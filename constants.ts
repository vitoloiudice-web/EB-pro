
import { Company, AdminProfile } from './types';

// NOTE: In a real production app, these should be environment variables.
// For the purpose of this architecture demo, we keep them here.
export const GOOGLE_CLIENT_ID = "414620675878-om6fktpaf0a78h943mle3ek5dfbu4q03.apps.googleusercontent.com";
export const GOOGLE_API_KEY = "AIzaSyDOtnn5HYInqBXGCdToLQZY2KKL2GnG-fo"; 
export const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
export const SCOPES = "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly";

// Multi-Tenant Configuration
export const COMPANIES: Company[] = [
  {
    id: 'c1',
    name: 'EcoCompact Spa',
    spreadsheetId: '1tAdkO29iGKe0g3xy0TbhNS_mkR3L4VQKHbj6A1Fgi_c', // PRODUCTION DB
  },
  {
    id: 'c2',
    name: 'UrbanWaste Solutions',
    spreadsheetId: '1tAdkO29iGKe0g3xy0TbhNS_mkR3L4VQKHbj6A1Fgi_c', // Shared DB for testing
  },
  {
    id: 'c3',
    name: 'HeavyDuty Trucks Ltd',
    spreadsheetId: '1tAdkO29iGKe0g3xy0TbhNS_mkR3L4VQKHbj6A1Fgi_c', // Shared DB for testing
  }
];

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

export const MOCK_ITEMS_DATA = [
  { sku: 'HYD-VAL-001', name: 'Valvola Controllo Flusso', category: 'Idraulica', stock: 12, safetyStock: 20, cost: 150, supplierId: 'SUP-01' },
  { sku: 'STL-PLT-5MM', name: 'Piastra Acciaio 5mm', category: 'Carpenteria', stock: 500, safetyStock: 200, cost: 45, supplierId: 'SUP-02' },
  { sku: 'ELC-PLC-X2', name: 'Centralina PLC Veicolare', category: 'Elettronica', stock: 5, safetyStock: 10, cost: 800, supplierId: 'SUP-03' },
  { sku: 'PNT-YEL-RAL', name: 'Vernice Gialla RAL1023', category: 'Verniciatura', stock: 50, safetyStock: 40, cost: 20, supplierId: 'SUP-04' },
  { sku: 'WLD-ROD-X1', name: 'Elettrodi Saldatura Inox', category: 'Saldatura', stock: 1000, safetyStock: 500, cost: 0.5, supplierId: 'SUP-02' },
];

export const MOCK_SUPPLIERS = [
  { id: 'SUP-01', name: 'HydraForce Italia', rating: 4.8, email: 'sales@hydraforce.it', paymentTerms: '60 DFFM' },
  { id: 'SUP-02', name: 'Acciaierie Venete', rating: 4.2, email: 'ordini@acciaierie.it', paymentTerms: '30 DF' },
  { id: 'SUP-03', name: 'AutoElectric Pro', rating: 3.9, email: 'info@autoelectric.com', paymentTerms: 'RB 30/60' },
];

export const MOCK_CUSTOMERS = [
  { id: 'CUST-01', name: 'Municipalità di Milano', email: 'appalti@comune.milano.it', vatNumber: '01199250158', address: 'Piazza della Scala, 2', region: 'Lombardia', paymentTerms: 'Bonifico 30gg' },
  { id: 'CUST-02', name: 'Roma Multiservizi', email: 'acquisti@romamultiservizi.it', vatNumber: '05438871003', address: 'Via Tiburtina 100', region: 'Lazio', paymentTerms: 'Bonifico 60gg' },
  { id: 'CUST-03', name: 'Hera SpA', email: 'procurement@gruppohera.it', vatNumber: '04245520376', address: 'Viale Berti Pichat 2/4', region: 'Emilia-Romagna', paymentTerms: 'Bonifico 90gg' },
];
