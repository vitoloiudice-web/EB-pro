import React, { useState, useMemo } from 'react';
import { Company } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie,
  ComposedChart, Area
} from 'recharts';

interface BIProps {
  company: Company;
}

const BusinessIntelligenceView: React.FC<BIProps> = ({ company }) => {
  const [reportType, setReportType] = useState<'PERFORMANCE' | 'QUALITY' | 'SAVINGS' | 'TREND'>('PERFORMANCE');
  const [savingsChartMode, setSavingsChartMode] = useState<'LINE' | 'BAR'>('LINE');
  const [trendTimeframe, setTrendTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');
  const [generating, setGenerating] = useState(false);

  // --- MOCK DATA ---
  const supplierPerformanceData = [
    { name: 'HydraForce', affidabilita: 98, qualita: 95, ritardi: 2 },
    { name: 'Acciaierie V.', affidabilita: 85, qualita: 99, ritardi: 12 },
    { name: 'AutoElectric', affidabilita: 92, qualita: 88, ritardi: 5 },
    { name: 'Vernici PRO', affidabilita: 95, qualita: 90, ritardi: 3 },
  ];

  const savingsData = [
    { month: 'Gen', target: 5000, actual: 4200, resi: 200 },
    { month: 'Feb', target: 5000, actual: 5100, resi: 150 },
    { month: 'Mar', target: 5000, actual: 6800, resi: 0 },
    { month: 'Apr', target: 5000, actual: 4500, resi: 300 },
  ];

  // Quality Matrix (Strategic)
  const qualityMatrix = [
    { x: 10, y: 30, z: 200, name: 'Fornitore A' },
    { x: 50, y: 80, z: 400, name: 'Fornitore B' },
    { x: 80, y: 90, z: 100, name: 'Fornitore C' },
    { x: 30, y: 50, z: 300, name: 'Fornitore D' },
  ];

  // Radar Data (Supplier Comparison)
  const supplierRadarData = [
    { subject: 'Qualità Prodotto', A: 120, B: 110, fullMark: 150 },
    { subject: 'Puntualità', A: 98, B: 130, fullMark: 150 },
    { subject: 'Prezzo', A: 86, B: 130, fullMark: 150 },
    { subject: 'Flessibilità', A: 99, B: 100, fullMark: 150 },
    { subject: 'Sostenibilità', A: 85, B: 90, fullMark: 150 },
    { subject: 'Innovazione', A: 65, B: 85, fullMark: 150 },
  ];

  // Donut Data (Non-Conformity Types)
  const defectTypesData = [
    { name: 'Dimensionale', value: 40, color: '#3b82f6' },
    { name: 'Estetico', value: 30, color: '#f59e0b' },
    { name: 'Documentale', value: 20, color: '#10b981' },
    { name: 'Funzionale', value: 10, color: '#ef4444' },
  ];

  // Bar Data (NC Trend)
  const ncTrendData = [
    { month: 'Nov', nc: 12 },
    { month: 'Dic', nc: 19 },
    { month: 'Gen', nc: 8 },
    { month: 'Feb', nc: 5 },
    { month: 'Mar', nc: 10 },
    { month: 'Apr', nc: 4 },
  ];


  // --- DYNAMIC TREND DATA GENERATOR ---
  const trendData = useMemo(() => {
    // Generate 24 months of data
    const rawMonths = [
       { id: 1, name: 'Gen 23', value: 12000 }, { id: 2, name: 'Feb 23', value: 12500 }, { id: 3, name: 'Mar 23', value: 11800 },
       { id: 4, name: 'Apr 23', value: 13200 }, { id: 5, name: 'Mag 23', value: 13500 }, { id: 6, name: 'Giu 23', value: 14000 },
       { id: 7, name: 'Lug 23', value: 13800 }, { id: 8, name: 'Ago 23', value: 9000 }, { id: 9, name: 'Set 23', value: 14500 },
       { id: 10, name: 'Ott 23', value: 15200 }, { id: 11, name: 'Nov 23', value: 16000 }, { id: 12, name: 'Dic 23', value: 15500 },
       { id: 13, name: 'Gen 24', value: 14800 }, { id: 14, name: 'Feb 24', value: 15900 }, { id: 15, name: 'Mar 24', value: 16500 },
       { id: 16, name: 'Apr 24', value: 17200 }, { id: 17, name: 'Mag 24', value: 17800 }, { id: 18, name: 'Giu 24', value: 18200 },
       { id: 19, name: 'Lug 24', value: 18500 }, { id: 20, name: 'Ago 24', value: 11000 }, { id: 21, name: 'Set 24', value: 19500 },
       { id: 22, name: 'Ott 24', value: 20500 }, { id: 23, name: 'Nov 24', value: 21200 }, { id: 24, name: 'Dic 24', value: 20000 }
    ];

    let aggregated = [];
    let step = 1;
    if (trendTimeframe === '3M') step = 3;
    if (trendTimeframe === '6M') step = 6;
    if (trendTimeframe === '1Y') step = 12;

    for (let i = 0; i < rawMonths.length; i += step) {
        const slice = rawMonths.slice(i, i + step);
        const sumValue = slice.reduce((acc, curr) => acc + curr.value, 0);
        
        let label = slice[0].name;
        if (step > 1) label = `${slice[0].name} - ${slice[slice.length-1].name}`;
        
        // CAGR / Growth Calculation
        // CAGR Formula: (EndValue / StartValue)^(1/n) - 1
        // Here we calculate simplistic period-over-period growth or cumulative CAGR from start
        
        const previousValue = i > 0 ? aggregated[aggregated.length-1].value : sumValue; // Avoid div by zero
        const growth = i > 0 ? ((sumValue - previousValue) / previousValue) * 100 : 0;
        
        // Cumulative CAGR from start (period 0)
        const startValue = rawMonths.slice(0, step).reduce((acc, c) => acc + c.value, 0);
        const n = aggregated.length; // periods elapsed
        const cagr = n > 0 ? (Math.pow(sumValue / startValue, 1 / (n + 1)) - 1) * 100 : 0;

        aggregated.push({
            name: label,
            value: sumValue,
            growth: parseFloat(growth.toFixed(2)),
            cagr: parseFloat(cagr.toFixed(2))
        });
    }
    return aggregated;
  }, [trendTimeframe]);

  const handleGenerateReport = (format: 'PDF' | 'EXCEL') => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      alert(`Report generato!`);
    }, 1500);
  };

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
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Header Section */}
      <div className="neu-flat p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-700">Business Intelligence</h2>
          <p className="text-slate-500 mt-2 font-medium">Analytics & Reporting avanzato</p>
        </div>
        
        <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
             <button 
                  onClick={() => handleGenerateReport('PDF')}
                  disabled={generating}
                  className="neu-btn px-4 py-2 text-sm text-red-600 flex-1 sm:flex-none whitespace-nowrap"
                >
                   {generating ? '...' : 'PDF Report'}
             </button>
             <button 
                  onClick={() => handleGenerateReport('EXCEL')}
                  disabled={generating}
                  className="neu-btn px-4 py-2 text-sm text-green-600 flex-1 sm:flex-none whitespace-nowrap"
                >
                   {generating ? '...' : 'Excel Report'}
             </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4">
          {(['PERFORMANCE', 'QUALITY', 'SAVINGS', 'TREND'] as const).map((tab) => (
             <button 
                key={tab}
                onClick={() => setReportType(tab)}
                className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${reportType === tab ? 'neu-pressed text-blue-600' : 'neu-flat-sm text-slate-500 hover:text-slate-700'}`}
             >
                {tab === 'PERFORMANCE' && 'Performance'}
                {tab === 'QUALITY' && 'Qualità'}
                {tab === 'SAVINGS' && 'Economico'}
                {tab === 'TREND' && 'Trend & CAGR'}
             </button>
          ))}
      </div>

      {/* PERFORMANCE VIEW */}
      {reportType === 'PERFORMANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-6">Affidabilità Fornitori (%)</h3>
                  <div className="h-80 w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={supplierPerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#d1d9e6" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill:'#64748b', fontWeight:600}} axisLine={false} tickLine={false} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} />
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
                              <span className="font-bold text-blue-600">92%</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: '92%' }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500 font-bold">Completezza</span>
                              <span className="font-bold text-blue-600">98%</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: '98%' }}></div>
                          </div>
                      </div>
                      
                      <div className="p-4 neu-pressed bg-amber-50/50 rounded-xl mt-4">
                          <h4 className="text-xs font-black text-amber-600 uppercase mb-1">Alert Critico</h4>
                          <p className="text-xs text-slate-600">
                             Fornitore <strong>Acciaierie V.</strong> in calo del 12%.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* SAVINGS VIEW */}
      {reportType === 'SAVINGS' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-bold text-slate-700">Risparmio vs Target</h3>
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
                  <div className="h-80 w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        {savingsChartMode === 'LINE' ? (
                          <LineChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Line name="Effettivo" type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} dot={{r:4, fill:'#10b981'}} />
                              <Line name="Obiettivo" type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                          </LineChart>
                        ) : (
                          <BarChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Bar dataKey="actual" name="Risparmio Effettivo" stackId="a" fill="#10b981" radius={[0, 0, 4, 4]} />
                              <Bar dataKey="resi" name="Resi / Anomalie" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="target" name="Obiettivo" stackId="b" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
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
                    <h4 className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-2">Risparmio Totale YTD</h4>
                    <p className="text-5xl font-black text-slate-700">€ 20.6k</p>
                    <p className="text-emerald-600 text-sm font-bold mt-2">+15% vs anno prec.</p>
                 </div>

                 <div className="neu-flat p-8 flex items-center justify-between">
                    <div>
                         <h3 className="text-lg font-bold text-slate-700">Conversione</h3>
                         <p className="text-xs text-slate-500 max-w-xs mt-1">Efficienza negoziazione su acquisti totali.</p>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center">
                         <div className="text-xl font-black text-slate-700">18%</div>
                         <svg className="absolute w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 96 96">
                             <circle cx="48" cy="48" r="40" stroke="#d1d9e6" strokeWidth="8" fill="none" />
                             <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset="200" strokeLinecap="round" />
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
                  <div className="h-80 w-full min-h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart outerRadius="80%" data={supplierRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar name="Fornitore A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Fornitore B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Legend />
                        <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '5px 5px 15px rgba(0,0,0,0.1)'}} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Donut Chart - Non Conformity Breakdown */}
              <div className="neu-flat p-8">
                   <h3 className="text-lg font-bold text-slate-700 mb-2">Analisi Non Conformità</h3>
                   <p className="text-xs text-slate-500 mb-6">Distribuzione per tipologia difetto</p>
                   <div className="h-80 relative w-full min-h-[320px]">
                     <ResponsiveContainer width="100%" height="100%">
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
                          <Tooltip contentStyle={{background: '#EEF2F6', border: 'none', borderRadius: '12px', boxShadow: '5px 5px 10px #d1d9e6'}}/>
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
                  <div className="h-64 w-full min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ncTrendData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                         <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <Tooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                         <Bar dataKey="nc" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} name="N.C." />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Strategic Matrix (Existing but refined) */}
              <div className="neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-2">Matrice Qualità / Costo</h3>
                  <p className="text-xs text-slate-500 mb-6">Posizionamento strategico fornitori</p>
                  <div className="h-64 w-full min-h-[256px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Prezzo Relativo" unit="%" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <YAxis type="number" dataKey="y" name="Punteggio Qualità" unit="pts" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <ZAxis type="number" dataKey="z" range={[50, 400]} />
                            <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
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

      {/* TREND & CAGR VIEW */}
      {reportType === 'TREND' && (
          <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                          <h3 className="text-lg font-bold text-slate-700">Analisi Trend & CAGR</h3>
                          <p className="text-xs text-slate-500">Compound Annual Growth Rate e Volume Acquisti</p>
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

                  <div className="h-80 w-full min-h-[320px] mb-8">
                      <ResponsiveContainer width="100%" height="100%">
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
                              <Tooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Bar yAxisId="left" dataKey="value" name="Volume Acquisto (€)" fill="url(#colorVolume)" radius={[4, 4, 0, 0]} barSize={20} />
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