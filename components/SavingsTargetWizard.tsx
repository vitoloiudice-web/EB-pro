import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Client, Item, SavingsTarget, SavingAction } from '../types';
import { dataService } from '../services/dataService';

interface SavingsTargetWizardProps {
  client: Client;
  onClose: () => void;
}

const SavingsTargetWizard: React.FC<SavingsTargetWizardProps> = ({ client, onClose }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [category, setCategory] = useState<string>('Tutte le categorie');
  const [targetPercent, setTargetPercent] = useState<number>(5);
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // Analysis State
  const [potentialSavings, setPotentialSavings] = useState<Array<{
    item: Item;
    currentSupplier: string;
    altSupplier: string;
    altSupplierId: string;
    currentPrice: number;
    altPrice: number;
    annualQty: number; // Assuming we estimate this
    savingPerUnit: number;
    totalSaving: number;
  }>>([]);

  useEffect(() => {
    loadData();
  }, [client.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const itemsRes = await dataService.getItems(client, 1, 1000, '');
      setItems(itemsRes.data);
    } catch (error) {
      console.error("Error loading items:", error);
    }
    setLoading(false);
  };

  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category));
    return ['Tutte le categorie', ...Array.from(cats)];
  }, [items]);

  const handleAnalyze = () => {
    // Calcolo Price Gap (Leva 1)
    const analysis = [];
    
    // Filtra items
    const filteredItems = category === 'Tutte le categorie' 
      ? items 
      : items.filter(i => i.category === category);

    for (const item of filteredItems) {
      if (!item.suppliers || item.suppliers.length < 2) continue; // Requires at least 2 suppliers

      const preferred = item.suppliers.find(s => s.isPreferred);
      if (!preferred) continue;

      const alternatives = item.suppliers.filter(s => !s.isPreferred && s.price < preferred.price);
      if (alternatives.length === 0) continue;

      // Find best alternative
      alternatives.sort((a, b) => a.price - b.price);
      const bestAlt = alternatives[0];

      const savingPerUnit = preferred.price - bestAlt.price;
      
      // Use stock as a base for monthly turnover if available
      const annualQty = item.stock > 0 ? item.stock * 12 : 1200;

      const totalSaving = savingPerUnit * annualQty;

      analysis.push({
        item,
        currentSupplier: preferred.supplierName,
        altSupplier: bestAlt.supplierName,
        altSupplierId: bestAlt.supplierId,
        currentPrice: preferred.price,
        altPrice: bestAlt.price,
        annualQty,
        savingPerUnit,
        totalSaving
      });
    }

    // Ordina per risparmio totale decrescente (Pareto intro)
    analysis.sort((a, b) => b.totalSaving - a.totalSaving);
    setPotentialSavings(analysis);
    setStep(2);
  };

  // Simula Baseline Budget dall'Item Cost * Annual Qty stimata
  const baselineBudget = useMemo(() => {
    const filteredItems = category === 'Tutte le categorie' 
      ? items 
      : items.filter(i => i.category === category);
    return filteredItems.reduce((acc, item) => acc + (item.cost * (item.stock > 0 ? item.stock * 12 : 1200)), 0);
  }, [items, category]);

  const targetAbsolute = (baselineBudget * targetPercent) / 100;
  const maxPotentialSaving = potentialSavings.reduce((acc, curr) => acc + curr.totalSaving, 0);

  const handleToggleSelection = (id: string) => {
    const newSelection = new Set(selectedItemIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedItemIds(newSelection);
  };

  const handleApplySwitch = async () => {
    const actionsToApply = potentialSavings.filter(ps => selectedItemIds.has(ps.item.id));
    if (actionsToApply.length === 0) return;
    setLoading(true);
    try {
        for (const action of actionsToApply) {
            // update item preferred supplier
            const updatedItem = { ...action.item };
            updatedItem.suppliers = updatedItem.suppliers?.map(s => ({
                ...s,
                isPreferred: s.supplierId === action.altSupplierId
            }));
            updatedItem.cost = action.altPrice;
            updatedItem.supplierId = action.altSupplierId;

            await dataService.saveItem(client, updatedItem, false);

            // create SavingAction record
            const savingAction: any = {
                itemSku: updatedItem.sku,
                itemName: updatedItem.name,
                categoryName: updatedItem.category,
                type: 'SUPPLIER_SWITCH',
                status: 'CERTIFIED',
                baselinePrice: action.currentPrice,
                targetPrice: action.altPrice,
                annualQty: action.annualQty,
                savingAmount: action.totalSaving,
                supplierId: action.altSupplierId,
                certifiedAt: new Date().toISOString()
            };
            await dataService.saveSavingAction(client, savingAction);
        }
        alert("Switch fornitore completato. Saving certificato!");
        setSelectedItemIds(new Set());
        loadData();
        setStep(1);
    } catch (e) {
        console.error(e);
        alert("Errore nell'applicazione dello switch");
    }
    setLoading(false);
  };

  const handleApplyRenegotiate = async () => {
    const actionsToApply = potentialSavings.filter(ps => selectedItemIds.has(ps.item.id));
    if (actionsToApply.length === 0) return;
    setLoading(true);
    try {
        for (const action of actionsToApply) {
            // create SavingAction record
            const savingAction: any = {
                itemSku: action.item.sku,
                itemName: action.item.name,
                categoryName: action.item.category,
                type: 'RENEGOTIATION',
                status: 'IN_PROGRESS',
                baselinePrice: action.currentPrice,
                targetPrice: action.currentPrice * 0.95, // arbitrary 5% target if no better alt exists, but here we can use altPrice as target
                annualQty: action.annualQty,
                savingAmount: action.totalSaving, // Expected saving
                // We don't switch the supplier yet since we only initiate RFQ/renegotiation
                supplierId: action.item.suppliers?.find(s => s.isPreferred)?.supplierId
            };
            await dataService.saveSavingAction(client, savingAction);
        }
        alert("Rinegoziazione (RFQ) avviata. Risparmi in pipeline!");
        setSelectedItemIds(new Set());
        loadData();
        setStep(1);
    } catch (e) {
        console.error(e);
        alert("Errore nell'avvio della rinegoziazione");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white bg-slate-50/50">
          <div>
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              Savings Target Wizard
            </h2>
            <p className="text-sm text-slate-500 mt-1">Configura il target e analizza i gap di prezzo</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 neu-flat rounded-full flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col flex-1 overflow-hidden">
          {step === 1 ? (
             <div className="p-8 max-w-2xl mx-auto w-full overflow-y-auto custom-scrollbar">
                <div className="neu-flat p-8 rounded-2xl mb-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-6 border-b border-slate-200 pb-2">1. Imposta Parametri Target</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Categoria Merceologica</label>
                      <select 
                        value={category} 
                        onChange={e => setCategory(e.target.value)}
                        className="w-full neu-input px-4 py-3 rounded-xl text-sm font-medium"
                      >
                        {categories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Target Saving (%)</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="range" 
                          min="1" max="25" 
                          value={targetPercent} 
                          onChange={e => setTargetPercent(Number(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                        />
                        <div className="neu-pressed px-4 py-2 rounded-xl text-emerald-600 font-bold w-20 text-center">
                          {targetPercent}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Baseline Budget Stimato</span>
                    <span className="text-2xl font-bold text-slate-700">€{baselineBudget.toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                  </div>
                  <div className="neu-flat p-6 rounded-2xl flex flex-col items-center justify-center text-center">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Saving Necessario</span>
                    <span className="text-2xl font-bold text-emerald-600">€{targetAbsolute.toLocaleString('it-IT', {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                  </div>
                </div>

                <button 
                  onClick={handleAnalyze} 
                  disabled={loading}
                  className="w-full neu-btn py-4 text-white text-lg font-bold bg-emerald-600 shadow-md flex items-center justify-center gap-2"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : (
                    <><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg> Analizza Price Gap</>
                  )}
                </button>
             </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
              <div className="grid grid-cols-4 gap-4">
                 <div className="neu-flat px-6 py-4 rounded-xl">
                   <div className="text-xs text-slate-400 font-bold mb-1">Saving Target</div>
                   <div className="text-xl font-bold text-slate-700">€{targetAbsolute.toLocaleString()}</div>
                 </div>
                 <div className="neu-flat px-6 py-4 rounded-xl border-l-4 border-emerald-500">
                   <div className="text-xs text-slate-400 font-bold mb-1">Max Saving Teorico</div>
                   <div className="text-xl font-bold text-emerald-600">€{maxPotentialSaving.toLocaleString()}</div>
                 </div>
                 <div className="neu-flat px-6 py-4 rounded-xl col-span-2 flex items-center">
                   <div className="w-full">
                     <div className="flex justify-between text-xs font-bold mb-2">
                       <span className="text-slate-500">Copertura Target via Price Gap</span>
                       <span className={maxPotentialSaving >= targetAbsolute ? 'text-emerald-600' : 'text-amber-500'}>
                         {Math.min(100, (maxPotentialSaving / targetAbsolute) * 100).toFixed(1)}%
                       </span>
                     </div>
                     <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                       <div 
                         className={`h-full ${maxPotentialSaving >= targetAbsolute ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                         style={{width: `${Math.min(100, (maxPotentialSaving / targetAbsolute) * 100)}%`}}
                       ></div>
                     </div>
                   </div>
                 </div>
              </div>

              <div className="flex-1 neu-flat rounded-2xl flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center flex-wrap gap-2">
                  <h3 className="font-bold text-slate-700">Piano di Risparmio (Leva 1: Price Gap)</h3>
                  <div className="flex gap-2">
                    <button onClick={handleApplyRenegotiate} disabled={selectedItemIds.size === 0 || loading} className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors disabled:opacity-50">Avvia Rinegoziazione</button>
                    <button onClick={handleApplySwitch} disabled={selectedItemIds.size === 0 || loading} className="neu-btn px-4 py-2 text-xs font-bold text-emerald-600 disabled:opacity-50">Applica Selezionati (Switch Fornitore)</button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto custom-scrollbar">
                   <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm border-b border-slate-200">
                       <tr>
                         <th className="p-3 w-10 text-center"></th>
                         <th className="p-3 text-slate-500 font-bold">Articolo</th>
                         <th className="p-3 text-slate-500 font-bold">Fornitore Attuale</th>
                         <th className="p-3 text-slate-500 font-bold">Alternativo</th>
                         <th className="p-3 text-right text-slate-500 font-bold">Δ Prezzo</th>
                         <th className="p-3 text-right text-slate-500 font-bold">Q.tà (Stima)</th>
                         <th className="p-3 text-right font-bold text-emerald-600">Saving/Anno</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                        {potentialSavings.length === 0 ? (
                          <tr><td colSpan={7} className="p-8 text-center text-slate-500">Nessun price gap individuato per la categoria.</td></tr>
                        ) : potentialSavings.map(s => (
                          <tr key={s.item.id} className="hover:bg-slate-50">
                            <td className="p-3 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedItemIds.has(s.item.id)}
                                onChange={() => handleToggleSelection(s.item.id)}
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer" 
                              />
                            </td>
                            <td className="p-3">
                              <div className="font-bold text-slate-700">{s.item.sku}</div>
                              <div className="text-xs text-slate-400 truncate max-w-[200px]">{s.item.name}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-600">{s.currentSupplier}</div>
                              <div className="font-mono text-xs text-slate-500">€{s.currentPrice.toFixed(2)}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-blue-600 font-medium">{s.altSupplier}</div>
                              <div className="font-mono text-xs text-emerald-600">€{s.altPrice.toFixed(2)}</div>
                            </td>
                            <td className="p-3 text-right text-emerald-600 font-mono">
                              -€{s.savingPerUnit.toFixed(2)}
                            </td>
                            <td className="p-3 text-right text-slate-600 font-mono">
                              {s.annualQty.toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-bold text-emerald-600 bg-emerald-50/30">
                              €{s.totalSaving.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsTargetWizard;
