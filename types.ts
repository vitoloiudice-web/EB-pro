
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

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

export interface Client {
  id: string;
  name: string;
  email?: string;
  logoUrl?: string;
  created_at?: string;
  spreadsheetId?: string;
}

export interface AdminProfile {
  printIsoCitation?: boolean; // Se stampare la citazione UNI-ISO nei PDF
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
  logoUrl?: string;
  codingSchema?: CodingSchema;
}

// --- ENTERPRISE ITEM STRUCTURE ---

export interface ItemSupplierRelation {
  supplierId: string;
  supplierName: string;
  supplierSku: string; // Codice articolo del fornitore
  currency: string;
  price: number;
  minOrderQty: number; // Lotto minimo (MOQ)
  leadTimeDays: number;
  isPreferred: boolean;
  paymentTerms?: string;
}

export interface ItemManufacturerInfo {
  name: string; // Produttore reale
  mpn: string; // Manufacturer Part Number
  countryOfOrigin?: string;
}

export type ItemCategory = 'DIRETTO' | 'INDIRETTO';
export type ItemGroup = 'CABINA' | 'TELAIO' | 'CONTROTELAIO' | 'VASCA/CASSA' | 'PALA-CARRELLO' | 'COMPATTAZIONE' | 'PARATIA' | 'ALZA-VOLTA-CONTENITORE' | 'CUFFIA/PORTELLONE';

export interface CodingMapping {
  name: string;
  code: string;
}

export interface CodingSchemaBranch {
  groups: CodingMapping[];
  macroFamilies: CodingMapping[];
  families: CodingMapping[];
  variants: CodingMapping[];
  revisions: CodingMapping[];
}

export interface CodingSchema {
  categories: CodingMapping[];
  diretto: CodingSchemaBranch;
  indiretto: CodingSchemaBranch;
}

export interface Item {
  // Identificativi
  id: string; // Internal UUID
  sku: string; // Codice Interno
  name: string;
  description: string;
  
  // --- TASSONOMIA ORGANIZZATIVA (eSOLVER) ---
  skuPrefix?: 'MP' | 'SL' | 'PF' | 'MO' | 'CE'; // Materie Prime, Semilavorati, Prodotti Finiti, Materiali di Consumo, Cespiti
  
  // Classificazione (Gerarchia: Categoria > Gruppo > Macrofamiglia > Famiglia)
  category: ItemCategory | string;
  group: ItemGroup | string;
  macroFamily: string;
  family: string; 
  
  // --- TASSONOMIA TECNICA (eSOLVER) ---
  technicalClass?: string;
  technicalSubclass?: string;

  // Dati Tecnici
  revision: string; // Indice revisione (0, 1, 2...)
  variant: string; // Variante (A, B, C...)
  progressive: string; // Numero progressivo (001, 002...)
  unit: string;
  weightKg: number;
  technicalSpecs?: Record<string, string>; // KV Pairs (es. "Materiale": "Acciaio")

  // --- DOCUMENTAL LINKING ---
  attachments?: {
    cadUrl?: string;
    specsUrl?: string;
    manualUrl?: string;
  };

  // --- LOGICHE DI LOTTO ---
  lotPolicy?: 'LFL' | 'MLS'; // Lotto per Lotto, Lotto Minimo
  minLotSize?: number;

  // --- ESTENSIONI eSOLVER ---
  isPhantom: boolean; // Componente Fantasma (Phantom)
  isSubcontracting: boolean; // Materiale in Conto Lavoro (Terzi/Clienti)
  multiUM?: {
    purchase: string; // UM Acquisto (es. kg)
    storage: string; // UM Stoccaggio (es. pz)
    consumption: string; // UM Consumo (es. m)
    conversionFactor: number; // Fattore di conversione
  };
  leadTimeOffset: number; // Lead Time Offsetting (giorni)
  // ---------------------------

  // Codice Cliente
  customerCode?: string; // Legacy/Default Codice interno usato dal cliente
  customerCodes?: { customerId: string; customerName: string; code: string }[]; // Multi-cliente

  // Produttore (Chi lo fa)
  manufacturer?: ItemManufacturerInfo;

  // Approvvigionamento (Chi lo vende - Multiplo)
  suppliers?: ItemSupplierRelation[];
  
  // Campi calcolati/flat per compatibilità UI rapida
  cost: number; // Costo del fornitore preferenziale
  stock: number;
  safetyStock: number;
  supplierId: string; // ID Fornitore preferenziale
  leadTimeDays: number; // Lead time preferenziale
}

export interface QualificationCriterion {
  id: string;
  label: string;
  type: 'BOOLEAN' | 'SCORE' | 'TEXT'; // BOOLEAN (Sì/No), SCORE (0-100)
  weight: number; // 0 to 100
  isActive: boolean;
  category: 'CERTIFICATION' | 'FINANCIAL' | 'ESG' | 'OPERATIONAL';
}

export interface Address {
  street: string;
  number: string;
  zip: string;
  city: string;
  province: string;
}

export interface ContactInfo {
  email: string;
  phone: string;
}

export interface SupportOffice extends ContactInfo, Address {}
export interface Warehouse extends ContactInfo, Address {}

export interface Supplier {
  id: string;
  name: string;
  nickname?: string;
  rating: number; // 1-5
  email: string;
  paymentTerms: string;
  phone?: string;
  
  // Sede Legale
  legalAddress?: Address & { phone: string };
  
  // Sede Operativa
  operationalAddress?: {
    plantName: string;
    contact: ContactInfo;
    address: Address;
    technicalOffice: ContactInfo;
    commercialOffice: ContactInfo;
    supportOffice: SupportOffice;
    logisticsOffice: ContactInfo;
    warehouse: Warehouse;
  };

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
  // Service Contract Fields
  monthlyFee?: number;
  contractStartDate?: string;
  contractEndDate?: string;
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
  customerId?: string; // Drop-shipping Destination
  customerName?: string; // Drop-shipping Destination
  status: 'DRAFT' | 'SENT' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  totalAmount: number;
  expectedDeliveryDate?: string;
  trackingCode?: string;
  notes?: string;
}

export interface LogisticsEvent {
  id: string;
  type: 'DROP_SHIPPING' | 'RETURN';
  referenceId: string; // PO ID or Order ID
  date: string;
  courier?: string;
  tracking?: string;
  status: 'PREPARATION' | 'TRANSIT' | 'DELIVERED' | 'ISSUE';
  itemsCount: number;
  supplierId?: string; // Origin
  customerId?: string; // Destination
}

export interface MRPResult {
  item: Item;
  isShortage: boolean;
  qtyToOrder: number;
  estimatedCost: number;
  status: 'GREEN' | 'YELLOW' | 'RED'; // Sistema Semaforico
  plannedOrderDate?: string; // Lead Time Offsetting
  requirementDate?: string;
  isPhantom: boolean;
  isSubcontracting: boolean;
}

export interface BomLine {
  parentSku: string;
  childSku: string;
  qtyRequired: number;
  formula?: string; // Formule parametriche (lunghezza, larghezza)
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
