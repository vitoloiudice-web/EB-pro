
import React, { useEffect, useState } from 'react';
import { 
  ComposedChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchOrders } from '../services/dataService';
import { PurchaseOrder } from '../types';

interface AnalyticsProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const Analytics: React.FC<AnalyticsProps> = ({ tenantId, isMultiTenant }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [analyticsData, setAnalyticsData] = useState<{
    monthlySpend: any[];
    vendorSpend: any[];
    statusDist: any[];
    partSpendGlobal: any[];
  }>({ monthlySpend: [], vendorSpend: [], statusDist: [], partSpendGlobal: [] });

  // Vendor Drilldown State
  const [vendorsList, setVendorsList] = useState<string[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [vendorPartData, setVendorPartData] = useState<any[]>([]);
  
  // View Mode State
  const [viewMode, setViewMode] = useState<'general' | 'detail'>('general');

  useEffect(() => {
    const loadData = async () => {
      const effectiveFilter = isMultiTenant ? 'all' : tenantId;
      const data = await fetchOrders(effectiveFilter);
      setOrders(data);
      processGlobalData(data);
      
      const uniqueVendors = Array.from(new Set(data.map(o => o.vendor))).sort();
      setVendorsList(uniqueVendors);
      if (uniqueVendors.length > 0) {
        setSelectedVendor(uniqueVendors[0]);
      }

      setLoading(false);
    };
    loadData();
  }, [tenantId, isMultiTenant]);

  useEffect(() => {
    if (selectedVendor && orders.length > 0) {
        setVendorPartData(calculateVendorStats(selectedVendor, orders));
    }
  }, [selectedVendor, orders]);

  const processGlobalData = (data: PurchaseOrder[]) => {
    const monthlyMap: Record<string, number> = {};
    data.forEach(order => {
      const month = order.date.substring(0, 7); 
      monthlyMap[month] = (monthlyMap[month] || 0) + order.amount;
    });
    const monthlySpend = Object.keys(monthlyMap).sort().map(key => ({ name: key, amount: monthlyMap[key] }));

    const vendorMap: Record<string, number> = {};
    data.forEach(order => {
      vendorMap[order.vendor] = (vendorMap[order.vendor] || 0) + order.amount;
    });
    const vendorSpend = Object.keys(vendorMap)
      .map(key => ({ name: key, value: vendorMap[key] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const statusMap: Record<string, number> = {};
    data.forEach(order => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    });
    const statusDist = Object.keys(statusMap).map(key => ({ name: key, value: statusMap[key] }));

    const partMap: Record<string, number> = {};
    data.forEach(order => {
        const key = order.description || 'N/A';
        partMap[key] = (partMap[key] || 0) + order.amount;
    });
    const partSpendGlobal = Object.keys(partMap)
        .map(key => ({ name: key, value: partMap[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    setAnalyticsData({ monthlySpend, vendorSpend, statusDist, partSpendGlobal });
  };

  const calculateVendorStats = (vendor: string, data: PurchaseOrder[]) => {
      const filtered = data.filter(o => o.vendor === vendor);
      const partMap: Record<string, number> = {};
      
      filtered.forEach(order => {
          const key = order.description || 'N/A';
          partMap[key] = (partMap[key] || 0) + order.amount;
      });

      return Object.keys(partMap)
        .map(key => ({ name: key, value: partMap[key] }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
  };

  const COLORS = ['#0ea5e9', '#0284c7', '#0369a1', '#0c4a6e', '#bae6fd'];
  const STATUS_COLORS: Record<string, string> = {
    'Open': '#22c55e', 
    'Pending Approval': '#eab308',
    'Closed': '#64748b'
  };

  const renderVendorChart = (data: any[], height: number = 320) => (
      <div style={{ height: `${height}px`, width: '100%', minHeight: '100px' }}>
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={150} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} />
            <Tooltip 
                cursor={{fill: 'transparent'}} 
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                formatter={(value: number | undefined) => value !== undefined ? [`€ ${value.toLocaleString()}`, 'Totale'] : ['N/A', 'Totale']}
            />
            <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
        </ResponsiveContainer>
      </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epicor-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">
            Business Intelligence & KPI {isMultiTenant && '(Global)'}
        </h2>
        <p className="text-slate-500 text-sm">Analisi basata sui dati reali delle transazioni</p>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-500">Nessun dato disponibile per l'analisi. Crea degli ordini nella sezione Acquisti.</p>
        </div>
      ) : (
        <>
            {/* ROW 1: General Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Chart 1: Monthly Spend Trend (Composed: Bar + Line) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Trend Spesa Mensile</h3>
                    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={analyticsData.monthlySpend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                            <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value/1000}k`} />
                            <Tooltip 
                                cursor={{fill: '#f1f5f9'}}
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                formatter={(value: number) => [`€ ${value.toLocaleString()}`, 'Spesa']}
                            />
                            <Bar dataKey="amount" fill="#0ea5e9" fillOpacity={0.7} radius={[4, 4, 0, 0]} barSize={40} />
                            <Line 
                                type="monotone" 
                                dataKey="amount" 
                                stroke="#f59e0b" 
                                strokeWidth={3}
                                dot={{ r: 5, fill: '#fff', stroke: '#f59e0b', strokeWidth: 2 }}
                                activeDot={{ r: 7, strokeWidth: 0 }}
                            />
                        </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 2: Status Distribution */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Stato Ordini (Volume)</h3>
                    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={analyticsData.statusDist}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {analyticsData.statusDist.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                            <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ROW 2: Global Top Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Chart 3: Top Vendors */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Fornitori (Spesa Totale)</h3>
                    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.vendorSpend} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}} 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                                formatter={(value: number) => [`€ ${value.toLocaleString()}`, 'Totale']}
                            />
                            <Bar dataKey="value" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={20}>
                                {analyticsData.vendorSpend.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Chart 4: Top Parts Global */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Articoli (Spesa Globale)</h3>
                    <div className="h-80 w-full" style={{ minHeight: '320px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData.partSpendGlobal} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={120} axisLine={false} tickLine={false} tick={{fill: '#475569', fontSize: 11, fontWeight: 500}} />
                            <Tooltip 
                                cursor={{fill: 'transparent'}} 
                                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                                formatter={(value: number) => [`€ ${value.toLocaleString()}`, 'Totale']}
                            />
                            <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                        </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>

            {/* ROW 3: Vendor Drilldown - SPLIT VIEW */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-lg font-bold text-slate-800">Analisi Articoli per Fornitore</h3>
                    
                    {/* View Switcher */}
                    <div className="flex bg-slate-100 rounded-lg p-1">
                        <button 
                            onClick={() => setViewMode('general')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'general' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Vista Generale
                        </button>
                        <button 
                            onClick={() => setViewMode('detail')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'detail' ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Vista Selezione
                        </button>
                    </div>
                </div>

                {viewMode === 'detail' ? (
                    /* DETAIL VIEW */
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-700 mb-1">Seleziona Fornitore:</label>
                            <select 
                                className="bg-slate-50 border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-epicor-500 focus:border-epicor-500 block w-full sm:w-64 p-2.5"
                                value={selectedVendor}
                                onChange={(e) => setSelectedVendor(e.target.value)}
                            >
                                {vendorsList.map(v => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        
                        {vendorPartData.length > 0 ? (
                            renderVendorChart(vendorPartData, 320)
                        ) : (
                            <div className="h-64 flex items-center justify-center text-slate-400 italic">
                                Nessun dato articolo disponibile per il fornitore selezionato.
                            </div>
                        )}
                    </>
                ) : (
                    /* GENERAL VIEW */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {vendorsList.map(vendor => {
                            const data = calculateVendorStats(vendor, orders);
                            if (data.length === 0) return null;
                            return (
                                <div key={vendor} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                    <h4 className="font-bold text-sm text-slate-700 mb-2 truncate" title={vendor}>{vendor}</h4>
                                    {renderVendorChart(data, 180)}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
