
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, Timestamp, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PurchaseOrder, Part, NonConformance, Tenant, BillOfMaterials, BomSubstitutionLog, BOMItem, SalesForecast, MrpProposal, AdminProfile, Supplier } from "../types";
import { MOCK_ORDERS as ORIGINAL_MOCK_ORDERS } from "../constants";

const ORDERS_COLLECTION = "purchase_orders";
const PARTS_COLLECTION = "parts";
const NCR_COLLECTION = "non_conformances";
const BOMS_COLLECTION = "boms"; 
const SUPPLIERS_COLLECTION = "suppliers"; // NEW

// --- TENANTS CONFIGURATION WITH MOCK DETAILS ---
const createMockSite = (city: string, active = true) => ({
    isActive: active,
    address: {
        vatNumber: 'IT12345678901',
        street: 'Via Industria 1',
        zipCode: '20100',
        city: city,
        province: 'MI',
        region: 'Lombardia',
        country: 'Italia'
    },
    contacts: {
        phone: '+39 02 1234567',
        emailInfo: `info@${city.toLowerCase()}.com`,
        emailSales: `sales@${city.toLowerCase()}.com`,
        emailTech: `tech@${city.toLowerCase()}.com`,
        emailAdmin: `admin@${city.toLowerCase()}.com`,
        emailReferent: `manager@${city.toLowerCase()}.com`,
        emailWarehouse: `logistics@${city.toLowerCase()}.com`
    }
});

export const AVAILABLE_TENANTS: Tenant[] = [
    { 
        id: 'main', 
        name: 'Main Corp (HQ)', 
        color: 'bg-epicor-600',
        currency: 'EUR (€)',
        details: {
            legal: createMockSite('Milano'),
            operational: createMockSite('Torino'),
            warehouseMain: createMockSite('Piacenza'),
            warehouseSatellite: createMockSite('Bologna', false)
        }
    },
    { 
        id: 'logistics', 
        name: 'Logistics Div (Milan)', 
        color: 'bg-orange-500', 
        currency: 'EUR (€)',
        details: {
            legal: createMockSite('Milano'),
            operational: createMockSite('Milano'),
            warehouseMain: createMockSite('Lainate'),
            warehouseSatellite: createMockSite('Segrate')
        }
    },
    { 
        id: 'germany', 
        name: 'German Branch (Berlin)', 
        color: 'bg-indigo-600', 
        currency: 'EUR (€)', 
        details: {
            legal: { ...createMockSite('Berlin'), address: { ...createMockSite('Berlin').address, country: 'Germany', vatNumber: 'DE987654321' } },
            operational: createMockSite('Hamburg'),
            warehouseMain: createMockSite('Frankfurt'),
            warehouseSatellite: createMockSite('Munich', false)
        }
    }
];

// --- LOCAL STORAGE KEYS ---
const LS_KEYS = {
  ORDERS: 'eb_pro_orders',
  PARTS: 'eb_pro_parts',
  NCRS: 'eb_pro_ncrs',
  BOMS: 'eb_pro_boms',
  SALES: 'eb_pro_sales',
  MRP: 'eb_pro_mrp',
  ADMIN: 'eb_pro_admin_profile',
  SUPPLIERS: 'eb_pro_suppliers' // NEW
};

// --- MOCK SUPPLIERS (Aligned with Parts) ---
const MOCK_SUPPLIERS: Supplier[] = [
    {
        id: 'SUP-001',
        tenantId: 'main',
        name: 'HydroMaster',
        vatNumber: 'IT09876543210',
        address: 'Via Idraulica 22',
        city: 'Modena',
        zipCode: '41100',
        country: 'Italia',
        emailOrder: 'orders@hydromaster.com',
        phone: '+39 059 112233',
        type: 'Produttore',
        market: 'Oleodinamica',
        rating: 5,
        status: 'Active'
    },
    {
        id: 'SUP-002',
        tenantId: 'main',
        name: 'Hydraulic Systems Ltd',
        vatNumber: 'GB123456789',
        address: '10 Industrial Park',
        city: 'Birmingham',
        zipCode: 'B1 1AA',
        country: 'UK',
        emailOrder: 'sales@hydrosys.co.uk',
        phone: '+44 121 555 555',
        type: 'Commerciale',
        market: 'Oleodinamica',
        rating: 4,
        status: 'Active'
    },
    {
        id: 'SUP-003',
        tenantId: 'main',
        name: 'Steel Dynamics',
        vatNumber: 'IT11223344556',
        address: 'Viale del Ferro 5',
        city: 'Brescia',
        zipCode: '25100',
        country: 'Italia',
        emailOrder: 'comm@steeldynamics.it',
        phone: '+39 030 998877',
        type: 'Produttore',
        market: 'Materia Prima',
        rating: 4,
        status: 'Active'
    },
    {
        id: 'SUP-004',
        tenantId: 'germany',
        name: 'ElecTech',
        vatNumber: 'DE556677889',
        address: 'Tech Strasse 10',
        city: 'Stuttgart',
        zipCode: '70173',
        country: 'Germany',
        emailOrder: 'bestellung@electech.de',
        phone: '+49 711 223344',
        type: 'Produttore',
        market: 'Elettronica',
        rating: 5,
        status: 'Active'
    },
    {
        id: 'SUP-005',
        tenantId: 'main',
        name: 'Global Logistics',
        vatNumber: 'IT99887766554',
        address: 'Interporto Bologna',
        city: 'Bologna',
        zipCode: '40100',
        country: 'Italia',
        emailOrder: 'book@global-log.it',
        phone: '+39 051 665544',
        type: 'Vettore',
        market: 'Logistica',
        rating: 3,
        status: 'Active'
    }
];

// --- ENRICHED MOCK DATA WITH TENANT IDs ---
const MOCK_PARTS: Part[] = [
  // ... MOCK DATA REMAIN SAME (omitted for brevity) ...
  { 
    id: '1', tenantId: 'main', sku: 'IDRA-PUMP-GEAR-036D-0001', skuComponents: { category: 'IDRA', family: 'PUMP', product: 'GEAR', variant: '036D', progressive: '0001' }, internalCode: 'INT-001', description: 'Pompa Idraulica Alta Pressione', uom: 'PZ', category: 'Idraulica',
    stock: 12, safetyStock: 5, leadTime: 45, cost: 1200, averageDailyConsumption: 0.5,
    manufacturer: { name: 'HydroMaster', partCode: 'HM-99', price: 1100, moq: 10, leadTime: 60 },
    suppliers: { habitual: { name: 'Hydraulic Systems Ltd', partCode: 'HSL-PUMP', price: 1200, moq: 1, leadTime: 45 }, alternatives: [] },
    bomUsage: [
        { parentId: 'PRD-EXC-01', parentName: 'Escavatore Cingolato EX-200', tenantId: 'main', type: 'Finished Product', quantityUsed: 1 },
        { parentId: 'GRP-HYD-SYS', parentName: 'Gruppo Impianto Idraulico', tenantId: 'main', type: 'Assembly Group', quantityUsed: 1 }
    ],
    substitutionHistory: [
        {
            id: 'hist-001',
            date: '2025-09-10',
            bomId: 'BOM-001',
            bomName: 'Escavatore EX-200',
            bomRevision: 'A.0',
            level: 2,
            wbs: '1.3.1',
            type: 'REPLACEMENT_FOR',
            relatedPartSku: 'OLD-PUMP-001',
            quantity: 1
        }
    ]
  },
  { 
    id: '1-old', tenantId: 'main', sku: 'OLD-PUMP-001', description: 'Pompa Idraulica (Obsoleta)', uom: 'PZ', category: 'Idraulica',
    stock: 0, safetyStock: 0, leadTime: 0, cost: 0, averageDailyConsumption: 0,
    substitutionHistory: [
        {
            id: 'hist-001',
            date: '2025-09-10',
            bomId: 'BOM-001',
            bomName: 'Escavatore EX-200',
            bomRevision: 'A.0',
            level: 2,
            wbs: '1.3.1',
            type: 'REPLACED_BY',
            relatedPartSku: 'IDRA-PUMP-GEAR-036D-0001',
            quantity: 1
        }
    ]
  },
  { 
    id: '1-log', tenantId: 'logistics', sku: 'IDRA-PUMP-GEAR-036D-0001', skuComponents: { category: 'IDRA', family: 'PUMP', product: 'GEAR', variant: '036D', progressive: '0001' }, internalCode: 'LOG-P-99', description: 'Pompa Idraulica Alta Pressione', uom: 'PZ', category: 'Idraulica',
    stock: 2, safetyStock: 2, leadTime: 45, cost: 1250, averageDailyConsumption: 0.1,
    manufacturer: { name: 'HydroMaster', partCode: 'HM-99', price: 1100, moq: 10, leadTime: 60 },
    suppliers: { habitual: { name: 'Local Distrib', partCode: 'LD-PUMP', price: 1250, moq: 1, leadTime: 2 }, alternatives: [] }
  },
  { 
    id: '2', tenantId: 'logistics', sku: 'ELET-CTRL-BRD-V002-0001', skuComponents: { category: 'ELET', family: 'CTRL', product: 'BRD', variant: 'V002', progressive: '0001' }, description: 'Centralina Controllo V2', uom: 'PZ', category: 'Elettronica',
    stock: 4, safetyStock: 8, leadTime: 20, cost: 450, averageDailyConsumption: 0.2,
    manufacturer: { name: 'ElecTech', partCode: 'ET-X1', price: 420, moq: 10, leadTime: 25 },
    suppliers: { habitual: { name: 'ElecTech', partCode: 'ET-X1', price: 450, moq: 5, leadTime: 20 }, alternatives: [] },
    bomUsage: [
         { parentId: 'PRD-EXC-01', parentName: 'Escavatore Cingolato EX-200', tenantId: 'main', type: 'Finished Product', quantityUsed: 2 },
         { parentId: 'PRD-LOADER-05', parentName: 'Pala Gommata L-50', tenantId: 'logistics', type: 'Finished Product', quantityUsed: 1 },
         { parentId: 'GRP-CABIN', parentName: 'Cabina Comandi Elettrici', tenantId: 'germany', type: 'Assembly Group', quantityUsed: 1 }
    ]
  },
  { 
    id: '3', tenantId: 'main', sku: 'MECC-PLT-STEL-5MM-0001', skuComponents: { category: 'MECC', family: 'PLT', product: 'STEL', variant: '5MM', progressive: '0001' }, internalCode: 'LAM-5MM', description: 'Piastra Acciaio 5mm', uom: 'MQ', category: 'Carpenteria',
    stock: 150, safetyStock: 50, leadTime: 10, cost: 45, averageDailyConsumption: 1.5,
    manufacturer: { name: 'Steel Mill Co', partCode: 'RAW-ST-5', price: 40, moq: 100, leadTime: 15 },
    suppliers: { habitual: { name: 'Steel Dynamics', partCode: 'SD-5MM', price: 45, moq: 20, leadTime: 10 }, alternatives: [] },
    bomUsage: [
        { parentId: 'GRP-FRAME', parentName: 'Telaio Inferiore', tenantId: 'main', type: 'Sub-Assembly', quantityUsed: 12.5 },
        { parentId: 'GRP-BUCKET', parentName: 'Benna Standard 1mq', tenantId: 'main', type: 'Sub-Assembly', quantityUsed: 4.2 }
    ]
  },
  { 
    id: '4', tenantId: 'germany', sku: 'GUARN-KIT-SER-A-0001', skuComponents: { category: 'GUARN', family: 'KIT', product: 'SER', variant: 'A', progressive: '0001' }, description: 'Kit Guarnizioni Serie A', uom: 'KIT', category: 'Consumabili',
    stock: 200, safetyStock: 100, leadTime: 5, cost: 12.50, averageDailyConsumption: 5.0,
    manufacturer: { name: 'Seal Master', partCode: 'SM-GK-A', price: 10.00, moq: 100, leadTime: 10 },
    suppliers: { habitual: { name: 'Compactor Parts', partCode: 'CP-GK-A', price: 12.50, moq: 50, leadTime: 5 }, alternatives: [] }
  },
  { 
    id: '5', tenantId: 'main', sku: 'TRK-VOL-FE320', description: 'Telaio Volvo FE 320', uom: 'PZ', category: 'Automotive',
    stock: 0, safetyStock: 1, leadTime: 90, cost: 85000, averageDailyConsumption: 0.05,
    manufacturer: { name: 'Volvo Trucks', partCode: 'FE-320', price: 85000, moq: 1, leadTime: 90 },
    suppliers: { habitual: { name: 'Volvo Italia', partCode: 'V-FE320', price: 85000, moq: 1, leadTime: 90 }, alternatives: [] }
  }
];

const MOCK_NCRS: NonConformance[] = [
    { id: '1', tenantId: 'main', partId: '1', qtyFailed: 1, reason: 'Perdita olio guarnizione testa', status: 'Open', date: '2024-05-20' },
    { id: '2', tenantId: 'germany', partId: '4', qtyFailed: 5, reason: 'Gomma cristallizzata', status: 'Resolved', date: '2024-05-15' }
];

const MOCK_ORDERS_ENRICHED: PurchaseOrder[] = ORIGINAL_MOCK_ORDERS.map((o, index) => ({
    ...o,
    tenantId: index % 3 === 0 ? 'main' : index % 3 === 1 ? 'logistics' : 'germany',
    customId: o.id,
    deliveryDate: o.date // Default delivery same as date for mocks
}));

const MOCK_BOMS: BillOfMaterials[] = [
  {
    id: 'BOM-CMP-22T',
    tenantId: 'main',
    name: 'Compattatore Rifiuti 22T',
    description: 'Distinta Base Complessa: Compattatore Carico Posteriore',
    revision: 'C.2',
    status: 'Active',
    createdAt: '2025-11-01',
    items: [
      { id: 'root', level: 0, wbs: '1', nodeType: 'Product', description: 'Compattatore 22T Standard', quantity: 1, uom: 'PZ' },
      // ... BOM STRUCTURE ...
      { id: '1', level: 1, wbs: '1.1', nodeType: 'Assembly', description: 'Gruppo Autotelaio 6x2', quantity: 1, uom: 'PZ' },
      { id: '1-1', level: 2, wbs: '1.1.1', nodeType: 'Component', description: 'Telaio Volvo FE 320', quantity: 1, uom: 'PZ', partNumber: 'TRK-VOL-FE320' },
      { id: '4', level: 2, wbs: '1.3.2', nodeType: 'Sub-Assembly', description: 'Impianto Idraulico Movimentazione', quantity: 1, uom: 'PZ' },
      { id: '4-1', level: 3, wbs: '1.3.2.1', nodeType: 'Variant', description: 'Cilindro Pala (Standard)', quantity: 2, uom: 'PZ', partNumber: 'IDRA-PUMP-GEAR-036D-0001' },
      { id: '5', level: 1, wbs: '1.4', nodeType: 'Assembly', description: 'Impianto Elettrico & Controllo', quantity: 1, uom: 'PZ' },
      { id: '5-1', level: 2, wbs: '1.4.1', nodeType: 'Component', description: 'Centralina PLC CanBus', quantity: 1, uom: 'PZ', partNumber: 'ELET-CTRL-BRD-V002-0001' }
    ]
  }
];

const MOCK_SALES_PLAN: SalesForecast[] = [
    { id: 'SF-001', tenantId: 'main', period: '2026-02', bomId: 'BOM-CMP-22T', bomName: 'Compattatore Rifiuti 22T', quantity: 5, status: 'Confirmed' },
    { id: 'SF-002', tenantId: 'main', period: '2026-03', bomId: 'BOM-CMP-22T', bomName: 'Compattatore Rifiuti 22T', quantity: 8, status: 'Draft' }
];

const MOCK_MRP_PROPOSALS: MrpProposal[] = [];


// --- HELPER: Local Persistence Manager ---
const getLocalData = <T>(key: string, defaultData: T[]): T[] => {
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultData));
    return defaultData;
  }
  return JSON.parse(stored);
};

const saveLocalData = <T>(key: string, newData: T) => {
  const current = getLocalData<T>(key, []);
  const updated = [newData, ...current]; 
  localStorage.setItem(key, JSON.stringify(updated));
};

const updateLocalData = <T extends { id: string }>(key: string, updatedItem: T) => {
    const current = getLocalData<T>(key, []);
    const index = current.findIndex(i => i.id === updatedItem.id);
    if (index !== -1) {
        current[index] = updatedItem;
        localStorage.setItem(key, JSON.stringify(current));
    }
};

const setFullLocalData = <T>(key: string, data: T[]) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// --- ADMIN PROFILE PERSISTENCE ---
const DEFAULT_ADMIN_PROFILE: AdminProfile = {
    companyName: 'Easy Buy S.r.l.',
    vatNumber: '',
    address: '',
    city: '',
    phone: '',
    email: ''
};

export const fetchAdminProfile = async (): Promise<AdminProfile> => {
    const stored = localStorage.getItem(LS_KEYS.ADMIN);
    return stored ? JSON.parse(stored) : DEFAULT_ADMIN_PROFILE;
};

export const saveAdminProfile = async (profile: AdminProfile) => {
    localStorage.setItem(LS_KEYS.ADMIN, JSON.stringify(profile));
};

// --- DATA FETCHING ---
const filterDataByTenant = <T extends { tenantId: string }>(data: T[], tenantId: string): T[] => {
    if (tenantId === 'all') return data;
    return data.filter(item => item.tenantId === tenantId);
};

// --- ORDERS ---
const mapDocToOrder = (doc: any): PurchaseOrder => {
  const data = doc.data();
  return {
    id: data.customId || doc.id,
    tenantId: data.tenantId || 'main',
    vendor: data.vendor,
    description: data.description || 'Ordine Standard',
    date: data.date,
    deliveryDate: data.deliveryDate, 
    amount: Number(data.amount),
    status: data.status,
    items: Number(data.items),
    partId: data.partId, 
    logistics: data.logistics 
  };
};

export const fetchOrders = async (tenantId: string = 'main'): Promise<PurchaseOrder[]> => {
  let remoteOrders: PurchaseOrder[] = [];
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    remoteOrders = querySnapshot.docs.map(mapDocToOrder);
  } catch (error) {
    // console.warn("Firestore fetch failed or restricted, using local data.");
  }

  const localOrders = getLocalData(LS_KEYS.ORDERS, MOCK_ORDERS_ENRICHED);
  
  const combinedOrders = [...remoteOrders];
  localOrders.forEach(localOrder => {
      if (!combinedOrders.some(remote => remote.id === localOrder.id)) {
          combinedOrders.push(localOrder);
      }
  });

  combinedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return filterDataByTenant(combinedOrders, tenantId);
};

export const addOrder = async (order: Omit<PurchaseOrder, 'id'> & { customId?: string }): Promise<void> => {
  const generatedId = order.customId || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
  const baseOrderData = {
    ...order,
    customId: generatedId
  };

  try {
    const firestoreOrder = {
        ...baseOrderData,
        createdAt: Timestamp.now()
    };
    await addDoc(collection(db, ORDERS_COLLECTION), firestoreOrder);
  } catch (e) {
    const localOrder: PurchaseOrder = {
        id: generatedId,
        tenantId: order.tenantId,
        vendor: order.vendor,
        description: order.description,
        date: order.date,
        amount: order.amount,
        status: order.status,
        items: order.items,
        deliveryDate: order.deliveryDate,
        partId: order.partId,
        logistics: order.logistics
    };
    saveLocalData(LS_KEYS.ORDERS, localOrder);
  }
};

export const updateOrder = async (order: PurchaseOrder): Promise<void> => {
    try {
        updateLocalData(LS_KEYS.ORDERS, order);
    } catch (e) {
        updateLocalData(LS_KEYS.ORDERS, order);
    }
};

// --- SUPPLIERS ---
export const fetchSuppliers = async (tenantId: string = 'main'): Promise<Supplier[]> => {
    const local = getLocalData(LS_KEYS.SUPPLIERS, MOCK_SUPPLIERS);
    return filterDataByTenant(local, tenantId);
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: `SUP-${Date.now()}` };
    saveLocalData(LS_KEYS.SUPPLIERS, newSupplier);
};

export const updateSupplier = async (supplier: Supplier) => {
    updateLocalData(LS_KEYS.SUPPLIERS, supplier);
};

// --- INVENTORY ---
const mapDocToPart = (doc: any): Part => {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: data.tenantId || 'main',
    sku: data.sku,
    internalCode: data.internalCode,
    description: data.description,
    uom: data.uom || 'PZ',
    stock: Number(data.stock),
    safetyStock: Number(data.safetyStock),
    leadTime: Number(data.leadTime),
    cost: Number(data.cost),
    averageDailyConsumption: Number(data.averageDailyConsumption || 0),
    category: data.category,
    manufacturer: data.manufacturer,
    suppliers: data.suppliers,
    otherTenants: data.otherTenants,
    bomUsage: data.bomUsage,
    skuComponents: data.skuComponents,
    substitutionHistory: data.substitutionHistory
  };
};

export const fetchParts = async (tenantId: string = 'main'): Promise<Part[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, PARTS_COLLECTION));
    const parts = querySnapshot.docs.map(mapDocToPart);
    if (parts.length > 0) return filterDataByTenant(parts, tenantId);
    throw new Error("No remote data");
  } catch (e) { 
    const local = getLocalData(LS_KEYS.PARTS, MOCK_PARTS); 
    return filterDataByTenant(local, tenantId);
  }
};

// ... Rest of the file unchanged ... (omitted for brevity)
export const fetchPartSiblings = async (sku: string, currentTenantId: string): Promise<Part[]> => {
    const allLocalParts = getLocalData(LS_KEYS.PARTS, MOCK_PARTS);
    return allLocalParts.filter(p => p.sku === sku && p.tenantId !== currentTenantId);
};

export const findPartByManufacturerCode = async (code: string): Promise<Part | undefined> => {
    const local = getLocalData(LS_KEYS.PARTS, MOCK_PARTS);
    const target = code.trim().toUpperCase();
    return local.find(p => p.manufacturer?.partCode?.toUpperCase() === target);
};

export const addPart = async (part: Omit<Part, 'id'>) => {
  try {
    await addDoc(collection(db, PARTS_COLLECTION), part);
  } catch (e) { 
    const localPart: Part = { ...part, id: `LOC-${Date.now()}` };
    saveLocalData(LS_KEYS.PARTS, localPart);
  }
};

export const updatePart = async (part: Part) => {
    try {
        const partRef = doc(db, PARTS_COLLECTION, part.id);
        const { id, ...data } = part;
        await updateDoc(partRef, data as any);
    } catch (e) {
        updateLocalData(LS_KEYS.PARTS, part);
    }
};

export const fetchNCRs = async (tenantId: string = 'main'): Promise<NonConformance[]> => {
  try {
    const q = query(collection(db, NCR_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const ncrs = querySnapshot.docs.map(mapDocToNCR);
    if (ncrs.length > 0) return filterDataByTenant(ncrs, tenantId);
    throw new Error("No remote data");
  } catch (e) { 
    const local = getLocalData(LS_KEYS.NCRS, MOCK_NCRS);
    return filterDataByTenant(local, tenantId);
  }
};

const mapDocToNCR = (doc: any): NonConformance => {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: data.tenantId || 'main',
    partId: data.partId,
    qtyFailed: Number(data.qtyFailed),
    reason: data.reason,
    status: data.status,
    date: data.date
  };
};

export const addNCR = async (ncr: Omit<NonConformance, 'id'>) => {
  try {
    await addDoc(collection(db, NCR_COLLECTION), { ...ncr, createdAt: Timestamp.now() });
  } catch (e) { 
    const localNCR: NonConformance = { ...ncr, id: `NCR-${Date.now()}` };
    saveLocalData(LS_KEYS.NCRS, localNCR);
  }
};

const mapDocToBOM = (doc: any): BillOfMaterials => {
  const data = doc.data();
  return {
    id: doc.id,
    tenantId: data.tenantId || 'main',
    name: data.name,
    description: data.description,
    revision: data.revision,
    status: data.status,
    items: data.items || [],
    createdAt: data.createdAt
  };
};

export const fetchBOMs = async (tenantId: string = 'main'): Promise<BillOfMaterials[]> => {
    try {
        const querySnapshot = await getDocs(collection(db, BOMS_COLLECTION));
        const boms = querySnapshot.docs.map(mapDocToBOM);
        if (boms.length > 0) return filterDataByTenant(boms, tenantId);
        throw new Error("No remote data");
    } catch (e) {
        const local = getLocalData(LS_KEYS.BOMS, MOCK_BOMS);
        return filterDataByTenant(local, tenantId);
    }
};

export const addBOM = async (bom: Omit<BillOfMaterials, 'id'>) => {
    try {
        await addDoc(collection(db, BOMS_COLLECTION), bom);
    } catch (e) {
        const localBOM: BillOfMaterials = { ...bom, id: `BOM-${Date.now()}` };
        saveLocalData(LS_KEYS.BOMS, localBOM);
    }
};

export const updateBomNode = async (
    bomId: string, 
    currentWbs: string, 
    updates: Partial<BOMItem>
) => {
    const allBoms = getLocalData<BillOfMaterials>(LS_KEYS.BOMS, MOCK_BOMS);
    const allParts = getLocalData<Part>(LS_KEYS.PARTS, MOCK_PARTS);

    const bomIndex = allBoms.findIndex(b => b.id === bomId);
    if (bomIndex === -1) return;
    const bom = allBoms[bomIndex];

    const itemIndex = bom.items.findIndex(i => i.wbs === currentWbs);
    if (itemIndex === -1) return;
    const item = bom.items[itemIndex];

    if (updates.wbs && updates.wbs !== currentWbs) {
        item.wbs = updates.wbs;
        item.level = (updates.wbs.match(/\./g) || []).length;
    }
    if (updates.nodeType) item.nodeType = updates.nodeType;
    if (updates.quantity !== undefined) item.quantity = updates.quantity;
    if (updates.uom !== undefined) item.uom = updates.uom;
    if (updates.description !== undefined) item.description = updates.description; 

    if (updates.partNumber !== undefined && updates.partNumber !== item.partNumber) {
        const oldSku = item.partNumber;
        const newSku = updates.partNumber;
        item.partNumber = newSku;
        
        const newPartRef = allParts.find(p => p.sku === newSku);
        if(newPartRef && updates.description === undefined) {
            item.description = newPartRef.description; 
        }
    }
    
    updateLocalData(LS_KEYS.BOMS, bom);
};

export const fetchSalesForecasts = async (tenantId: string): Promise<SalesForecast[]> => {
    const local = getLocalData(LS_KEYS.SALES, MOCK_SALES_PLAN);
    return filterDataByTenant(local, tenantId);
};

export const saveSalesForecasts = async (forecasts: SalesForecast[]) => {
    const all = getLocalData(LS_KEYS.SALES, MOCK_SALES_PLAN);
    const otherTenants = all.filter(f => f.tenantId !== forecasts[0]?.tenantId);
    setFullLocalData(LS_KEYS.SALES, [...otherTenants, ...forecasts]);
};

export const fetchMrpProposals = async (tenantId: string): Promise<MrpProposal[]> => {
    const local = getLocalData(LS_KEYS.MRP, MOCK_MRP_PROPOSALS);
    return filterDataByTenant(local, tenantId);
};

export const saveMrpProposals = async (proposals: MrpProposal[], tenantScope: string = 'all') => {
    const all = getLocalData<MrpProposal>(LS_KEYS.MRP, MOCK_MRP_PROPOSALS);
    const keptProposals = all.filter(p => {
        if (p.status !== 'Pending') return true; 
        if (tenantScope === 'all') return false; 
        return p.tenantId !== tenantScope;
    });
    setFullLocalData(LS_KEYS.MRP, [...keptProposals, ...proposals]);
};

export const deleteMrpProposal = async (id: string) => {
    const all = getLocalData<MrpProposal>(LS_KEYS.MRP, []);
    const filtered = all.filter(p => p.id !== id);
    setFullLocalData(LS_KEYS.MRP, filtered);
};

export const seedInitialData = async () => {
  await fetchOrders('all');
  await fetchParts('all');
  await fetchNCRs('all');
  await fetchBOMs('all');
  await fetchSalesForecasts('all');
};
