
import React, { useState, useEffect } from 'react';
import { SalesForecast, BillOfMaterials } from '../types';
import { fetchSalesForecasts, fetchBOMs, saveSalesForecasts } from '../services/dataService';

interface SalesPlanProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const SalesPlan: React.FC<SalesPlanProps> = ({ tenantId, isMultiTenant }) => {
    const [forecasts, setForecasts] = useState<SalesForecast[]>([]);
    const [boms, setBoms] = useState<BillOfMaterials[]>([]);
    const [loading, setLoading] = useState(true);

    const [newForecast, setNewForecast] = useState({
        period: '2026-02',
        bomId: '',
        quantity: 1
    });

    useEffect(() => {
        loadData();
    }, [tenantId, isMultiTenant]);

    const loadData = async () => {
        setLoading(true);
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const [loadedForecasts, loadedBoms] = await Promise.all([
            fetchSalesForecasts(effectiveFilter),
            fetchBOMs(effectiveFilter)
        ]);
        setForecasts(loadedForecasts);
        setBoms(loadedBoms.filter(b => b.status === 'Active')); // Only active BOMs
        setLoading(false);
    };

    const handleAddForecast = async (e: React.FormEvent) => {
        e.preventDefault();
        const bom = boms.find(b => b.id === newForecast.bomId);
        if (!bom) return;

        const newItem: SalesForecast = {
            id: `SF-${Date.now()}`,
            tenantId: isMultiTenant ? 'main' : tenantId,
            period: newForecast.period,
            bomId: bom.id,
            bomName: bom.name,
            quantity: Number(newForecast.quantity),
            status: 'Draft'
        };

        const updated = [...forecasts, newItem];
        setForecasts(updated);
        await saveSalesForecasts(updated);
        
        // Reset form but keep period
        setNewForecast(prev => ({ ...prev, bomId: '', quantity: 1 }));
    };

    const confirmForecast = async (id: string) => {
        const updated = forecasts.map(f => f.id === id ? { ...f, status: 'Confirmed' as const } : f);
        setForecasts(updated);
        await saveSalesForecasts(updated);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-800">Piano Vendite {isMultiTenant && '(Global)'}</h2>
                <p className="text-slate-500 text-sm">Definizione previsioni di vendita prodotti finiti per calcolo fabbisogni (MRP).</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Input Form */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-epicor-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Aggiungi Previsione
                    </h3>
                    <form onSubmit={handleAddForecast} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Periodo (Mese)</label>
                            <input 
                                type="month" 
                                className="w-full border border-slate-300 rounded p-2"
                                value={newForecast.period}
                                onChange={e => setNewForecast({...newForecast, period: e.target.value})}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prodotto (BOM)</label>
                            <select 
                                className="w-full border border-slate-300 rounded p-2"
                                value={newForecast.bomId}
                                onChange={e => setNewForecast({...newForecast, bomId: e.target.value})}
                                required
                            >
                                <option value="">-- Seleziona Prodotto --</option>
                                {boms.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} (Rev. {b.revision})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantità Prevista</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full border border-slate-300 rounded p-2"
                                value={newForecast.quantity}
                                onChange={e => setNewForecast({...newForecast, quantity: Number(e.target.value)})}
                                required
                            />
                        </div>
                        <button type="submit" className="w-full bg-epicor-600 text-white py-2 rounded font-bold hover:bg-epicor-700 shadow-md">
                            Aggiungi al Piano
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Previsioni Attive</h3>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">{forecasts.length} record</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Periodo</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Prodotto</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Q.tà</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stato</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-4 text-center">Caricamento...</td></tr>
                                ) : forecasts.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-slate-400 italic">Nessuna previsione inserita.</td></tr>
                                ) : (
                                    forecasts.sort((a,b) => a.period.localeCompare(b.period)).map(f => (
                                        <tr key={f.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-slate-600">{f.period}</td>
                                            <td className="px-6 py-4 font-medium text-slate-800">{f.bomName}</td>
                                            <td className="px-6 py-4 font-bold text-lg">{f.quantity}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${f.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {f.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {f.status === 'Draft' && (
                                                    <button 
                                                        onClick={() => confirmForecast(f.id)}
                                                        className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100"
                                                    >
                                                        Conferma
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesPlan;
