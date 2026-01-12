import React from 'react';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../ui/Toast';
import { Pagination } from '../ui/Pagination';

interface PaginatedDataProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  pageSize?: number;
  title?: string;
  emptyMessage?: string;
  className?: string;
}

/**
 * Componente wrapper per dati paginati con notifiche
 */
export function PaginatedData<T extends { id: string }>({
  data,
  renderItem,
  pageSize = 10,
  title,
  emptyMessage = 'Nessun elemento trovato',
  className = ''
}: PaginatedDataProps<T>) {
  const { showToast } = useToast();
  const pagination = usePagination({
    items: data,
    pageSize
  });

  const currentData = pagination.getCurrentPageItems();

  React.useEffect(() => {
    if (data.length > 0) {
      showToast(`${data.length} elementi caricati`, 'info');
    }
  }, [data.length, showToast]);

  return (
    <div className={`space-y-4 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-slate-800">{title}</h3>}

      {currentData.length === 0 ? (
        <div className="text-center py-8 text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="space-y-2">{currentData.map((item, idx) => renderItem(item, idx))}</div>
      )}

      {data.length > pageSize && <Pagination {...pagination} />}
    </div>
  );
}
