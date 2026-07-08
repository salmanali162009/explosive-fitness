import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAShEyFGQLpdB7bgtQ2MvXP5izE_HOn_SA",
  authDomain: "first-project-f9684.firebaseapp.com",
  projectId: "first-project-f9684",
  storageBucket: "first-project-f9684.firebasestorage.app",
  messagingSenderId: "658044746307",
  appId: "1:658044746307:web:a2da6961e90079d69a72f6",
  measurementId: "G-5BYBTCMYE4"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
