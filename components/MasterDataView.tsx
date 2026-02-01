import React, { useState, useCallback } from 'react';
import { Company, Item, Supplier, Customer } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import Pagination from './common/Pagination';
import { usePaginatedData } from '../hooks/usePaginatedData';

interface MasterDataViewProps {
  company: Company;
}

type TabType = 'ITEMS' | 'SUPPLIERS' | 'CUSTOMERS';

const MasterDataView: React.FC<MasterDataViewProps> = ({ company }) => {
  const [activeTab, setActiveTab] = useState<TabType>('ITEMS');

  // Define fetchers wrapped in useCallback to prevent infinite loops in hook
  const fetchItems = useCallback((p: number, s: number, q: string) => googleSheetsService.getItems(company, p, s, q), [company]);
  const fetchSuppliers = useCallback((p: number, s: number, q: string) => googleSheetsService.getSuppliers(company, p, s, q), [company]);
  const fetchCustomers = useCallback((p: number, s: number, q: string) => googleSheetsService.getCustomers(company, p, s, q), [company]);

  // Hooks for each tab
  // Note: In a larger app, we might conditionally render components to avoid calling all hooks at once, 
  // but for this scale, declaring them is fine, or we can use a dynamic fetcher.
  // Let's use a dynamic fetcher strategy for cleaner code.
  
  const getActiveFetcher = () => {
      switch(activeTab) {
          case 'ITEMS': return fetchItems;
          case 'SUPPLIERS': return fetchSuppliers;
          case 'CUSTOMERS': return fetchCustomers;
      }
  };

  const { 
    data, loading, total, page, setPage, search, setSearch, pageSize 
  } = usePaginatedData<Item | Supplier | Customer>({
    fetchMethod: getActiveFetcher(),
    pageSize: 15
  });

  // Type Guards for rendering
  const isItem = (x: any): x is Item => activeTab === 'ITEMS';
  const isSupplier = (x: any): x is Supplier => activeTab === 'SUPPLIERS';
  const isCustomer = (x: any): x is Customer => activeTab === 'CUSTOMERS';

  return (
    <div className="space-y-6 flex flex-col h-full animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Anagrafiche</h2>
          <p className="text-sm text-slate-500 font-medium">Database centrale</p>
        </div>
        <button className="neu-btn px-6 py-2.5 text-blue-600">
           + Nuova Voce
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-6 justify-between items-center">
        <div className="flex space-x-4">
            {(['ITEMS', 'SUPPLIERS', 'CUSTOMERS'] as TabType[]).map((tab) => (
            <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); setSearch(''); }}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab 
                ? 'neu-pressed text-blue-600' 
                : 'neu-flat text-slate-500 hover:text-slate-700'
                }`}
            >
                {tab === 'ITEMS' && 'Articoli'}
                {tab === 'SUPPLIERS' && 'Fornitori'}
                {tab === 'CUSTOMERS' && 'Clienti'}
            </button>
            ))}
        </div>
        <div className="relative w-full sm:w-72">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input 
              type="text"
              className="neu-input w-full pl-10 pr-4 py-2 text-sm text-slate-600 font-medium placeholder-slate-400"
              placeholder={`Cerca in ${activeTab.toLowerCase()}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      {/* Content Area */}
      <div className="neu-flat flex-1 flex flex-col p-4 overflow-hidden">
        
          <div className="overflow-auto flex-1 custom-scrollbar rounded-xl">
            <table className="w-full text-left">
                <thead className="sticky top-0 bg-[#EEF2F6] z-10">
                  <tr>
                    {activeTab === 'ITEMS' && (
                        <>
                            <th className="p-4">SKU</th>
                            <th className="p-4">Descrizione</th>
                            <th className="p-4">Categoria</th>
                            <th className="p-4 text-right">Costo Std.</th>
                            <th className="p-4 text-right">Lead Time</th>
                            <th className="p-4">Fornitore</th>
                        </>
                    )}
                    {activeTab === 'SUPPLIERS' && (
                         <>
                            <th className="p-4">ID</th>
                            <th className="p-4">Ragione Sociale</th>
                            <th className="p-4">Rating</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Pagamento</th>
                         </>
                    )}
                     {activeTab === 'CUSTOMERS' && (
                         <>
                            <th className="p-4">Cliente</th>
                            <th className="p-4">P.IVA</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Zona</th>
                            <th className="p-4">Pagamento</th>
                         </>
                    )}
                    <th className="p-4 text-center w-24">Azioni</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  
                  {loading && (
                      <tr><td colSpan={7} className="p-10 text-center text-slate-500 animate-pulse">Caricamento in corso...</td></tr>
                  )}

                  {!loading && activeTab === 'ITEMS' && (data as Item[]).map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-4 font-mono text-xs font-bold text-slate-500">{item.sku}</td>
                      <td className="p-4 font-bold text-slate-700">{item.name}</td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold text-slate-500 bg-slate-200">
                          {item.category}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-slate-600">€ {item.cost.toFixed(2)}</td>
                      <td className="p-4 text-right font-medium text-slate-500">{item.leadTimeDays} gg</td>
                      <td className="p-4 text-slate-500 text-sm">{item.supplierId}</td>
                      <td className="p-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">Edit</button>
                      </td>
                    </tr>
                  ))}

                  {!loading && activeTab === 'SUPPLIERS' && (data as Supplier[]).map((sup, idx) => (
                    <tr key={idx}>
                      <td className="p-4 font-mono text-xs text-slate-500">{sup.id}</td>
                      <td className="p-4 font-bold text-slate-700">{sup.name}</td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <span className="text-amber-400 mr-1 text-lg">★</span>
                          <span className="text-slate-700 font-bold">{sup.rating}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">{sup.email}</td>
                      <td className="p-4 text-slate-500 text-sm">{sup.paymentTerms}</td>
                      <td className="p-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">View</button>
                      </td>
                    </tr>
                  ))}

                  {!loading && activeTab === 'CUSTOMERS' && (data as Customer[]).map((cust, idx) => (
                     <tr key={idx}>
                      <td className="p-4">
                        <div className="font-bold text-slate-700">{cust.name}</div>
                        <div className="text-xs text-slate-400">{cust.address}</div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{cust.vatNumber}</td>
                      <td className="p-4 text-blue-600 text-sm cursor-pointer">{cust.email}</td>
                      <td className="p-4 text-slate-600 text-sm">{cust.region}</td>
                      <td className="p-4 text-slate-500 text-sm">{cust.paymentTerms}</td>
                      <td className="p-4 text-center">
                        <button className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase">View</button>
                      </td>
                    </tr>
                  ))}

                  {!loading && data.length === 0 && (
                     <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nessun elemento trovato.</td></tr>
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

export default MasterDataView;