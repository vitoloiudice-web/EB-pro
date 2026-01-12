import { useState, useEffect } from 'react';
import { syncService, SyncStatus } from '../services/syncService';

/**
 * Custom hook per monitore lo stato di sincronizzazione dei dati
 * Ritorna lo stato della sincronizzazione e permette di triggerare manualmente
 */
export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => syncService.getStatus());

  useEffect(() => {
    // Ascolta i cambiamenti dello stato
    const unsubscribe = syncService.onStatusChange(setStatus);

    return () => unsubscribe();
  }, []);

  return {
    ...status,
    manualSync: () => syncService.syncQueue()
  };
}
