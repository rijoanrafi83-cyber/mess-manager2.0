import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPP07U5UbZfHAeSUuUSWHfoSrLPI33Ahc",
  authDomain: "mess-manager-2.firebaseapp.com",
  projectId: "mess-manager-2",
  storageBucket: "mess-manager-2.firebasestorage.app",
  messagingSenderId: "13664139775",
  appId: "1:13664139775:web:3a48a7e9718b53dc28cfca",
  measurementId: "G-FYZ4ZYGZFX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;