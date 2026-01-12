import { db } from '../firebaseConfig';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

/**
 * AUDIT SERVICE: Tracciamento operazioni
 * Registra chi ha fatto cosa e quando
 */

export interface AuditLog {
  id?: string;
  timestamp: Date;
  userId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'DOWNLOAD' | 'EXPORT';
  entity: string; // 'Part', 'PO', 'Supplier', etc
  entityId: string;
  tenantId: string;
  changes?: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  ipAddress?: string;
  userAgent?: string;
}

const AUDIT_COLLECTION = 'audit_logs';

/**
 * Registra un'operazione nell'audit log
 */
export async function logAuditEntry(entry: Omit<AuditLog, 'id'>): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, AUDIT_COLLECTION), {
      ...entry,
      timestamp: entry.timestamp.toISOString()
    });

    console.log(`[Audit] ${entry.action} on ${entry.entity}/${entry.entityId} by ${entry.userId}`);
    return docRef.id;
  } catch (error) {
    console.error('[Audit] Failed to log entry:', error);
    // Non lanciamo errore - non vogliamo bloccare operazioni per problemi di audit
    return '';
  }
}

/**
 * Recupera audit log per un'entità specifica
 */
export async function getAuditLogs(
  entityId: string,
  tenantId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('entityId', '==', entityId),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: new Date(doc.data().timestamp)
    } as AuditLog));
  } catch (error) {
    console.error('[Audit] Failed to retrieve logs:', error);
    return [];
  }
}

/**
 * Recupera audit log per un utente
 */
export async function getAuditLogsByUser(
  userId: string,
  tenantId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, AUDIT_COLLECTION),
      where('userId', '==', userId),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.slice(0, limit).map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: new Date(doc.data().timestamp)
    } as AuditLog));
  } catch (error) {
    console.error('[Audit] Failed to retrieve user logs:', error);
    return [];
  }
}

/**
 * Helper per loggare operazioni CRUD comuni
 */
export async function auditCreate(
  entity: string,
  entityId: string,
  tenantId: string,
  userId: string,
  data: Record<string, any>
): Promise<void> {
  await logAuditEntry({
    timestamp: new Date(),
    userId,
    action: 'CREATE',
    entity,
    entityId,
    tenantId,
    changes: {
      before: {},
      after: data
    }
  });
}

export async function auditUpdate(
  entity: string,
  entityId: string,
  tenantId: string,
  userId: string,
  before: Record<string, any>,
  after: Record<string, any>
): Promise<void> {
  await logAuditEntry({
    timestamp: new Date(),
    userId,
    action: 'UPDATE',
    entity,
    entityId,
    tenantId,
    changes: {
      before,
      after
    }
  });
}

export async function auditDelete(
  entity: string,
  entityId: string,
  tenantId: string,
  userId: string,
  data: Record<string, any>
): Promise<void> {
  await logAuditEntry({
    timestamp: new Date(),
    userId,
    action: 'DELETE',
    entity,
    entityId,
    tenantId,
    changes: {
      before: data,
      after: {}
    }
  });
}
