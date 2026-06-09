import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import {
  ROLES,
  credentialAliasDocId,
} from "../utils/roles";
import { AuthContext } from "./useAuth";

const AUTH_PROFILE_TIMEOUT_MS = 8000;

class AuthStartupTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "AuthStartupTimeoutError";
  }
}

function withTimeout(promise, timeoutMs, message) {
  let timeoutId;

  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new AuthStartupTimeoutError(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [status, setStatus] = useState("loading");
  const authSequenceRef = useRef(0);
  const signingOutRef = useRef(false);

  const buildAdminProfile = useCallback((firebaseUser, adminData = {}, userData = {}) => ({
    uid: firebaseUser.uid,
    authUid: firebaseUser.uid,
    email:
      firebaseUser.email ||
      adminData.email ||
      userData.email ||
      "",
    displayName:
      adminData.displayName ||
      adminData.fullName ||
      userData.displayName ||
      userData.fullName ||
      firebaseUser.displayName ||
      firebaseUser.email,
    fullName:
      adminData.fullName ||
      adminData.displayName ||
      userData.fullName ||
      userData.displayName ||
      firebaseUser.displayName ||
      "",
    phone:
      adminData.phone ||
      userData.phone ||
      "",
    bio:
      adminData.bio ||
      userData.bio ||
      "",
    photoURL:
      adminData.photoURL ||
      userData.photoURL ||
      firebaseUser.photoURL ||
      "",
    createdAt:
      adminData.createdAt ||
      userData.createdAt ||
      null,
    joinedAt:
      adminData.joinedAt ||
      userData.joinedAt ||
      adminData.createdAt ||
      userData.createdAt ||
      null,
    role: ROLES.ADMIN,
    ownerId: firebaseUser.uid,
    status: adminData.status || adminData.accountStatus || "active",
    accountStatus:
      adminData.accountStatus ||
      adminData.status ||
      "active",
    sessionId: firebaseUser.uid,
  }), []);

  const hydrateAdminProfile = useCallback(async (
    firebaseUser,
    adminSnap,
    userSnap
  ) => {
    const adminData = adminSnap?.exists()
      ? adminSnap.data()
      : {};
    const userData = userSnap?.exists()
      ? userSnap.data()
      : {};
    const accountStatus =
      adminData.accountStatus ||
      adminData.status ||
      userData.accountStatus ||
      userData.status ||
      "active";
    const hasAdminProfile =
      adminSnap?.exists() &&
      (!adminData.role || adminData.role === ROLES.ADMIN);
    const hasLegacyAdminProfile =
      userSnap?.exists() &&
      (
        userData.role === ROLES.ADMIN ||
        !userData.role
      );

    if (
      accountStatus !== "active" ||
      (!hasAdminProfile && !hasLegacyAdminProfile)
    ) {
      return null;
    }

    const profile = buildAdminProfile(
      firebaseUser,
      adminData,
      userData
    );

    // NOTE: We no longer write to adminProfiles on every auth state change.
    // The profile is created during registration and updated via explicit saves
    // (SettingsPage, ProfilePanel). This prevents race conditions when multiple
    // tabs are open and avoids unnecessary Firestore writes on every page load.

    return profile;
  }, [buildAdminProfile]);

  const buildManagedProfile = useCallback((firebaseUser, data) => ({
    uid: firebaseUser.uid,
    email: data.email || firebaseUser.email,
    displayName:
      data.displayName ||
      data.name ||
      firebaseUser.displayName ||
      firebaseUser.email,
    role: data.role || "member",
    ownerId: data.ownerId,
    memberId: data.memberId,
    authUid: firebaseUser.uid,
    status: data.status || "active",
    accountStatus: data.accountStatus || data.status || "active",
    credentialVersion: data.credentialVersion || 1,
    photoURL: data.photoURL || firebaseUser.photoURL || "",
    bio: data.bio || "",
    phone: data.phone || "",
    createdAt: data.createdAt || null,
    joinedAt: data.joinedAt || data.createdAt || null,
    sessionId: firebaseUser.uid,
  }), []);

  const loadBootstrapProfile = useCallback(async (firebaseUser) => {
    const adminRef = doc(
      db,
      "adminProfiles",
      firebaseUser.uid
    );
    const userRef = doc(
      db,
      "users",
      firebaseUser.uid
    );

    const [adminSnap, userSnap] = await Promise.all([
      getDoc(adminRef),
      getDoc(userRef),
    ]);

    const adminProfile = await hydrateAdminProfile(
      firebaseUser,
      adminSnap,
      userSnap
    );

    if (adminProfile) {
      return {
        kind: "profile",
        profile: adminProfile,
      };
    }

    const memberRef = doc(
      db,
      "memberAccess",
      firebaseUser.uid
    );
    const memberSnap = await getDoc(memberRef);

    if (!memberSnap.exists()) {
      return {
        kind: "guest",
      };
    }

    const data = memberSnap.data();
    const accountStatus =
      data.accountStatus || data.status || "active";

    if (accountStatus !== "active") {
      return {
        kind: "inactive",
      };
    }

    return {
      kind: "profile",
      profile: buildManagedProfile(firebaseUser, data),
    };
  }, [buildManagedProfile, hydrateAdminProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        const sequence = authSequenceRef.current + 1;
        authSequenceRef.current = sequence;

        try {
          if (!firebaseUser) {
            signingOutRef.current = false;
            setCurrentUser(null);
            setUserProfile(null);
            setStatus("guest");
            return;
          }

          if (signingOutRef.current) {
            return;
          }

          setCurrentUser(firebaseUser);
          const result = await withTimeout(
            loadBootstrapProfile(firebaseUser),
            AUTH_PROFILE_TIMEOUT_MS,
            "Auth profile lookup timed out."
          );

          if (
            signingOutRef.current ||
            sequence !== authSequenceRef.current
          ) {
            return;
          }

          if (result.kind === "profile") {
            setUserProfile(result.profile);
            setStatus("authed");
            return;
          }

          if (result.kind === "inactive") {
            await signOut(auth);
            setCurrentUser(null);
            setUserProfile(null);
            setStatus("guest");
            return;
          }

          setUserProfile(null);
          setStatus("guest");

        } catch (err) {
          if (
            signingOutRef.current ||
            sequence !== authSequenceRef.current
          ) {
            return;
          }

          if (err instanceof AuthStartupTimeoutError) {
            console.warn(
              "Auth startup timed out:",
              err
            );
          } else {
            console.error(
              "Auth state error:",
              err
            );
          }

          setUserProfile(null);
          setStatus("guest");
        }
      }
    );

    return () => unsubscribe();
  }, [loadBootstrapProfile]);

  useEffect(() => {
    if (
      status !== "authed" ||
      !userProfile?.uid ||
      userProfile.role !== ROLES.ADMIN ||
      !currentUser
    ) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "adminProfiles", userProfile.uid),
      (snap) => {
        if (!snap.exists()) {
          return;
        }

        const data = snap.data();
        const accountStatus =
          data.accountStatus || data.status || "active";

        if (
          data.role === ROLES.ADMIN &&
          accountStatus === "active"
        ) {
          setUserProfile(
            buildAdminProfile(currentUser, data)
          );
        }
      }
    );

    return () => unsubscribe();
  }, [
    buildAdminProfile,
    currentUser,
    status,
    userProfile?.uid,
    userProfile?.role,
  ]);

  useEffect(() => {
    if (
      status !== "authed" ||
      !userProfile?.uid ||
      userProfile.role === ROLES.ADMIN
    ) {
      return undefined;
    }

    const unsubscribe = onSnapshot(
      doc(db, "memberAccess", userProfile.uid),
      async (snap) => {
        if (!snap.exists()) {
          await signOut(auth);
          return;
        }

        const data = snap.data();
        const accountStatus =
          data.accountStatus || data.status || "active";

        if (
          accountStatus !== "active" ||
          data.credentialVersion !== userProfile.credentialVersion
        ) {
          await signOut(auth);
        }
      }
    );

    return () => unsubscribe();
  }, [
    status,
    userProfile?.uid,
    userProfile?.role,
    userProfile?.credentialVersion,
  ]);
  const resolveLoginEmail = async (identifier, expectedRole) => {
    const sharedAliasSnap = await getDoc(
      doc(
        db,
        "roleLoginAliases",
        credentialAliasDocId(identifier)
      )
    );

    if (!sharedAliasSnap.exists()) {
      return identifier;
    }

    const alias = sharedAliasSnap.data();

    if (
      expectedRole &&
      alias.role !== expectedRole
    ) {
      throw new Error(
        `Use the ${alias.role} login page for this account.`
      );
    }

    if (
      alias.enabled === false ||
      (alias.accountStatus || alias.status || "active") !==
        "active"
    ) {
      throw new Error(
        "This account is inactive. Contact your administrator."
      );
    }

    return alias.authEmail || identifier;
  };

  const login = async (
    email,
    password,
    options = {}
  ) => {
    try {
      const expectedRole = options.expectedRole;
      const resolvedEmail =
        await resolveLoginEmail(
          email.trim(),
          expectedRole
        );

      const cred = await signInWithEmailAndPassword(
        auth,
        resolvedEmail,
        password
      );

      const adminSnap = await getDoc(
        doc(db, "adminProfiles", cred.user.uid)
      );
      const userSnap = await getDoc(
        doc(db, "users", cred.user.uid)
      );
      const adminProfile = await hydrateAdminProfile(
        cred.user,
        adminSnap,
        userSnap
      );

      if (adminProfile) {
        if (
          expectedRole &&
          expectedRole !== ROLES.ADMIN
        ) {
          await signOut(auth);
          return {
            success: false,
            message:
              "Use the admin login page for this account.",
          };
        }

        return {
          success: true,
        };
      }

      const accessSnap = await getDoc(
        doc(db, "memberAccess", cred.user.uid)
      );

      if (!accessSnap.exists()) {
        await signOut(auth);
        return {
          success: false,
          message: "No active workspace account was found for these credentials.",
        };
      }

      const access = accessSnap.data();
      const accessRole =
        access.role || ROLES.MEMBER;

      if (
        expectedRole &&
        accessRole !== expectedRole
      ) {
        await signOut(auth);
        return {
          success: false,
          message: `Use the ${accessRole} login page for this account.`,
        };
      }

      const accountStatus =
        access.accountStatus || access.status || "active";

      if (accountStatus !== "active") {
        await signOut(auth);
        return {
          success: false,
          message: "This account is inactive. Contact your administrator.",
        };
      }

      return {
        success: true,
      };

    } catch (err) {
      console.error("Login Error:", err);

      return {
        success: false,
        message:
          err.message || "Login failed",
      };
    }
  };
  const register = async (
    displayName,
    email,
    password
  ) => {
    try {
      const cred =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      await setDoc(
        doc(db, "adminProfiles", cred.user.uid),
        {
          displayName,
          email,
          role: "admin",
          ownerId: cred.user.uid,
          accountStatus: "active",
          status: "active",
          createdAt: serverTimestamp(),
        }
      );

      return {
        success: true,
        message:
          "Account created successfully",
      };

    } catch (err) {
      console.error(
        "Register Error:",
        err
      );

      return {
        success: false,
        message:
          err.message ||
          "Registration failed",
      };
    }
  };
  const logout = async () => {
    signingOutRef.current = true;
    authSequenceRef.current += 1;

    setCurrentUser(null);
    setUserProfile(null);
    setStatus("guest");

    try {
      await signOut(auth);

      return {
        success: true,
      };

    } catch (err) {
      console.error(
        "Logout Error:",
        err
      );

      return {
        success: false,
        message:
          err.message ||
          "Logout failed",
      };
    } finally {
      signingOutRef.current = false;
      setCurrentUser(null);
      setUserProfile(null);
      setStatus("guest");
    }
  };
  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(
        auth,
        email
      );

      return {
        success: true,
        message:
          "Password reset email sent successfully",
      };

    } catch (err) {
      console.error(
        "Reset Password Error:",
        err
      );

      return {
        success: false,
        message:
          err.message ||
          "Failed to send reset email",
      };
    }
  };
  const value = {
    currentUser,
    userProfile,
    status,

    authLoading: status === "loading",
    profileLoading: status === "loading",
    isLoading: status === "loading",
    isAuthed: status === "authed",

    login,
    register,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
