
import { googleSheetsService } from './googleSheetsService';
import { firestoreService } from './firestoreService';
import { Client, Item, Supplier, Customer, PaginatedResponse } from '../types';

// This service decides whether to use Google Sheets or Firestore
// For now, we prioritize Firestore if the user is authenticated, 
// but the user requested a full migration.
// We will use a flag or check for firebase config.

const USE_FIRESTORE = true; // Set to true for migration

class DataService {
  public async getItems(client: Client, page: number, pageSize: number, search: string, filters: any = {}): Promise<PaginatedResponse<Item>> {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.getItems(client, page, pageSize, search, filters);
    return googleSheetsService.getItems(client, page, pageSize, search);
  }

  public async getItemsForClients(clients: Client[], page: number, pageSize: number, search: string, filters: any = {}): Promise<PaginatedResponse<Item>> {
    if (USE_FIRESTORE) return firestoreService.getItemsForClients(clients.filter(c => !!c).map(c => c.id), page, pageSize, search, filters);
    // Fallback for Google Sheets (not strictly required for now, but good practice)
    if (clients.length > 0 && clients[0]) {
      return googleSheetsService.getItems(clients[0], page, pageSize, search);
    }
    return { data: [], total: 0 };
  }

  public async saveItem(client: Client, item: Item, isNew: boolean) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveItem(client, item, isNew);
    return googleSheetsService.saveItem(client, item, isNew);
  }

  public async deleteItem(itemId: string) {
    if (USE_FIRESTORE) return firestoreService.deleteItem(itemId);
  }

  public async getSuppliers(client: Client, page: number, pageSize: number, search: string): Promise<PaginatedResponse<Supplier>> {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.getSuppliers(client, page, pageSize, search);
    return googleSheetsService.getSuppliers(client, page, pageSize, search);
  }

  public async getSuppliersCount(client: Client): Promise<number> {
    if (!client) return 0;
    if (USE_FIRESTORE) return firestoreService.getSuppliersCount(client);
    return 0;
  }

  public async getSuppliersForClients(clients: Client[], page: number, pageSize: number, search: string): Promise<PaginatedResponse<Supplier>> {
    if (USE_FIRESTORE) return firestoreService.getSuppliersForClients(clients.filter(c => !!c).map(c => c.id), page, pageSize, search);
    // Fallback for Google Sheets
    if (clients.length > 0 && clients[0]) {
      return googleSheetsService.getSuppliers(clients[0], page, pageSize, search);
    }
    return { data: [], total: 0 };
  }

  public async saveSupplier(client: Client, supplier: Supplier, isNew: boolean) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveSupplier(client, supplier, isNew);
    return googleSheetsService.saveSupplier(client, supplier, isNew);
  }

  public async deleteSupplier(supplierId: string) {
    if (USE_FIRESTORE) return firestoreService.deleteSupplier(supplierId);
  }

  public async getCustomers(client: Client, page: number = 1, pageSize: number = 1000, search: string = ''): Promise<PaginatedResponse<Customer>> {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.getCustomers(client, page, pageSize, search);
    return googleSheetsService.getCustomers(client, page, pageSize, search);
  }

  public async saveCustomer(client: Client, customer: Customer, isNew: boolean) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveCustomer(client, customer, isNew);
    return googleSheetsService.saveCustomer(client, customer, isNew);
  }

  public async deleteCustomer(customerId: string) {
    if (USE_FIRESTORE) return firestoreService.deleteCustomer(customerId);
  }

  public async getAdminProfile(client: Client) {
    if (!client) return null;
    if (USE_FIRESTORE) return firestoreService.getAdminProfile(client);
  }

  public async saveAdminProfile(client: Client, profile: any) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveAdminProfile(client, profile);
  }

  public async getQualificationCriteria(client: Client) {
    if (!client) return [];
    if (USE_FIRESTORE) return firestoreService.getQualificationCriteria(client);
  }

  public async saveQualificationCriterion(client: Client, criterion: any, isNew: boolean) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveQualificationCriterion(client, criterion, isNew);
  }

  public async calculateMRP(client: Client, page: number, pageSize: number, search: string) {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.calculateMRP(client, page, pageSize, search);
    return googleSheetsService.calculateMRP(client, page, pageSize, search);
  }

  public async getOrders(client: Client, page: number, pageSize: number, search: string) {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.getOrders(client, page, pageSize, search);
    return googleSheetsService.getOrders(client, page, pageSize, search);
  }

  public async saveOrder(client: Client, order: any, isNew: boolean) {
    if (!client) throw new Error("Client is required");
    if (USE_FIRESTORE) return firestoreService.saveOrder(client, order, isNew);
  }

  public async deleteOrder(orderId: string) {
    if (USE_FIRESTORE) return firestoreService.deleteOrder(orderId);
  }

  public async getLogisticsEvents(client: Client, page: number, pageSize: number, search: string) {
    if (!client) return { data: [], total: 0 };
    if (USE_FIRESTORE) return firestoreService.getLogisticsEvents(client, page, pageSize, search);
    return googleSheetsService.getLogisticsEvents(client, page, pageSize, search);
  }

  public async getLogisticsStats(client: Client) {
    if (!client) return { openOrders: 0, incomingValue: 0, delayed: 0 };
    if (USE_FIRESTORE) return firestoreService.getLogisticsStats(client);
    return { openOrders: 0, incomingValue: 0, delayed: 0 };
  }

  public async getBIData(client: Client) {
    if (!client) return null;
    if (USE_FIRESTORE) return firestoreService.getBIData(client);
    return null;
  }

  public async getCachedAiAnalysis(clientId: string) {
    if (USE_FIRESTORE) return firestoreService.getCachedAiAnalysis(clientId);
    return null;
  }

  public async saveAiAnalysisToCache(clientId: string, analysis: any) {
    if (USE_FIRESTORE) return firestoreService.saveAiAnalysisToCache(clientId, analysis);
  }

  public async getBudgetAllocations(client: Client, status?: 'APPROVED' | 'PENDING') {
    if (USE_FIRESTORE) return firestoreService.getBudgetAllocations(client, status);
    return [];
  }

  public async saveBudgetAllocations(client: Client, allocations: any[], status: 'APPROVED' | 'PENDING' = 'APPROVED') {
    if (USE_FIRESTORE) return firestoreService.saveBudgetAllocations(client, allocations, status);
  }
}

export const dataService = new DataService();
