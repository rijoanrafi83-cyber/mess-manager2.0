import {
  createContext,
  useContext,
  useEffect,
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
} from "firebase/firestore";

import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [userProfile, setUserProfile] = useState(null);
  const [status, setStatus] = useState("loading");

  // =========================
  // AUTH STATE LISTENER
  // =========================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          // No user
          if (!firebaseUser) {
            setUserProfile(null);
            setStatus("guest");
            return;
          }

          // =========================
          // ADMIN PROFILE CHECK
          // =========================
          const adminRef = doc(
            db,
            "adminProfiles",
            firebaseUser.uid
          );

          const adminSnap = await getDoc(adminRef);

          if (adminSnap.exists()) {
            const data = adminSnap.data();

            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName:
                data.displayName ||
                firebaseUser.displayName ||
                firebaseUser.email,
              role: "admin",
              ownerId: firebaseUser.uid,
            });

            setStatus("authed");
            return;
          }

          // =========================
          // MEMBER PROFILE CHECK
          // =========================
          const memberRef = doc(
            db,
            "memberAccess",
            firebaseUser.uid
          );

          const memberSnap = await getDoc(memberRef);

          if (memberSnap.exists()) {
            const data = memberSnap.data();

            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName:
                data.displayName ||
                firebaseUser.displayName ||
                firebaseUser.email,
              role: "member",
              ownerId: data.ownerId,
              memberId: data.memberId,
            });

            setStatus("authed");
            return;
          }

          // =========================
          // NO PROFILE FOUND
          // =========================
          setUserProfile(null);
          setStatus("guest");

        } catch (err) {
          console.error(
            "Auth state error:",
            err
          );

          setUserProfile(null);
          setStatus("guest");
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // =========================
  // LOGIN
  // =========================
  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

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

  // =========================
  // REGISTER
  // =========================
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

      // Create admin profile
      await setDoc(
        doc(db, "adminProfiles", cred.user.uid),
        {
          displayName,
          email,
          role: "admin",
          ownerId: cred.user.uid,
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

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {
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
    }
  };

  // =========================
  // RESET PASSWORD
  // =========================
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

  // =========================
  // CONTEXT VALUE
  // =========================
  const value = {
    userProfile,
    status,

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

// =========================
// CUSTOM HOOK
// =========================
export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return ctx;
}