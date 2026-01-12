import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// --- PRE-FLIGHT CHECK ---
// Validate Environment Variables before attempting to run React
const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "";
const hasQuotes = apiKey.includes('"') || apiKey.includes("'");
const hasSpaces = apiKey.includes(" ");

if (hasQuotes || hasSpaces || apiKey.length < 10) {
  // CRITICAL CONFIG ERROR: Stop execution and show help
  document.body.innerHTML = `
    <div style="max-width: 800px; margin: 40px auto; padding: 24px; font-family: system-ui, sans-serif; border: 2px solid #ef4444; border-radius: 8px; background: #fff1f2;">
      <h1 style="color: #991b1b; margin-top: 0;">Configuration Error Detected</h1>
      <p style="font-size: 1.1em; color: #374151;">The application cannot start because the Firebase API Key is malformed.</p>
      
      <div style="background: #ffffff; padding: 16px; border: 1px solid #e5e7eb; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: bold; color: #4b5563;">Current Value (Raw):</p>
        <code style="display: block; background: #f3f4f6; padding: 8px; font-size: 1.2em; border-radius: 4px; overflow-x: auto;">
          ${JSON.stringify(apiKey)}
        </code>
      </div>

      <div style="color: #b91c1c;">
        <strong>Diagnosis:</strong>
        ${hasQuotes ? '<p>⚠️ <strong>Contains Quotes:</strong> You have included quotes (<code>"</code> or <code>\'</code>) in your Vercel Environment Variable. Remove them.</p>' : ''}
        ${hasSpaces ? '<p>⚠️ <strong>Contains Spaces:</strong> You have trailing or leading spaces in your Vercel Environment Variable. Delete them.</p>' : ''}
        ${apiKey.length < 10 ? '<p>⚠️ <strong>Too Short:</strong> The key seems truncated or missing.</p>' : ''}
      </div>

      <p style="margin-top: 24px; font-size: 0.9em; color: #6b7280;">
        Go to <strong>Vercel Dashboard > Settings > Environment Variables</strong> and edit <code>VITE_FIREBASE_API_KEY</code> to contain ONLY the alphanumeric key.
      </p>
    </div>
  `;
  throw new Error("Halting for Pre-flight Configuration Check");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);