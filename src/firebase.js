import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAPP07U5ubZfHAeSUuUSWHfoSrLPI33Ahc",
  authDomain: "mess-manager-2.firebaseapp.com",
  projectId: "mess-manager-2",
  storageBucket: "mess-manager-2.appspot.com"
  messagingSenderId: "13664139775",
  appId: "1:13664139775:web:3a48a7e9718b53dc28cfca",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;