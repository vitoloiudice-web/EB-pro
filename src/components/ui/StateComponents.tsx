import React from 'react';

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    {icon && <div className="text-6xl mb-4 text-gray-400">{icon}</div>}
    <h3 className="text-xl font-semibold text-gray-700 mb-2">{title}</h3>
    {description && <p className="text-gray-500 text-center mb-6 max-w-sm">{description}</p>}
    {action && (
      <button
        onClick={action.onClick}
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        aria-label={action.label}
      >
        {action.label}
      </button>
    )}
  </div>
);

export const LoadingState: React.FC<{
  message?: string;
}> = ({ message = 'Caricamento...' }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4" role="status" aria-live="polite">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-300 border-t-blue-600 mb-4" />
    <p className="text-gray-600">{message}</p>
  </div>
);

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Errore', message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 bg-red-50 rounded-lg border border-red-200">
    <div className="text-6xl mb-4 text-red-500">⚠️</div>
    <h3 className="text-xl font-semibold text-red-700 mb-2">{title}</h3>
    <p className="text-red-600 text-center mb-6 max-w-sm">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        aria-label="Riprova"
      >
        Riprova
      </button>
    )}
  </div>
);
