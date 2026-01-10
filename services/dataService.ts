import { collection, getDocs, addDoc, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { PurchaseOrder, Part, NonConformance } from "../types";
import { MOCK_ORDERS } from "../constants";

const ORDERS_COLLECTION = "purchase_orders";
const PARTS_COLLECTION = "parts";
const NCR_COLLECTION = "non_conformances";

// --- MOCK DATA DEFINITIONS (Fallbacks) ---
const MOCK_PARTS: Part[] = [
  { id: '1', sku: 'HYD-PUMP-01', description: 'Pompa Idraulica Alta Pressione', stock: 12, safetyStock: 5, leadTime: 45, cost: 1200, category: 'Idraulica' },
  { id: '2', sku: 'ELEC-CTRL-X1', description: 'Centralina Controllo V2', stock: 4, safetyStock: 8, leadTime: 20, cost: 450, category: 'Elettronica' },
  { id: '3', sku: 'STEEL-PLT-5MM', description: 'Piastra Acciaio 5mm', stock: 150, safetyStock: 50, leadTime: 10, cost: 45, category: 'Carpenteria' },
  { id: '4', sku: 'GASKET-KIT-A', description: 'Kit Guarnizioni Serie A', stock: 200, safetyStock: 100, leadTime: 5, cost: 12.50, category: 'Consumabili' }
];

const MOCK_NCRS: NonConformance[] = [
    { id: '1', partId: '1', qtyFailed: 1, reason: 'Perdita olio guarnizione testa', status: 'Open', date: '2024-05-20' },
    { id: '2', partId: '3', qtyFailed: 5, reason: 'Spessore fuori tolleranza (>5.2mm)', status: 'Resolved', date: '2024-05-15' }
];

// --- ORDERS ---
const mapDocToOrder = (doc: any): PurchaseOrder => {
  const data = doc.data();
  return {
    id: data.customId || doc.id,
    vendor: data.vendor,
    date: data.date,
    amount: Number(data.amount),
    status: data.status,
    items: Number(data.items)
  };
};

export const fetchOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const q = query(collection(db, ORDERS_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const orders = querySnapshot.docs.map(mapDocToOrder);
    return orders.length > 0 ? orders : MOCK_ORDERS;
  } catch (error) {
    console.warn("Firestore access failed (using Mocks):", error);
    return MOCK_ORDERS;
  }
};

export const addOrder = async (order: Omit<PurchaseOrder, 'id'> & { customId?: string }): Promise<void> => {
  try {
    await addDoc(collection(db, ORDERS_COLLECTION), {
      ...order,
      customId: order.customId || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: Timestamp.now()
    });
  } catch (e) {
    console.warn("Demo Mode: Order not saved to DB.", e);
  }
};

// --- INVENTORY ---
const mapDocToPart = (doc: any): Part => {
  const data = doc.data();
  return {
    id: doc.id,
    sku: data.sku,
    description: data.description,
    stock: Number(data.stock),
    safetyStock: Number(data.safetyStock),
    leadTime: Number(data.leadTime),
    cost: Number(data.cost),
    category: data.category
  };
};

export const fetchParts = async (): Promise<Part[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, PARTS_COLLECTION));
    const parts = querySnapshot.docs.map(mapDocToPart);
    return parts.length > 0 ? parts : MOCK_PARTS;
  } catch (e) { 
    console.warn("Firestore access failed (using Mocks):", e); 
    return MOCK_PARTS; 
  }
};

export const addPart = async (part: Omit<Part, 'id'>) => {
  try {
    await addDoc(collection(db, PARTS_COLLECTION), part);
  } catch (e) { console.warn("Demo Mode: Part not saved.", e); }
};

// --- QUALITY ---
const mapDocToNCR = (doc: any): NonConformance => {
  const data = doc.data();
  return {
    id: doc.id,
    partId: data.partId,
    qtyFailed: Number(data.qtyFailed),
    reason: data.reason,
    status: data.status,
    date: data.date
  };
};

export const fetchNCRs = async (): Promise<NonConformance[]> => {
  try {
    const q = query(collection(db, NCR_COLLECTION), orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);
    const ncrs = querySnapshot.docs.map(mapDocToNCR);
    return ncrs.length > 0 ? ncrs : MOCK_NCRS;
  } catch (e) { 
    console.warn("Firestore access failed (using Mocks):", e); 
    return MOCK_NCRS; 
  }
};

export const addNCR = async (ncr: Omit<NonConformance, 'id'>) => {
  try {
    await addDoc(collection(db, NCR_COLLECTION), { ...ncr, createdAt: Timestamp.now() });
  } catch (e) { console.warn("Demo Mode: NCR not saved.", e); }
};

// --- SEEDING ---
export const seedInitialData = async () => {
  // In demo mode with mocks, seeding is skipped implicitly because fetchOrders returns data.
  const orders = await fetchOrders();
  if (orders.length === 0) {
     // Logic remains if DB connection eventually works
     const mocks = MOCK_ORDERS.slice(0, 3);
     for (const m of mocks) await addOrder(m as any);
  }
};