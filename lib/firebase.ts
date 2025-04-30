// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDbMbGj1knfXUFlZvyjXI4_BpXbXX9ccVg",
  authDomain: "flowpilot-45d37.firebaseapp.com",
  projectId: "flowpilot-45d37",
  storageBucket: "flowpilot-45d37.firebasestorage.app",
  messagingSenderId: "130364100922",
  appId: "1:130364100922:web:2d1df024de1ffe24bac003",
  measurementId: "G-WPEKXNRC7S"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);