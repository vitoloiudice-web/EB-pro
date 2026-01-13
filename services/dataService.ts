
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, Timestamp, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PurchaseOrder, Part, NonConformance, Tenant, BillOfMaterials, BomSubstitutionLog, BOMItem, SalesForecast, MrpProposal, AdminProfile, Supplier } from "../types";
import { MOCK_ORDERS as ORIGINAL_MOCK_ORDERS } from "../constants";
import { idbService, STORE_NAMES } from "./idbService";

const COLLECTIONS = {
    ORDERS: "purchase_orders",
    PARTS: "parts",
    NCRS: "non_conformances",
    BOMS: "boms",
    SUPPLIERS: "suppliers"
};

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

// --- HELPER: Database Seeder ---
const seedIfNeeded = async () => {
    try {
        const existingOrders = await idbService.getAll<PurchaseOrder>(STORE_NAMES.ORDERS);
        if (existingOrders.length === 0) {
            console.log("🌱 Seeding IndexedDB with Mock Data...");
            await Promise.all([
                idbService.bulkPut(STORE_NAMES.ORDERS, MOCK_ORDERS_ENRICHED),
                idbService.bulkPut(STORE_NAMES.PARTS, MOCK_PARTS),
                idbService.bulkPut(STORE_NAMES.NCRS, MOCK_NCRS),
                idbService.bulkPut(STORE_NAMES.BOMS, MOCK_BOMS),
                idbService.bulkPut(STORE_NAMES.SALES, MOCK_SALES_PLAN),
                idbService.bulkPut(STORE_NAMES.SUPPLIERS, MOCK_SUPPLIERS)
            ]);
            console.log("✅ Seeding Complete.");
        }
    } catch (e) {
        console.error("Seeding failed:", e);
    }
};

// --- DATA FETCHING (Hybrid Strategy) ---
const filterDataByTenant = <T extends { tenantId: string }>(data: T[], tenantId: string): T[] => {
    if (tenantId === 'all') return data;
    return data.filter(item => item.tenantId === tenantId);
};

// --- SYNC FUNCTION (Placeholder for future) ---
export const syncPendingOperations = async () => {
    // This would push local changes to Firestore when online
    console.log("🔄 Sync check...");
};

// --- ADMIN PROFILE ---
const DEFAULT_ADMIN_PROFILE: AdminProfile = {
    companyName: 'Easy Buy S.r.l.',
    vatNumber: '',
    address: '',
    city: '',
    phone: '',
    email: ''
};

export const fetchAdminProfile = async (): Promise<AdminProfile> => {
    const profile = await idbService.getAdminProfile();
    return profile || DEFAULT_ADMIN_PROFILE;
};

export const saveAdminProfile = async (profile: AdminProfile) => {
    await idbService.saveAdminProfile(profile);
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
    const q = query(collection(db, COLLECTIONS.ORDERS), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    remoteOrders = querySnapshot.docs.map(mapDocToOrder);
    console.log(`🔥 Firestore: Fetched ${remoteOrders.length} orders.`);
  } catch (error) {
    console.warn("⚠️ Firestore fetch failed/offline. Using IDB.");
  }

  // Ensure DB is seeded if this is first run offline
  await seedIfNeeded();

  // Get Local Data
  const localOrders = await idbService.getAll<PurchaseOrder>(STORE_NAMES.ORDERS);
  
  // Merge: Remote takes precedence, but we add local-only (if any created offline)
  const combinedOrders = [...remoteOrders];
  localOrders.forEach(localOrder => {
      if (!combinedOrders.some(remote => remote.id === localOrder.id)) {
          combinedOrders.push(localOrder);
      }
  });

  // If remote failed, combined is just local
  if (remoteOrders.length === 0 && combinedOrders.length === 0) {
      // Emergency fallback if both empty (shouldn't happen due to seed)
      return filterDataByTenant(MOCK_ORDERS_ENRICHED, tenantId); 
  }

  combinedOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return filterDataByTenant(combinedOrders, tenantId);
};

export const addOrder = async (order: Omit<PurchaseOrder, 'id'> & { customId?: string }): Promise<void> => {
  const generatedId = order.customId || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`;
  const fullOrder: PurchaseOrder = {
      ...order,
      id: generatedId
  };

  try {
    const firestoreOrder = {
        ...fullOrder,
        createdAt: Timestamp.now()
    };
    await addDoc(collection(db, COLLECTIONS.ORDERS), firestoreOrder);
    console.log("🔥 Firestore: Order added.");
  } catch (e) {
    console.warn("⚠️ Firestore add failed. Saving to IDB.", e);
  }
  
  // Always save to IDB for offline capability / speed
  await idbService.put(STORE_NAMES.ORDERS, fullOrder);
};

export const updateOrder = async (order: PurchaseOrder): Promise<void> => {
    try {
        // This is simplified. In real app, you'd query by customId if 'id' isn't the document ID
        // Assuming order.id might be customId, this might fail if not careful.
        // For prototype, we focus on IDB update primarily.
        // To fix firestore update, we'd need the doc ref ID, not custom ID.
        // Skipping complex Firestore update query for brevity in this refactor step.
    } catch (e) {
        console.warn("Firestore update skipped/failed");
    }
    await idbService.put(STORE_NAMES.ORDERS, order);
};

// --- SUPPLIERS ---
export const fetchSuppliers = async (tenantId: string = 'main'): Promise<Supplier[]> => {
    await seedIfNeeded();
    // Try Remote? Not implemented in basic firestore setup yet, using IDB
    const local = await idbService.getAll<Supplier>(STORE_NAMES.SUPPLIERS);
    return filterDataByTenant(local, tenantId);
};

export const addSupplier = async (supplier: Omit<Supplier, 'id'>) => {
    const newSupplier = { ...supplier, id: `SUP-${Date.now()}` };
    await idbService.put(STORE_NAMES.SUPPLIERS, newSupplier);
};

export const updateSupplier = async (supplier: Supplier) => {
    await idbService.put(STORE_NAMES.SUPPLIERS, supplier);
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
  await seedIfNeeded();
  
  let remoteParts: Part[] = [];
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.PARTS));
    remoteParts = querySnapshot.docs.map(mapDocToPart);
    if(remoteParts.length > 0) {
        console.log(`🔥 Firestore: Fetched ${remoteParts.length} parts.`);
        return filterDataByTenant(remoteParts, tenantId);
    }
  } catch (e) { 
    console.warn("⚠️ Firestore Parts fetch failed.");
  }

  const local = await idbService.getAll<Part>(STORE_NAMES.PARTS);
  return filterDataByTenant(local, tenantId);
};

export const fetchPartSiblings = async (sku: string, currentTenantId: string): Promise<Part[]> => {
    const allLocalParts = await idbService.getAll<Part>(STORE_NAMES.PARTS);
    return allLocalParts.filter(p => p.sku === sku && p.tenantId !== currentTenantId);
};

export const findPartByManufacturerCode = async (code: string): Promise<Part | undefined> => {
    const local = await idbService.getAll<Part>(STORE_NAMES.PARTS);
    const target = code.trim().toUpperCase();
    return local.find(p => p.manufacturer?.partCode?.toUpperCase() === target);
};

export const addPart = async (part: Omit<Part, 'id'>) => {
  const newPart = { ...part, id: `PART-${Date.now()}` };
  try {
    await addDoc(collection(db, COLLECTIONS.PARTS), part);
  } catch (e) { 
    console.warn("Firestore part add failed");
  }
  await idbService.put(STORE_NAMES.PARTS, newPart);
};

export const updatePart = async (part: Part) => {
    // Skipping firestore update logic for brevity (requires doc ID mapping)
    await idbService.put(STORE_NAMES.PARTS, part);
};

// --- NCRS ---
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

export const fetchNCRs = async (tenantId: string = 'main'): Promise<NonConformance[]> => {
  await seedIfNeeded();
  try {
    const q = query(collection(db, COLLECTIONS.NCRS), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const ncrs = querySnapshot.docs.map(mapDocToNCR);
    if(ncrs.length > 0) return filterDataByTenant(ncrs, tenantId);
  } catch (e) { 
    console.warn("Firestore NCR fetch failed");
  }
  
  const local = await idbService.getAll<NonConformance>(STORE_NAMES.NCRS);
  return filterDataByTenant(local, tenantId);
};

export const addNCR = async (ncr: Omit<NonConformance, 'id'>) => {
  const newNcr = { ...ncr, id: `NCR-${Date.now()}` };
  try {
    await addDoc(collection(db, COLLECTIONS.NCRS), { ...ncr, createdAt: Timestamp.now() });
  } catch (e) { 
    console.warn("Firestore NCR add failed");
  }
  await idbService.put(STORE_NAMES.NCRS, newNcr);
};

// --- BOMs ---
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
    await seedIfNeeded();
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTIONS.BOMS));
        const boms = querySnapshot.docs.map(mapDocToBOM);
        if (boms.length > 0) return filterDataByTenant(boms, tenantId);
    } catch (e) {
        console.warn("Firestore BOM fetch failed");
    }
    const local = await idbService.getAll<BillOfMaterials>(STORE_NAMES.BOMS);
    return filterDataByTenant(local, tenantId);
};

export const addBOM = async (bom: Omit<BillOfMaterials, 'id'>) => {
    const newBom = { ...bom, id: `BOM-${Date.now()}` };
    try {
        await addDoc(collection(db, COLLECTIONS.BOMS), bom);
    } catch (e) {
        console.warn("Firestore BOM add failed");
    }
    await idbService.put(STORE_NAMES.BOMS, newBom);
};

export const updateBomNode = async (
    bomId: string, 
    currentWbs: string, 
    updates: Partial<BOMItem>
) => {
    const bom = await idbService.get<BillOfMaterials>(STORE_NAMES.BOMS, bomId);
    if (!bom) return;

    const allParts = await idbService.getAll<Part>(STORE_NAMES.PARTS);

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
    
    await idbService.put(STORE_NAMES.BOMS, bom);
};

// --- SALES & MRP (Local Only for now to save tokens/reads) ---
export const fetchSalesForecasts = async (tenantId: string): Promise<SalesForecast[]> => {
    await seedIfNeeded();
    const local = await idbService.getAll<SalesForecast>(STORE_NAMES.SALES);
    return filterDataByTenant(local, tenantId);
};

export const saveSalesForecasts = async (forecasts: SalesForecast[]) => {
    // This overwrites strategy needs to be smart in IDB (bulkPut updates existing by ID)
    await idbService.bulkPut(STORE_NAMES.SALES, forecasts);
};

export const fetchMrpProposals = async (tenantId: string): Promise<MrpProposal[]> => {
    await seedIfNeeded();
    const local = await idbService.getAll<MrpProposal>(STORE_NAMES.MRP);
    return filterDataByTenant(local, tenantId);
};

export const saveMrpProposals = async (proposals: MrpProposal[], tenantScope: string = 'all') => {
    // MRP logic wipes old pending proposals usually, but here we just upsert new ones
    // For a real MRP engine, you might want to clear old pending ones for the tenant first
    await idbService.bulkPut(STORE_NAMES.MRP, proposals);
};

export const deleteMrpProposal = async (id: string) => {
    await idbService.delete(STORE_NAMES.MRP, id);
};

export const seedInitialData = async () => {
  await seedIfNeeded();
};
