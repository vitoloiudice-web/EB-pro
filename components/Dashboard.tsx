import React, { useEffect, useState, useMemo } from 'react';
import { Company, AiAnalysisResult, ViewState } from '../types';
import { geminiService } from '../services/geminiService';
import { googleSheetsService } from '../services/googleSheetsService';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, Legend } from 'recharts';
import GeminiActionModal from './GeminiActionModal';
import BudgetManagerModal from './BudgetManagerModal';

interface DashboardProps {
  company: Company;
  onNavigate: (view: ViewState, params?: any) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ company, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AiAnalysisResult | null>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [totalValue, setTotalValue] = useState(0);

  // Interaction State
  const [isGeminiModalOpen, setGeminiModalOpen] = useState(false);
  const [isBudgetModalOpen, setBudgetModalOpen] = useState(false);
  
  // Filter State for Trend Chart
  const [trendTimeRange, setTrendTimeRange] = useState<'1M' | '3M' | '6M' | 'YTD'>('6M');
  const [trendCategory, setTrendCategory] = useState<string>('ALL');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch larger dataset for dashboard analytics to avoid pagination skewing totals
        const itemsRes = await googleSheetsService.getItems(company, 1, 1000);
        const suppliersRes = await googleSheetsService.getSuppliers(company, 1, 1000);

        const items = itemsRes.data;
        const suppliers = suppliersRes.data;
        
        // Data Processing for Charts
        const categorySpend: Record<string, number> = {};
        let total = 0;
        items.forEach(item => {
          const val = item.stock * item.cost;
          categorySpend[item.category] = (categorySpend[item.category] || 0) + val;
          total += val;
        });
        setTotalValue(total);

        const chart = Object.keys(categorySpend).map((key, index) => ({ 
          name: key, 
          value: categorySpend[key],
          budget: categorySpend[key] * 1.2, // Mock budget (20% margin)
          spent: categorySpend[key],
          color: ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'][index % 6]
        }));
        setCategoryData(chart);

        // Generate richer Mock Trend Data to support multi-dimensional filtering
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const fullTrend = months.map(m => ({
            name: m,
            Idraulica: Math.floor(Math.random() * 2000) + 1000,
            Elettronica: Math.floor(Math.random() * 3000) + 500,
            Carpenteria: Math.floor(Math.random() * 1500) + 800,
            Verniciatura: Math.floor(Math.random() * 800) + 200,
            Totale: 0 
        })).map(item => ({
            ...item,
            Totale: item.Idraulica + item.Elettronica + item.Carpenteria + item.Verniciatura
        }));
        
        setTrendData(fullTrend);

        // Call AI
        const aiResult = await geminiService.analyzeProcurementData(items, suppliers);
        setAnalysis(aiResult);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [company]);

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


  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="neu-flat p-8 flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">Analisi AI in corso...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Modals */}
      <GeminiActionModal 
         isOpen={isGeminiModalOpen} 
         onClose={() => setGeminiModalOpen(false)} 
         analysis={analysis} 
      />
      <BudgetManagerModal 
         isOpen={isBudgetModalOpen} 
         onClose={() => setBudgetModalOpen(false)} 
         categories={categoryData}
      />

      {/* Top Actions */}
      <div className="flex flex-wrap justify-end gap-4">
          <button className="neu-btn px-5 py-2.5 text-sm w-full sm:w-auto">
            <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Report
          </button>
          <button className="neu-btn px-5 py-2.5 text-sm text-blue-600 font-bold w-full sm:w-auto">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nuovo Ordine
          </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Total Stock Value */}
        <div className="neu-flat p-6 flex flex-col justify-between h-40 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <svg className="w-20 h-20 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" /></svg>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valore Magazzino</p>
          <div>
            <h3 className="text-3xl font-black text-slate-700">€ {totalValue.toLocaleString('it-IT')}</h3>
            <span className="text-xs font-bold text-green-600 flex items-center mt-1">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              +12% vs mese prec.
            </span>
          </div>
        </div>

        {/* AI Insight Card - Interactive */}
        <div 
            onClick={() => setGeminiModalOpen(true)}
            className="md:col-span-2 neu-flat p-6 relative overflow-hidden border-l-4 border-blue-500 cursor-pointer hover:shadow-lg transition-all group"
        >
           <div className="flex flex-col h-full justify-between relative z-10">
             <div className="flex justify-between items-start">
                 <div className="flex items-center space-x-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white shadow-lg animate-pulse">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                    </div>
                    <span className="text-sm font-bold text-slate-600 uppercase tracking-wide">Gemini Insight</span>
                 </div>
                 <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-1 rounded-full group-hover:bg-blue-200 transition-colors">CLICCA PER INTERVENIRE</span>
             </div>
             
             <p className="text-base font-medium text-slate-700 italic line-clamp-2">"{analysis?.summary || "Analisi dati in corso..."}"</p>
             
             {/* 3 Action Pillars Preview */}
             <div className="mt-4 flex gap-2">
                  <div className="flex-1 neu-pressed py-2 px-1 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Strategico</span>
                      <span className="text-xs font-bold text-slate-600">Supply Chain</span>
                  </div>
                  <div className="flex-1 neu-pressed py-2 px-1 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Operativo</span>
                      <span className="text-xs font-bold text-blue-600">Scorte</span>
                  </div>
                  <div className="flex-1 neu-pressed py-2 px-1 text-center">
                      <span className="block text-[10px] text-slate-400 font-bold uppercase">Economico</span>
                      <span className="text-xs font-bold text-emerald-600">Saving</span>
                  </div>
             </div>
           </div>
        </div>

        {/* Order Status - Interactive */}
        <div className="neu-flat p-6 flex flex-col justify-center space-y-4">
           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Ordini Attivi</p>
           
           <div 
             onClick={() => onNavigate(ViewState.LOGISTICS, { filter: 'SHIPPED' })}
             className="flex items-center justify-between cursor-pointer hover:bg-blue-50 p-1 rounded-lg transition-colors group"
             title="Vai agli ordini in spedizione"
            >
             <span className="text-sm font-medium text-slate-600 group-hover:text-blue-700 flex items-center">
                In Spedizione
                <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </span>
             <span className="neu-pressed px-2 py-1 text-xs font-bold text-blue-600 group-hover:bg-white">8</span>
           </div>

           <div 
             onClick={() => onNavigate(ViewState.LOGISTICS, { filter: 'EXCEPTION' })}
             className="flex items-center justify-between cursor-pointer hover:bg-red-50 p-1 rounded-lg transition-colors group"
             title="Vai agli ordini in ritardo"
            >
             <span className="text-sm font-medium text-slate-600 group-hover:text-red-700 flex items-center">
                Ritardi / Anomalie
                <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
             </span>
             <span className="neu-pressed px-2 py-1 text-xs font-bold text-red-500 group-hover:bg-white">2</span>
           </div>

           <div className="w-full bg-[#EEF2F6] shadow-inner rounded-full h-2 mt-2">
              <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-2 rounded-full shadow-sm" style={{ width: '75%' }}></div>
           </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-w-0">
        
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

          <div className="flex-1 min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <Tooltip 
                  contentStyle={{background: '#EEF2F6', borderRadius: '12px', border: 'none', boxShadow: '5px 5px 10px #d1d9e6, -5px -5px 10px #ffffff', color: '#475569'}}
                />
                <Legend />
                
                {/* Logic: If ALL, show stacked areas (or just Total). If Specific, show that specific line */}
                {trendCategory === 'ALL' ? (
                     <>
                        <Area type="monotone" dataKey="Idraulica" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                        <Area type="monotone" dataKey="Elettronica" stackId="1" stroke="#6366f1" fill="#6366f1" />
                        <Area type="monotone" dataKey="Carpenteria" stackId="1" stroke="#10b981" fill="#10b981" />
                        <Area type="monotone" dataKey="Verniciatura" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
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

          <div className="flex-1 min-h-[220px]">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 11, fill: '#64748b', fontWeight: 600}} axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
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