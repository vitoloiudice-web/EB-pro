import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '../../types';
import { Pagination } from '../ui/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { useToast } from '../ui/Toast';
import { LoadingState, ErrorState, EmptyState } from '../ui/StateComponents';

interface PurchasingTableProps {
  orders: PurchaseOrder[];
  loading: boolean;
  error?: string;
  onOrderClick: (order: PurchaseOrder) => void;
  onDeleteOrder: (orderId: string) => Promise<void>;
  pageSize?: number;
}

export const PurchasingTable: React.FC<PurchasingTableProps> = ({
  orders,
  loading,
  error,
  onOrderClick,
  onDeleteOrder,
  pageSize = 10
}) => {
  const { showToast } = useToast();
  const pagination = usePagination({
    items: orders,
    pageSize
  });

  const [deleting, setDeleting] = useState<string | null>(null);

  const handleDelete = async (orderId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;

    setDeleting(orderId);
    try {
      await onDeleteOrder(orderId);
      showToast('success', 'Ordine eliminato');
    } catch (err) {
      showToast('error', 'Errore durante l\'eliminazione');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return <LoadingState message="Caricamento ordini di acquisto..." />;
  }

  if (error) {
    return <ErrorState title="Errore" message={error} />;
  }

  if (orders.length === 0) {
    return <EmptyState title="Nessun ordine" description="Crea il primo ordine di acquisto" />;
  }

  const currentOrders = pagination.getCurrentPageItems();

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Numero Ordine
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Fornitore
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Data
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Importo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">
                Stato
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {currentOrders.map((order) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-4">
                  <button
                    onClick={() => onOrderClick(order)}
                    className="text-epicor-600 hover:underline font-medium"
                  >
                    {order.customId || order.id}
                  </button>
                </td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {order.vendor}
                </td>
                <td className="px-6 py-4 text-sm text-slate-600">
                  {new Date(order.date).toLocaleDateString('it-IT')}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                  € {order.amount.toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${order.status === 'Closed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'Open' || order.status === 'Approved'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                  >
                    {order.status === 'Closed'
                      ? 'Chiuso'
                      : order.status === 'Open'
                        ? 'Aperto'
                        : order.status === 'Approved'
                          ? 'Approvato'
                          : order.status === 'Draft'
                            ? 'Bozza'
                            : order.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => onOrderClick(order)}
                      className="text-epicor-600 hover:text-epicor-700 text-sm font-medium"
                      aria-label={`Modifica ordine ${order.customId || order.id}`}
                    >
                      Modifica
                    </button>
                    <button
                      onClick={() => handleDelete(order.id)}
                      disabled={deleting === order.id}
                      className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50"
                      aria-label={`Elimina ordine ${order.customId || order.id}`}
                    >
                      {deleting === order.id ? 'Eliminazione...' : 'Elimina'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length > pageSize && <Pagination {...pagination} />}
    </div>
  );
};
