
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  MRP = 'MRP',
  LOGISTICS = 'LOGISTICS',
  MASTER_DATA = 'MASTER_DATA',
  BI = 'BI', // Business Intelligence
  SUPPLIER_QUALIFICATION = 'SUPPLIER_QUALIFICATION',
  SUPPLIER_SCOUTING = 'SUPPLIER_SCOUTING', // Nuova vista
  SETTINGS = 'SETTINGS'
}

export interface Company {
  id: string;
  name: string;
  spreadsheetId: string;
  logoUrl?: string;
}

export interface AdminProfile {
  companyName: string;
  vatNumber: string; // Partita IVA
  taxId: string; // Codice Fiscale
  address: string;
  city: string;
  zipCode: string;
  province: string;
  country: string;
  email: string;
  phone: string;
  website: string;
  bankName: string;
  iban: string;
  swift: string;
}

export interface Item {
  sku: string;
  name: string;
  category: 'Idraulica' | 'Carpenteria' | 'Elettronica' | 'Verniciatura' | 'Saldatura' | 'Generico';
  description: string;
  unit: string;
  weightKg: number;
  cost: number;
  stock: number;
  safetyStock: number;
  supplierId: string;
  leadTimeDays: number;
}

export interface QualificationCriterion {
  id: string;
  label: string;
  type: 'BOOLEAN' | 'SCORE' | 'TEXT'; // BOOLEAN (Sì/No), SCORE (0-100)
  weight: number; // 0 to 100
  isActive: boolean;
  category: 'CERTIFICATION' | 'FINANCIAL' | 'ESG' | 'OPERATIONAL';
}

export interface Supplier {
  id: string;
  name: string;
  rating: number; // 1-5
  email: string;
  paymentTerms: string;
  address?: string;
  phone?: string;
  // Campi estesi per qualifica
  status?: 'QUALIFIED' | 'PENDING' | 'EXPIRED' | 'REJECTED';
  auditDate?: string;
  // Mappa dinamica: ID Criterio -> Valore (es. { 'iso9001': 100, 'esg_score': 75 })
  qualificationValues?: Record<string, any>;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  vatNumber: string; // Partita IVA
  address: string;
  region: string;
  paymentTerms: string;
}

export interface PurchaseOrderItem {
  sku: string;
  description: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrder {
  id: string; // PO Number (es. PO-2023-001)
  date: string;
  supplierId: string;
  supplierName: string; // Denormalized for UI speed
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'SHIPPED' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate?: string;
  trackingCode?: string;
  notes?: string;
}

export interface LogisticsEvent {
  id: string;
  type: 'INBOUND' | 'OUTBOUND';
  referenceId: string; // PO ID or Order ID
  date: string;
  courier?: string;
  tracking?: string;
  status: 'TRANSIT' | 'DELIVERED' | 'EXCEPTION';
  itemsCount: number;
}

export interface BomLine {
  parentSku: string;
  childSku: string;
  qtyRequired: number;
}

export interface AiAnalysisResult {
  summary: string;
  kpis: {
    label: string;
    value: string;
    trend: 'up' | 'down' | 'neutral';
  }[];
  recommendations: string[];
}

export interface ScoutingResult {
  analysisText: string; // Markdown formatted analysis
  sources: {
    title: string;
    uri: string;
  }[];
}

export interface ImportFieldMapping {
  systemField: keyof PurchaseOrder | 'sku' | 'qty' | 'unitPrice' | 'itemDescription'; // Fields we need to map
  fileColumn: string; // The header in the CSV/Excel
}