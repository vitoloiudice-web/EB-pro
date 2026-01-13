
// @ts-ignore
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Safe access to environment variables to prevent runtime crash
const env: any = import.meta.env || {};

// Configuration using standard Vite env variables
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID
};

// Log warning if keys are missing in dev (helper for setup)
if (env.DEV && !firebaseConfig.apiKey) {
    console.warn("⚠️ Firebase Config missing! Ensure you have a .env.local file with VITE_FIREBASE_* keys.");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
