// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAPPO7U5ubZfHAeSUuUSWHfoSrLPI33Ahc",
  authDomain: "mess-manager-2.firebaseapp.com",
  projectId: "mess-manager-2",
  storageBucket: "mess-manager-2.firebasestorage.app",
  messagingSenderId: "13664139775",
  appId: "1:13664139775:web:3a48a7e9718b53dc28cfca",
  measurementId: "G-FYZ4ZYGZFX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);