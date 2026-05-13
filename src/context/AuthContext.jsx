import React, {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "firebase/auth";

import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";

import { auth, db } from "../firebase";

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {

  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // REGISTER
  // =========================
  const register = async (name, email, password) => {

    try {

      // CREATE USER
      const userCredential =
        await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // SAVE USER PROFILE
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          name: name,
          email: email,
          role: "admin",
          createdAt: serverTimestamp()
        }
      );

      // GET SAVED USER
      const savedUser = await getDoc(
        doc(db, "users", user.uid)
      );

      // SET CURRENT USER
      if (savedUser.exists()) {
        setCurrentUser(savedUser.data());
      }

      return {
        success: true
      };

    } catch (error) {

      console.error("REGISTER ERROR:", error);

      return {
        success: false,
        message: error.message
      };
    }
  };

  // =========================
  // LOGIN
  // =========================
  const login = async (email, password) => {

    try {

      // LOGIN USER
      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

      const user = userCredential.user;

      // LOAD USER PROFILE
      const userDoc = await getDoc(
        doc(db, "users", user.uid)
      );

      // IF PROFILE NOT FOUND
      if (!userDoc.exists()) {

        // CREATE PROFILE AUTOMATICALLY
        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            name: user.displayName || "User",
            email: user.email,
            role: "admin",
            createdAt: serverTimestamp()
          }
        );

        // LOAD AGAIN
        const newUserDoc = await getDoc(
          doc(db, "users", user.uid)
        );

        if (newUserDoc.exists()) {

          setCurrentUser(newUserDoc.data());

          return {
            success: true,
            user: newUserDoc.data()
          };
        }
      }

      // NORMAL LOGIN
      setCurrentUser(userDoc.data());

      return {
        success: true,
        user: userDoc.data()
      };

    } catch (error) {

      console.error("LOGIN ERROR:", error);

      let customMessage = "Login failed";

      switch (error.code) {

        case "auth/user-not-found":
          customMessage = "No account found";
          break;

        case "auth/wrong-password":
          customMessage = "Wrong password";
          break;

        case "auth/invalid-credential":
          customMessage = "Invalid email or password";
          break;

        case "auth/invalid-email":
          customMessage = "Invalid email";
          break;

        default:
          customMessage = error.message;
      }

      return {
        success: false,
        message: customMessage
      };
    }
  };

  // =========================
  // LOGOUT
  // =========================
  const logout = async () => {

    try {

      await signOut(auth);

      setCurrentUser(null);

    } catch (error) {

      console.error("LOGOUT ERROR:", error);
    }
  };

  // =========================
  // AUTO LOGIN CHECK
  // =========================
  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(auth, async (user) => {

        try {

          if (user) {

            const userDoc = await getDoc(
              doc(db, "users", user.uid)
            );

            if (userDoc.exists()) {

              setCurrentUser(userDoc.data());

            } else {

              // AUTO CREATE PROFILE
              await setDoc(
                doc(db, "users", user.uid),
                {
                  uid: user.uid,
                  name: user.displayName || "User",
                  email: user.email,
                  role: "admin",
                  createdAt: serverTimestamp()
                }
              );

              const newDoc = await getDoc(
                doc(db, "users", user.uid)
              );

              if (newDoc.exists()) {
                setCurrentUser(newDoc.data());
              }
            }

          } else {

            setCurrentUser(null);
          }

        } catch (error) {

          console.error(
            "AUTH STATE ERROR:",
            error
          );

          setCurrentUser(null);

        } finally {

          setLoading(false);
        }
      });

    return () => unsubscribe();

  }, []);

  // =========================
  // CONTEXT VALUE
  // =========================
  const value = {
    currentUser,
    register,
    login,
    logout
  };

  // =========================
  // PROVIDER
  // =========================
  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};