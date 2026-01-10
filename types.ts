export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  PURCHASING = 'PURCHASING',
  ANALYTICS = 'ANALYTICS',
  DOCUMENTS = 'DOCUMENTS'
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
  vendor: string;
  date: string;
  amount: number;
  status: 'Open' | 'Closed' | 'Pending Approval';
  items: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface HeatmapDataPoint {
  region: string;
  value: number;
  x: number;
  y: number;
}