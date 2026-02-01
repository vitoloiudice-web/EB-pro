import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Company, PurchaseOrder, LogisticsEvent, Supplier } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import Pagination from './common/Pagination';
import ImportWizard from './ImportWizard';
import { usePaginatedData } from '../hooks/usePaginatedData';

interface LogisticsViewProps {
  company: Company;
  initialFilter?: string;
}

const LogisticsView: React.FC<LogisticsViewProps> = ({ company, initialFilter }) => {
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'INBOUND'>('ORDERS');
  const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

  // --- STATISTICS (Separate fetch, lightweight) ---
  const [stats, setStats] = useState({ openOrders: 0, incomingValue: 0, delayed: 0 });
  
  useEffect(() => {
      // In a real optimized app, this would be a separate aggregation API endpoint
      // For now we simulate it by fetching a small subset or metadata
      const loadStats = async () => {
          // This is a placeholder. Real implementation would call a summary endpoint.
          setStats({ openOrders: 12, incomingValue: 45000, delayed: 2 });
      };
      loadStats();
  }, [company]);

  // --- ACTIONS ---
  const createOrder = () => alert("Logica creazione ordine: Apertura modale selezione articoli da MRP.");
  const importOrders = (newOrders: PurchaseOrder[]) => alert("Import completato (aggiornare lista).");
  const receiveGoods = (id: string) => alert(`Ricezione merce per Ordine ${id}`);
  const downloadDDT = (id: string) => alert(`Download DDT ${id}`);

  // --- PAGINATED DATA FETCHING ---
  const fetchOrders = useCallback((p: number, s: number, q: string) => googleSheetsService.getOrders(company, p, s, q), [company]);
  const fetchEvents = useCallback((p: number, s: number, q: string) => googleSheetsService.getLogisticsEvents(company, p, s, q), [company]);

  const { 
      data, loading, total, page, setPage, search, setSearch, pageSize, refresh 
  } = usePaginatedData<PurchaseOrder | LogisticsEvent>({
      fetchMethod: activeTab === 'ORDERS' ? fetchOrders : fetchEvents,
      pageSize: 15,
      initialSearch: initialFilter || ''
  });

  // Reset page when tab changes
  useEffect(() => {
      setPage(1);
      setSearch('');
  }, [activeTab]);

  const getStatusBadge = (status: string) => {
    let colorClass = "text-slate-600 bg-slate-200";
    if (['SENT', 'TRANSIT'].includes(status)) colorClass = "text-blue-600 bg-blue-100";
    if (['CONFIRMED'].includes(status)) colorClass = "text-indigo-600 bg-indigo-100";
    if (['SHIPPED'].includes(status)) colorClass = "text-amber-600 bg-amber-100";
    if (['RECEIVED', 'DELIVERED'].includes(status)) colorClass = "text-emerald-600 bg-emerald-100";
    if (['CANCELLED', 'EXCEPTION'].includes(status)) colorClass = "text-red-600 bg-red-100";
    if (['DRAFT'].includes(status)) colorClass = "text-slate-500 bg-slate-100 border border-dashed border-slate-300";

    return <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${colorClass}`}>{status}</span>;
  };

  const handleImportSuccess = (newOrders: PurchaseOrder[]) => {
      importOrders(newOrders);
      setIsImportWizardOpen(false);
      refresh();
  };

  return (
    <div className="flex flex-col h-full space-y-8 relative animate-fade-in">
      <ImportWizard 
        isOpen={isImportWizardOpen} 
        onClose={() => setIsImportWizardOpen(false)} 
        onImportComplete={handleImportSuccess}
      />

      {/* HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Logistica & Ordini</h2>
          <p className="text-sm text-slate-500 font-medium">Tracking approvvigionamenti</p>
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
            <button 
                onClick={() => setIsImportWizardOpen(true)}
                className="neu-btn px-5 py-2 text-sm flex-1 sm:flex-none whitespace-nowrap"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                Importa Excel
            </button>
            <button onClick={createOrder} className="neu-btn px-5 py-2 text-sm text-blue-600 flex-1 sm:flex-none whitespace-nowrap">
                Nuovo Ordine
            </button>
        </div>
      </div>

      {/* KPI CARDS (Static for now, usually async) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="neu-flat p-5 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Ordini Aperti</p>
                  <p className="text-2xl font-black text-slate-700 mt-1">{stats.openOrders}</p>
              </div>
              <div className="w-12 h-12 rounded-full neu-pressed flex items-center justify-center text-blue-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              </div>
          </div>
          <div className="neu-flat p-5 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Valore in Transito</p>
                  <p className="text-2xl font-black text-slate-700 mt-1">€ {stats.incomingValue.toLocaleString('it-IT')}</p>
              </div>
              <div className="w-12 h-12 rounded-full neu-pressed flex items-center justify-center text-amber-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
          </div>
          <div className="neu-flat p-5 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">Anomalie</p>
                  <p className="text-2xl font-black text-red-500 mt-1">{stats.delayed}</p>
              </div>
              <div className="w-12 h-12 rounded-full neu-pressed flex items-center justify-center text-red-500">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
          </div>
      </div>

      {/* CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto justify-center sm:justify-start">
              <button
                onClick={() => setActiveTab('ORDERS')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'ORDERS' ? 'neu-pressed text-blue-600' : 'neu-flat text-slate-500 hover:text-slate-700'}`}
              >
                  Ordini Fornitori
              </button>
              <button
                onClick={() => setActiveTab('INBOUND')}
                className={`px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'INBOUND' ? 'neu-pressed text-blue-600' : 'neu-flat text-slate-500 hover:text-slate-700'}`}
              >
                  Tracking & Inbound
              </button>
          </div>
          <div className="relative w-full sm:w-72">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
                type="text"
                placeholder={activeTab === 'ORDERS' ? "Cerca ordine..." : "Cerca tracking..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="neu-input w-full pl-10 pr-4 py-2 text-sm text-slate-600 font-medium placeholder-slate-400"
            />
          </div>
      </div>

      {/* DATA TABLE AREA */}
      <div className="neu-flat flex-1 flex flex-col p-4 overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
             <table className="w-full text-left">
                 <thead className="sticky top-0 bg-[#EEF2F6] z-10">
                     <tr>
                         {activeTab === 'ORDERS' ? (
                             <>
                                <th className="p-4">Rif. Ordine</th>
                                <th className="p-4">Data</th>
                                <th className="p-4">Fornitore</th>
                                <th className="p-4 text-right">Totale</th>
                                <th className="p-4 text-center">Stato</th>
                                <th className="p-4 text-center">Azioni</th>
                             </>
                         ) : (
                             <>
                                <th className="p-4">Riferimento</th>
                                <th className="p-4">Corriere / Tracking</th>
                                <th className="p-4">Data Arrivo</th>
                                <th className="p-4 text-center">Colli</th>
                                <th className="p-4 text-center">Stato</th>
                                <th className="p-4 text-center">Documenti</th>
                             </>
                         )}
                     </tr>
                 </thead>
                 <tbody className="space-y-2">
                     {loading ? (
                         <tr><td colSpan={6} className="p-10 text-center text-slate-500 animate-pulse">Caricamento dati...</td></tr>
                     ) : activeTab === 'ORDERS' ? (
                         (data as PurchaseOrder[]).map((order) => (
                             <tr key={order.id}>
                                 <td className="p-4 font-mono font-bold text-slate-600">{order.id}</td>
                                 <td className="p-4 text-slate-500 text-sm font-medium">{order.date}</td>
                                 <td className="p-4 font-bold text-slate-700">{order.supplierName}</td>
                                 <td className="p-4 text-right font-mono text-slate-600">€ {order.totalAmount.toLocaleString('it-IT', {minimumFractionDigits: 2})}</td>
                                 <td className="p-4 text-center">
                                     {getStatusBadge(order.status)}
                                 </td>
                                 <td className="p-4 text-center">
                                     {order.status === 'SHIPPED' ? (
                                         <button 
                                            onClick={() => receiveGoods(order.id)}
                                            className="text-emerald-600 hover:text-emerald-700 font-bold text-xs uppercase tracking-wide"
                                         >
                                             Ricevi
                                         </button>
                                     ) : (
                                         <button className="text-blue-600 hover:text-blue-700 font-bold text-xs uppercase tracking-wide">Dettagli</button>
                                     )}
                                 </td>
                             </tr>
                         ))
                     ) : (
                         (data as LogisticsEvent[]).map((event) => (
                             <tr key={event.id}>
                                 <td className="p-4">
                                     <div className="font-bold text-slate-700">{event.referenceId}</div>
                                     <div className="text-xs text-slate-400 font-mono">{event.id}</div>
                                 </td>
                                 <td className="p-4">
                                     <div className="text-slate-700 font-medium">{event.courier}</div>
                                     <div className="text-xs text-blue-500 font-mono">{event.tracking}</div>
                                 </td>
                                 <td className="p-4 text-slate-500 font-medium">{event.date}</td>
                                 <td className="p-4 text-center font-mono text-slate-600 font-bold">{event.itemsCount}</td>
                                 <td className="p-4 text-center">
                                     {getStatusBadge(event.status)}
                                 </td>
                                 <td className="p-4 text-center">
                                     <button 
                                        onClick={() => downloadDDT(event.id)}
                                        className="neu-icon-btn w-8 h-8 mx-auto"
                                     >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                     </button>
                                 </td>
                             </tr>
                         ))
                     )}
                     {!loading && data.length === 0 && (
                        <tr><td colSpan={6} className="p-8 text-center text-slate-400 italic">Nessun dato disponibile.</td></tr>
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

export default LogisticsView;