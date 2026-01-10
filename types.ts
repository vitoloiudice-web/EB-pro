export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  PURCHASING = 'PURCHASING',
  QUALITY = 'QUALITY',
  REPORTS = 'REPORTS',
  SETTINGS = 'SETTINGS'
}

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
  vendor: string;
  date: string;
  amount: number;
  status: 'Draft' | 'Approved' | 'Sent' | 'Closed' | 'Pending Approval' | 'Open';
  items: number;
}

export interface Part {
  id: string;
  sku: string;
  description: string;
  stock: number;
  safetyStock: number;
  leadTime: number; // Days
  cost: number;
  category: string;
}

export interface NonConformance {
  id: string;
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
  startMonth: number; // 0-11
  endMonth: number; // 0-11
  riskLevel: 'High' | 'Medium' | 'Low';
}