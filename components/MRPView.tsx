import React, { useCallback, useState } from 'react';
import { Client, PurchaseOrder } from '../types';
import { dataService } from '../services/dataService';
import Pagination from './common/Pagination';
import PurchaseOrderModal from './PurchaseOrderModal';
import { usePaginatedData } from '../hooks/usePaginatedData';
import Tooltip from './common/Tooltip';

interface MRPViewProps {
  client: Client;
}

const MRPView: React.FC<MRPViewProps> = ({ client }) => {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [prefilledOrder, setPrefilledOrder] = useState<PurchaseOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const fetchMRP = useCallback((p: number, s: number, q: string) => {
    if (!client) return Promise.resolve({ data: [], total: 0 });
    return dataService.calculateMRP(client as any, p, s, q);
  }, [client]);

  const { data: rows, loading, total, page, setPage, pageSize, refresh } = usePaginatedData({
    fetchMethod: fetchMRP,
    pageSize: 50
  });

  const handleGenerateOrders = () => {
    const shortageItems = rows.filter((r: any) => r.isShortage);
    if (shortageItems.length === 0) {
      setError("Nessun articolo sottoscorta trovato per generare ordini.");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setError(null);

    const newOrder: any = {
      id: `PO-MRP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      supplierId: '',
      supplierName: '',
      status: 'DRAFT',
      totalAmount: shortageItems.reduce((acc: number, r: any) => acc + r.estimatedCost, 0),
      items: shortageItems.map((r: any) => ({
        sku: r.item.sku,
        description: r.item.name,
        qty: r.qtyToOrder,
        unitPrice: r.item.cost,
        total: r.estimatedCost
      })),
      trackingCode: ''
    };

    setPrefilledOrder(newOrder);
    setIsOrderModalOpen(true);
  };

  const handleSaveOrder = async (orderData: any) => {
    try {
      await dataService.saveOrder(client, orderData, true);
      setIsOrderModalOpen(false);
      setSuccess("Ordine d'acquisto generato con successo!");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch (err: any) {
      setError(`Errore generazione ordine: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="flex flex-col min-h-full space-y-6 animate-fade-in relative">
      {error && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-red-50 border border-red-200 rounded-xl shadow-xl text-red-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      <PurchaseOrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        initialData={prefilledOrder}
        onSave={handleSaveOrder}
        client={client}
      />

      <div className="flex justify-end">
        <Tooltip position="bottom" content={{ title: "Generazione Massiva Ordini", description: "Crea automaticamente proposte d'ordine per tutti gli articoli sottoscorta rilevati.", usage: "Clicca per avviare il wizard di creazione ordini." }}>
          <button onClick={handleGenerateOrders} className="neu-btn px-6 py-2.5 text-blue-600">
            Genera Ordini Acquisto
          </button>
        </Tooltip>
      </div>
      
      {/* Table Container - Neomorphic */}
      <div className="neu-flat flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#EEF2F6] z-10">
              <tr>
                <th className="p-4">Codice / Articolo</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Giacenza</th>
                <th className="p-4 text-right">Scorta Sic.</th>
                <th className="p-4 text-right">Da Ordinare</th>
                <th className="p-4">Data Ordine (Offset)</th>
                <th className="p-4 text-center">Semaforo</th>
              </tr>
            </thead>
            <tbody className="text-sm space-y-2">
              {loading ? (
                 <tr><td colSpan={7} className="p-10 text-center text-slate-400 animate-pulse font-medium">Calcolo MRP in corso...</td></tr>
              ) : rows.map((row: any, idx) => (
                <tr key={idx} className={row.isSubcontracting ? 'opacity-60 grayscale' : ''}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                        <div className="font-bold text-slate-700">{row.item.name}</div>
                        {row.isSubcontracting && <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 rounded font-bold">CONTO LAVORO</span>}
                    </div>
                    <div className="text-xs text-slate-400 font-mono font-bold">{row.item.sku}</div>
                  </td>
                  <td className="p-4 text-slate-500 font-semibold text-xs uppercase tracking-wide">{row.item.category}</td>
                  <td className="p-4 text-right font-mono text-slate-600 font-bold">{row.item.stock}</td>
                  <td className="p-4 text-right font-mono text-slate-400 font-medium">{row.item.safetyStock}</td>
                  <td className="p-4 text-right font-mono font-bold text-blue-600">
                    {row.qtyToOrder > 0 ? row.qtyToOrder : '-'}
                  </td>
                  <td className="p-4 text-slate-500 font-mono text-xs">
                    {row.qtyToOrder > 0 ? (
                        <div>
                            <span className="font-bold text-blue-700">{row.plannedOrderDate}</span>
                            <div className="text-[9px] text-slate-400">Req: {row.requirementDate}</div>
                        </div>
                    ) : '-'}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center">
                        {row.status === 'RED' && (
                            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse" title="Critico: Mancanza materiali"></div>
                        )}
                        {row.status === 'YELLOW' && (
                            <div className="w-4 h-4 rounded-full bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.5)]" title="Attenzione: Sottoscorta"></div>
                        )}
                        {row.status === 'GREEN' && (
                            <div className="w-4 h-4 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" title="Ottimale"></div>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nessun dato disponibile.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 px-2">
          <Pagination 
            currentPage={page}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default MRPView;