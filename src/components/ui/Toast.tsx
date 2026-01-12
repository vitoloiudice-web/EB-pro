import React, { useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '✓';
    case 'error':
      return '✕';
    case 'warning':
      return '⚠';
    case 'info':
      return 'ⓘ';
  }
};

const getColors = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-800';
    case 'error':
      return 'bg-red-50 border-red-200 text-red-800';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'info':
      return 'bg-blue-50 border-blue-200 text-blue-800';
  }
};

export const ToastContainer: React.FC<{
  toasts: Toast[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => (
  <div className="fixed top-4 right-4 z-50 space-y-2" role="region" aria-label="Notifiche" aria-live="polite">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${getColors(toast.type)} animate-fade-in-up shadow-md max-w-sm`}
        role="alert"
      >
        <span className="text-xl font-bold">{getIcon(toast.type)}</span>
        <span className="flex-1">{toast.message}</span>
        <button
          onClick={() => onRemove(toast.id)}
          className="ml-2 text-lg hover:opacity-70 transition-opacity"
          aria-label="Chiudi notifica"
        >
          ×
        </button>
      </div>
    ))}
  </div>
);

/**
 * Hook per gestire Toast notifications
 */
export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string, duration: number = 3000) => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return {
    toasts,
    showToast,
    removeToast,
    success: (msg: string, duration?: number) => showToast('success', msg, duration),
    error: (msg: string, duration?: number) => showToast('error', msg, duration),
    warning: (msg: string, duration?: number) => showToast('warning', msg, duration),
    info: (msg: string, duration?: number) => showToast('info', msg, duration)
  };
}
