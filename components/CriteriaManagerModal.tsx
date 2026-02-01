import React, { useState } from 'react';
import { QualificationCriterion } from '../types';

interface CriteriaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: QualificationCriterion[];
  onUpdateCriteria: (updatedCriteria: QualificationCriterion[]) => void;
}

const CriteriaManagerModal: React.FC<CriteriaManagerModalProps> = ({ isOpen, onClose, criteria, onUpdateCriteria }) => {
  const [localCriteria, setLocalCriteria] = useState<QualificationCriterion[]>(criteria);
  const [newCriterionName, setNewCriterionName] = useState('');
  const [newCriterionCategory, setNewCriterionCategory] = useState<QualificationCriterion['category']>('OPERATIONAL');

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    setLocalCriteria(prev => prev.map(c => c.id === id ? { ...c, isActive: !c.isActive } : c));
  };

  const handleWeightChange = (id: string, val: number) => {
    setLocalCriteria(prev => prev.map(c => c.id === id ? { ...c, weight: val } : c));
  };

  const handleAddCriterion = () => {
    if (!newCriterionName.trim()) return;
    const newId = `custom_${Date.now()}`;
    const newCriterion: QualificationCriterion = {
      id: newId,
      label: newCriterionName,
      type: 'SCORE', // Default to score for simplicity
      weight: 10,
      isActive: true,
      category: newCriterionCategory
    };
    setLocalCriteria([...localCriteria, newCriterion]);
    setNewCriterionName('');
  };

  const handleSave = () => {
    onUpdateCriteria(localCriteria);
    onClose();
  };

  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'CERTIFICATION': return 'text-blue-500 bg-blue-100';
      case 'FINANCIAL': return 'text-green-500 bg-green-100';
      case 'ESG': return 'text-emerald-500 bg-emerald-100';
      case 'OPERATIONAL': return 'text-amber-500 bg-amber-100';
      default: return 'text-slate-500 bg-slate-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white/50">
          <div>
            <h3 className="text-xl font-bold text-slate-700">Configurazione Criteri Qualifica</h3>
            <p className="text-sm text-slate-500">Definisci i pesi e i parametri per il Vendor Rating.</p>
          </div>
          <button onClick={onClose} className="neu-icon-btn text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            {/* LEFT: Existing Criteria List */}
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-r border-slate-200">
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Criteri Attivi</h4>
                <div className="space-y-4">
                    {localCriteria.map(c => (
                        <div key={c.id} className={`neu-flat p-4 rounded-xl flex items-center gap-4 transition-opacity ${!c.isActive ? 'opacity-50' : ''}`}>
                            {/* Toggle */}
                            <button 
                                onClick={() => handleToggle(c.id)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out flex-shrink-0 ${c.isActive ? 'bg-blue-500' : 'bg-slate-300'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${c.isActive ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold text-slate-700 text-sm">{c.label}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${getCategoryColor(c.category)}`}>{c.category}</span>
                                </div>
                                
                                {/* Weight Slider */}
                                <div className="flex items-center space-x-2 mt-2">
                                    <span className="text-xs font-bold text-slate-400 w-10">Peso</span>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={c.weight}
                                        onChange={(e) => handleWeightChange(c.id, Number(e.target.value))}
                                        disabled={!c.isActive}
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    />
                                    <span className="text-xs font-bold text-blue-600 w-8 text-right">{c.weight}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* RIGHT: Add New */}
            <div className="w-full md:w-1/3 p-6 bg-slate-50/50">
                <h4 className="text-sm font-bold text-slate-600 uppercase tracking-wide mb-4">Nuovo Parametro</h4>
                <div className="neu-flat p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nome Criterio</label>
                        <input 
                            type="text" 
                            className="w-full neu-input px-3 py-2 text-sm font-medium"
                            placeholder="Es. Cybersecurity Score"
                            value={newCriterionName}
                            onChange={(e) => setNewCriterionName(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Categoria</label>
                        <select 
                            className="w-full neu-input px-3 py-2 text-sm font-medium bg-transparent"
                            value={newCriterionCategory}
                            onChange={(e) => setNewCriterionCategory(e.target.value as any)}
                        >
                            <option value="OPERATIONAL">Operativo</option>
                            <option value="CERTIFICATION">Certificazioni</option>
                            <option value="FINANCIAL">Finanziario</option>
                            <option value="ESG">ESG / Sostenibilità</option>
                        </select>
                    </div>
                    <button 
                        onClick={handleAddCriterion}
                        className="w-full neu-btn py-2 text-sm text-blue-600 mt-2"
                        disabled={!newCriterionName.trim()}
                    >
                        + Aggiungi Lista
                    </button>
                </div>

                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h5 className="text-xs font-bold text-blue-800 mb-2">Nota Informativa</h5>
                    <p className="text-xs text-blue-600 leading-relaxed">
                        Modificando i pesi, il punteggio totale (Ranking Score) di tutti i fornitori verrà ricalcolato automaticamente.
                        Il calcolo è una media ponderata basata sui criteri attivi.
                    </p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end space-x-4">
            <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Annulla</button>
            <button onClick={handleSave} className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md">Applica Modifiche</button>
        </div>

      </div>
    </div>
  );
};

export default CriteriaManagerModal;
