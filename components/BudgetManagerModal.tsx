import React, { useState } from 'react';

interface BudgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: any[];
}

const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({ isOpen, onClose, categories }) => {
  const [localCategories, setLocalCategories] = useState(categories);
  const [editMode, setEditMode] = useState<string | null>(null); // Category Name
  const [tempBudget, setTempBudget] = useState<number>(0);

  if (!isOpen) return null;

  const handleEdit = (cat: any) => {
    setEditMode(cat.name);
    setTempBudget(cat.budget);
  };

  const handleSaveLine = (catName: string) => {
    setLocalCategories(prev => prev.map(c => c.name === catName ? { ...c, budget: tempBudget } : c));
    setEditMode(null);
  };

  const handleGlobalSave = () => {
    // In a real app, this would perform an API call
    alert("Richiesta di revisione budget inviata con successo!");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white/50 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-slate-700">Gestione Budget</h3>
                <p className="text-sm text-slate-500">Revisione allocazioni per categoria merceologica.</p>
            </div>
            <button onClick={onClose} className="neu-icon-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th className="pb-4 pl-2 text-xs font-bold text-slate-400 uppercase">Categoria</th>
                        <th className="pb-4 text-right text-xs font-bold text-slate-400 uppercase">Speso (YTD)</th>
                        <th className="pb-4 text-right text-xs font-bold text-slate-400 uppercase">Budget Attuale</th>
                        <th className="pb-4 text-right text-xs font-bold text-slate-400 uppercase">Delta</th>
                        <th className="pb-4 text-center text-xs font-bold text-slate-400 uppercase">Azioni</th>
                    </tr>
                </thead>
                <tbody className="space-y-2">
                    {localCategories.map((cat, idx) => {
                        const delta = cat.budget - cat.spent;
                        const isNegative = delta < 0;

                        return (
                            <tr key={idx} className="group border-b border-slate-200/50 last:border-0 hover:bg-white/40 transition-colors">
                                <td className="py-4 pl-2 font-bold text-slate-700">
                                    <div className="flex items-center">
                                        <span className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: cat.color}}></span>
                                        {cat.name}
                                    </div>
                                </td>
                                <td className="py-4 text-right font-mono text-slate-600">€ {cat.spent.toLocaleString('it-IT')}</td>
                                <td className="py-4 text-right">
                                    {editMode === cat.name ? (
                                        <input 
                                            type="number"
                                            value={tempBudget}
                                            onChange={(e) => setTempBudget(Number(e.target.value))}
                                            className="w-24 text-right neu-pressed px-2 py-1 text-sm font-bold text-blue-600"
                                            autoFocus
                                        />
                                    ) : (
                                        <span className="font-mono font-bold text-slate-700">€ {cat.budget.toLocaleString('it-IT')}</span>
                                    )}
                                </td>
                                <td className={`py-4 text-right font-bold ${isNegative ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {isNegative ? '-' : '+'} € {Math.abs(delta).toLocaleString('it-IT')}
                                </td>
                                <td className="py-4 text-center">
                                    {editMode === cat.name ? (
                                        <button onClick={() => handleSaveLine(cat.name)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase">Salva</button>
                                    ) : (
                                        <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase opacity-0 group-hover:opacity-100 transition-opacity">Modifica</button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end">
            <button onClick={handleGlobalSave} className="neu-btn px-8 py-3 text-white bg-blue-600 shadow-lg">
                Invia Richiesta Approvazione
            </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetManagerModal;