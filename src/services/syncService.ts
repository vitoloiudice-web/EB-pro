import { db } from '../firebaseConfig';
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

export type SyncOperationType = 'ADD' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
    id: string;
    type: SyncOperationType;
    collection: string;
    docId?: string;
    payload?: any;
    timestamp: number;
    retries?: number;
    status?: 'pending' | 'synced' | 'failed';
}

export interface SyncStatus {
    isSyncing: boolean;
    isOnline: boolean;
    pendingCount: number;
    syncedCount: number;
    failedCount: number;
}

const STORAGE_KEY = 'eb_pro_sync_queue';
const MAX_RETRIES = 3;

class SyncServiceClass {
    private listeners: Set<(status: SyncStatus) => void> = new Set();
    private isSyncing = false;
    private syncInterval: NodeJS.Timeout | null = null;

    constructor() {
        window.addEventListener('online', () => {
            console.log('[Sync] Online - starting sync');
            this.syncQueue();
        });
        window.addEventListener('offline', () => {
            console.log('[Sync] Offline - queuing operations');
        });
        this.startAutoSync();
    }

    getQueue(): SyncOperation[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to parse sync queue", e);
            return [];
        }
    }

    enqueue(op: Omit<SyncOperation, 'id' | 'timestamp' | 'retries' | 'status'>): string {
        const queue = this.getQueue();
        const id = crypto.randomUUID();
        const newOp: SyncOperation = {
            ...op,
            id,
            timestamp: Date.now(),
            retries: 0,
            status: 'pending'
        };
        queue.push(newOp);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        console.log(`[Sync] Operation enqueued: ${op.type} on ${op.collection}/${op.docId}`);
        this.notifyListeners();
        return id;
    }

    remove(id: string): void {
        const queue = this.getQueue();
        const filtered = queue.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        this.notifyListeners();
    }

    clear(): void {
        localStorage.removeItem(STORAGE_KEY);
        this.notifyListeners();
    }

    getCount(): number {
        return this.getQueue().length;
    }

    private async executeOperation(op: SyncOperation): Promise<void> {
        const docRef = doc(db, op.collection, op.docId || '');

        switch (op.type) {
            case 'ADD':
                await setDoc(docRef, op.payload || {}, { merge: true });
                break;
            case 'UPDATE':
                await updateDoc(docRef, op.payload || {});
                break;
            case 'DELETE':
                await deleteDoc(docRef);
                break;
        }
    }

    async syncQueue(): Promise<void> {
        if (this.isSyncing || !navigator.onLine) return;

        this.isSyncing = true;
        this.notifyListeners();

        try {
            const queue = this.getQueue();
            const pending = queue.filter(op => op.status === 'pending' || !op.status);

            for (const op of pending) {
                try {
                    await this.executeOperation(op);
                    op.status = 'synced';
                    console.log(`[Sync] ✓ Synced ${op.type} on ${op.collection}/${op.docId}`);
                } catch (error) {
                    console.error(`[Sync] Failed ${op.type} on ${op.collection}/${op.docId}:`, error);
                    op.retries = (op.retries || 0) + 1;
                    if ((op.retries || 0) >= MAX_RETRIES) {
                        op.status = 'failed';
                        console.error(`[Sync] ✗ Max retries exceeded for operation ${op.id}`);
                    }
                }
            }

            // Rimuovi operazioni sincronizzate
            const remaining = queue.filter(op => op.status !== 'synced');
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
        } finally {
            this.isSyncing = false;
            this.notifyListeners();
        }
    }

    private startAutoSync(): void {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = setInterval(() => {
            if (navigator.onLine && this.getCount() > 0) {
                this.syncQueue();
            }
        }, 5000);
    }

    onStatusChange(listener: (status: SyncStatus) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private notifyListeners(): void {
        const queue = this.getQueue();
        const status: SyncStatus = {
            isSyncing: this.isSyncing,
            isOnline: navigator.onLine,
            pendingCount: queue.filter(op => op.status === 'pending' || !op.status).length,
            syncedCount: queue.filter(op => op.status === 'synced').length,
            failedCount: queue.filter(op => op.status === 'failed').length
        };
        this.listeners.forEach(listener => listener(status));
    }

    getStatus(): SyncStatus {
        const queue = this.getQueue();
        return {
            isSyncing: this.isSyncing,
            isOnline: navigator.onLine,
            pendingCount: queue.filter(op => op.status === 'pending' || !op.status).length,
            syncedCount: queue.filter(op => op.status === 'synced').length,
            failedCount: queue.filter(op => op.status === 'failed').length
        };
    }

    destroy(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        this.listeners.clear();
    }
}

export const syncService = new SyncServiceClass();
