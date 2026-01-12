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

  // FORCE DEBUG LOGGING
  console.log("--- FIREBASE DEBUG ---");
  console.log("API Key Exists:", !!apiKey);
  if (apiKey) {
    console.log("API Key Length:", apiKey.length);
    console.log("First Char:", apiKey.charAt(0), "Code:", apiKey.charCodeAt(0));
    console.log("Last Char:", apiKey.charAt(apiKey.length - 1), "Code:", apiKey.charCodeAt(apiKey.length - 1));
    console.log("Contains Quotes:", apiKey.includes('"') || apiKey.includes("'"));
    console.log("Contains Spaces:", apiKey.includes(" "));
  }
  console.log("----------------------");

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

  const apiKey = firebaseConfig.apiKey || "UNDEFINED";

  // RENDER ERROR DIRECTLY TO SCREEN
  document.body.innerHTML = `
    <div style="
      font-family: system-ui, -apple-system, sans-serif;
      padding: 40px;
      background-color: #fef2f2;
      min-height: 100vh;
      color: #991b1b;
    ">
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <h1 style="margin-top: 0; border-bottom: 2px solid #fee2e2; padding-bottom: 15px;">🔥 Firebase Initialization Failed</h1>
        
        <p style="font-size: 1.1rem; line-height: 1.6;">
          The application crashed because the Firebase SDK rejected the configuration.
        </p>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <strong>Error Code:</strong> <code>${error.code || 'UNKNOWN'}</code><br>
          <strong>Message:</strong> ${error.message}
        </div>

        <h3>🔍 API Key Diagnosis</h3>
        <p>We analyzed the injected <code>VITE_FIREBASE_API_KEY</code> variable:</p>
        
        <ul style="background: #f9fafb; padding: 20px 40px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <li><strong>Status:</strong> ${apiKey ? '✅ Present' : '❌ Missing'}</li>
          <li><strong>Length:</strong> ${apiKey.length} characters</li>
          <li><strong>First 3 Chars:</strong> <code>${apiKey.substring(0, 3)}</code></li>
          <li><strong>Last 3 Chars:</strong> <code>${apiKey.substring(apiKey.length - 3)}</code></li>
          <li><strong>Contains Whitespace:</strong> ${/\s/.test(apiKey) ? '⚠️ YES (Check for spaces/newlines!)' : 'No'}</li>
          <li><strong>Contains Quotes:</strong> ${/['"]/.test(apiKey) ? '⚠️ YES (Remove quotes!)' : 'No'}</li>
          <li><strong>Raw Encoded (Reveal Hidden):</strong><br>
            <code style="word-break: break-all; background: #eee; padding: 4px;">${encodeURIComponent(apiKey)}</code>
          </li>
        </ul>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <strong>How to fix:</strong><br>
          1. Go to Vercel > Settings > Environment Variables.<br>
          2. Compare the "Raw Encoded" value above with your actual key.<br>
          3. If you see <code>%20</code> (Space) or <code>%22</code> (Quote) or <code>%0A</code> (Newline), delete those characters in Vercel.
        </div>
      </div>
    </div>
  `;

  // Stop further execution
  throw new Error("HALT: Firebase Init Failed via Custom Handler");
}

export { app, db, auth };