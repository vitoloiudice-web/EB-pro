
// Reference to vite/client removed to prevent "Cannot find type definition file" error
// /// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_FIREBASE_API_KEY: string;
    readonly VITE_FIREBASE_AUTH_DOMAIN: string;
    readonly VITE_FIREBASE_PROJECT_ID: string;
    readonly VITE_FIREBASE_STORAGE_BUCKET: string;
    readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
    readonly VITE_FIREBASE_APP_ID: string;
    readonly VITE_GEMINI_API_KEY: string;
    
    // GOOGLE DRIVE / SHEETS DATABASE CONFIG
    readonly VITE_GOOGLE_API_KEY: string;
    readonly VITE_GOOGLE_CLIENT_ID: string;
    
    // Standard Vite Environment Variables
    readonly BASE_URL: string;
    readonly MODE: string;
    readonly DEV: boolean;
    readonly PROD: boolean;
    readonly SSR: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
