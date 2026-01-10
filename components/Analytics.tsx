import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { fetchOrders } from '../services/dataService';
import { PurchaseOrder } from '../types';

const Analytics: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<{
    monthlySpend: any[];
    vendorSpend: any[];
    statusDist: any[];
  }>({ monthlySpend: [], vendorSpend: [], statusDist: [] });

  useEffect(() => {
    const loadData = async () => {
      const data = await fetchOrders();
      setOrders(data);
      processData(data);
      setLoading(false);
    };
    loadData();
  }, []);

  const processData = (data: PurchaseOrder[]) => {
    // 1. Monthly Spend Trend
    const monthlyMap: Record<string, number> = {};
    data.forEach(order => {
      // Extract YYYY-MM
      const month = order.date.substring(0, 7); 
      monthlyMap[month] = (monthlyMap[month] || 0) + order.amount;
    });
    const monthlySpend = Object.keys(monthlyMap)
      .sort() // Chronological order
      .map(key => ({
        name: key,
        amount: monthlyMap[key]
      }));

    // 2. Top Vendors by Spend
    const vendorMap: Record<string, number> = {};
    data.forEach(order => {
      vendorMap[order.vendor] = (vendorMap[order.vendor] || 0) + order.amount;
    });
    const vendorSpend = Object.keys(vendorMap)
      .map(key => ({
        name: key,
        value: vendorMap[key]
      }))
      .sort((a, b) => b.value - a.value) // Descending
      .slice(0, 5); // Top 5

    // 3. Status Distribution
    const statusMap: Record<string, number> = {};
    data.forEach(order => {
      statusMap[order.status] = (statusMap[order.status] || 0) + 1;
    });
    const statusDist = Object.keys(statusMap).map(key => ({
      name: key,
      value: statusMap[key]
    }));

    setAnalyticsData({ monthlySpend, vendorSpend, statusDist });
  };

  const COLORS = ['#0ea5e9', '#0284c7', '#0369a1', '#0c4a6e', '#bae6fd'];
  const STATUS_COLORS: Record<string, string> = {
    'Open': '#22c55e', // Green
    'Pending Approval': '#eab308', // Yellow
    'Closed': '#64748b' // Slate
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epicor-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Business Intelligence & KPI</h2>
        <p className="text-slate-500 text-sm">Analisi basata sui dati reali delle transazioni</p>
      </div>

      {orders.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl shadow-sm border border-slate-200">
            <p className="text-slate-500">Nessun dato disponibile per l'analisi. Crea degli ordini nella sezione Acquisti.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart 1: Monthly Spend Trend */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Trend Spesa Mensile</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.monthlySpend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} tickFormatter={(value) => `€${value/1000}k`} />
                        <Tooltip 
                            cursor={{fill: '#f1f5f9'}}
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                            formatter={(value: number) => [`€ ${value.toLocaleString()}`, 'Spesa']}
                        />
                        <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Chart 2: Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Stato Ordini (Volume)</h3>
                <div className="h-80 w-full">
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

            {/* Chart 3: Top Vendors */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Top 5 Fornitori per Volume di Spesa</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analyticsData.vendorSpend} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0"/>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={150} axisLine={false} tickLine={false} tick={{fill: '#475569', fontWeight: 500}} />
                        <Tooltip 
                            cursor={{fill: 'transparent'}} 
                            contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                            formatter={(value: number) => [`€ ${value.toLocaleString()}`, 'Totale']}
                        />
                        <Bar dataKey="value" fill="#0284c7" radius={[0, 4, 4, 0]} barSize={30}>
                             {analyticsData.vendorSpend.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;