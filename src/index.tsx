import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// --- PRE-FLIGHT CHECK (GUARANTEED EXECUTION) ---
// This runs before any other code because we removed the static import of App
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";

// Strict Check: Quotes, Spaces, or Missing
const hasQuotes = apiKey.includes('"') || apiKey.includes("'");
const hasSpaces = apiKey.includes(" ");
const isTooShort = apiKey.length < 20;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element not found");
const root = ReactDOM.createRoot(rootElement);

if (hasQuotes || hasSpaces || isTooShort) {
  // RENDER FATAL ERROR SCREEN
  console.error("Halting App: Configuration Error Detected");
  document.body.innerHTML = `
    <div style="font-family: system-ui, sans-serif; padding: 40px; background-color: #fef2f2; min-height: 100vh; color: #991b1b;">
      <div style="max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 2px solid #b91c1c; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
        <h1 style="margin-top: 0; color: #dc2626;">⚠️ Critical Configuration Error</h1>
        <p style="font-size: 1.1em;">The application was stopped before initialization because the <strong>VITE_FIREBASE_API_KEY</strong> on Vercel is invalid.</p>
        
        <div style="background: #1f2937; color: #10b981; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 1.1em; margin: 20px 0; overflow-x: auto;">
          <strong>VALUE READ:</strong><br>
          ${JSON.stringify(apiKey)}
        </div>

        <div style="color: #b91c1c; background: #fee2e2; padding: 15px; border-radius: 8px;">
          <strong>DIAGNOSIS:</strong>
          <ul style="margin: 10px 0 0 20px;">
            ${hasQuotes ? '<li>❌ <strong>CONTAINS QUOTES:</strong> Remove the quotes (<code>"</code> or <code>\'</code>) from the value in Vercel.</li>' : ''}
            ${hasSpaces ? '<li>❌ <strong>CONTAINS SPACES:</strong> Remove leading/trailing spaces in Vercel.</li>' : ''}
            ${isTooShort ? '<li>❌ <strong>INVALID/MISSING:</strong> Typically API keys are ~39 chars long.</li>' : ''}
          </ul>
        </div>
        
        <p style="margin-top: 20px; color: #4b5563;">Please update your Environment Variables in Vercel Settings and redeploy.</p>
      </div>
    </div>
  `;
} else {
  // CONFIG IS VALID -> LOAD APP
  // Using dynamic import to ensure App (and Firebase) are strictly loaded AFTER the check
  import('./App').then(({ default: App }) => {
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }).catch(err => {
    console.error("Failed to load App module:", err);
    document.body.innerHTML = `<h1 style="color:red; padding: 20px;">Failed to load application bundle. Check console.</h1>`;
  });
}