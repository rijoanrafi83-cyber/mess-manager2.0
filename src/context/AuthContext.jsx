// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // Firestore profile
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Register new admin
  async function registerAdmin(name, email, password) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    // Create admin profile in Firestore
    await setDoc(doc(db, "admins", cred.user.uid), {
      uid: cred.user.uid,
      name,
      email,
      role: "admin",
      createdAt: serverTimestamp(),
    });
    return cred.user;
  }

  // Login
  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Logout
  async function logout() {
    await signOut(auth);
    setUserProfile(null);
  }

  // Forgot password
  async function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  // Load Firestore profile (admin OR member)
  async function loadProfile(user) {
    setProfileLoading(true);
    try {
      // Try admin profile first
      const adminDoc = await getDoc(doc(db, "admins", user.uid));
      if (adminDoc.exists()) {
        setUserProfile({ ...adminDoc.data(), role: "admin" });
        setProfileLoading(false);
        return;
      }
      // Try member account
      const { getDocs, collection, query, where } = await import("firebase/firestore");
      const q = query(collection(db, "memberAccounts"), where("memberUid", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = snap.docs[0].data();
        setUserProfile({ ...data, role: "member" });
        setProfileLoading(false);
        return;
      }
      // Unknown user
      setUserProfile(null);
    } catch (err) {
      console.error("loadProfile error:", err);
      setUserProfile(null);
    }
    setProfileLoading(false);
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadProfile(user);
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  const value = {
    currentUser,
    userProfile,
    authLoading,
    profileLoading,
    registerAdmin,
    login,
    logout,
    resetPassword,
    loadProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}