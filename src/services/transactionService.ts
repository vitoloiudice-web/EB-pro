import { db } from '../firebaseConfig';
import { writeBatch, doc } from 'firebase/firestore';

/**
 * TRANSACTION SERVICE: Operazioni atomiche
 * Garantisce all-or-nothing per operazioni multi-step critiche
 */

export interface TransactionOperation {
  type: 'set' | 'update' | 'delete';
  collection: string;
  docId: string;
  data?: Record<string, any>;
}

export class TransactionError extends Error {
  constructor(public readonly operations: TransactionOperation[]) {
    super(`Transaction failed after processing ${operations.length} operations`);
  }
}

/**
 * Esegue una transazione atomica su Firestore
 * Se qualsiasi operazione fallisce, TUTTE vengono rollback
 */
export async function executeAtomicTransaction(
  operations: TransactionOperation[],
  name: string = 'unnamed-transaction'
): Promise<void> {
  if (operations.length === 0) {
    throw new Error('No operations provided for transaction');
  }

  console.log(`[Transaction] Starting: ${name} (${operations.length} ops)`);

  const batch = writeBatch(db);
  const processed: TransactionOperation[] = [];

  try {
    for (const op of operations) {
      const docRef = doc(db, op.collection, op.docId);

      switch (op.type) {
        case 'set':
          batch.set(docRef, op.data || {}, { merge: false });
          break;
        case 'update':
          batch.update(docRef, op.data || {});
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }

      processed.push(op);
    }

    await batch.commit();
    console.log(`[Transaction] ✓ Completed: ${name}`);
  } catch (error) {
    console.error(`[Transaction] ✗ Failed: ${name}`, error);
    throw new TransactionError(processed);
  }
}

/**
 * Caso specifico: Split di un ordine d'acquisto
 * Operazioni atomiche:
 * 1. Decrement quantità ordine originale
 * 2. Crea nuovo ordine con quantità split
 */
export async function splitPurchaseOrder(
  originalOrderId: string,
  originalQty: number,
  splitQty: number,
  newOrderData: Record<string, any>,
  collection: string = 'purchase_orders'
): Promise<string> {
  if (splitQty <= 0 || splitQty >= originalQty) {
    throw new Error('Invalid split quantity');
  }

  const remainingQty = originalQty - splitQty;
  const newOrderId = `${originalOrderId}_split_${Date.now()}`;

  const operations: TransactionOperation[] = [
    {
      type: 'update',
      collection,
      docId: originalOrderId,
      data: {
        quantity: remainingQty,
        updatedAt: new Date().toISOString()
      }
    },
    {
      type: 'set',
      collection,
      docId: newOrderId,
      data: {
        ...newOrderData,
        quantity: splitQty,
        parentOrderId: originalOrderId,
        createdAt: new Date().toISOString()
      }
    }
  ];

  await executeAtomicTransaction(operations, `split-po-${originalOrderId}`);
  return newOrderId;
}

/**
 * Caso specifico: Goods Receipt + Inventory Update
 * Operazioni atomiche:
 * 1. Crea record Goods Receipt
 * 2. Incrementa inventory
 * 3. Aggiorna PO status a "Received"
 */
export async function recordGoodsReceipt(
  poId: string,
  partId: string,
  quantity: number,
  receiptData: Record<string, any>
): Promise<string> {
  const receiptId = `gr_${Date.now()}`;

  const operations: TransactionOperation[] = [
    {
      type: 'set',
      collection: 'goods_receipts',
      docId: receiptId,
      data: {
        ...receiptData,
        poId,
        partId,
        quantity,
        receivedAt: new Date().toISOString()
      }
    },
    {
      type: 'update',
      collection: 'part_master',
      docId: partId,
      data: {
        stock: { increment: quantity }, // Firebase increment
        lastUpdate: new Date().toISOString()
      }
    },
    {
      type: 'update',
      collection: 'purchase_orders',
      docId: poId,
      data: {
        status: 'Received',
        receivedQty: quantity,
        receivedAt: new Date().toISOString()
      }
    }
  ];

  await executeAtomicTransaction(operations, `goods-receipt-${receiptId}`);
  return receiptId;
}
