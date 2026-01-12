/**
 * STOCK ALLOCATION SERVICE
 * Gestisce la riservazione di stock per PO e ordini cliente
 * Evita double-booking
 */

export interface StockAllocation {
  id?: string;
  partId: string;
  allocatedQty: number;
  orderId: string; // PO ID o Customer Order ID
  orderType: 'PO' | 'Sales' | 'Manufacturing';
  status: 'Reserved' | 'Confirmed' | 'Delivered' | 'Cancelled';
  createdAt?: Date;
  reservedAt?: Date;
  deliveredAt?: Date;
}

// In-memory allocation tracking (dovrebbe essere su Firestore per produzione)
const allocations: StockAllocation[] = [];

/**
 * Prenota stock per un ordine
 */
export function allocateStock(
  partId: string,
  orderId: string,
  orderType: 'PO' | 'Sales' | 'Manufacturing',
  quantity: number
): string {
  const id = `alloc_${Date.now()}`;
  const allocation: StockAllocation = {
    id,
    partId,
    orderId,
    orderType,
    allocatedQty: quantity,
    status: 'Reserved',
    createdAt: new Date(),
    reservedAt: new Date()
  };

  allocations.push(allocation);
  console.log(`[Stock] Allocated ${quantity} units of ${partId} for ${orderType} ${orderId}`);
  return id;
}

/**
 * Conferma una prenotazione
 */
export function confirmAllocation(allocationId: string): boolean {
  const alloc = allocations.find(a => a.id === allocationId);
  if (!alloc) return false;

  alloc.status = 'Confirmed';
  console.log(`[Stock] Confirmed allocation ${allocationId}`);
  return true;
}

/**
 * Completa una prenotazione (stock consegnato)
 */
export function fulfillAllocation(allocationId: string): boolean {
  const alloc = allocations.find(a => a.id === allocationId);
  if (!alloc) return false;

  alloc.status = 'Delivered';
  alloc.deliveredAt = new Date();
  console.log(`[Stock] Fulfilled allocation ${allocationId}`);
  return true;
}

/**
 * Annulla una prenotazione
 */
export function cancelAllocation(allocationId: string): boolean {
  const alloc = allocations.find(a => a.id === allocationId);
  if (!alloc) return false;

  alloc.status = 'Cancelled';
  console.log(`[Stock] Cancelled allocation ${allocationId}`);
  return true;
}

/**
 * Calcola stock disponibile (libero) per una parte
 * Considera il total stock e sottrae tutte le allocazioni attive
 */
export function calculateFreeStock(
  partId: string,
  totalStock: number,
  safetyStock: number = 0,
  blockedForNCR: number = 0
): number {
  // Stock effettivamente utilizzabile
  const usableStock = Math.max(0, totalStock - safetyStock - blockedForNCR);

  // Sottrai allocazioni attive (non consegnate)
  const allocatedQty = allocations
    .filter(a => 
      a.partId === partId && 
      a.status !== 'Delivered' && 
      a.status !== 'Cancelled'
    )
    .reduce((sum, a) => sum + a.allocatedQty, 0);

  return Math.max(0, usableStock - allocatedQty);
}

/**
 * Verifica se è possibile allocare una quantità
 */
export function canAllocate(
  partId: string,
  quantityNeeded: number,
  totalStock: number,
  safetyStock: number = 0,
  blockedForNCR: number = 0
): { possible: boolean; freeQty: number; message: string } {
  const freeQty = calculateFreeStock(partId, totalStock, safetyStock, blockedForNCR);

  if (freeQty >= quantityNeeded) {
    return {
      possible: true,
      freeQty,
      message: `OK: ${quantityNeeded} disponibili`
    };
  }

  return {
    possible: false,
    freeQty,
    message: `Insufficiente: richiesti ${quantityNeeded}, disponibili ${freeQty}`
  };
}

/**
 * Recupera tutte le allocazioni per un pezzo
 */
export function getAllocationsByPart(partId: string): StockAllocation[] {
  return allocations.filter(a => a.partId === partId && a.status !== 'Cancelled');
}

/**
 * Recupera tutte le allocazioni per un ordine
 */
export function getAllocationsByOrder(orderId: string): StockAllocation[] {
  return allocations.filter(a => a.orderId === orderId && a.status !== 'Cancelled');
}

/**
 * Riepilogo allocazioni per dashboard
 */
export function getAllocationSummary(partId: string, totalStock: number): {
  reserved: number;
  confirmed: number;
  free: number;
} {
  const allocsByStatus = {
    reserved: 0,
    confirmed: 0,
    delivered: 0
  };

  for (const alloc of allocations.filter(a => a.partId === partId && a.status !== 'Cancelled')) {
    if (alloc.status === 'Reserved') allocsByStatus.reserved += alloc.allocatedQty;
    if (alloc.status === 'Confirmed') allocsByStatus.confirmed += alloc.allocatedQty;
    if (alloc.status === 'Delivered') allocsByStatus.delivered += alloc.allocatedQty;
  }

  return {
    reserved: allocsByStatus.reserved,
    confirmed: allocsByStatus.confirmed,
    free: Math.max(0, totalStock - allocsByStatus.reserved - allocsByStatus.confirmed)
  };
}

/**
 * Pulisci allocazioni deliverate e scadute
 */
export function cleanupAllocations(retentionDays: number = 30): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const initialLength = allocations.length;
  
  const remaining = allocations.filter(alloc => {
    if (alloc.status === 'Delivered' && alloc.deliveredAt && alloc.deliveredAt < cutoffDate) {
      return false; // Rimuovi
    }
    return true;
  });

  const removed = initialLength - remaining.length;
  allocations.length = 0;
  allocations.push(...remaining);

  console.log(`[Stock] Cleanup: removed ${removed} old allocations`);
  return removed;
}
