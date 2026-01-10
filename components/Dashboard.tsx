import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { SALES_DATA } from '../constants';
import { KpiTile } from '../types';
import { fetchOrders, seedInitialData } from '../services/dataService';
import { DEFAULT_SEASONAL_EVENTS } from '../utils/seasonalAlgorithms';

const Dashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KpiTile[]>([]);

  useEffect(() => {
    const loadData = async () => {
      await seedInitialData();
      const orders = await fetchOrders();
      
      const openOrders = orders.filter(o => o.status === 'Open' || o.status === 'Approved');
      const totalOpenValue = openOrders.reduce((sum, o) => sum + o.amount, 0);

      setKpis([
        { id: '1', title: 'Open PO Value', value: `€ ${(totalOpenValue / 1000).toFixed(1)}k`, change: 12.5, trend: 'up', icon: 'shopping-cart' },
        { id: '2', title: 'On-Time Delivery', value: '94%', change: -2.1, trend: 'down', icon: 'clock' },
        { id: '3', title: 'Quality Score', value: '98/100', change: 1.5, trend: 'up', icon: 'check-circle' },
        { id: '4', title: 'Active Suppliers', value: '24', change: 0, trend: 'neutral', icon: 'users' },
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const getMonthName = (index: number) => new Date(0, index).toLocaleString('it-IT', { month: 'short' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
          <p className="text-slate-500 text-sm">Welcome back, Admin</p>
        </div>
        <button onClick={() => window.location.reload()} className="text-epicor-600 hover:text-epicor-800 text-sm font-medium">Refresh Data</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-epicor-600"></div></div>
      ) : (
        <>
          {/* KPI Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <div key={kpi.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-xs uppercase font-semibold tracking-wider">{kpi.title}</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{kpi.value}</p>
                </div>
                <div className={`p-2 rounded-lg ${kpi.trend === 'up' ? 'bg-green-50 text-green-600' : kpi.trend === 'down' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>
                   <span className="text-xs font-bold">{kpi.change > 0 ? '+' : ''}{kpi.change}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Seasonal Radar */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Seasonal Radar (Chiusure Fornitori)</h3>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from({ length: 12 }).map((_, i) => {
                  const event = DEFAULT_SEASONAL_EVENTS.find(e => e.startMonth <= i && e.endMonth >= i);
                  return (
                    <div key={i} className={`flex flex-col items-center p-2 rounded-lg border ${event ? (event.riskLevel === 'High' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200') : 'bg-slate-50 border-slate-100'}`}>
                      <span className="text-xs font-bold text-slate-600">{getMonthName(i)}</span>
                      {event && <span className="text-[10px] text-center mt-1 leading-tight text-red-600 font-medium">{event.riskLevel === 'High' ? 'CHIUSO' : 'RISCHIO'}</span>}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-slate-500 mt-3">* I periodi evidenziati richiedono anticipo ordini (Algoritmo MRP Attivo)</p>
            </div>

            {/* Action Center */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Action Center</h3>
              <ul className="space-y-3">
                <li className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="w-2 h-2 mt-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Approvare 3 PO</p>
                    <p className="text-xs text-slate-500">Ordini sopra €5k richiedono firma.</p>
                  </div>
                </li>
                <li className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Nuova NCR Rilevata</p>
                    <p className="text-xs text-slate-500">Parte: HYD-PUMP-01 (Difetto)</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Performance Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-3">
               <h3 className="text-lg font-bold text-slate-800 mb-4">Spend Trend (YTD)</h3>
               <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={SALES_DATA}>
                        <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284c7" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0284c7" stopOpacity={0}/>
                        </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#0284c7" fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                 </ResponsiveContainer>
               </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;