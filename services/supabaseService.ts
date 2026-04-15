import { supabase } from './supabaseClient';
import { Client, Item, Supplier, Customer, PurchaseOrder, LogisticsEvent } from '../types';

export const supabaseService = {
  
  // --- ITEMS ---
  getItems: async (clientId: string, page: number = 1, pageSize: number = 20, search: string = '') => {
    let query = supabase
      .from('items')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    // Map DB columns to Frontend Types if necessary (snake_case to camelCase)
    // Assuming the frontend type matches or we map it here.
    // For simplicity, we'll map manually to ensure type safety.
    const mappedData: Item[] = (data || []).map((row: any) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      description: row.description,
      category: row.category,
      macroFamily: row.macro_family || '',
      family: row.family,
      group: row.group_name,
      stock: row.stock,
      safetyStock: row.safety_stock,
      cost: row.cost,
      supplierId: row.preferred_supplier_id, // Note: This is a UUID now, not a string code like 'SUP-01'
      leadTimeDays: row.lead_time_days,
      revision: row.revision,
      variant: row.variant || '',
      progressive: row.progressive || '',
      customerCode: row.customer_code || '',
      unit: row.unit,
      weightKg: row.weight_kg,
      manufacturer: row.manufacturer_info,
      technicalSpecs: row.technical_specs,
      isPhantom: row.is_phantom || false,
      isSubcontracting: row.is_subcontracting || false,
      leadTimeOffset: row.lead_time_offset || 0,
      multiUM: row.multi_um,
      // We might need to fetch supplier details if the UI expects a name/code
    }));

    return { data: mappedData, total: count || 0 };
  },

  saveItem: async (clientId: string, item: Partial<Item>, isNew: boolean) => {
    const dbItem = {
      client_id: clientId,
      sku: item.sku,
      name: item.name,
      description: item.description,
      category: item.category,
      stock: item.stock,
      safety_stock: item.safetyStock,
      cost: item.cost,
      preferred_supplier_id: item.supplierId, // Needs to be a valid UUID
      lead_time_days: item.leadTimeDays,
      family: item.family,
      group_name: item.group,
      revision: item.revision,
      variant: item.variant,
      progressive: item.progressive,
      customer_code: item.customerCode,
      unit: item.unit,
      weight_kg: item.weightKg,
      manufacturer_info: item.manufacturer,
      technical_specs: item.technicalSpecs,
      is_phantom: item.isPhantom,
      is_subcontracting: item.isSubcontracting,
      lead_time_offset: item.leadTimeOffset,
      multi_um: item.multiUM
    };

    if (isNew) {
      const { error } = await supabase.from('items').insert([dbItem]);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('items').update(dbItem).eq('id', item.id);
      if (error) throw error;
    }
  },

  // --- SUPPLIERS ---
  getSuppliers: async (clientId: string, page: number = 1, pageSize: number = 20, search: string = '') => {
    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const mappedData: Supplier[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      nickname: row.nickname || '',
      rating: row.rating,
      email: row.email,
      paymentTerms: row.payment_terms,
      legalAddress: row.legal_address || { street: row.address || '', number: '', zip: '', city: '', province: '', phone: row.phone || '' },
      operationalAddress: row.operational_address || {
        plantName: '',
        contact: { email: '', phone: '' },
        address: { street: '', number: '', zip: '', city: '', province: '' },
        technicalOffice: { email: '', phone: '' },
        commercialOffice: { email: '', phone: '' },
        supportOffice: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' },
        logisticsOffice: { email: '', phone: '' },
        warehouse: { email: '', phone: '', street: '', number: '', zip: '', city: '', province: '' }
      },
      status: row.status,
      qualificationValues: row.qualification_data
    }));

    return { data: mappedData, total: count || 0 };
  },

  saveSupplier: async (clientId: string, supplier: Partial<Supplier>, isNew: boolean) => {
    const dbSupplier = {
      client_id: clientId,
      name: supplier.name,
      nickname: supplier.nickname,
      rating: supplier.rating,
      email: supplier.email,
      payment_terms: supplier.paymentTerms,
      legal_address: supplier.legalAddress,
      operational_address: supplier.operationalAddress,
      status: supplier.status,
      qualification_data: supplier.qualificationValues
    };

    if (isNew) {
      const { error } = await supabase.from('suppliers').insert([dbSupplier]);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('suppliers').update(dbSupplier).eq('id', supplier.id);
      if (error) throw error;
    }
  },

  // --- CUSTOMERS ---
  getCustomers: async (clientId: string, page: number = 1, pageSize: number = 20, search: string = '') => {
    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('client_id', clientId)
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const mappedData: Customer[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      vatNumber: row.vat_number,
      address: row.address,
      region: row.region,
      paymentTerms: row.payment_terms
    }));

    return { data: mappedData, total: count || 0 };
  },

  // --- ORDERS ---
  getOrders: async (clientId: string, page: number = 1, pageSize: number = 20) => {
    const { data, error, count } = await supabase
      .from('purchase_orders')
      .select('*, suppliers(name)', { count: 'exact' })
      .eq('client_id', clientId)
      .range((page - 1) * pageSize, page * pageSize - 1)
      .order('date', { ascending: false });

    if (error) throw error;

    const mappedData: PurchaseOrder[] = (data || []).map((row: any) => ({
      id: row.po_number, // Use the human readable ID for UI
      date: row.date,
      supplierId: row.supplier_id,
      supplierName: row.suppliers?.name || 'Unknown',
      status: row.status,
      totalAmount: row.total_amount,
      trackingCode: row.tracking_code,
      notes: row.notes,
      items: [] // Items would need a separate fetch or join
    }));

    return { data: mappedData, total: count || 0 };
  }
};
