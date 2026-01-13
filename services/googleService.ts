
// @ts-ignore
const gapi = window.gapi;
// @ts-ignore
const google = window.google;

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

// Scopes required for Drive (Creation) and Sheets (Read/Write)
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
const DISCOVERY_DOCS = [
    'https://sheets.googleapis.com/$discovery/rest?version=v4',
    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
];

export interface GoogleAuthResponse {
    success: boolean;
    user?: any;
    error?: string;
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

// Initialize GAPI (Legacy Client for API calls)
export const initGapiClient = async (): Promise<void> => {
    if (gapiInited) return;
    
    return new Promise((resolve, reject) => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    apiKey: API_KEY,
                    discoveryDocs: DISCOVERY_DOCS,
                });
                gapiInited = true;
                resolve();
            } catch (err) {
                console.error("GAPI Init Error:", err);
                reject(err);
            }
        });
    });
};

// Initialize GIS (New Identity Services for Auth)
export const initGisClient = (callback: (response: any) => void): void => {
    if (gisInited) return;

    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (resp: any) => {
                if (resp.error !== undefined) {
                    throw (resp);
                }
                callback(resp);
            },
        });
        gisInited = true;
    } catch (err) {
        console.error("GIS Init Error:", err);
    }
};

// Trigger Login Popup
export const handleGoogleLogin = (): void => {
    if (tokenClient) {
        // Request access token. 
        // prompt: '' will try to silently sign in if authorized before, 
        // but for first time use 'consent' might be needed if we want offline access (not needed here)
        tokenClient.requestAccessToken({ prompt: '' });
    } else {
        console.error("Token Client not initialized. Call initGisClient first.");
    }
};

// Check if user is already signed in (Valid Token exists)
export const getToken = () => {
    return gapi.client.getToken();
};

// --- DRIVE & SHEETS HELPERS (Foundation for Step 2) ---

export const findDatabaseSheet = async (fileName: string = "EB-Pro_Database"): Promise<string | null> => {
    try {
        const response = await gapi.client.drive.files.list({
            q: `name = '${fileName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
            fields: 'files(id, name)',
        });
        
        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id;
        }
        return null;
    } catch (err) {
        console.error("Error finding DB sheet:", err);
        return null;
    }
};

export const createDatabaseSheet = async (fileName: string = "EB-Pro_Database"): Promise<string> => {
    try {
        const response = await gapi.client.sheets.spreadsheets.create({
            properties: {
                title: fileName,
            },
            // We will define sheets (tabs) in the next step
            sheets: [
                { properties: { title: 'Metadata' } } 
            ]
        });
        return response.result.spreadsheetId;
    } catch (err) {
        console.error("Error creating DB sheet:", err);
        throw err;
    }
};
