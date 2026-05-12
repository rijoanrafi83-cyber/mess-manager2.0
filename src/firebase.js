import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZqnOCaGo2PSBnIGfD9Hf2rzSzXS14hgk",
  authDomain: "mess-manager-n.firebaseapp.com",
  projectId: "mess-manager-n",
  storageBucket: "mess-manager-n.firebasestorage.app",
  messagingSenderId: "652482966344",
  appId: "1:652482966344:web:7d6dfab31bc86050a1f97d",
  measurementId: "G-XB4KWRES7S"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;