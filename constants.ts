import { KpiTile, PurchaseOrder } from "./types";

export const APP_NAME = "EB-pro";
export const APP_VERSION = "2.0";

export const KPI_DATA: KpiTile[] = [
  { id: '1', title: 'Ordini Aperti', value: '€ 1.2M', change: 12.5, trend: 'up', icon: 'shopping-cart' },
  { id: '2', title: 'Debito Fornitori', value: '€ 450k', change: -5.2, trend: 'down', icon: 'credit-card' },
  { id: '3', title: 'Ritardi Consegna', value: '18', change: 2.1, trend: 'up', icon: 'clock' },
  { id: '4', title: 'Performance MRP', value: '98%', change: 0.5, trend: 'up', icon: 'activity' },
];

export const MOCK_ORDERS: PurchaseOrder[] = [
  { id: 'PO-2024-001', vendor: 'Steel Dynamics Inc.', date: '2024-05-18', amount: 45000, status: 'Open', items: 12 },
  { id: 'PO-2024-002', vendor: 'Hydraulic Systems Ltd', date: '2024-05-17', amount: 12500, status: 'Pending Approval', items: 4 },
  { id: 'PO-2024-003', vendor: 'ElecTech Components', date: '2024-05-16', amount: 3200, status: 'Closed', items: 25 },
  { id: 'PO-2024-004', vendor: 'Global Logistics', date: '2024-05-15', amount: 8900, status: 'Open', items: 1 },
  { id: 'PO-2024-005', vendor: 'Compactor Parts Co.', date: '2024-05-14', amount: 22100, status: 'Open', items: 8 },
];

export const SALES_DATA = [
  { name: 'Gen', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'Mag', value: 1890 },
  { name: 'Giu', value: 2390 },
];

export const CATEGORY_DATA = [
  { name: 'Idraulica', value: 400 },
  { name: 'Elettronica', value: 300 },
  { name: 'Carpenteria', value: 300 },
  { name: 'Logistica', value: 200 },
];