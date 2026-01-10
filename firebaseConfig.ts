import { initializeApp } from "firebase/app";

// Configuration provided in the Masterplan V2.0
const firebaseConfig = {
  apiKey: "AIzaSyAiH70t--y-BJ2QnCGlMBMJah6wH-rzuPs",
  authDomain: "eb-pro-88020.firebaseapp.com",
  projectId: "eb-pro-88020",
  storageBucket: "eb-pro-88020.firebasestorage.app",
  messagingSenderId: "130601485902",
  appId: "1:130601485902:web:409c796402268cd792651f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export { app };