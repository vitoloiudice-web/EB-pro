
import { PurchaseOrder, Part, NonConformance, BillOfMaterials, SalesForecast, MrpProposal, Supplier, AdminProfile } from "../types";

const DB_NAME = 'eb-pro-db';
const DB_VERSION = 1;

const STORES = {
  ORDERS: 'orders',
  PARTS: 'parts',
  NCRS: 'ncrs',
  BOMS: 'boms',
  SALES: 'sales',
  MRP: 'mrp',
  SUPPLIERS: 'suppliers',
  SETTINGS: 'settings' // For Admin Profile
};

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create Object Stores if they don't exist
      Object.values(STORES).forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          // Use 'id' as keyPath for most, 'key' for settings singleton
          if (storeName === STORES.SETTINGS) {
             db.createObjectStore(storeName, { keyPath: 'key' });
          } else {
             db.createObjectStore(storeName, { keyPath: 'id' });
          }
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Generic Actions Class to handle 'this' context correctly
class IdbService {
  
  async getAll<T>(storeName: string): Promise<T[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, data: T): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Bulk put for seeding
  async bulkPut<T>(storeName: string, items: T[]): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      
      items.forEach(item => store.put(item));
      
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // Specific Getters for Admin Profile (Singleton pattern in IDB)
  async getAdminProfile(): Promise<AdminProfile | null> {
      const result = await this.get<{key: string, value: AdminProfile}>(STORES.SETTINGS, 'adminProfile');
      return result ? result.value : null;
  }

  async saveAdminProfile(profile: AdminProfile): Promise<void> {
      await this.put(STORES.SETTINGS, { key: 'adminProfile', value: profile });
  }
}

export const idbService = new IdbService();
export const STORE_NAMES = STORES;
