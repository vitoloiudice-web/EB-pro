
export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SUPPLIERS = 'SUPPLIERS', // NEW
  BOM = 'BOM',
  INVENTORY = 'INVENTORY',
  SALES_PLAN = 'SALES_PLAN',
  MRP = 'MRP',
  PURCHASING = 'PURCHASING',
  QUALITY = 'QUALITY',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS'
}

// --- COMPANY DATA STRUCTURES ---

export interface AddressInfo {
  vatNumber?: string;
  street: string;
  zipCode: string;
  city: string;
  province: string;
  region?: string;
  country: string;
}

export interface ContactInfo {
  phone: string;
  emailInfo: string;
  emailSales?: string;     // Legal
  emailTech?: string;
  emailAdmin?: string;
  emailReferent?: string;  // Operational/Warehouse
  emailWarehouse?: string; // Operational/Warehouse (Sales/Warehouse)
}

export interface SiteDetails {
  isActive: boolean; // UI Toggle
  address: AddressInfo;
  contacts: ContactInfo;
}

export interface TenantDetails {
  legal: SiteDetails;
  operational: SiteDetails;
  warehouseMain: SiteDetails;
  warehouseSatellite: SiteDetails;
}

export interface Tenant {
  id: string;
  name: string;
  color: string;
  currency: string; // Added currency
  details?: TenantDetails; // Added detailed configuration
}

// NEW: Admin Profile for Email Sending
export interface AdminProfile {
  companyName: string;
  vatNumber: string;
  address: string;
  city: string;
  phone: string;
  email: string;
}

// --- SUPPLIERS MANAGEMENT ---

export type SupplierType = 'Produttore' | 'Commerciale' | 'Vettore';

export type SupplierMarket = 
  | 'Energia / Commodity'
  | 'Materia Prima'
  | 'Carpenteria'
  | 'Torneria'
  | 'Oleodinamica'
  | 'Elettrica'
  | 'Elettronica'
  | 'Pneumatica'
  | 'Plastica'
  | 'Bulloneria'
  | 'Utensileria'
  | 'DPI'
  | 'Automotive'
  | 'Multimarket'
  | 'Ferramenta'
  | 'Logistica'
  | 'Manodopera'
  | 'Generico';

export interface Supplier {
  id: string;
  tenantId: string;
  name: string;
  vatNumber: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  emailOrder: string; // Crucial for sending POs
  emailAdmin?: string;
  phone: string;
  website?: string;
  type: SupplierType;
  market: SupplierMarket;
  paymentTerms?: string;
  rating?: number; // 1-5 stars
  notes?: string;
  status: 'Active' | 'Hold' | 'Blacklisted';
}

// --- EXISTING TYPES ---

export interface KpiTile {
  id: string;
  title: string;
  value: string | number;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
}

export interface PurchaseOrder {
  id: string;
  customId?: string;
  tenantId: string;
  vendor: string;
  description?: string;
  date: string; // Order Creation Date
  deliveryDate?: string; // NEW: Requested Delivery Date
  amount: number;
  status: 'Draft' | 'Approved' | 'Sent' | 'Closed' | 'Pending Approval' | 'Open';
  items: number;
  partId?: string; // NEW: Link to Part Registry for price updates
  logistics?: { // NEW: Logistics details
      destination?: string;
      incoterms?: string;
      carrier?: string;
      notes?: string;
  };
}

export interface SupplierInfo {
  name: string;
  partCode: string;
  price: number;
  moq: number;
  leadTime: number;
}

// NEW: Sales Plan Forecast
export interface SalesForecast {
  id: string;
  tenantId: string;
  period: string; // "2026-01"
  bomId: string; // Link to Product BOM
  bomName: string; 
  quantity: number;
  status: 'Draft' | 'Confirmed';
}

// NEW: MRP Proposal (Output of MRP Engine)
export interface MrpProposal {
  id: string;
  tenantId: string;
  partId: string;
  partSku: string;
  description: string;
  requiredQty: number; // Gross Requirement
  currentStock: number;
  missingQty: number; // Net Requirement
  suggestedVendor: string;
  estimatedCost: number;
  reason: string; // "Fabbisogno da Piano Vendite Gennaio"
  status: 'Pending' | 'Ordered' | 'Ignored';
  createdAt: string;
  needDate?: string; // NEW: When the stock will be depleted
  orderByDate?: string; // NEW: When to place order (Need - LeadTime)
}

// NEW: Bill of Materials Usage (Where is this part used?)
export interface BomUsage {
  parentId: string;
  parentName: string; // e.g. "Escavatore Mod. X"
  tenantId?: string; // NEW: Which tenant owns the parent product
  type: 'Finished Product' | 'Assembly Group' | 'Sub-Assembly';
  quantityUsed: number;
}

// NEW: Structure to track BOM Substitutions in Inventory
export interface BomSubstitutionLog {
  id: string;
  date: string;
  bomId: string;
  bomName: string;
  bomRevision: string;
  wbs: string;      // "1.1.2"
  level: number;
  type: 'REPLACEMENT_FOR' | 'REPLACED_BY'; // Did this part replace someone, or was it replaced?
  relatedPartSku: string; // The SKU of the other part involved
  quantity: number;
}

// NEW: Complex BOM Types
export type BomNodeType = 'Product' | 'Assembly' | 'Sub-Assembly' | 'Component' | 'Option' | 'Variant' | 'Phantom';

export interface BOMItem {
  id: string; // Unique ID of the node
  level: number; // 0, 1, 2...
  wbs: string; // "1", "1.1", "1.a.1" - Hierarchical string
  nodeType: BomNodeType; // NEW: Classification for MRP
  partNumber?: string; // Optional link to Part SKU
  description: string;
  quantity: number;
  uom: string;
  children?: BOMItem[]; // Recursive structure for UI
}

export interface BillOfMaterials {
  id: string;
  tenantId: string;
  name: string; // "Nome Breve"
  description: string;
  revision: string;
  status: 'Draft' | 'Active' | 'Obsolete';
  items: BOMItem[]; // Flat list or tree root
  createdAt: string;
}

export interface Part {
  id: string;
  tenantId: string;
  sku: string;
  internalCode?: string; // NEW: Free text for tenant-specific BOM/Legacy code
  skuComponents?: {
    category: string;
    family: string;
    product: string;
    variant: string;
    progressive: string;
  };
  description: string;
  uom: string;
  category: string;
  manufacturer?: SupplierInfo;
  suppliers?: {
    habitual: SupplierInfo;
    alternatives: SupplierInfo[];
  };
  stock: number; 
  safetyStock: number;
  otherTenants?: {
    name: string;
    stock: number;
    safetyStock: number;
  }[];
  leadTime: number; 
  cost: number;
  averageDailyConsumption?: number; // NEW: For MRP projection (forecast/rotation)
  // NEW: Where this part is used
  bomUsage?: BomUsage[];
  // NEW: History of BOM changes involving this part
  substitutionHistory?: BomSubstitutionLog[];
}

export interface NonConformance {
  id: string;
  tenantId: string;
  partId: string;
  qtyFailed: number;
  reason: string;
  status: 'Open' | 'Resolved' | 'RMA Sent';
  date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface SeasonalEvent {
  name: string;
  startMonth: number;
  endMonth: number;
  riskLevel: 'High' | 'Medium' | 'Low';
}
