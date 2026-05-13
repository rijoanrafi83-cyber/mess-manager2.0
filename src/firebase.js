import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

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

const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider("6LdQmOcsAAAAAEl38XTX2HJomck5RNJLcmcjRR0s"),
  isTokenAutoRefreshEnabled: true,
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;