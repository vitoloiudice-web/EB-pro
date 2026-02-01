import { Company, Item, Supplier, Customer, AdminProfile, PurchaseOrder, LogisticsEvent } from '../types';
import { DISCOVERY_DOCS, GOOGLE_API_KEY, GOOGLE_CLIENT_ID, SCOPES, MOCK_ITEMS_DATA, MOCK_SUPPLIERS, MOCK_CUSTOMERS, MOCK_ADMIN_PROFILE } from '../constants';

// Declare types for window global Google API objects
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

class GoogleSheetsService {
  private tokenClient: any;
  private isInitialized: boolean = false;
  private accessToken: string | null = null;
  
  // Simple in-memory cache to store total counts or pages to reduce API calls
  private cache: Map<string, any> = new Map();

  constructor() {
    this.isInitialized = false;
  }

  public initClient = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        resolve();
        return;
      }
      const checkScriptsLoaded = () => {
        if (window.gapi && window.google) {
          this.initializeGapi(resolve, reject);
        } else {
          setTimeout(checkScriptsLoaded, 100);
        }
      };
      checkScriptsLoaded();
    });
  };

  private initializeGapi = (resolve: () => void, reject: (reason?: any) => void) => {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          apiKey: GOOGLE_API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });

        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            this.accessToken = tokenResponse.access_token;
            console.log("Access Token Received");
          },
        });

        this.isInitialized = true;
        resolve();
      } catch (e: any) {
        console.warn("GAPI Client Init failed. App will run in MOCK MODE.", e);
        this.isInitialized = true; 
        resolve();
      }
    });
  };

  public signIn = () => {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken();
    } else {
      console.warn("Mock Mode Active. Cannot perform real Sign-In.");
      alert("Modalità Demo Attiva: L'accesso API Google è disabilitato in questo ambiente.");
    }
  };

  // --- OPTIMIZED FETCHING STRATEGY ---
  
  /**
   * Calculates the A1 notation range for pagination.
   * Assumes 1 header row.
   * Page 1 (size 20) -> A2:Z21
   * Page 2 (size 20) -> A22:Z41
   */
  private getPageRange(sheetName: string, page: number, pageSize: number, lastColChar: string = 'Z'): string {
    const startRow = (page - 1) * pageSize + 2;
    const endRow = startRow + pageSize - 1;
    return `${sheetName}!A${startRow}:${lastColChar}${endRow}`;
  }

  private fetchRawData = async (spreadsheetId: string, range: string): Promise<any[][]> => {
    if (!this.accessToken) {
      // In Mock mode, we pass the range to getMockData, but getMockData needs to handle
      // the logic to return specific slices if a specific range is requested, 
      // OR we fetch all mock data and slice it here. 
      // For simplicity in Mock Mode, we'll fetch all and slice in the specific methods.
      return this.getMockData(range);
    }

    try {
      const response = await window.gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: range,
      });
      return response.result.values || [];
    } catch (error) {
      console.error(`Error fetching range ${range}:`, error);
      return this.getMockData(range);
    }
  };

  // --- MOCK DATA ENGINE (Simulating Server-Side filtering/paging) ---
  private getMockData(range: string): any[][] {
    if (range.includes('Articoli')) {
      return MOCK_ITEMS_DATA.map(i => [i.sku, i.name, i.category, i.stock, i.safetyStock, i.cost, i.supplierId]);
    }
    if (range.includes('Fornitori')) {
      return MOCK_SUPPLIERS.map(s => [s.id, s.name, s.rating, s.email, s.paymentTerms]);
    }
    if (range.includes('Clienti')) {
      return MOCK_CUSTOMERS.map(c => [c.id, c.name, c.email, c.vatNumber, c.address, c.region, c.paymentTerms]);
    }
    return [];
  }

  // --- PAGINATED ENTITY METHODS ---

  public getItems = async (company: Company, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Item>> => {
    if (!this.accessToken) {
       // Mock Pagination Logic
       let allItems = MOCK_ITEMS_DATA.map((i: any) => ({ ...i, unit: 'pz', leadTimeDays: 7, weightKg: 0, description: i.name })) as Item[];
       
       if (search) {
         const lowerSearch = search.toLowerCase();
         allItems = allItems.filter(i => i.name.toLowerCase().includes(lowerSearch) || i.sku.toLowerCase().includes(lowerSearch));
       }
       
       const total = allItems.length;
       const sliced = allItems.slice((page - 1) * pageSize, page * pageSize);
       
       // Simulate Network Latency
       await new Promise(r => setTimeout(r, 400));
       return { data: sliced, total };
    }

    // REAL API STRATEGY
    // 1. If search is active, we unfortuntely need to fetch all to filter (Google Sheets API limitation without SQL)
    // 2. If no search, we fetch the specific range.
    if (search) {
        const rows = await this.fetchRawData(company.spreadsheetId, 'Articoli!A:H');
        const allItems = rows.slice(1).map((row) => ({
            sku: row[0],
            name: row[1],
            category: row[2] as Item['category'],
            stock: Number(row[3]),
            safetyStock: Number(row[4]),
            cost: Number(row[5]),
            supplierId: row[6],
            description: row[1],
            unit: 'pz',
            weightKg: 0,
            leadTimeDays: 7
        })).filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.sku.toLowerCase().includes(search.toLowerCase()));

        return {
            data: allItems.slice((page - 1) * pageSize, page * pageSize),
            total: allItems.length
        };
    } else {
        // Efficient Range Fetching
        const range = this.getPageRange('Articoli', page, pageSize, 'H');
        const rows = await this.fetchRawData(company.spreadsheetId, range);
        
        // For total count, in a real app we'd fetch a metadata cell. Here we assume a fixed large number or fetch ID column.
        // Simplified: return estimated total or fetch column A only to count.
        const total = 50; // Placeholder for efficiency in demo
        
        const data = rows.map((row) => ({
            sku: row[0],
            name: row[1],
            category: row[2] as Item['category'],
            stock: Number(row[3]),
            safetyStock: Number(row[4]),
            cost: Number(row[5]),
            supplierId: row[6],
            description: row[1],
            unit: 'pz',
            weightKg: 0,
            leadTimeDays: 7
        }));

        return { data, total };
    }
  };

  public getSuppliers = async (company: Company, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Supplier>> => {
      // Mock Logic for consistency
      let all = MOCK_SUPPLIERS.map(s => ({...s, status: 'QUALIFIED'})) as Supplier[];
      if(search) all = all.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
      
      await new Promise(r => setTimeout(r, 300));
      return {
          data: all.slice((page - 1) * pageSize, page * pageSize),
          total: all.length
      };
  };

  public getCustomers = async (company: Company, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<Customer>> => {
      let all = MOCK_CUSTOMERS as Customer[];
      if(search) all = all.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));
      
      await new Promise(r => setTimeout(r, 300));
      return {
          data: all.slice((page - 1) * pageSize, page * pageSize),
          total: all.length
      };
  };

  public getAdminProfile = async (company: Company): Promise<AdminProfile> => {
     return new Promise(resolve => {
       setTimeout(() => resolve(MOCK_ADMIN_PROFILE), 500);
     });
  }

  // Modified to return Paginated Results even for calculation views
  public calculateMRP = async (company: Company, page: number = 1, pageSize: number = 20, search: string = '') => {
    // Note: MRP needs ALL items to identify shortages correctly globally. 
    // However, for the UI "View", we paginate the results.
    // In a real Backend, the DB does the math. Here we fetch all (cached) and slice results.
    const response = await this.getItems(company, 1, 1000, search); // Fetch "all" for calc
    const allItems = response.data;

    const mrpResults = allItems.map(item => {
      const shortage = item.stock < item.safetyStock;
      const amountToOrder = shortage ? (item.safetyStock - item.stock) : 0;
      return {
        item,
        isShortage: shortage,
        qtyToOrder: amountToOrder,
        estimatedCost: amountToOrder * item.cost
      };
    });

    // If searching specifically for shortages, we could filter here.
    // Paginating the results:
    return {
        data: mrpResults.slice((page - 1) * pageSize, page * pageSize),
        total: mrpResults.length
    };
  };

  public getOrders = async (company: Company, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<PurchaseOrder>> => {
    // Mock Data
    const mockOrders: PurchaseOrder[] = [
        { id: 'PO-2023-1001', date: '2023-10-01', supplierId: 'SUP-01', supplierName: 'HydraForce Italia', status: 'RECEIVED', totalAmount: 4500.50, items: [{ sku: 'HYD-VAL-001', description: 'Valvola', qty: 10, unitPrice: 150, total: 1500 }], trackingCode: 'DHL-123456' },
        { id: 'PO-2023-1015', date: '2023-10-15', supplierId: 'SUP-02', supplierName: 'Acciaierie Venete', status: 'SHIPPED', totalAmount: 12500.00, items: [], expectedDeliveryDate: '2023-10-25', trackingCode: 'BRT-998877' },
        { id: 'PO-2023-1020', date: '2023-10-20', supplierId: 'SUP-03', supplierName: 'AutoElectric Pro', status: 'SENT', totalAmount: 850.00, items: [], expectedDeliveryDate: '2023-10-30' },
        { id: 'PO-2023-1022', date: '2023-10-22', supplierId: 'SUP-04', supplierName: 'Vernici PRO', status: 'DRAFT', totalAmount: 0, items: [] }
    ];

    // Generate more mock data to demonstrate pagination
    for(let i=0; i<35; i++) {
        mockOrders.push({
            id: `PO-2023-1${100+i}`,
            date: '2023-09-10',
            supplierId: 'SUP-GEN',
            supplierName: `Fornitore Generico ${i}`,
            status: i % 3 === 0 ? 'CONFIRMED' : 'DRAFT',
            totalAmount: Math.random() * 5000,
            items: []
        });
    }

    let filtered = mockOrders;
    if (search) {
        const s = search.toLowerCase();
        filtered = mockOrders.filter(o => o.id.toLowerCase().includes(s) || o.supplierName.toLowerCase().includes(s) || o.status.toLowerCase().includes(s));
    }

    await new Promise(r => setTimeout(r, 500)); // Simulate net lag
    return {
        data: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length
    };
  }

  public getLogisticsEvents = async (company: Company, page: number = 1, pageSize: number = 20, search: string = ''): Promise<PaginatedResponse<LogisticsEvent>> => {
     const events: LogisticsEvent[] = [
         { id: 'LOG-001', type: 'INBOUND', referenceId: 'PO-2023-1015', date: '2023-10-23', courier: 'Bartolini', tracking: 'BRT-998877', status: 'TRANSIT', itemsCount: 150 },
         { id: 'LOG-002', type: 'INBOUND', referenceId: 'PO-2023-1001', date: '2023-10-05', courier: 'DHL', tracking: 'DHL-123456', status: 'DELIVERED', itemsCount: 10 }
     ];
     
     let filtered = events;
     if(search) {
        filtered = events.filter(e => e.tracking?.toLowerCase().includes(search.toLowerCase()) || e.referenceId.toLowerCase().includes(search.toLowerCase()));
     }

     return { data: filtered, total: filtered.length }; // Simplified for now
  }
}

export const googleSheetsService = new GoogleSheetsService();