
import { KpiTile, PurchaseOrder, FatturaElettronica } from "./types";

export const APP_NAME = "EB-pro eSolver";
export const APP_VERSION = "2.1 Enterprise";

export const KPI_DATA: KpiTile[] = [
  { id: '1', title: 'Fatturato Mese', value: '€ 1.2M', change: 12.5, trend: 'up', icon: 'currency-euro' },
  { id: '2', title: 'Scarti SDI', value: '3', change: -5.2, trend: 'down', icon: 'exclamation-circle' },
  { id: '3', title: 'Ritardi Consegna', value: '18', change: 2.1, trend: 'up', icon: 'clock' },
  { id: '4', title: 'Efficienza Magazzino', value: '98%', change: 0.5, trend: 'up', icon: 'cube' },
];

export const MOCK_ORDERS: PurchaseOrder[] = [
  { id: 'PO-2024-001', tenantId: 'main', vendor: 'Steel Dynamics Inc.', description: 'Stock Acciaio 5mm', date: '2024-05-18', amount: 45000, status: 'Open', items: 12 },
  { id: 'PO-2024-002', tenantId: 'main', vendor: 'Hydraulic Systems Ltd', description: 'Pompe Idrauliche Ricambio', date: '2024-05-17', amount: 12500, status: 'Pending Approval', items: 4 },
  { id: 'PO-2024-003', tenantId: 'main', vendor: 'ElecTech Components', description: 'Centraline Controllo', date: '2024-05-16', amount: 3200, status: 'Closed', items: 25 },
  { id: 'PO-2024-004', tenantId: 'main', vendor: 'Global Logistics', description: 'Servizi Logistica Urgente', date: '2024-05-15', amount: 8900, status: 'Open', items: 1 },
  { id: 'PO-2024-005', tenantId: 'main', vendor: 'Compactor Parts Co.', description: 'Kit Guarnizioni Manutenzione', date: '2024-05-14', amount: 22100, status: 'Open', items: 8 },
];

export const MOCK_INVOICES: FatturaElettronica[] = [
    { id: 'FTE-001', tenantId: 'main', flusso: 'Attivo', controparte: 'Cliente Alpha SRL', pivaControparte: '01234567890', dataDocumento: '2026-01-15', numeroDocumento: '2026/001', tipoDocumento: 'TD01', importoTotale: 12200, importoIva: 2200, statoHub: 'Conservata', statoSDI: 'Consegnata', dataInvioSDI: '2026-01-15T10:00:00' },
    { id: 'FTE-002', tenantId: 'main', flusso: 'Attivo', controparte: 'Beta Costruzioni', pivaControparte: '09876543211', dataDocumento: '2026-01-16', numeroDocumento: '2026/002', tipoDocumento: 'TD01', importoTotale: 5500, importoIva: 500, statoHub: 'In Elaborazione', statoSDI: 'Inviata', dataInvioSDI: '2026-01-16T09:30:00' },
    { id: 'FTE-003', tenantId: 'main', flusso: 'Passivo', controparte: 'Steel Dynamics Inc.', pivaControparte: 'IT11223344556', dataDocumento: '2026-01-10', numeroDocumento: 'SD-998', tipoDocumento: 'TD01', importoTotale: 45000, importoIva: 9900, statoHub: 'Conservata', statoSDI: 'Consegnata' },
    { id: 'FTE-004', tenantId: 'main', flusso: 'Attivo', controparte: 'Gamma Services', pivaControparte: 'IT00000000000', dataDocumento: '2026-01-18', numeroDocumento: '2026/003', tipoDocumento: 'TD01', importoTotale: 1200, importoIva: 220, statoHub: 'Da Inviare', statoSDI: 'Scartata', dataInvioSDI: '2026-01-18T14:00:00', messaggioErrore: 'Codice Fiscale non valido' },
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
