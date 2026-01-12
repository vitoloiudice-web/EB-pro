import React from 'react';
import { EmptyState, LoadingState } from './ui/StateComponents';

interface Column<T> {
  key: keyof T | 'actions';
  label: string;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface AccessibleTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRetry?: () => void;
  onRowClick?: (row: T) => void;
  keyField: keyof T;
  caption: string; // Obbligatorio per accessibilità
  rowAriaLabel?: (row: T) => string;
}

export const AccessibleTable = React.forwardRef<HTMLTableElement, AccessibleTableProps<any>>(
  ({
    data,
    columns,
    loading = false,
    error = null,
    emptyMessage = 'Nessun dato disponibile',
    onRetry,
    onRowClick,
    keyField,
    caption,
    rowAriaLabel
  }, ref) => {
    
    if (loading) {
      return <LoadingState message="Caricamento dati..." />;
    }

    if (error) {
      return (
        <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">Errore nel caricamento</h3>
          <p className="text-red-700 mb-3">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              aria-label="Riprova a caricare"
            >
              Riprova
            </button>
          )}
        </div>
      );
    }

    if (data.length === 0) {
      return <EmptyState title={emptyMessage} />;
    }

    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table
          ref={ref}
          className="w-full border-collapse"
          role="table"
          aria-label={caption}
        >
          <caption className="sr-only">{caption}</caption>
          
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr role="row">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-4 py-3 text-left font-semibold text-gray-700 text-sm ${col.width || 'auto'}`}
                  scope="col"
                  role="columnheader"
                  aria-sort={col.sortable ? 'none' : undefined}
                >
                  {col.sortable ? (
                    <button
                      className="flex items-center gap-2 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-1 py-1"
                      aria-label={`Ordina per ${col.label}`}
                    >
                      {col.label}
                      <span className="text-xs text-gray-400">⇅</span>
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row, index) => (
              <tr
                key={String(row[keyField])}
                role="row"
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                onClick={() => onRowClick?.(row)}
                aria-label={rowAriaLabel?.(row)}
                tabIndex={onRowClick ? 0 : -1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && onRowClick) {
                    onRowClick(row);
                  }
                }}
              >
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className="px-4 py-3 text-sm text-gray-700"
                    role="cell"
                  >
                    {col.key === 'actions'
                      ? col.render?.(row, index)
                      : col.render
                        ? col.render(row, index)
                        : String(row[col.key] || '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
);

AccessibleTable.displayName = 'AccessibleTable';
