
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryConstraint
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Item, Supplier, Customer, Client, PaginatedResponse } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  indexLink?: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  let errorMessage = error instanceof Error ? error.message : String(error);
  
  // Extract index creation link if present in the error message
  const indexLinkMatch = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]*/);
  const indexLink = indexLinkMatch ? indexLinkMatch[0] : null;

  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    indexLink: indexLink,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

class FirestoreService {
  // --- ITEMS ---
  public async getItems(client: Client, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Item>> {
    if (!client) return { data: [], total: 0 };
    return this.getItemsForClients([client.id], page, pageSize, search);
  }

  public async getItemsForClients(clientIds: string[], page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Item>> {
    if (clientIds.length === 0) return { data: [], total: 0 };
    const path = 'items';
    try {
      let qConstraints: QueryConstraint[] = [
        where('client_id', 'in', clientIds),
        limit(1000) // Fetch a larger batch for in-memory sorting/filtering
      ];

      const q = query(collection(db, path), ...qConstraints);
      const snapshot = await getDocs(q);
      
      let items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Item));
      
      // Sort in memory to avoid index requirement
      items.sort((a, b) => a.sku.localeCompare(b.sku));

      if (search) {
        items = items.filter(item => 
          item.sku.toLowerCase().includes(search.toLowerCase()) || 
          item.name.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Handle pagination in memory
      const start = (page - 1) * pageSize;
      const paginatedItems = items.slice(start, start + pageSize);

      return {
        data: paginatedItems,
        total: items.length
      };
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for items.');
        return { data: [], total: 0 };
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return { data: [], total: 0 };
    }
  }

  public async saveItem(client: Client, item: Item, isNew: boolean) {
    if (!client) throw new Error("Client is required to save item");
    const path = 'items';
    try {
      const data = {
        ...item,
        client_id: client.id,
        updated_at: serverTimestamp(),
        created_at: isNew ? serverTimestamp() : (item as any).created_at || serverTimestamp()
      };
      
      if (isNew) {
        // Enforce absolute uniqueness of SKU
        const q = query(collection(db, path), where('client_id', '==', client.id), where('sku', '==', item.sku));
        const existing = await getDocs(q);
        if (!existing.empty) {
          throw new Error(`Lo SKU ${item.sku} esiste già. L'univocità è obbligatoria.`);
        }
        await addDoc(collection(db, path), data);
      } else {
        const docRef = doc(db, path, item.id);
        await updateDoc(docRef, data);
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  }

  public async deleteItem(itemId: string) {
    const path = 'items';
    try {
      await deleteDoc(doc(db, path, itemId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- SUPPLIERS ---
  public async getSuppliers(client: Client, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Supplier>> {
    if (!client) return { data: [], total: 0 };
    return this.getSuppliersForClients([client.id], page, pageSize, search);
  }

  public async getSuppliersForClients(clientIds: string[], page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Supplier>> {
    if (clientIds.length === 0) return { data: [], total: 0 };
    const path = 'suppliers';
    try {
      const q = query(collection(db, path), where('client_id', 'in', clientIds), limit(1000));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier));
      if (search) {
        data = data.filter(s => 
          s.name.toLowerCase().includes(search.toLowerCase()) || 
          (s.nickname && s.nickname.toLowerCase().includes(search.toLowerCase()))
        );
      }
      const start = (page - 1) * pageSize;
      const paginatedData = data.slice(start, start + pageSize);
      return { data: paginatedData, total: data.length };
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for suppliers.');
        return { data: [], total: 0 };
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return { data: [], total: 0 };
    }
  }

  public async getSuppliersCount(client: Client): Promise<number> {
    if (!client) return 0;
    const path = 'suppliers';
    try {
      const q = query(collection(db, path), where('client_id', '==', client.id));
      const snapshot = await getDocs(q);
      return snapshot.size;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return 0;
    }
  }

  public async saveSupplier(client: Client, supplier: Supplier, isNew: boolean) {
    if (!client) throw new Error("Client is required to save supplier");
    const path = 'suppliers';
    try {
      const data = { ...supplier, client_id: client.id, created_at: serverTimestamp() };
      if (isNew) {
        await addDoc(collection(db, path), data);
      } else {
        await updateDoc(doc(db, path, supplier.id), data);
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  }

  public async deleteSupplier(supplierId: string) {
    const path = 'suppliers';
    try {
      await deleteDoc(doc(db, path, supplierId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- CUSTOMERS ---
  public async getCustomers(client: Client, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Customer>> {
    if (!client) return { data: [], total: 0 };
    const path = 'customers';
    try {
      const q = query(collection(db, path), where('client_id', '==', client.id), limit(pageSize));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
      if (search) {
        data = data.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      }
      return { data, total: data.length };
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for customers.');
        return { data: [], total: 0 };
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return { data: [], total: 0 };
    }
  }

  public async saveCustomer(client: Client, customer: Customer, isNew: boolean) {
    if (!client) throw new Error("Client is required to save customer");
    const path = 'customers';
    try {
      const data = { ...customer, client_id: client.id, created_at: serverTimestamp() };
      if (isNew) {
        await addDoc(collection(db, path), data);
      } else {
        await updateDoc(doc(db, path, customer.id), data);
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  }

  public async deleteCustomer(customerId: string) {
    const path = 'customers';
    try {
      await deleteDoc(doc(db, path, customerId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- ADMIN PROFILE ---
  public async getAdminProfile(client: Client) {
    if (!client) return null;
    const path = `clients/${client.id}/settings/profile`;
    try {
      const docRef = doc(db, 'clients', client.id, 'settings', 'profile');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return null;
    }
  }

  public async saveAdminProfile(client: Client, profile: any) {
    if (!client) throw new Error("Client is required to save admin profile");
    const path = `clients/${client.id}/settings/profile`;
    try {
      const docRef = doc(db, 'clients', client.id, 'settings', 'profile');
      await setDoc(docRef, { ...profile, updated_at: serverTimestamp() }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // --- QUALIFICATION CRITERIA ---
  public async getQualificationCriteria(client: Client) {
    if (!client) return [];
    const path = `clients/${client.id}/qualificationCriteria`;
    try {
      const q = query(collection(db, 'clients', client.id, 'qualificationCriteria'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for qualification criteria.');
        return [];
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  }

  public async saveQualificationCriterion(client: Client, criterion: any, isNew: boolean) {
    if (!client) throw new Error("Client is required to save qualification criterion");
    const path = `clients/${client.id}/qualificationCriteria`;
    try {
      const colRef = collection(db, 'clients', client.id, 'qualificationCriteria');
      const data = { ...criterion, updated_at: serverTimestamp() };
      if (isNew) {
        await addDoc(colRef, data);
      } else {
        await setDoc(doc(colRef, criterion.id), data, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  }

  // --- MRP ---
  public async calculateMRP(client: Client, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<any>> {
    if (!client) return { data: [], total: 0 };
    
    try {
      // 1. Fetch all items
      const itemsResponse = await this.getItems(client, 1, 1000, search); 
      const allItems = itemsResponse.data;

      // 2. Fetch BOM (mocking for now as we don't have a UI for it yet, but logic is ready)
      // In a real scenario, we'd fetch from 'bom_lines' collection
      const bomSnapshot = await getDocs(query(collection(db, 'bom_lines'), where('client_id', '==', client.id)));
      const bomLines = bomSnapshot.docs.map(d => d.data() as any);

      // 3. Recursive requirement calculation for Phantom components
      const requirementsMap: Record<string, number> = {};
      
      const explodeRequirements = (sku: string, qty: number) => {
        const item = allItems.find(i => i.sku === sku);
        if (!item) return;

        if (item.isPhantom) {
          // Pass requirements to children
          const children = bomLines.filter(l => l.parentSku === sku);
          children.forEach(child => {
            explodeRequirements(child.childSku, qty * child.qtyRequired);
          });
        } else {
          // Accumulate requirement on real component
          requirementsMap[sku] = (requirementsMap[sku] || 0) + qty;
        }
      };

      // For this demo, we assume requirements come from safety stock gaps or open orders
      // In a real ERP, F_t (Gross Requirements) comes from Sales Orders or Production Plans
      allItems.forEach(item => {
        if (item.stock < item.safetyStock) {
          explodeRequirements(item.sku, item.safetyStock - item.stock);
        }
      });

      // 4. Calculate MRP Results using eSOLVER formula: D_t = S_{t-1} + R_t + P_t - F_t
      const mrpResults = allItems.map(item => {
        const grossRequirement = requirementsMap[item.sku] || 0;
        const scheduledReceipts = 0; // Mock: would come from open POs
        const plannedOrderReleases = 0; // This is what we are calculating
        
        // Net Availability (D_t)
        const netAvailability = item.stock + scheduledReceipts - grossRequirement;
        
        const isShortage = netAvailability < 0 || (item.stock < item.safetyStock);
        let qtyToOrder = 0;
        
        if (isShortage) {
          qtyToOrder = Math.max(0, item.safetyStock - netAvailability);
        }

        // Subcontracting check: zero netting for purchase
        if (item.isSubcontracting) {
          qtyToOrder = 0;
        }

        // Lead Time Offsetting
        const leadTime = item.leadTimeDays + (item.leadTimeOffset || 0);
        const requirementDate = new Date();
        requirementDate.setDate(requirementDate.getDate() + 7); // Mock: requirement in 7 days
        
        const plannedOrderDate = new Date(requirementDate);
        plannedOrderDate.setDate(plannedOrderDate.getDate() - leadTime);

        // Sistema Semaforico
        let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
        if (item.stock <= 0 && grossRequirement > 0) {
          status = 'RED';
        } else if (isShortage) {
          status = 'YELLOW';
        }

        return {
          item,
          isShortage,
          qtyToOrder,
          estimatedCost: qtyToOrder * item.cost,
          status,
          plannedOrderDate: plannedOrderDate.toISOString().split('T')[0],
          requirementDate: requirementDate.toISOString().split('T')[0],
          isPhantom: item.isPhantom,
          isSubcontracting: item.isSubcontracting
        };
      });

      // Filter out phantoms from final purchase list as they are not physically managed
      const finalResults = mrpResults.filter(r => !r.item.isPhantom);

      return {
          data: finalResults.slice((page - 1) * pageSize, page * pageSize),
          total: finalResults.length
      };
    } catch (error) {
      console.error("MRP Calculation Error:", error);
      return { data: [], total: 0 };
    }
  }

  // --- ORDERS ---
  public async getOrders(client: Client, page: number = 1, pageSize: number = 20, search: string = '') {
    if (!client) return { data: [], total: 0 };
    const path = 'purchase_orders';
    try {
      const q = query(collection(db, path), where('client_id', '==', client.id), limit(pageSize));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      if (search) {
        data = data.filter((o: any) => o.po_number?.toLowerCase().includes(search.toLowerCase()));
      }
      return { data, total: data.length };
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for orders.');
        return { data: [], total: 0 };
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return { data: [], total: 0 };
    }
  }

  public async saveOrder(client: Client, order: any, isNew: boolean) {
    if (!client) throw new Error("Client is required to save order");
    const path = 'purchase_orders';
    try {
      const data = { ...order, client_id: client.id };
      if (isNew) {
        await addDoc(collection(db, path), data);
      } else {
        const orderRef = doc(db, path, order.id);
        await setDoc(orderRef, data, { merge: true });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  public async deleteOrder(orderId: string) {
    const path = 'purchase_orders';
    try {
      await deleteDoc(doc(db, path, orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // --- LOGISTICS ---
  public async getLogisticsEvents(client: Client, page: number = 1, pageSize: number = 20, search: string = '') {
    if (!client) return { data: [], total: 0 };
    const path = 'logistics_events';
    try {
      const q = query(collection(db, path), where('client_id', '==', client.id), limit(pageSize));
      const snapshot = await getDocs(q);
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      return { data, total: data.length };
    } catch (error: any) {
      if (error.message && error.message.includes('client is offline')) {
        console.warn('Firestore client is offline. Returning empty data for logistics events.');
        return { data: [], total: 0 };
      }
      handleFirestoreError(error, OperationType.LIST, path);
      return { data: [], total: 0 };
    }
  }

  public async getLogisticsStats(client: Client) {
    if (!client) return { openOrders: 0, incomingValue: 0, delayed: 0 };
    const ordersResponse = await this.getOrders(client, 1, 1000);
    const orders = ordersResponse.data;
    
    return {
      openOrders: orders.filter((o: any) => o.status !== 'RECEIVED' && o.status !== 'CANCELLED').length,
      incomingValue: orders.reduce((acc: number, o: any) => acc + (o.totalAmount || 0), 0),
      delayed: orders.filter((o: any) => o.status === 'EXCEPTION' || o.status === 'DELAYED').length
    };
  }

  // --- BI DATA ---
  public async getBIData(client: Client) {
    if (!client) return null;
    try {
      const [suppliersRes, itemsRes, ordersRes] = await Promise.all([
        this.getSuppliers(client, 1, 1000),
        this.getItems(client, 1, 1000),
        this.getOrders(client, 1, 1000)
      ]);

      return {
        suppliers: suppliersRes.data,
        items: itemsRes.data,
        orders: ordersRes.data
      };
    } catch (error) {
      console.error("Error fetching BI data:", error);
      return null;
    }
  }

  // --- AI CACHE ---
  public async getCachedAiAnalysis(clientId: string): Promise<any | null> {
    const path = `clients/${clientId}/ai_cache/latest`;
    try {
      const docRef = doc(db, 'clients', clientId, 'ai_cache', 'latest');
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      console.error("Error fetching AI cache:", error);
      return null;
    }
  }

  public async saveAiAnalysisToCache(clientId: string, analysis: any) {
    const path = `clients/${clientId}/ai_cache/latest`;
    try {
      const docRef = doc(db, 'clients', clientId, 'ai_cache', 'latest');
      await setDoc(docRef, { ...analysis, updated_at: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.error("Error saving AI cache:", error);
    }
  }
}

export const firestoreService = new FirestoreService();
