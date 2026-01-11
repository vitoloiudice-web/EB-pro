
import React, { useState, useEffect } from 'react';
import { fetchSalesForecasts, fetchBOMs, fetchParts, fetchMrpProposals, saveMrpProposals, fetchOrders, fetchNCRs } from '../services/dataService';
import { SalesForecast, BillOfMaterials, Part, MrpProposal, BOMItem, PurchaseOrder, NonConformance } from '../types';
import { calculateMrpSuggestion, DEFAULT_SEASONAL_EVENTS } from '../utils/seasonalAlgorithms';

interface MRPProps {
    tenantId: string;
    isMultiTenant: boolean;
}

interface TimeBucketEvent {
    date: Date;
    dateStr: string;
    type: 'INITIAL_STOCK' | 'PO_RECEIPT' | 'DEMAND_BOM' | 'DEMAND_CONSUMPTION';
    qty: number;
    ref?: string;
    balanceAfter: number;
}

const MRP: React.FC<MRPProps> = ({ tenantId, isMultiTenant }) => {
    const [loading, setLoading] = useState(false);
    const [lastRun, setLastRun] = useState<Date | null>(null);
    const [proposals, setProposals] = useState<MrpProposal[]>([]);
    const [logs, setLogs] = useState<string[]>([]);
    
    // Data Stats
    const [stats, setStats] = useState({ forecastCount: 0, bomCount: 0, partCount: 0, openPoCount: 0 });

    useEffect(() => {
        loadInitialData();
    }, [tenantId, isMultiTenant]);

    const loadInitialData = async () => {
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const [f, b, p, props, o] = await Promise.all([
            fetchSalesForecasts(effectiveFilter),
            fetchBOMs(effectiveFilter),
            fetchParts(effectiveFilter),
            fetchMrpProposals(effectiveFilter),
            fetchOrders(effectiveFilter)
        ]);
        setStats({ 
            forecastCount: f.length, 
            bomCount: b.length, 
            partCount: p.length,
            openPoCount: o.filter(ord => ord.status === 'Open' || ord.status === 'Approved').length
        });
        setProposals(props.filter(p => p.status === 'Pending')); // Show history/pending
    };

    const runMRP = async () => {
        setLoading(true);
        setLogs([]);
        const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

        try {
            const effectiveFilter = isMultiTenant ? 'all' : tenantId;
            addLog("Inizio Elaborazione MRP Time-Phased (Stagionale)...");
            
            // 1. Fetch All Data Sources
            const forecasts = (await fetchSalesForecasts(effectiveFilter)).filter(f => f.status === 'Confirmed');
            const boms = await fetchBOMs(effectiveFilter);
            const parts = await fetchParts(effectiveFilter);
            const openOrders = (await fetchOrders(effectiveFilter)).filter(o => o.status === 'Open' || o.status === 'Approved');
            const ncrs = (await fetchNCRs(effectiveFilter)).filter(n => n.status === 'Open');

            if (forecasts.length === 0) {
                addLog("Nessun Piano Vendite confermato trovato. Interruzione.");
                setLoading(false);
                return;
            }

            addLog(`Dati caricati: ${forecasts.length} Previsioni, ${openOrders.length} Ordini Aperti, ${ncrs.length} NCR Attive.`);

            // 2. Prepare Demand Timeline per SKU
            // Structure: Map<PartSKU, Array<Event>>
            const demandEvents: Map<string, TimeBucketEvent[]> = new Map();

            // Helper to get/init array
            const getEvents = (sku: string) => {
                if (!demandEvents.has(sku)) demandEvents.set(sku, []);
                return demandEvents.get(sku)!;
            };

            // A. Process Demand (Forecasts -> BOM Explosion)
            forecasts.forEach(forecast => {
                const bom = boms.find(b => b.id === forecast.bomId);
                if (!bom) {
                    addLog(`WARN: BOM ${forecast.bomId} non trovata per previsione ${forecast.id}`);
                    return;
                }
                
                // Assume Forecast Period is "YYYY-MM" -> Need Date is 1st of that month
                const needDate = new Date(`${forecast.period}-01`);

                // Explode BOM
                bom.items.forEach(item => {
                    if (item.partNumber && (item.nodeType === 'Component' || item.nodeType === 'Variant' || item.nodeType === 'Option')) {
                        const qtyNeeded = item.quantity * forecast.quantity;
                        getEvents(item.partNumber).push({
                            date: needDate,
                            dateStr: needDate.toISOString().split('T')[0],
                            type: 'DEMAND_BOM',
                            qty: -qtyNeeded, // Negative for demand
                            ref: `Plan ${forecast.period} (${bom.name})`,
                            balanceAfter: 0
                        });
                    }
                });
            });

            // B. Process Supply (Open Purchase Orders)
            openOrders.forEach(order => {
                const matchedPart = parts.find(p => order.description?.includes(p.sku) || order.description === p.description);
                if (matchedPart) {
                    const orderDate = new Date(order.date);
                    const leadTimeDays = matchedPart.leadTime;
                    const arrivalDate = new Date(orderDate);
                    arrivalDate.setDate(arrivalDate.getDate() + leadTimeDays);
                    
                    const finalArrival = arrivalDate < new Date() ? new Date(new Date().setDate(new Date().getDate() + 1)) : arrivalDate;

                    getEvents(matchedPart.sku).push({
                        date: finalArrival,
                        dateStr: finalArrival.toISOString().split('T')[0],
                        type: 'PO_RECEIPT',
                        qty: order.items, // Supply is positive
                        ref: `PO ${order.id}`,
                        balanceAfter: 0
                    });
                }
            });


            // 3. Calculate Projection per Part
            const newProposals: MrpProposal[] = [];

            parts.forEach(part => {
                const events = getEvents(part.sku);
                
                // Initial Net Stock: Physical Stock - Blocked NCRs
                const blockedStock = ncrs.filter(n => n.partId === part.id).reduce((sum, n) => sum + n.qtyFailed, 0);
                const startStock = Math.max(0, part.stock - blockedStock);
                
                if (events.length === 0 && (part.averageDailyConsumption || 0) === 0 && startStock >= part.safetyStock) return;

                events.sort((a, b) => a.date.getTime() - b.date.getTime());

                let runningStock = startStock;
                let currentDate = new Date(); 
                
                const horizonEnd = new Date();
                horizonEnd.setMonth(horizonEnd.getMonth() + 6);

                const fullTimeline: TimeBucketEvent[] = [];
                
                fullTimeline.push({
                    date: new Date(),
                    dateStr: new Date().toISOString().split('T')[0],
                    type: 'INITIAL_STOCK',
                    qty: startStock,
                    ref: `Start (Net of ${blockedStock} NCR)`,
                    balanceAfter: startStock
                });

                const applyConsumption = (untilDate: Date) => {
                    if (!part.averageDailyConsumption || part.averageDailyConsumption <= 0) return;
                    
                    const diffTime = Math.abs(untilDate.getTime() - currentDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                    
                    if (diffDays > 0) {
                        const consumptionQty = diffDays * part.averageDailyConsumption;
                        runningStock -= consumptionQty;
                    }
                };

                for (const event of events) {
                    if (event.date > horizonEnd) break;
                    
                    if (event.date > currentDate) {
                        applyConsumption(event.date);
                        currentDate = event.date;
                    }

                    runningStock += event.qty;
                    event.balanceAfter = runningStock;
                    fullTimeline.push(event);

                    // TRIGGER POINT: Stock dips below Safety Stock
                    if (runningStock < part.safetyStock) {
                        const missing = part.safetyStock - runningStock;
                        const needDateObj = new Date(event.date);

                        // --- SEASONAL ALGORITHM APPLICATION ---
                        // Instead of simple subtraction, check for seasonal conflicts
                        const seasonalCalc = calculateMrpSuggestion(
                            needDateObj,
                            part.leadTime,
                            DEFAULT_SEASONAL_EVENTS
                        );

                        const orderByDateStr = seasonalCalc.adjustedOrderDate.toISOString().split('T')[0];
                        let reasonStr = `Stock < Sicurezza (${part.safetyStock}) al ${event.dateStr}. Causale: ${event.ref}`;

                        // Append Seasonal Alert if present
                        if (seasonalCalc.alertMessage) {
                            reasonStr += ` | ⚠️ ${seasonalCalc.alertMessage}`;
                        }
                        // --------------------------------------

                        newProposals.push({
                            id: `MRP-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                            tenantId: part.tenantId,
                            partId: part.id,
                            partSku: part.sku,
                            description: part.description,
                            requiredQty: Math.abs(event.qty),
                            currentStock: startStock,
                            missingQty: Math.ceil(missing),
                            suggestedVendor: part.suppliers?.habitual?.name || part.manufacturer?.name || 'Unknown',
                            estimatedCost: Math.ceil(missing) * part.cost,
                            reason: reasonStr,
                            status: 'Pending',
                            createdAt: new Date().toISOString().split('T')[0],
                            needDate: event.dateStr,
                            orderByDate: orderByDateStr // Optimized Date
                        });

                        break; 
                    }
                }
                
                // Rotation Check (Consumption Only)
                if (part.averageDailyConsumption && runningStock >= part.safetyStock) {
                    applyConsumption(horizonEnd);
                    if (runningStock < part.safetyStock) {
                         const missing = part.safetyStock - runningStock;
                         const needDateObj = new Date(horizonEnd);
                         
                         // Seasonal Algo also for rotation based orders
                         const seasonalCalc = calculateMrpSuggestion(
                            needDateObj,
                            part.leadTime,
                            DEFAULT_SEASONAL_EVENTS
                        );

                         newProposals.push({
                            id: `MRP-ROT-${Date.now()}-${Math.floor(Math.random()*10000)}`,
                            tenantId: part.tenantId,
                            partId: part.id,
                            partSku: part.sku,
                            description: part.description,
                            requiredQty: 0,
                            currentStock: startStock,
                            missingQty: Math.ceil(missing),
                            suggestedVendor: part.suppliers?.habitual?.name || 'Unknown',
                            estimatedCost: Math.ceil(missing) * part.cost,
                            reason: `Esaurimento da Consumo (${part.averageDailyConsumption}/die) al ${horizonEnd.toISOString().split('T')[0]} ${seasonalCalc.alertMessage ? '| ⚠️ ' + seasonalCalc.alertMessage : ''}`,
                            status: 'Pending',
                            createdAt: new Date().toISOString().split('T')[0],
                            needDate: horizonEnd.toISOString().split('T')[0],
                            orderByDate: seasonalCalc.adjustedOrderDate.toISOString().split('T')[0]
                        });
                    }
                }
            });

            // 4. Save Results
            await saveMrpProposals(newProposals, effectiveFilter);
            setProposals(newProposals); 

            if (newProposals.length > 0) {
                addLog(`Calcolo Completato. Generate ${newProposals.length} proposte d'ordine (Time-Phased + Stagionale).`);
            } else {
                addLog("Calcolo Completato. Nessun fabbisogno rilevato (Stock sufficiente nel periodo).");
            }

            setLastRun(new Date());

        } catch (e) {
            console.error(e);
            addLog("Errore critico durante esecuzione MRP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Motore MRP {isMultiTenant && '(Global)'}</h2>
                    <p className="text-slate-500 text-sm">MRP II: Fabbisogni netti temporali con ottimizzazione stagionale (JIT)</p>
                </div>
                <div className="mt-4 md:mt-0 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm text-sm">
                    <span className="text-slate-500 mr-2">Ultima esecuzione:</span>
                    <span className="font-mono font-bold">{lastRun ? lastRun.toLocaleTimeString() : 'Mai'}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Control Panel */}
                <div className="bg-slate-800 text-white rounded-xl p-6 shadow-lg h-fit">
                    <h3 className="font-bold text-lg mb-4 flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Pannello Controllo
                    </h3>
                    
                    <div className="space-y-4 mb-8">
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Piano Vendite</span>
                            <span className="font-bold">{stats.forecastCount} Previsioni</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Flussi in Ingresso</span>
                            <span className="font-bold">{stats.openPoCount} PO Aperti</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-700 pb-2">
                            <span className="text-slate-400">Algoritmo Attivo</span>
                            <span className="font-bold text-green-400">Time-Phased + Seasonal</span>
                        </div>
                    </div>

                    <button 
                        onClick={runMRP}
                        disabled={loading}
                        className={`w-full py-4 rounded-lg font-bold text-lg shadow-md transition-all flex justify-center items-center ${loading ? 'bg-slate-600 cursor-not-allowed' : 'bg-epicor-500 hover:bg-epicor-400 hover:shadow-lg hover:scale-105'}`}
                    >
                        {loading ? (
                            <span className="animate-pulse">Calcolo in corso...</span>
                        ) : (
                            <>
                                <span>Esegui Calcolo MRP</span>
                                <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </>
                        )}
                    </button>
                    
                    <div className="mt-6 bg-slate-900 rounded p-3 text-xs font-mono text-green-400 h-48 overflow-y-auto">
                        {logs.length === 0 ? <span className="text-slate-600">Log di sistema in attesa...</span> : logs.map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700">Risultati MRP (Proposte)</h3>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-bold">{proposals.length} Ordini Suggeriti</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4">
                        {proposals.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <svg className="w-16 h-16 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p>Nessuna proposta d'ordine generata. Esegui il calcolo.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {proposals.map(p => {
                                    const isSeasonalAlert = p.reason.includes('⚠️');
                                    return (
                                        <div key={p.id} className={`bg-white border border-l-4 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isSeasonalAlert ? 'border-l-red-500 border-red-100' : 'border-l-orange-500 border-slate-200'}`}>
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-slate-800 text-lg">{p.partSku}</h4>
                                                        {isMultiTenant && <span className="text-[10px] uppercase bg-slate-100 px-1 rounded">{p.tenantId}</span>}
                                                    </div>
                                                    <p className="text-sm text-slate-600">{p.description}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-semibold flex items-center">
                                                            📅 Need: {p.needDate}
                                                        </span>
                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold flex items-center ${isSeasonalAlert ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                            🛒 Order By: {p.orderByDate}
                                                            {isSeasonalAlert && <span className="ml-1 text-[8px] uppercase font-bold">(Anticipato)</span>}
                                                        </span>
                                                    </div>
                                                    <p className={`text-xs mt-2 italic ${isSeasonalAlert ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                                                        {p.reason}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-500 uppercase font-bold">Da Ordinare</p>
                                                    <p className="text-2xl font-bold text-orange-600">{p.missingQty}</p>
                                                </div>
                                            </div>
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-sm">
                                                <div className="flex gap-4 text-slate-500">
                                                    <span>Stock Iniziale: <strong>{p.currentStock}</strong></span>
                                                    <span title="Include PO in arrivo">Fabbisogno Netto: <strong>{p.missingQty}</strong></span>
                                                </div>
                                                <div className="font-bold text-slate-700">
                                                    Stima: € {p.estimatedCost.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MRP;
