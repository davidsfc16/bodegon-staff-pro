import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQqv5L37_D9fo5TklKd_4979Ea10Brhww",
  authDomain: "kbodegon-app.firebaseapp.com",
  projectId: "kbodegon-app",
  storageBucket: "kbodegon-app.firebasestorage.app",
  messagingSenderId: "298619681230",
  appId: "1:298619681230:web:139c1ebbdc802e211e539f"
};

const app = initializeApp(firebaseConfig);

// 🔥 BASE DE DATOS
export const db = getFirestore(app);