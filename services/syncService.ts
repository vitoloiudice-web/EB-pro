
export type SyncOperationType = 'ADD' | 'UPDATE' | 'DELETE';

export interface SyncOperation {
    id: string;
    type: SyncOperationType;
    collection: string;
    docId?: string; // Required for UPDATE/DELETE
    payload?: any;
    timestamp: number;
}

const STORAGE_KEY = 'eb_pro_sync_queue';

export const syncService = {
    getQueue: (): SyncOperation[] => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error("Failed to parse sync queue", e);
            return [];
        }
    },

    enqueue: (op: Omit<SyncOperation, 'id' | 'timestamp'>): void => {
        const queue = syncService.getQueue();
        const newOp: SyncOperation = {
            ...op,
            id: crypto.randomUUID(),
            timestamp: Date.now()
        };
        queue.push(newOp);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        console.log(`[SyncService] Operation enqueued: ${op.type} on ${op.collection}`);
    },

    remove: (id: string): void => {
        const queue = syncService.getQueue();
        const filtered = queue.filter(item => item.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    },

    clear: (): void => {
        localStorage.removeItem(STORAGE_KEY);
    },

    getCount: (): number => {
        return syncService.getQueue().length;
    }
};
