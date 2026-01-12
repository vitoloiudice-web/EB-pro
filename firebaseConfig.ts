import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Security Fix: Firebase config now reads from environment variables
// Set these in .env.local (never commit .env.local to git!)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate config in development
if (import.meta.env.DEV && !firebaseConfig.apiKey) {
  console.warn("[Firebase] Missing API key. Copy .env.example to .env.local and fill in your credentials.");
}

// Initialize Firebase
let app;
let db;
let auth;

try {
  const apiKey = firebaseConfig.apiKey;
  if (!apiKey) {
    throw new Error("VITE_FIREBASE_API_KEY is missing. Please check your .env.local or Vercel Environment Variables.");
  }

  // Debug helper for "invalid-api-key" errors
  if (apiKey.includes('"') || apiKey.includes("'") || apiKey.includes(" ") || apiKey.length < 30) {
    console.warn("Possible malformed API Key detected:", {
      length: apiKey.length,
      hasQuotes: apiKey.includes('"') || apiKey.includes("'"),
      hasSpaces: apiKey.includes(" ")
    });
    // We don't throw here to let Firebase try, but this info helps debug the subsequent crash
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error: any) {
  console.error("CRITICAL: Firebase Initialization Failed", error);

  // Enhance error message for the UI
  if (error.code === 'auth/invalid-api-key') {
    const apiKeyDebug = firebaseConfig.apiKey ?
      `Present (Length: ${firebaseConfig.apiKey.length}, Starts with: ${firebaseConfig.apiKey.substring(0, 4)}...)` : 'Missing';
    error.message += ` | DEBUG INFO: API Key is ${apiKeyDebug}. Check for extra quotes or spaces in Vercel Env Vars.`;
  }

  // Re-throw so the global error handler in index.html catches it and shows it to the user
  throw error;
}

export { app, db, auth };