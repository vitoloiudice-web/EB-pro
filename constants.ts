
import { Client, AdminProfile } from './types';

// Environment variables
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ""; 
export const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
// Added userinfo.email and userinfo.profile scopes
export const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

// Multi-Tenant Configuration
export const CLIENTS: Client[] = [];

export const MOCK_ADMIN_PROFILE: AdminProfile = {
  companyName: "EB-pro Procurement Solutions S.r.l.",
  vatNumber: "IT12345678901",
  taxId: "12345678901",
  address: "Via dell'Innovazione Tecnologica, 42",
  city: "Milano",
  zipCode: "20100",
  province: "MI",
  country: "Italia",
  email: "admin@eb-pro.com",
  phone: "+39 02 555 1234",
  website: "www.eb-pro.com",
  bankName: "Intesa Sanpaolo",
  iban: "IT60X0306903200100000012345",
  swift: "BCITITMM"
};

export const ITEM_GROUPS = [
  { name: 'Cassa/Vasca', code: 'VA' },
  { name: 'Telaio', code: 'TE' },
  { name: 'Compattazione', code: 'KO' },
  { name: 'Cabina', code: 'CA' }
];

export const ITEM_HIERARCHY: Record<string, { code: string, macrofamilies: Record<string, { code: string, families: string[] }> }> = {
  'Diretto': {
    code: 'D',
    macrofamilies: {
      'Carpenteria': { code: 'CAR', families: ['Laminato', 'Profilato'] },
      'Torneria': { code: 'TOR', families: ['Spinotto', 'Flangia'] },
      'Oleodinamica': { code: 'OLE', families: ['Cilindro', 'Distributore', 'Pompa', 'PTO', 'Centralina', 'Valvola', 'Filtrazione', 'Serbatoio', 'Raccorderia', 'Tubo', 'Olio'] },
      'Elettrica': { code: 'ELE', families: ['Cavo', 'Logica', 'IOT 4.0', 'Illuminazione', 'Audio-Video', 'Componente', 'Minuteria'] },
      'Pneumatica': { code: 'PNE', families: ['Attuatore', 'Filtrazione', 'Componente'] },
      'Gomma': { code: 'GOM', families: ['Battuta', 'Protezione', 'Copertura'] },
      'Ferramenta': { code: 'FER', families: ['Vite', 'Bullone', 'Dado', 'Minuteria'] },
      'Verniciatura': { code: 'VER', families: ['Smalto', 'Catalizzatore', 'Solvente', 'Sigillante', 'Stucco'] },
      'Finitura': { code: 'FIN', families: ['Carrozzeria', 'Segnaletica'] }
    }
  },
  'Indiretto': {
    code: 'I',
    macrofamilies: {
      'Canone': { code: 'CAN', families: ['Energia', 'Finanziario', 'Fabbricato', 'Macchinario'] },
      'Strumentale': { code: 'STR', families: ['Preparazione', 'Utensile', 'Sicurezza', 'Formazione', 'DPI', 'Stoccaggio', 'Movimentazione'] }
    }
  }
};
