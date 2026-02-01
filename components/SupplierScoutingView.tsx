import React, { useState } from 'react';
import { Company, Item, Supplier, ScoutingResult } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import { geminiService } from '../services/geminiService';
import { usePaginatedData } from '../hooks/usePaginatedData';
import ScoutingActionModal from './ScoutingActionModal';

interface SupplierScoutingViewProps {
  company: Company;
}

const SupplierScoutingView: React.FC<SupplierScoutingViewProps> = ({ company }) => {
  // Mode Selection: Scout for Item Alternative OR Supplier Competitor
  const [scoutMode, setScoutMode] = useState<'ITEM' | 'SUPPLIER'>('ITEM');

  // Selection State
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  const [isSearching, setIsSearching] = useState(false);
  const [scoutingResult, setScoutingResult] = useState<ScoutingResult | null>(null);
  
  // Modal State
  const [isActionModalOpen, setActionModalOpen] = useState(false);
  const [selectedCandidateName, setSelectedCandidateName] = useState('');

  // Fetch Items 
  const { 
      data: items, 
      loading: loadingItems, 
      setSearch: setSearchItems, 
      search: searchItemsTerm 
  } = usePaginatedData<Item>({
    fetchMethod: (p, s, q) => googleSheetsService.getItems(company, p, s, q),
    pageSize: 10
  });

  // Fetch Suppliers
  const { 
      data: suppliers, 
      loading: loadingSuppliers, 
      setSearch: setSearchSuppliers, 
      search: searchSuppliersTerm 
  } = usePaginatedData<Supplier>({
    fetchMethod: (p, s, q) => googleSheetsService.getSuppliers(company, p, s, q),
    pageSize: 10
  });

  const handleModeSwitch = (mode: 'ITEM' | 'SUPPLIER') => {
      setScoutMode(mode);
      setSelectedItem(null);
      setSelectedSupplier(null);
      setScoutingResult(null);
  };

  const handleScout = async () => {
    const target = scoutMode === 'ITEM' ? selectedItem : selectedSupplier;
    if (!target) return;

    setIsSearching(true);
    setScoutingResult(null);
    try {
        let contextName = "N/A";

        if (scoutMode === 'ITEM') {
             // Try to resolve supplier name for the item
             const s = (target as Item).supplierId;
             // Ideally we fetch the name, simplified here:
             contextName = s; 
        } else {
             contextName = (target as Supplier).name;
        }

        const result = await geminiService.scoutSuppliers(target, contextName, scoutMode);
        setScoutingResult(result);
    } catch (error) {
        console.error(error);
        alert("Errore durante la ricerca.");
    } finally {
        setIsSearching(false);
    }
  };

  const openActionModal = () => {
      const name = prompt("Inserisci il nome del candidato per cui generare i documenti:");
      if (name) {
          setSelectedCandidateName(name);
          setActionModalOpen(true);
      }
  };

  // Skeleton Loader Component to prevent flickering
  const ListSkeleton = () => (
      <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>
          ))}
      </div>
  );

  return (
    <div className="flex flex-col h-full space-y-6 animate-fade-in relative">
      
      {(selectedItem || selectedSupplier) && (
          <ScoutingActionModal 
            isOpen={isActionModalOpen}
            onClose={() => setActionModalOpen(false)}
            candidateName={selectedCandidateName}
            itemName={scoutMode === 'ITEM' ? selectedItem!.name : 'Servizi Fornitura'}
            companyName={company.name}
          />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Supplier Scouting AI</h2>
          <p className="text-sm text-slate-500 font-medium">Motore di ricerca strategico per alternative e competitors</p>
        </div>
      </div>

      {/* LAYOUT FIX: Added min-h-0 to allow flex container to handle overflow correctly */}
      <div className="flex flex-col lg:flex-row gap-8 flex-1 lg:overflow-hidden min-h-0">
        
        {/* LEFT: Configuration Wizard */}
        {/* LAYOUT FIX: Added h-full, overflow-y-auto to allow scrolling the whole wizard column if it gets tall */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full overflow-y-auto custom-scrollbar pb-4">
            
            {/* Step 1: Mode Selection & List */}
            {/* LAYOUT FIX: Removed max-h-[60vh] to let it grow naturally within the scrollable column */}
            <div className="neu-flat p-6 flex flex-col">
                <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">1. Seleziona Obiettivo</h3>
                
                {/* Mode Toggle */}
                <div className="flex p-1 bg-slate-200 rounded-xl mb-4">
                    <button 
                        onClick={() => handleModeSwitch('ITEM')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scoutMode === 'ITEM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Per Articolo
                    </button>
                    <button 
                        onClick={() => handleModeSwitch('SUPPLIER')}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${scoutMode === 'SUPPLIER' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Per Fornitore
                    </button>
                </div>

                <input 
                    type="text" 
                    placeholder={scoutMode === 'ITEM' ? "Cerca SKU..." : "Cerca Ragione Sociale..."} 
                    className="neu-input w-full px-4 py-2 text-sm mb-4"
                    onChange={(e) => scoutMode === 'ITEM' ? setSearchItems(e.target.value) : setSearchSuppliers(e.target.value)}
                />

                <div className="overflow-y-auto custom-scrollbar flex-1 space-y-2 pr-2 min-h-[300px] max-h-[500px]">
                    {/* Render Items List with Stale-While-Revalidate pattern to avoid flicker */}
                    {scoutMode === 'ITEM' && (
                        <>
                            {/* Only show Skeleton if we have NO data and are loading. Otherwise show dimmed stale data */}
                            {loadingItems && items.length === 0 ? (
                                <ListSkeleton />
                            ) : (
                                <div className={`transition-opacity duration-300 ${loadingItems ? 'opacity-60' : 'opacity-100'}`}>
                                    {items.map(item => (
                                        <div 
                                            key={item.sku}
                                            onClick={() => setSelectedItem(item)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all border-l-4 mb-2 ${selectedItem?.sku === item.sku ? 'bg-blue-50 border-blue-500 shadow-inner' : 'border-transparent hover:bg-slate-50'}`}
                                        >
                                            <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                                            <div className="flex justify-between mt-1">
                                                <span className="text-xs text-slate-500 font-mono">{item.sku}</span>
                                                <span className="text-xs font-bold text-slate-400">{item.category}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {items.length === 0 && (
                                         <div className="p-8 text-center text-slate-400 italic text-xs border-2 border-dashed border-slate-200 rounded-xl">
                                            Nessun articolo trovato.
                                         </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Render Suppliers List */}
                    {scoutMode === 'SUPPLIER' && (
                        <>
                             {loadingSuppliers && suppliers.length === 0 ? (
                                <ListSkeleton />
                            ) : (
                                <div className={`transition-opacity duration-300 ${loadingSuppliers ? 'opacity-60' : 'opacity-100'}`}>
                                    {suppliers.map(sup => (
                                        <div 
                                            key={sup.id}
                                            onClick={() => setSelectedSupplier(sup)}
                                            className={`p-3 rounded-xl cursor-pointer transition-all border-l-4 mb-2 ${selectedSupplier?.id === sup.id ? 'bg-blue-50 border-blue-500 shadow-inner' : 'border-transparent hover:bg-slate-50'}`}
                                        >
                                            <div className="font-bold text-slate-700 text-sm">{sup.name}</div>
                                            <div className="flex justify-between mt-1">
                                                <div className="flex items-center">
                                                    <span className="text-amber-400 text-xs mr-1">★</span>
                                                    <span className="text-xs font-bold text-slate-500">{sup.rating}</span>
                                                </div>
                                                <span className="text-xs text-slate-400">{sup.email}</span>
                                            </div>
                                        </div>
                                    ))}
                                     {suppliers.length === 0 && (
                                         <div className="p-8 text-center text-slate-400 italic text-xs border-2 border-dashed border-slate-200 rounded-xl">
                                            Nessun fornitore trovato.
                                         </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Step 2: Confirmation & Launch */}
            {(selectedItem || selectedSupplier) && (
                <div className="neu-flat p-6 animate-fade-in">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">2. Conferma Parametri</h3>
                    <div className="space-y-3 mb-6 text-sm">
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Target</span>
                            <span className="font-bold text-slate-700">
                                {scoutMode === 'ITEM' ? selectedItem?.name : selectedSupplier?.name}
                            </span>
                        </div>
                        {scoutMode === 'ITEM' && (
                             <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Costo Base</span>
                                <span className="font-bold text-slate-700">€ {selectedItem?.cost}</span>
                             </div>
                        )}
                         {scoutMode === 'SUPPLIER' && (
                             <div className="flex justify-between border-b border-slate-100 pb-2">
                                <span className="text-slate-500">Rating Attuale</span>
                                <span className="font-bold text-slate-700">{selectedSupplier?.rating}/5</span>
                             </div>
                        )}
                        <div className="flex justify-between border-b border-slate-100 pb-2">
                            <span className="text-slate-500">Modalità</span>
                            <span className="font-bold text-blue-600 text-xs uppercase bg-blue-50 px-2 py-0.5 rounded">
                                {scoutMode === 'ITEM' ? 'Alternative Prodotto' : 'Competitor Check'}
                            </span>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleScout}
                        disabled={isSearching}
                        className={`w-full neu-btn py-4 text-white font-bold shadow-lg flex items-center justify-center ${isSearching ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}
                    >
                        {isSearching ? (
                            <>
                               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                                Ricerca in corso...
                            </>
                        ) : (
                            <>
                               <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                Avvia Scouting AI
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>

        {/* RIGHT: Results Area */}
        <div className="w-full lg:w-2/3 neu-flat p-8 flex flex-col lg:overflow-hidden relative h-full">
            {!scoutingResult && !isSearching ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
                    <svg className="w-24 h-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7m0 0L9 7" /></svg>
                    <p className="text-lg font-medium">Seleziona un target e avvia lo scouting per vedere i risultati.</p>
                </div>
            ) : isSearching ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6">
                     <div className="relative w-24 h-24">
                         <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                         <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                         </div>
                     </div>
                     <div className="text-center">
                         <h4 className="text-xl font-bold text-slate-700">Analisi Web in Corso</h4>
                         <p className="text-slate-500 mt-2">Gemini sta esplorando il web, confrontando specifiche e valutando opzioni...</p>
                     </div>
                </div>
            ) : scoutingResult && (
                <div className="flex flex-col h-full">
                    {/* Toolbar */}
                    <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-200">
                        <div className="flex items-center space-x-2">
                             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                             <span className="font-bold text-slate-700">Report Strategico Generato</span>
                        </div>
                        <button 
                            onClick={openActionModal}
                            className="neu-btn px-4 py-2 text-xs font-bold text-blue-600 border border-blue-100"
                        >
                            Genera Strategia Contatto
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                        
                        {/* AI Markdown Content */}
                        <div className="prose prose-sm prose-slate max-w-none">
                            <div className="whitespace-pre-wrap font-sans text-slate-700 leading-relaxed">
                                {scoutingResult.analysisText}
                            </div>
                        </div>

                        {/* Sources */}
                        {scoutingResult.sources.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 18v-1.478a2.008 2.008 0 00-1.041-1.71l-2.958-1.479zM6 12a2 2 0 00-2 2v1a1 1 0 01-1-1v-4a1 1 0 011-1h1z" clipRule="evenodd" /></svg>
                                    Fonti Web (Grounding)
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {scoutingResult.sources.map((src, idx) => (
                                        <a 
                                            key={idx} 
                                            href={src.uri} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="neu-pressed px-4 py-3 rounded-lg flex items-center group hover:bg-white transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-3 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <span className="text-xs font-bold">{idx + 1}</span>
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-xs font-bold text-slate-700 truncate">{src.title}</p>
                                                <p className="text-[10px] text-blue-500 truncate">{src.uri}</p>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default SupplierScoutingView;