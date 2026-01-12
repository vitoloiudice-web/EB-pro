
import React, { useState, useEffect } from 'react';
import { fetchParts, addPart, updatePart, findPartByManufacturerCode, fetchPartSiblings, AVAILABLE_TENANTS } from '../services/dataService';
import { Part, SupplierInfo } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface InventoryProps {
    tenantId: string;
    isMultiTenant: boolean;
}

// Helper for empty supplier
const emptySupplier = (): SupplierInfo => ({ name: '', partCode: '', price: 0, moq: 0, leadTime: 0 });

type InventoryTab = 'registry' | 'search' | 'stats';

const Inventory: React.FC<InventoryProps> = ({ tenantId, isMultiTenant }) => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('registry');
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Edit & Detail State
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null); // To hold full obj
  const [siblingParts, setSiblingParts] = useState<Part[]>([]);

  // Search Tab State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'sku' | 'desc' | 'internal'>('all');

  // Stats Tab State
  const [statsSelectedPart, setStatsSelectedPart] = useState<Part | null>(null);

  // --- FORM STATE ---
  const [skuComp, setSkuComp] = useState({
    category: '', family: '', product: '', variant: '', progressive: '0001'
  });
  const [internalCode, setInternalCode] = useState(''); // NEW: Internal Tenant Code
  const [description, setDescription] = useState('');
  const [uom, setUom] = useState('PZ');
  
  const [manufacturer, setManufacturer] = useState<SupplierInfo>(emptySupplier());
  const [habitualSupplier, setHabitualSupplier] = useState<SupplierInfo>(emptySupplier());
  const [altSuppliers, setAltSuppliers] = useState<SupplierInfo[]>(Array(6).fill(null).map(emptySupplier)); 
  
  const [stockInfo, setStockInfo] = useState({ stock: 0, safety: 0 });
  
  // Computed SKU
  const currentSKU = `${skuComp.category}-${skuComp.family}-${skuComp.product}-${skuComp.variant}-${skuComp.progressive}`.toUpperCase().replace(/-+/g, '-').replace(/-$/, '');

  useEffect(() => {
    loadParts();
    // Reset stats selection when switching tenants to avoid stale data display
    setStatsSelectedPart(null);
  }, [tenantId, isMultiTenant]);

  // Description Auto-suggestion logic
  useEffect(() => {
    if (skuComp.category.length > 2 && modalMode === 'create') {
      const suggestions: Record<string, string> = {
        'IDRA': 'Componente Idraulico - ',
        'ELET': 'Scheda Elettronica - ',
        'MECC': 'Parte Meccanica - ',
        'GUARN': 'Kit Guarnizioni - '
      };
      const prefix = skuComp.category.substring(0, 4).toUpperCase();
      if (suggestions[prefix] && (description === '' || Object.values(suggestions).some(s => description.startsWith(s)))) {
        setDescription(suggestions[prefix]);
      }
    }
  }, [skuComp.category]);

  const loadParts = async () => {
    setLoading(true);
    const effectiveFilter = isMultiTenant ? 'all' : tenantId;
    const data = await fetchParts(effectiveFilter);
    setParts(data);
    setLoading(false);
  };

  const handleAltSupplierChange = (index: number, field: keyof SupplierInfo, value: any) => {
    const updated = [...altSuppliers];
    updated[index] = { ...updated[index], [field]: value };
    setAltSuppliers(updated);
  };

  // --- GLOBAL LOOKUP LOGIC ---
  const handleManufacturerCodeBlur = async () => {
      if (!manufacturer.partCode || manufacturer.partCode.length < 3) return;

      const foundPart = await findPartByManufacturerCode(manufacturer.partCode);
      if (foundPart) {
          if (confirm(`Parte trovata nel Network Globale: "${foundPart.description}". Vuoi importare i dati anagrafici?`)) {
              populateForm(foundPart);
          }
      }
  };

  const populateForm = (part: Part) => {
      // 1. SKU Decomposition logic
      if (part.skuComponents) {
          setSkuComp(part.skuComponents);
      } else {
          // Fallback for Legacy/Mock Data: Try to parse SKU string to fill required fields
          const chunks = part.sku.split('-');
          setSkuComp({
             category: chunks[0] || '',
             family: chunks[1] || '',
             product: chunks[2] || '',
             variant: chunks[3] || '',
             progressive: chunks.length > 4 ? chunks[4] : (chunks.length === 3 ? chunks[2] : '0001') // Try to preserve logic or default
          });
      }

      setInternalCode(part.internalCode || ''); 
      setDescription(part.description);
      setUom(part.uom);
      if (part.manufacturer) setManufacturer(part.manufacturer);
      if (part.suppliers?.habitual) setHabitualSupplier(part.suppliers.habitual);
      if (part.suppliers?.alternatives) {
          const alts = Array(6).fill(null).map(emptySupplier);
          part.suppliers.alternatives.forEach((a, i) => { if(i < 6) alts[i] = a; });
          setAltSuppliers(alts);
      }
      setStockInfo({ stock: part.stock, safety: part.safetyStock });
  };

  const handleRowClick = async (part: Part) => {
      setModalMode('edit');
      setSelectedPartId(part.id);
      setSelectedPart(part); // Store full part for history view
      populateForm(part);
      
      // Fetch siblings for cross-tenant view
      const siblings = await fetchPartSiblings(part.sku, part.tenantId);
      setSiblingParts(siblings);

      setShowModal(true);
  };

  const handleOpenCreate = () => {
      setModalMode('create');
      setSelectedPartId(null);
      setSelectedPart(null);
      resetForm();
      setSiblingParts([]);
      setShowModal(true);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if(isMultiTenant && modalMode === 'create') {
        alert("Attenzione: Creazione parte assegnata al tenant principale (Main Corp).");
    }

    // --- INTEGRITY CHECK ---
    let finalSku = currentSKU;
    
    if (manufacturer.partCode && manufacturer.partCode.length > 2) {
        const existingGlobalPart = await findPartByManufacturerCode(manufacturer.partCode);
        if (existingGlobalPart && existingGlobalPart.id !== selectedPartId && existingGlobalPart.sku !== currentSKU) {
            const userConfirmed = confirm(
                `⚠️ CONFLITTO SKU RILEVATO\n\n` +
                `Il Codice Produttore "${manufacturer.partCode}" è già registrato nel sistema sotto lo SKU Globale:\n` +
                `👉 ${existingGlobalPart.sku}\n\n` +
                `Il sistema non permette SKU multipli per lo stesso codice produttore fisico.\n` +
                `Cliccando OK, il sistema forzerà l'uso dello SKU "${existingGlobalPart.sku}" per questa anagrafica.`
            );
            if (!userConfirmed) return; 
            finalSku = existingGlobalPart.sku;
        }
    }

    const commonData = {
      sku: finalSku, // Use the validated SKU
      skuComponents: skuComp,
      internalCode, // Save internal code
      description,
      uom,
      category: skuComp.category,
      manufacturer: manufacturer.name ? manufacturer : undefined,
      suppliers: {
        habitual: habitualSupplier,
        alternatives: altSuppliers.filter(s => s.name !== '') 
      },
      stock: stockInfo.stock,
      safetyStock: stockInfo.safety,
      cost: habitualSupplier.price || manufacturer.price || 0,
      leadTime: habitualSupplier.leadTime || manufacturer.leadTime || 0
    };

    try {
        if (modalMode === 'create') {
            await addPart({
                tenantId: isMultiTenant ? 'main' : tenantId,
                ...commonData
            });
        } else if (modalMode === 'edit' && selectedPartId) {
            // Find existing part to keep tenantId
            const existing = parts.find(p => p.id === selectedPartId);
            if (existing) {
                await updatePart({
                    id: selectedPartId,
                    tenantId: existing.tenantId,
                    ...commonData
                });
            }
        }
    } catch (error) {
        console.error("Error saving part:", error);
        alert("Errore durante il salvataggio. Controlla la console.");
        return;
    }

    setShowModal(false);
    resetForm();
    loadParts();
  };

  const resetForm = () => {
    setSkuComp({ category: '', family: '', product: '', variant: '', progressive: '0001' });
    setInternalCode('');
    setDescription('');
    setUom('PZ');
    setManufacturer(emptySupplier());
    setHabitualSupplier(emptySupplier());
    setAltSuppliers(Array(6).fill(null).map(emptySupplier));
    setStockInfo({ stock: 0, safety: 0 });
  };

  // --- FILTER & SEARCH HELPERS ---
  const filteredParts = parts.filter(p => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      if (searchFilter === 'sku') return p.sku.toLowerCase().includes(q);
      if (searchFilter === 'desc') return p.description.toLowerCase().includes(q);
      if (searchFilter === 'internal') return p.internalCode?.toLowerCase().includes(q);
      
      // Default 'all'
      return p.sku.toLowerCase().includes(q) || 
             p.description.toLowerCase().includes(q) || 
             p.internalCode?.toLowerCase().includes(q) ||
             p.manufacturer?.partCode.toLowerCase().includes(q);
  });


  // --- SUB-COMPONENT RENDERERS ---

  const renderSupplierInputs = (
      title: string, 
      data: SupplierInfo, 
      onChange: (field: keyof SupplierInfo, val: any) => void, 
      bgColor: string = 'bg-slate-50',
      onBlurCode?: () => void
    ) => (
    <div className={`p-4 rounded-lg border border-slate-200 ${bgColor} space-y-3`}>
      <h4 className="font-bold text-sm text-slate-700 uppercase">{title}</h4>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 flex gap-2">
            <div className="flex-1">
                <label className="text-xs text-slate-500">Nome {title === 'Produzione' ? 'Produttore' : 'Fornitore'}</label>
                <input type="text" className="w-full border rounded px-2 py-1 text-sm" 
                    value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Es. Bosch Rexroth" />
            </div>
            <div className="flex-1">
                 <label className="text-xs text-slate-500 font-bold">Cod. Art. {title.includes('Produzione') ? '(Produttore)' : '(Fornitore)'} {onBlurCode && '🔎'}</label>
                 <input type="text" className={`w-full border rounded px-2 py-1 text-sm font-mono ${onBlurCode ? 'border-blue-300 focus:ring-blue-500 bg-white' : ''}`}
                    value={data.partCode} 
                    onChange={e => onChange('partCode', e.target.value)} 
                    onBlur={onBlurCode} 
                    placeholder={onBlurCode ? "Cerca Globale..." : "Codice..."}
                 />
            </div>
        </div>
        
        <div>
           <label className="text-xs text-slate-500">Prezzo (€)</label>
           <input type="number" className="w-full border rounded px-2 py-1 text-sm"
            value={data.price} onChange={e => onChange('price', Number(e.target.value))} />
        </div>
        <div>
           <label className="text-xs text-slate-500">MOQ</label>
           <input type="number" className="w-full border rounded px-2 py-1 text-sm"
            value={data.moq} onChange={e => onChange('moq', Number(e.target.value))} />
        </div>
        <div>
           <label className="text-xs text-slate-500">Lead Time (gg)</label>
           <input type="number" className="w-full border rounded px-2 py-1 text-sm"
            value={data.leadTime} onChange={e => onChange('leadTime', Number(e.target.value))} />
        </div>
      </div>
    </div>
  );

  // --- STATS BOM FILTER LOGIC ---
  const visibleBomUsages = statsSelectedPart?.bomUsage?.filter(usage => {
      // If we are in Multi-Tenant View, show ALL usages
      if (isMultiTenant) return true;
      // If Single Tenant, show ONLY usages for that tenant (or legacy items without tenantId)
      return usage.tenantId === tenantId || !usage.tenantId;
  }) || [];

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">
               Magazzino & Anagrafica {isMultiTenant && '(Global View)'}
            </h2>
           <p className="text-slate-500 text-sm">Gestione parti, ricerche e analisi di utilizzo</p>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-lg">
            <button 
                onClick={() => setActiveTab('registry')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'registry' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
                1. Anagrafica Articoli
            </button>
            <button 
                onClick={() => setActiveTab('search')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'search' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
                2. Ricerca Avanzata
            </button>
            <button 
                onClick={() => setActiveTab('stats')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'stats' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
            >
                3. Statistiche & BOM
            </button>
        </div>
      </div>


      {/* 2. TAB CONTENT: REGISTRY (ANAGRAFICA) */}
      {activeTab === 'registry' && (
          <div className="animate-fade-in-up">
              <div className="flex justify-end mb-4">
                <button onClick={handleOpenCreate} className="bg-epicor-600 text-white px-4 py-2 rounded-md hover:bg-epicor-700 shadow-md flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuova Parte
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU / Cod. Int.</th>
                      {isMultiTenant && <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Tenant</th>}
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dati Prodotto</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Dati Fornitore</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prezzo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {loading ? <tr><td colSpan={isMultiTenant ? 6 : 5} className="p-4 text-center">Loading...</td></tr> : parts.map(part => (
                      <tr key={part.id} onClick={() => handleRowClick(part)} className="cursor-pointer hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                            <div className="text-sm font-bold text-epicor-600">{part.sku}</div>
                            {part.internalCode && <div className="text-xs text-slate-400 font-mono mt-0.5">Ref: {part.internalCode}</div>}
                        </td>
                        {isMultiTenant && <td className="px-6 py-4 text-xs font-medium text-slate-400 uppercase">{part.tenantId}</td>}
                        <td className="px-6 py-4">
                            <div className="text-sm text-slate-800 font-medium">{part.description}</div>
                            {part.manufacturer && (
                                <div className="text-xs text-slate-500 mt-1">
                                    {part.manufacturer.name} <span className="text-slate-400 font-mono">({part.manufacturer.partCode})</span>
                                </div>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${part.stock <= part.safetyStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {part.stock} {part.uom}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm text-slate-500">{part.suppliers?.habitual?.name || 'N/A'}</div>
                            {part.suppliers?.habitual?.partCode && (
                                <div className="text-xs text-slate-400">Cod: {part.suppliers.habitual.partCode}</div>
                            )}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">€ {part.cost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
          </div>
      )}

      {/* 3. TAB CONTENT: SEARCH (RICERCA) */}
      {activeTab === 'search' && (
          <div className="animate-fade-in-up space-y-6">
              {/* Filter Bar */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Cerca (Testo Libero)</label>
                          <div className="relative">
                              <input 
                                type="text" 
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-epicor-500"
                                placeholder="Cerca per SKU, Descrizione, Codice Produttore..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                              />
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                              </div>
                          </div>
                      </div>
                      <div className="w-full md:w-64">
                          <label className="block text-sm font-medium text-slate-700 mb-1">Filtra Campo</label>
                          <select 
                            className="block w-full border border-slate-300 rounded-lg py-2 px-3 bg-white focus:outline-none focus:ring-1 focus:ring-epicor-500"
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value as any)}
                          >
                              <option value="all">Tutti i Campi</option>
                              <option value="sku">Solo SKU</option>
                              <option value="desc">Solo Descrizione</option>
                              <option value="internal">Solo Codice Interno</option>
                          </select>
                      </div>
                  </div>
              </div>

              {/* Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredParts.map(part => (
                      <div key={part.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow p-5 flex flex-col justify-between group">
                          <div>
                              <div className="flex justify-between items-start mb-2">
                                  <span className="bg-slate-100 text-slate-600 text-xs font-mono px-2 py-1 rounded border border-slate-200">{part.sku}</span>
                                  {part.stock <= part.safetyStock && <span className="bg-red-100 text-red-600 text-[10px] uppercase font-bold px-2 py-1 rounded-full">Low Stock</span>}
                              </div>
                              <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-2">{part.description}</h3>
                              {part.internalCode && <p className="text-xs text-slate-400 mb-3 font-mono">Ref. Interno: {part.internalCode}</p>}
                              
                              <div className="space-y-2 mt-4">
                                  <div className="flex justify-between text-sm border-b border-slate-100 pb-1">
                                      <span className="text-slate-500">Stock:</span>
                                      <span className="font-semibold text-slate-700">{part.stock} {part.uom}</span>
                                  </div>
                                  <div className="flex justify-between text-sm border-b border-slate-100 pb-1">
                                      <span className="text-slate-500">Produttore:</span>
                                      <span className="font-medium text-slate-700 truncate max-w-[150px]">{part.manufacturer?.name || '-'}</span>
                                  </div>
                              </div>
                          </div>
                          
                          <div className="mt-6 flex gap-2">
                              <button 
                                onClick={() => handleRowClick(part)}
                                className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                              >
                                  Modifica
                              </button>
                              <button 
                                onClick={() => { setStatsSelectedPart(part); setActiveTab('stats'); }}
                                className="flex-1 bg-epicor-50 border border-epicor-100 text-epicor-700 py-2 rounded-lg text-sm font-medium hover:bg-epicor-100 transition-colors flex justify-center items-center"
                              >
                                  Statistiche
                                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                              </button>
                          </div>
                      </div>
                  ))}
                  {filteredParts.length === 0 && (
                      <div className="col-span-full text-center py-12 text-slate-400 italic">Nessun articolo trovato. Prova a modificare i filtri.</div>
                  )}
              </div>
          </div>
      )}


      {/* 4. TAB CONTENT: STATISTICS & BOM */}
      {activeTab === 'stats' && (
          <div className="animate-fade-in-up space-y-8">
              
              {/* A. General Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                      <p className="text-slate-400 text-xs uppercase font-bold tracking-wider mb-1">Valore Totale Stock</p>
                      <h3 className="text-3xl font-bold">€ {parts.reduce((sum, p) => sum + (p.stock * p.cost), 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}</h3>
                      <div className="mt-4 text-xs text-slate-400 flex items-center">
                          <span className="bg-white/10 px-2 py-1 rounded mr-2">{parts.length} Referenze</span>
                          <span>Totali</span>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Articoli Sotto Scorta</p>
                      <div className="flex items-end">
                          <h3 className="text-3xl font-bold text-red-600">{parts.filter(p => p.stock <= p.safetyStock).length}</h3>
                          <span className="text-sm text-slate-400 mb-1 ml-2">su {parts.length}</span>
                      </div>
                  </div>
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                      <p className="text-slate-500 text-xs uppercase font-bold tracking-wider mb-1">Valore Medio Articolo</p>
                      <h3 className="text-3xl font-bold text-epicor-600">€ {(parts.reduce((sum, p) => sum + p.cost, 0) / (parts.length || 1)).toFixed(2)}</h3>
                  </div>
              </div>

              <hr className="border-slate-200" />

              {/* B. Specific Part Stats & BOM */}
              <div>
                  <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-slate-800">Analisi Singolo Articolo & BOM</h3>
                      <select 
                        className="border border-slate-300 rounded-lg p-2 min-w-[300px]"
                        value={statsSelectedPart?.id || ''}
                        onChange={(e) => setStatsSelectedPart(parts.find(p => p.id === e.target.value) || null)}
                      >
                          <option value="">-- Seleziona Articolo per Dettagli --</option>
                          {parts.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.description}</option>)}
                      </select>
                  </div>

                  {statsSelectedPart ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          {/* Left: Specific Volumes */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                              <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2 mb-4">Volumi Specifici</h4>
                              <div className="space-y-6">
                                  <div className="flex justify-between items-center">
                                      <span className="text-slate-500">Valore Giacenza Attuale</span>
                                      <span className="text-xl font-bold text-slate-800">€ {(statsSelectedPart.stock * statsSelectedPart.cost).toLocaleString()}</span>
                                  </div>
                                  
                                  {/* Fake Consumption Chart */}
                                  <div>
                                      <span className="text-xs text-slate-400 uppercase font-bold">Consumo Stimato (Ultimi 6 Mesi)</span>
                                      <div className="h-40 mt-2 w-full">
                                          <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={[
                                                {name: 'M-5', val: Math.floor(Math.random()*10)}, 
                                                {name: 'M-4', val: Math.floor(Math.random()*15)},
                                                {name: 'M-3', val: Math.floor(Math.random()*20)},
                                                {name: 'M-2', val: Math.floor(Math.random()*10)},
                                                {name: 'M-1', val: Math.floor(Math.random()*25)},
                                                {name: 'M', val: Math.floor(Math.random()*30)}
                                            ]}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="name" hide />
                                                <Tooltip />
                                                <Bar dataKey="val" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                          </ResponsiveContainer>
                                      </div>
                                  </div>
                              </div>
                          </div>

                          {/* Right: BOM Visualization */}
                          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-4">
                                  <h4 className="font-bold text-slate-700">Distinta Base (Where Used)</h4>
                                  <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${isMultiTenant ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {isMultiTenant ? 'All Tenants' : 'Selected Tenant Only'}
                                  </span>
                              </div>
                              
                              {visibleBomUsages.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                      <svg className="w-10 h-10 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                      </svg>
                                      <p className="text-sm">Nessun utilizzo trovato nel contesto corrente.</p>
                                  </div>
                              ) : (
                                  <div className="space-y-4">
                                      <p className="text-sm text-slate-500 mb-2">
                                          L'articolo <span className="font-mono text-epicor-600 font-bold">{statsSelectedPart.sku}</span> è componente di:
                                      </p>
                                      
                                      <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
                                          {visibleBomUsages.map((usage, idx) => (
                                              <div key={idx} className="relative pl-6">
                                                  {/* Connector Dot */}
                                                  <div className="absolute -left-[9px] top-3 w-4 h-4 bg-white border-2 border-epicor-500 rounded-full"></div>
                                                  
                                                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                                                      <div className="flex justify-between items-start">
                                                          <div>
                                                              <div className="flex items-center">
                                                                  <h5 className="font-bold text-slate-800 text-sm">{usage.parentName}</h5>
                                                                  {/* Tenant Badge only in Multi-Tenant Mode */}
                                                                  {isMultiTenant && usage.tenantId && (
                                                                      <span className={`ml-2 text-[9px] uppercase font-bold px-1.5 py-0.5 rounded text-white ${AVAILABLE_TENANTS.find(t => t.id === usage.tenantId)?.color || 'bg-gray-400'}`}>
                                                                          {AVAILABLE_TENANTS.find(t => t.id === usage.tenantId)?.name || usage.tenantId}
                                                                      </span>
                                                                  )}
                                                              </div>
                                                              <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {usage.parentId}</p>
                                                          </div>
                                                          <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-1 rounded uppercase font-bold">
                                                              {usage.type}
                                                          </span>
                                                      </div>
                                                      <div className="mt-3 flex items-center text-xs text-slate-600">
                                                          <span className="font-semibold mr-1">Quantità Impiegata:</span>
                                                          <span className="bg-white border border-slate-300 px-2 py-0.5 rounded font-mono">{usage.quantityUsed} {statsSelectedPart.uom}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                          <p className="text-slate-500">Seleziona un articolo dal menu in alto per visualizzare le statistiche di dettaglio e l'albero di utilizzo (BOM).</p>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* MODAL (For Create/Edit - Only available when triggered) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                <div>
                    <h3 className="text-xl font-bold">{modalMode === 'create' ? 'Nuova Anagrafica' : 'Modifica Parte'}</h3>
                    <p className="text-xs text-slate-400">{modalMode === 'create' ? 'Creazione master data' : 'Modifica dettagli e visualizzazione network'}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-mono text-epicor-500">{currentSKU}</p>
                </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50">
                <form id="partForm" onSubmit={handleSubmit}>
                    
                    {/* NEW SECTION: BOM UPDATE NOTIFICATION (CONDITIONAL) */}
                    {selectedPart && selectedPart.substitutionHistory && selectedPart.substitutionHistory.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
                            <h3 className="text-lg font-bold text-blue-800 border-b border-blue-200 pb-2 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Aggiornamento DB (Storico Sostituzioni)
                            </h3>
                            <div className="space-y-3">
                                {selectedPart.substitutionHistory.map(log => (
                                    <div key={log.id} className="bg-white p-3 rounded-lg border border-blue-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between text-sm">
                                        <div className="mb-2 md:mb-0">
                                            <p className="font-bold text-slate-800">{log.bomName} <span className="text-slate-500 font-normal">(Rev. {log.bomRevision})</span></p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Data: {log.date} | Livello: {log.level} | WBS: {log.wbs}
                                            </p>
                                        </div>
                                        <div className="flex items-center">
                                            {log.type === 'REPLACEMENT_FOR' ? (
                                                <div className="text-right">
                                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-bold uppercase mr-2">Sostituto Di</span>
                                                    <p className="text-xs font-mono mt-1 text-slate-600">Old SKU: <strong>{log.relatedPartSku}</strong></p>
                                                </div>
                                            ) : (
                                                 <div className="text-right">
                                                    <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold uppercase mr-2">Sostituito Da</span>
                                                    <p className="text-xs font-mono mt-1 text-slate-600">New SKU: <strong>{log.relatedPartSku}</strong></p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 1. SEZIONE PARTE (GLOBALE) */}
                    <div className="bg-white p-6 rounded-xl border-l-4 border-l-blue-500 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[10px] px-2 py-1 rounded-bl">DATI GLOBALI (Condivisi)</div>
                        <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">1</span>
                            Dati Identificativi & SKU
                        </h3>
                        
                        {/* Internal Code Field */}
                         <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-4 flex flex-col md:flex-row gap-4 items-center">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Codice Interno (Tenant)</label>
                                <input type="text" name="internal_code" className="w-full border border-slate-300 rounded p-2 text-sm" 
                                    placeholder="Es. Codice Gestionale Vecchio / BOM Ref"
                                    value={internalCode} onChange={e => setInternalCode(e.target.value)} />
                                <p className="text-[10px] text-slate-500 mt-1">Identificativo libero usato solo nel tuo tenant (es. distinte base).</p>
                            </div>
                            <div className="hidden md:block w-px h-10 bg-yellow-200 mx-2"></div>
                            <div className="flex-1 w-full">
                                <div className="text-xs font-bold text-slate-500 uppercase mb-1">Anteprima SKU Globale</div>
                                <div className="font-mono text-lg font-bold text-epicor-700 tracking-wider bg-white px-3 py-1 rounded border border-slate-200 inline-block w-full">
                                    {currentSKU}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Categoria (4)</label>
                                <input maxLength={4} name="sku_category" className="w-full border border-slate-300 rounded p-2 uppercase font-mono" placeholder="IDRA" 
                                    value={skuComp.category} onChange={e => setSkuComp({...skuComp, category: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Famiglia (4)</label>
                                <input maxLength={4} name="sku_family" className="w-full border border-slate-300 rounded p-2 uppercase font-mono" placeholder="PUMP"
                                    value={skuComp.family} onChange={e => setSkuComp({...skuComp, family: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Prodotto (4)</label>
                                <input maxLength={4} name="sku_product" className="w-full border border-slate-300 rounded p-2 uppercase font-mono" placeholder="GEAR"
                                    value={skuComp.product} onChange={e => setSkuComp({...skuComp, product: e.target.value})} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Variante (4)</label>
                                <input maxLength={4} name="sku_variant" className="w-full border border-slate-300 rounded p-2 uppercase font-mono" placeholder="X001"
                                    value={skuComp.variant} onChange={e => setSkuComp({...skuComp, variant: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Progressivo (4)</label>
                                <input maxLength={4} name="sku_progressive" className="w-full border border-slate-300 rounded p-2 uppercase font-mono" placeholder="0001"
                                    value={skuComp.progressive} onChange={e => setSkuComp({...skuComp, progressive: e.target.value})} required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="md:col-span-3">
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Descrizione (Max 100)</label>
                                <input maxLength={100} name="description" className="w-full border border-slate-300 rounded p-2" 
                                    value={description} onChange={e => setDescription(e.target.value)} required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">Unità Misura</label>
                                <select name="uom" className="w-full border border-slate-300 rounded p-2" value={uom} onChange={e => setUom(e.target.value)}>
                                    <option value="PZ">Pezzo (PZ)</option>
                                    <option value="KG">Chilogrammo (KG)</option>
                                    <option value="MT">Metro (MT)</option>
                                    <option value="LT">Litro (LT)</option>
                                    <option value="KIT">Kit</option>
                                </select>
                            </div>
                        </div>

                         <div className="mb-2">
                            {renderSupplierInputs('Produzione (Produttore Originale)', manufacturer, 
                                (f, v) => setManufacturer({...manufacturer, [f]: v}), 
                                'bg-blue-50 border-blue-100',
                                handleManufacturerCodeBlur 
                            )}
                        </div>
                    </div>

                    {/* 2. SEZIONE LOCALE (TENANT) */}
                    <div className="bg-white p-6 rounded-xl border-l-4 border-l-orange-500 shadow-sm mt-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-orange-500 text-white text-[10px] px-2 py-1 rounded-bl">DATI LOCALI (Tenant)</div>
                         <h3 className="text-lg font-bold text-slate-800 border-b pb-2 mb-4 flex items-center">
                            <span className="bg-orange-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs mr-2">2</span>
                            Condizioni & Stock Locale
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <h4 className="font-bold text-sm text-slate-800 uppercase mb-3">Livelli Stock</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-500 block font-semibold mb-1">Stock Reale</label>
                                        <input type="number" name="stock_real" className="w-full border rounded p-2 text-xl font-bold text-slate-800"
                                            value={stockInfo.stock} onChange={e => setStockInfo({...stockInfo, stock: Number(e.target.value)})} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 block font-semibold mb-1">Safety Stock</label>
                                        <input type="number" name="stock_safety" className="w-full border rounded p-2 text-xl font-medium text-slate-600"
                                            value={stockInfo.safety} onChange={e => setStockInfo({...stockInfo, safety: Number(e.target.value)})} />
                                    </div>
                                </div>
                            </div>
                             <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                                 {renderSupplierInputs('Fornitore A (Abituale)', habitualSupplier, (f, v) => setHabitualSupplier({...habitualSupplier, [f]: v}), 'bg-transparent border-none p-0')}
                            </div>
                        </div>

                        <details className="group">
                             <summary className="font-bold text-sm text-slate-500 uppercase cursor-pointer hover:text-slate-700 list-none flex items-center">
                                <span className="mr-2">▶</span> Fornitori Alternativi (B-G)
                             </summary>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pl-4 border-l-2 border-slate-100">
                                {['B', 'C', 'D', 'E', 'F', 'G'].map((label, idx) => (
                                    <div key={label}>
                                        {renderSupplierInputs(`Fornitore ${label}`, altSuppliers[idx], (f, v) => handleAltSupplierChange(idx, f, v))}
                                    </div>
                                ))}
                            </div>
                        </details>
                    </div>

                    {/* 3. SEZIONE CROSS-TENANT (READ ONLY) */}
                    {modalMode === 'edit' && (
                        <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 shadow-inner mt-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
                                <svg className="w-5 h-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Disponibilità nel Network (Altri Tenant)
                            </h3>
                            
                            {siblingParts.length === 0 ? (
                                <p className="text-sm text-slate-500 italic">Nessun altro tenant possiede questo articolo (SKU: {currentSKU})</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {siblingParts.map(sib => {
                                        const tInfo = AVAILABLE_TENANTS.find(t => t.id === sib.tenantId);
                                        return (
                                            <div key={sib.id} className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 relative overflow-hidden">
                                                <div className={`absolute top-0 left-0 w-1 h-full ${tInfo?.color || 'bg-gray-400'}`}></div>
                                                <div className="pl-3">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold text-slate-800">{tInfo?.name || sib.tenantId}</h4>
                                                        <span className="text-xs font-mono bg-slate-100 px-1 rounded">Stock: {sib.stock}</span>
                                                    </div>
                                                    
                                                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                        <div>
                                                            <p className="text-slate-500">Fornitore:</p>
                                                            <p className="font-medium">{sib.suppliers?.habitual?.name || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">Codice Forn.:</p>
                                                            <p className="font-medium">{sib.suppliers?.habitual?.partCode || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-slate-500">Prezzo:</p>
                                                            <p className="font-medium">€ {sib.cost}</p>
                                                        </div>
                                                         <div>
                                                            <p className="text-slate-500">Lead Time:</p>
                                                            <p className="font-medium">{sib.leadTime} gg</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                </form>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-200 font-medium">
                    Annulla
                </button>
                <button type="submit" form="partForm" className="px-6 py-2 bg-epicor-600 text-white rounded-md hover:bg-epicor-700 font-bold shadow-md">
                    {modalMode === 'create' ? 'Crea Parte' : 'Salva Modifiche'}
                </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
