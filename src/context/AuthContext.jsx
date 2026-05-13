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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        try {
          if (!firebaseUser) {
            setUserProfile(null);
            setStatus("guest");
            return;
          }

          // admin profile check
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
                firebaseUser.email,
              role: "admin",
              ownerId: firebaseUser.uid,
            });

            setStatus("authed");
            return;
          }

          // member profile check
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
                firebaseUser.email,
              role: "member",
              ownerId: data.ownerId,
              memberId: data.memberId,
            });

            setStatus("authed");
            return;
          }

          // no profile
          setUserProfile(null);
          setStatus("guest");

        } catch (err) {
          console.error(err);
          setUserProfile(null);
          setStatus("guest");
        }
      }
    );

    return () => unsubscribe();
  }, []);

  // login
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
      return {
        success: false,
        message: err.message,
      };
    }
  };

  // register
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
          createdAt: serverTimestamp(),
        }
      );

      return {
        success: true,
      };

    } catch (err) {
      console.error(err);

      return {
        success: false,
        message: err.message,
      };
    }
  };

  // logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  // reset password
  const sendReset = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);

      return {
        success: true,
      };

    } catch (err) {
      return {
        success: false,
        message: err.message,
      };
    }
  };

  const value = {
    userProfile,
    status,

    isLoading: status === "loading",
    isAuthed: status === "authed",

    login,
    register,
    logout,
    sendReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return ctx;
}