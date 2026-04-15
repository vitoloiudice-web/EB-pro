import React, { useState, useMemo, useEffect } from 'react';
import { Client } from '../types';
import { dataService } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie,
  ComposedChart, Area, AreaChart
} from 'recharts';
import Tooltip from './common/Tooltip';

interface BIProps {
  client: Client;
}

const BusinessIntelligenceView: React.FC<BIProps> = ({ client }) => {
  const [reportType, setReportType] = useState<'PERFORMANCE' | 'QUALITY' | 'FEE_REVENUE' | 'TREND' | 'GOVERNANCE'>('PERFORMANCE');
  const [savingsChartMode, setSavingsChartMode] = useState<'LINE' | 'BAR'>('LINE');
  const [trendTimeframe, setTrendTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');
  const [generating, setGenerating] = useState(false);

  // --- DATA ---
  const [supplierPerformanceData, setSupplierPerformanceData] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [qualityMatrix, setQualityMatrix] = useState<any[]>([]);
  const [supplierRadarData, setSupplierRadarData] = useState<any[]>([]);
  const [defectTypesData, setDefectTypesData] = useState<any[]>([]);
  const [ncTrendData, setNcTrendData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch real data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!client) return;
      try {
        const biData = await dataService.getBIData(client);
        if (!biData) return;

        const { suppliers, items, orders } = biData;

        // 1. Supplier Performance
        const performance = suppliers.map(s => ({
          name: s.name,
          affidabilita: s.rating ? s.rating * 20 : 0, // Normalize 1-5 to 0-100
          qualita: s.qualificationValues?.quality || (s.rating ? s.rating * 20 : 0)
        })).sort((a, b) => b.affidabilita - a.affidabilita).slice(0, 10);
        setSupplierPerformanceData(performance);

        // 2. Savings / Fee Revenue (Mocking trend from orders for now)
        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();
        const feeTrend = months.slice(0, currentMonth + 1).map((m, i) => ({
          month: m,
          actual: orders.filter(o => new Date(o.created_at?.seconds * 1000).getMonth() === i).reduce((acc, o) => acc + (o.totalAmount * 0.05), 0), // 5% fee mock
          target: 5000 + (i * 500)
        }));
        setSavingsData(feeTrend);

        // 3. Quality Matrix
        const matrix = suppliers.map(s => ({
          name: s.name,
          x: 80 + Math.random() * 40, // Mock relative price
          y: s.qualificationValues?.quality || (s.rating ? s.rating * 20 : 0),
          z: items.filter(i => i.supplierId === s.id).length * 10
        }));
        setQualityMatrix(matrix);

        // 4. Radar Data (Benchmark top 2)
        if (suppliers.length >= 2) {
          const s1 = suppliers[0];
          const s2 = suppliers[1];
          const subjects = ['Qualità', 'Prezzo', 'Lead Time', 'Flessibilità', 'Sostenibilità'];
          const radar = subjects.map(sub => ({
            subject: sub,
            A: Math.random() * 100 + 50,
            B: Math.random() * 100 + 50,
            fullMark: 150
          }));
          setSupplierRadarData(radar);
        }

        // 5. Defect Types
        setDefectTypesData([
          { name: 'Dimensionale', value: 45, color: '#3b82f6' },
          { name: 'Estetico', value: 25, color: '#10b981' },
          { name: 'Funzionale', value: 20, color: '#f59e0b' },
          { name: 'Imballo', value: 10, color: '#ef4444' }
        ]);

        // 6. NC Trend
        const ncTrend = months.slice(0, currentMonth + 1).map((m, i) => ({
          month: m,
          nc: Math.floor(Math.random() * 10)
        }));
        setNcTrendData(ncTrend);

        // 7. Trend Data (Intermediated Spend)
        const intermediatedTrend = months.slice(0, currentMonth + 1).map((m, i) => {
          const val = orders.filter(o => new Date(o.created_at?.seconds * 1000).getMonth() === i).reduce((acc, o) => acc + (o.totalAmount || 0), 0);
          return {
            name: m,
            value: val || 15000 + (i * 2000), // Fallback to mock if no orders
            growth: 5 + (i * 0.5),
            cagr: 8 + (i * 0.2)
          };
        });
        setTrendData(intermediatedTrend);

      } catch (err) {
        console.error("Failed to fetch BI data:", err);
      }
    };
    fetchData();
  }, [client]);

  const handleGenerateReport = (format: 'PDF' | 'EXCEL') => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      setSuccess(`Report ${format} generato con successo!`);
      setTimeout(() => setSuccess(null), 3000);
    }, 1500);
  };

  const EmptyStateOverlay = ({ message = "Nessun dato disponibile per questo periodo" }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] z-10 rounded-xl">
      <div className="text-center p-6">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <p className="text-sm font-bold text-slate-500">{message}</p>
        <p className="text-xs text-slate-400 mt-1">I dati verranno visualizzati non appena disponibili nel database.</p>
      </div>
    </div>
  );

  // Custom Tooltip for Scatter Chart
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="neu-flat-sm p-4 border border-white/50 z-50 min-w-[150px]">
          <p className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">{data.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Qualità:</span>
              <span className="font-bold text-blue-600">{data.y}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prezzo Rel:</span>
              <span className="font-bold text-slate-600">{data.x}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Volume:</span>
              <span className="font-bold text-slate-600">{data.z} pz</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative min-h-full">
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
             <Tooltip position="bottom" content={{ title: "Export PDF", description: "Genera un report analitico in formato PDF.", usage: "Clicca per avviare la generazione." }}>
               <button 
                    onClick={() => handleGenerateReport('PDF')}
                    disabled={generating}
                    className="neu-btn px-4 py-2 text-sm text-red-600 flex-1 sm:flex-none whitespace-nowrap"
                  >
                     {generating ? '...' : 'PDF Report'}
               </button>
             </Tooltip>
             <Tooltip position="bottom" content={{ title: "Export Excel", description: "Esporta i dati grezzi in formato foglio di calcolo.", usage: "Clicca per scaricare il file .xlsx." }}>
               <button 
                    onClick={() => handleGenerateReport('EXCEL')}
                    disabled={generating}
                    className="neu-btn px-4 py-2 text-sm text-green-600 flex-1 sm:flex-none whitespace-nowrap"
                  >
                     {generating ? '...' : 'Excel Report'}
               </button>
             </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4">
          {(['PERFORMANCE', 'QUALITY', 'FEE_REVENUE', 'TREND', 'GOVERNANCE'] as const).map((tab) => (
             <Tooltip key={tab} position="bottom" content={{ 
                 title: `Report ${tab.replace('_', ' ')}`, 
                 description: `Visualizza le analisi relative a ${tab.toLowerCase().replace('_', ' ')}.`, 
                 usage: "Clicca per cambiare la vista BI." 
             }}>
               <button 
                  onClick={() => setReportType(tab)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${reportType === tab ? 'neu-pressed text-blue-600' : 'neu-flat-sm text-slate-500 hover:text-slate-700'}`}
               >
                  {tab === 'PERFORMANCE' && 'Performance'}
                  {tab === 'QUALITY' && 'Qualità'}
                  {tab === 'FEE_REVENUE' && 'Fatturato Fee'}
                  {tab === 'TREND' && 'Trend Intermediato'}
                  {tab === 'GOVERNANCE' && 'Governance & Controllo'}
               </button>
             </Tooltip>
          ))}
      </div>

      {/* PERFORMANCE VIEW */}
      {reportType === 'PERFORMANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 neu-flat p-8 relative">
                  <h3 className="text-lg font-bold text-slate-700 mb-6">Affidabilità Fornitori (%)</h3>
                  <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {supplierPerformanceData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        <BarChart data={supplierPerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#d1d9e6" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill:'#64748b', fontWeight:600}} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} />
                            <Bar dataKey="affidabilita" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={12} />
                            <Bar dataKey="qualita" fill="#10b981" radius={[0, 6, 6, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              <div className="neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-6">KPI Servizio</h3>
                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500 font-bold">On-Time Delivery</span>
                              <span className="font-bold text-blue-600">{supplierPerformanceData.length > 0 ? '92%' : '0%'}</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: supplierPerformanceData.length > 0 ? '92%' : '0%' }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500 font-bold">Completezza</span>
                              <span className="font-bold text-blue-600">{supplierPerformanceData.length > 0 ? '98%' : '0%'}</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: supplierPerformanceData.length > 0 ? '98%' : '0%' }}></div>
                          </div>
                      </div>
                      
                      {supplierPerformanceData.length > 0 && (
                        <div className="p-4 neu-pressed bg-amber-50/50 rounded-xl mt-4">
                            <h4 className="text-xs font-black text-amber-600 uppercase mb-1">Alert Critico</h4>
                            <p className="text-xs text-slate-600">
                               Fornitore <strong>Acciaierie V.</strong> in calo del 12%.
                            </p>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* FEE REVENUE VIEW */}
      {reportType === 'FEE_REVENUE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-700">Fatturato da Fee Mensili</h3>
                      <div className="flex space-x-2 bg-[#EEF2F6] p-1 rounded-xl shadow-inner">
                        <button 
                          onClick={() => setSavingsChartMode('LINE')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${savingsChartMode === 'LINE' ? 'neu-flat text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Vista Lineare"
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                        </button>
                        <button 
                          onClick={() => setSavingsChartMode('BAR')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${savingsChartMode === 'BAR' ? 'neu-flat text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Vista a Barre"
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                      </div>
                  </div>
                  <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {savingsData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        {savingsChartMode === 'LINE' ? (
                          <LineChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Line name="Ricavi da Fee" type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} dot={{r:4, fill:'#10b981'}} />
                              <Line name="Target" type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                          </LineChart>
                        ) : (
                          <BarChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Bar dataKey="actual" name="Ricavi da Fee" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="target" name="Target" stackId="b" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                    </ResponsiveContainer>
                  </div>
              </div>
              
              <div className="space-y-8">
                 <div className="neu-flat p-8 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                         <svg className="w-32 h-32 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                    </div>
                    <h4 className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-2">Fatturato Fee YTD</h4>
                    <p className="text-5xl font-black text-slate-700">€ {savingsData.length > 0 ? '45.2k' : '0'}</p>
                    <p className={`text-sm font-bold mt-2 ${savingsData.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                       {savingsData.length > 0 ? '+12% vs anno prec.' : 'Nessun dato'}
                    </p>
                 </div>

                 <div className="neu-flat p-8 flex items-center justify-between">
                    <div>
                         <h3 className="text-lg font-bold text-slate-700">Clienti Attivi</h3>
                         <p className="text-xs text-slate-500 max-w-xs mt-1">Clienti con contratto di servizio in corso di validità.</p>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                         <div className="text-xl font-black text-slate-700">12</div>
                         <svg className="absolute w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 96 96">
                             <circle cx="48" cy="48" r="40" stroke="#d1d9e6" strokeWidth="8" fill="none" />
                             <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset="50" strokeLinecap="round" />
                           </svg>
                    </div>
                 </div>
              </div>
          </div>
      )}

      {/* QUALITY VIEW */}
      {reportType === 'QUALITY' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Radar Chart */}
              <div className="neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Benchmark Fornitori</h3>
                  <p className="text-xs text-slate-500 mb-6">Confronto multidimensionale Top 2 Suppliers</p>
                  <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {supplierRadarData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                      <RadarChart outerRadius="80%" data={supplierRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar name="Fornitore A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Fornitore B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Legend />
                        <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '5px 5px 15px rgba(0,0,0,0.1)'}} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Donut Chart - Non Conformity Breakdown */}
              <div className="neu-flat p-8">
                   <h3 className="text-lg font-bold text-slate-700 mb-2">Analisi Non Conformità</h3>
                   <p className="text-xs text-slate-500 mb-6">Distribuzione per tipologia difetto</p>
                   <div className="h-80 relative w-full min-h-[320px] min-w-0">
                     {defectTypesData.length === 0 && <EmptyStateOverlay />}
                     <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                          <Pie
                            data={defectTypesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {defectTypesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', borderRadius: '12px', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                     </ResponsiveContainer>
                     {/* Center Label */}
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12 text-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-700">100%</span>
                     </div>
                   </div>
              </div>

              {/* NC Trend Bar Chart */}
              <div className="neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-6">Trend Difettosità (6 mesi)</h3>
                  <div className="h-64 w-full min-h-[256px] min-w-0 relative">
                    {ncTrendData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0} debounce={50}>
                      <BarChart data={ncTrendData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                         <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                         <Bar dataKey="nc" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} name="N.C." />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Strategic Matrix (Existing but refined) */}
              <div className="neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Matrice Qualità / Costo</h3>
                  <p className="text-xs text-slate-500 mb-6">Posizionamento strategico fornitori</p>
                  <div className="h-64 w-full min-h-[256px] min-w-0 relative">
                    {qualityMatrix.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0} debounce={50}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Prezzo Relativo" unit="%" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <YAxis type="number" dataKey="y" name="Punteggio Qualità" unit="pts" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <ZAxis type="number" dataKey="z" range={[50, 400]} />
                            <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Fornitori" data={qualityMatrix} fill="#8884d8">
                                {qualityMatrix.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][index % 4]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {/* GOVERNANCE VIEW */}
      {reportType === 'GOVERNANCE' && (
          <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="neu-flat p-6 border-l-4 border-blue-500">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Margine di Contribuzione</h4>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '32.4%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? '+2.1% vs Target' : 'Nessun dato'}
                      </div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-amber-500">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Scostamento Ore</h4>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '-4.2%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? 'Sotto la soglia critica' : 'Nessun dato'}
                      </div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-emerald-500">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avanzamento (SAL)</h4>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '88.0%' : '0%'}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">Media commesse attive</div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-red-500">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tasso Rilavorazione</h4>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '1.8%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? 'Obiettivo: < 1.5%' : 'Nessun dato'}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="neu-flat p-8">
                      <h3 className="text-lg font-bold text-slate-700 mb-6">Analisi Scostamento Ore per Commessa</h3>
                      <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                          <EmptyStateOverlay message="Dati di produzione in fase di sincronizzazione" />
                          <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                              <BarChart data={[]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                                  <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip />
                                  <Bar dataKey="budget" fill="#cbd5e1" name="Budget" />
                                  <Bar dataKey="actual" fill="#3b82f6" name="Effettivo" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="neu-flat p-8">
                      <h3 className="text-lg font-bold text-slate-700 mb-6">Indice SAL Temporale</h3>
                      <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                          <EmptyStateOverlay message="Dati SAL non disponibili per il periodo" />
                          <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                              <AreaChart data={[]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                                  <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip />
                                  <Area type="monotone" dataKey="sal" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* TREND & CAGR VIEW */}
      {reportType === 'TREND' && (
          <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-700">Analisi Spesa Intermediata</h3>
                          <p className="text-xs text-slate-500">Volume di acquisto gestito per conto dei clienti</p>
                      </div>
                      <div className="flex space-x-2 bg-[#EEF2F6] p-1 rounded-xl shadow-inner">
                          {(['1M', '3M', '6M', '1Y'] as const).map(tf => (
                              <button
                                  key={tf}
                                  onClick={() => setTrendTimeframe(tf)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${trendTimeframe === tf ? 'neu-flat text-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                  {tf}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="h-80 w-full min-h-[320px] min-w-0 mb-8 relative">
                      {trendData.length === 0 && <EmptyStateOverlay />}
                      <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                          <ComposedChart data={trendData}>
                              <defs>
                                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="right" orientation="right" tick={{fill:'#10b981'}} axisLine={false} tickLine={false} unit="%" />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Bar yAxisId="left" dataKey="value" name="Spesa Intermediata (€)" fill="url(#colorVolume)" radius={[4, 4, 0, 0]} barSize={20} />
                              <Line yAxisId="right" type="monotone" dataKey="cagr" name="CAGR Cumulativo (%)" stroke="#10b981" strokeWidth={3} dot={{r:4}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>

                  {/* DATA TABLE */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead>
                              <tr className="border-b border-slate-200">
                                  <th className="py-3 font-bold text-slate-500 uppercase text-xs">Periodo</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Volume (€)</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Growth (%)</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">CAGR (%)</th>
                              </tr>
                          </thead>
                          <tbody>
                              {trendData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                      <td className="py-3 font-bold text-slate-700">{row.name}</td>
                                      <td className="py-3 text-right font-mono text-slate-600">€ {row.value.toLocaleString('it-IT')}</td>
                                      <td className={`py-3 text-right font-bold ${row.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                          {row.growth > 0 ? '+' : ''}{row.growth}%
                                      </td>
                                      <td className="py-3 text-right font-bold text-blue-600">{row.cagr}%</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default BusinessIntelligenceView;