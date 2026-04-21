import React, { useEffect, useState, useMemo } from 'react';
import { Client, AiAnalysisResult, ViewState, Item, Supplier } from '../types';
import { geminiService } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import GeminiActionModal from './GeminiActionModal';
import BudgetManagerModal from './BudgetManagerModal';
import PurchaseOrderModal from './PurchaseOrderModal';
import Tooltip from './common/Tooltip';

interface DashboardProps {
  clients: Client[];
  onNavigate: (view: ViewState, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ clients, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);
  const [items, setItems] = useState<Item[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Interaction State
  const [isGeminiModalOpen, setGeminiModalOpen] = useState(false);
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  const [isOrderModalOpen, setOrderModalOpen] = useState(false);
  
  // Filter State for Trend Chart
  const [trendTimeRange, setTrendTimeRange] = useState<'1M' | '3M' | '6M' | 'YTD'>('6M');
  const [trendCategory, setTrendCategory] = useState<string>('ALL');
  const [orderStats, setOrderStats] = useState({ shipped: 0, exception: 0 });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const runAiAnalysis = async (currentItems: Item[], currentSuppliers: Supplier[], force: boolean = false) => {
    if (currentItems.length === 0 || aiLoading) return;
    
    setAiLoading(true);
    try {
      const clientId = clients[0]?.id;
      
      // Try to get from cache first if not forced
      if (!force && clientId) {
        const cached = await dataService.getCachedAiAnalysis(clientId);
        if (cached) {
          setAnalysis(cached as AiAnalysisResult);
          // If cache is present, we still might want to update in background if it's old
          // but for now we just stop loading to show cached data immediately
          setAiLoading(false);
          return;
        }
      }

      const aiResult = await geminiService.analyzeProcurementData(currentItems, currentSuppliers);
      setAnalysis(aiResult);
      
      // Save to cache
      if (clientId) {
        await dataService.saveAiAnalysisToCache(clientId, aiResult);
      }
    } catch (err) {
      console.error("AI Analysis failed:", err);
    } finally {
      setAiLoading(true); // Temporary flip to force re-render if needed, though usually just false
      setAiLoading(false);
    }
  };

  const fetchData = async () => {
    if (clients.length === 0) {
      setLoading(false);
      setAiLoading(false);
      setTotalValue(0);
      setCategoryData([]);
      setTrendData([]);
      setOrderStats({ shipped: 0, exception: 0 });
      return;
    }
    
    setLoading(true);
    
    try {
      // Fetch larger dataset for dashboard analytics to avoid pagination skewing totals
      const [itemsRes, suppliersRes, budgetRes] = await Promise.all([
        dataService.getItemsForClients(clients, 1, 1000, ''),
        dataService.getSuppliersForClients(clients, 1, 1000, ''),
        dataService.getBudgetAllocations(clients[0], 'APPROVED')
      ]);

      const currentItems = itemsRes.data;
      const currentSuppliers = suppliersRes.data;
      const budgetAllocations = budgetRes;

      setItems(currentItems);
      setSuppliers(currentSuppliers);
      
      // Process real data (or empty if none)
      const categorySpend: Record<string, number> = {};
      let total = 0;
      currentItems.forEach(item => {
        const val = item.stock * item.cost;
        categorySpend[item.category] = (categorySpend[item.category] || 0) + val;
        total += val;
      });
      setTotalValue(total);

      const chart = Object.keys(categorySpend).map((key, index) => {
        const allocation = budgetAllocations.find((b: any) => b.category_name === key);
        const budgetAmount = allocation ? allocation.budget_amount : categorySpend[key] * 1.2;

        return { 
          name: key, 
          value: categorySpend[key],
          budget: budgetAmount,
          spent: categorySpend[key],
          color: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][index % 6]
        };
      });
      setCategoryData(chart);

      // Initialize trend data with zeros for existing categories
      const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
      const actualCategories = Array.from(new Set(currentItems.map(i => i.category)));
      
      const emptyTrend = months.map(m => {
          const monthObj: any = { name: m, Totale: 0 };
          actualCategories.forEach(cat => {
              monthObj[cat] = 0;
          });
          return monthObj;
      });
      
      setTrendData(emptyTrend);

      // Fetch Order Stats
      if (clients.length > 0) {
          const logisticsStats = await dataService.getLogisticsStats(clients[0]);
          setOrderStats({
              shipped: logisticsStats.openOrders, // Simplified mapping
              exception: logisticsStats.delayed
          });
      }

      // Data is ready, stop main loading
      setLoading(false);

      // Load AI (cached or background)
      runAiAnalysis(currentItems, currentSuppliers);

    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clients]);

  // Dynamic Filtering for Trend Chart
  const filteredTrendData = useMemo(() => {
     let data = [...trendData];
     
     // Time Filter
     const currentMonthIndex = new Date().getMonth(); // simulate current month
     // In a real app we would filter by date objects. Here we slice the mock array.
     let sliceCount = 6;
     if (trendTimeRange === '1M') sliceCount = 1;
     if (trendTimeRange === '3M') sliceCount = 3;
     if (trendTimeRange === '6M') sliceCount = 6;
     if (trendTimeRange === 'YTD') sliceCount = 12;

     data = data.slice(0, sliceCount);
     return data;
  }, [trendData, trendTimeRange]);

  const uniqueCategories = useMemo(() => {
     if(trendData.length === 0) return [];
     return Object.keys(trendData[0]).filter(k => k !== 'name' && k !== 'Totale');
  }, [trendData]);


  const handleSaveOrder = async (orderData: any) => {
    try {
      // For simplicity, we use the first client if multiple are selected
      const client = clients[0];
      if (!client) throw new Error("Nessuna azienda selezionata");
      await dataService.saveOrder(client, orderData, true);
      setOrderModalOpen(false);
      setSuccess("Ordine d'acquisto creato con successo!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(`Errore creazione ordine: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="neu-flat p-8 flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Caricamento dati in corso...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in pb-12 relative min-h-full">
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
      
      {/* Modals */}
      <GeminiActionModal 
         isOpen={isGeminiModalOpen} 
         onClose={() => setGeminiModalOpen(false)} 
         analysis={analysis} 
      />
      <BudgetManagerModal 
         isOpen={isBudgetModalOpen} 
         onClose={() => setBudgetModalOpen(false)} 
         client={clients[0]}
         categories={categoryData}
         onSave={fetchData}
      />
      <PurchaseOrderModal 
        isOpen={isOrderModalOpen}
        onClose={() => setOrderModalOpen(false)}
        initialData={null}
        onSave={handleSaveOrder}
        client={clients[0]}
      />

      {/* Top Actions */}
      <div className="flex flex-wrap justify-end gap-4">
          <Tooltip position="bottom" className="w-full sm:w-auto" content={{ title: "Esportazione Report", description: "Genera un documento PDF/Excel con i dati consolidati della dashboard.", usage: "Clicca per scaricare il report corrente." }}>
            <button className="neu-btn px-5 py-2.5 text-sm w-full">
              <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Report
            </button>
          </Tooltip>
          <Tooltip position="bottom" className="w-full sm:w-auto" content={{ title: "Nuovo Ordine d'Acquisto", description: "Avvia la procedura di creazione di un nuovo ordine verso un fornitore.", usage: "Clicca per aprire il configuratore d'ordine." }}>
            <button 
              onClick={() => setOrderModalOpen(true)}
              className="neu-btn px-5 py-2.5 text-sm text-blue-600 font-bold w-full"
            >
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuovo Ordine
            </button>
          </Tooltip>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* AI Insight Card - Interactive */}
        <Tooltip position="bottom" className="sm:col-span-2 xl:col-span-4 w-full" content={{ title: "Intelligenza Artificiale Gemini", description: "Analisi predittiva e prescrittiva basata sui dati di acquisto e stock.", usage: "Clicca per visualizzare le azioni consigliate dall'AI." }}>
          <div 
              className="neu-flat p-8 relative overflow-hidden border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all group min-h-[160px] w-full"
          >
             <div className="flex flex-col h-full relative z-10">
               <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                   <div className="flex items-center space-x-2" onClick={() => setGeminiModalOpen(true)}>
                      <div className={`w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg ${aiLoading ? 'animate-spin' : 'animate-pulse'}`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                      </div>
                      <span className="text-sm font-black text-slate-700 uppercase tracking-widest">Gemini Insight</span>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); runAiAnalysis(items, suppliers, true); }}
                        disabled={aiLoading}
                        className="neu-btn px-3 py-1 text-[9px] font-black uppercase text-slate-500 hover:text-blue-600 flex items-center gap-1"
                      >
                        <svg className={`w-3 h-3 ${aiLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Aggiorna
                      </button>
                      {!aiLoading && <span onClick={() => setGeminiModalOpen(true)} className="bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-lg shadow-sm group-hover:bg-blue-700 transition-colors uppercase tracking-tighter">CLICCA PER INTERVENIRE</span>}
                   </div>
               </div>
               
               <div className="flex-1 flex flex-col justify-center" onClick={() => setGeminiModalOpen(true)}>
                {aiLoading && !analysis ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium text-slate-400 italic">Analisi AI in corso...</p>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base font-medium text-slate-600 italic leading-relaxed mb-4">
                    "{analysis?.summary || "Nessuna analisi disponibile."}"
                    {aiLoading && analysis && <span className="ml-2 text-[10px] text-blue-400 animate-pulse">(Aggiornamento...)</span>}
                  </p>
                )}
               </div>
               
               {/* 3 Action Pillars Preview */}
               <div className="mt-auto flex gap-3" onClick={() => setGeminiModalOpen(true)}>
                    <div className="flex-1 neu-pressed py-2 px-2 rounded-lg text-center">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-tighter">Strategico</span>
                        <span className="text-[11px] font-bold text-slate-600">Supply Chain</span>
                    </div>
                    <div className="flex-1 neu-pressed py-2 px-2 rounded-lg text-center">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-tighter">Operativo</span>
                        <span className="text-[11px] font-bold text-blue-600">Scorte</span>
                    </div>
                    <div className="flex-1 neu-pressed py-2 px-2 rounded-lg text-center">
                        <span className="block text-[9px] text-slate-400 font-black uppercase tracking-tighter">Economico</span>
                        <span className="text-[11px] font-bold text-emerald-600">Saving</span>
                    </div>
               </div>
             </div>
          </div>
        </Tooltip>

        {/* Total Stock Value */}
        <Tooltip position="bottom" className="sm:col-span-1 xl:col-span-2 w-full h-full" content={{ title: "Valore Totale Magazzino", description: "Somma del valore economico di tutti gli articoli a stock per le aziende selezionate.", usage: "Monitora l'immobilizzato finanziario in tempo reale." }}>
          <div className="neu-flat p-6 flex flex-col justify-between min-h-[160px] h-full relative overflow-hidden group w-full">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" /></svg>
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Valore Magazzino</p>
            <div className="mt-auto">
              <h3 className="text-4xl font-black text-slate-700">€ {totalValue.toLocaleString('it-IT')}</h3>
              {totalValue > 0 && (
                <span className="text-[10px] font-bold text-green-600 flex items-center mt-2 uppercase tracking-wider">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                  Aggiornato Live
                </span>
              )}
            </div>
          </div>
        </Tooltip>

        {/* Order Status - Interactive */}
        <Tooltip position="bottom" className="sm:col-span-1 xl:col-span-2 w-full h-full" content={{ title: "Riepilogo Ordini Attivi", description: "Stato degli ordini d'acquisto in corso di gestione.", usage: "Clicca per andare alla vista Logistica." }}>
          <div className="neu-flat p-8 flex flex-col justify-between min-h-[160px] h-full group w-full">
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Ordini Attivi</p>
            
            <div className="space-y-3">
              <div 
                onClick={() => onNavigate(ViewState.LOGISTICS, { filter: 'SHIPPED' })}
                className="flex items-center justify-between cursor-pointer hover:bg-blue-50/50 p-1.5 rounded-lg transition-colors"
              >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">In Spedizione</span>
                <span className="neu-pressed px-3 py-1 rounded-md text-xs font-black text-blue-600">{orderStats.shipped}</span>
              </div>

              <div 
                onClick={() => onNavigate(ViewState.LOGISTICS, { filter: 'EXCEPTION' })}
                className="flex items-center justify-between cursor-pointer hover:bg-red-50/50 p-1.5 rounded-lg transition-colors"
              >
                <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">Ritardi / Anomalie</span>
                <span className="neu-pressed px-3 py-1 rounded-md text-xs font-black text-red-500">{orderStats.exception}</span>
              </div>
            </div>

            <div className="w-full bg-slate-200/50 rounded-full h-1.5 mt-4 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full transition-all duration-700 ease-out" 
                  style={{ width: `${orderStats.shipped + orderStats.exception > 0 ? Math.min(100, (orderStats.shipped / (orderStats.shipped + orderStats.exception)) * 100) : 0}%` }}
                ></div>
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
        
        {/* Trend Chart - Enhanced */}
        <div className="lg:col-span-2 neu-flat p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h3 className="text-lg font-bold text-slate-700">Trend Acquisti Multidimensionale</h3>
            
            <div className="flex flex-wrap gap-2">
                {/* Time Range Selector */}
                <div className="flex bg-[#EEF2F6] p-1 rounded-xl shadow-inner">
                    {(['1M', '3M', '6M', 'YTD'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTrendTimeRange(range)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${trendTimeRange === range ? 'neu-flat text-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>

                {/* Category Selector */}
                <select 
                    value={trendCategory}
                    onChange={(e) => setTrendCategory(e.target.value)}
                    className="neu-pressed text-xs py-1 px-3 text-slate-600 font-bold bg-transparent outline-none cursor-pointer"
                >
                    <option value="ALL">Tutte le Categorie</option>
                    {uniqueCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>
          </div>

          <div className="flex-1 min-h-[320px] min-w-0 relative">
            <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
              <AreaChart data={filteredTrendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 600}} />
                <RechartsTooltip 
                  contentStyle={{background: '#EEF2F6', borderRadius: '12px', border: 'none', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff', color: '#475569'}}
                />
                <Legend />
                
                {/* Logic: If ALL, show stacked areas (or just Total). If Specific, show that specific line */}
                {trendCategory === 'ALL' ? (
                     <>
                        {uniqueCategories.map((cat, idx) => (
                          <Area 
                            key={cat}
                            type="monotone" 
                            dataKey={cat} 
                            stackId="1" 
                            stroke={['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 6]} 
                            fill={['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'][idx % 6]} 
                          />
                        ))}
                     </>
                ) : (
                    <Area type="monotone" dataKey={trendCategory} stroke="#3b82f6" strokeWidth={3} fill="url(#colorTotal)" />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown & Budget */}
        <div className="neu-flat p-6 flex flex-col">
          <div className="mb-4">
             <h3 className="text-lg font-bold text-slate-700">Budget per Categoria</h3>
             <p className="text-xs text-slate-500">Speso vs Assegnato</p>
          </div>

          <div className="flex-1 min-h-[220px] min-w-0 relative">
             <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0} debounce={50}>
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                <Legend />
                <Bar dataKey="spent" name="Speso" stackId="a" fill="#3b82f6" barSize={12} radius={[0,0,0,0]} />
                <Bar dataKey="budget" name="Budget Residuo" stackId="a" fill="#cbd5e1" barSize={12} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-6 pt-6 border-t border-slate-200">
             <button 
                onClick={() => setBudgetModalOpen(true)}
                className="w-full neu-btn py-3 text-sm text-slate-700 hover:text-blue-600 flex items-center justify-center"
             >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                Gestione Budget & Allocazioni
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;