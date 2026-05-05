import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Budget, BudgetAssignmentMode, BudgetTimePeriod } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (budget: Partial<Budget>) => Promise<void>;
  budget: Partial<Budget> | null;
}

const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSave, budget }) => {
  const [formData, setFormData] = useState<Partial<Budget>>(budget || {
    assignmentMode: 'SVINCOLATO',
    period: 'ANNUALE',
    status: 'ACTIVE',
    amountAssigned: 0,
    currency: 'EUR',
    customerName: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  // When modal opens or budget prop changes, reset form
  React.useEffect(() => {
    if (isOpen) {
      setFormData(budget || {
        assignmentMode: 'SVINCOLATO',
        period: 'ANNUALE',
        status: 'ACTIVE',
        amountAssigned: 0,
        currency: 'EUR',
        customerName: '',
      });
    }
  }, [isOpen, budget]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'amountAssigned' || name === 'year' || name === 'periodValue' ? Number(value) : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error(err);
      alert("Errore durante il salvataggio.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-xl font-bold text-slate-800">
              {budget?.id ? 'Modifica' : 'Nuovo'} Budget
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            <form id="budgetForm" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Cliente (Denominazione)</label>
                  <input required name="customerName" value={formData.customerName || ''} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm" placeholder="Es. ACME Corp" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Stato</label>
                  <select name="status" value={formData.status || 'ACTIVE'} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm">
                    <option value="ACTIVE">Attivo</option>
                    <option value="DRAFT">Bozza</option>
                    <option value="EXHAUSTED">Esaurito</option>
                    <option value="EXPIRED">Scaduto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Modalità di Assegnazione</label>
                  <select name="assignmentMode" value={formData.assignmentMode || 'SVINCOLATO'} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm">
                    <option value="SVINCOLATO">A. Svincolato (Libero)</option>
                    <option value="VINCOLO_ITEM">B. Vincolo Item</option>
                    <option value="VINCOLO_ITEM_TEMPO">C. Vincolo Item-Tempo</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Periodo di Validità</label>
                  <select name="period" value={formData.period || 'ANNUALE'} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm">
                    <option value="A_CONTRATTO">A Contratto</option>
                    <option value="ANNUALE">Per Anno</option>
                    <option value="SEMESTRALE">Semestrale</option>
                    <option value="TRIMESTRALE">Trimestrale</option>
                    <option value="MENSILE">Mensile</option>
                  </select>
                </div>
              </div>

              {/* Dynamic Fields based on Assignment Mode */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-5">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest border-b border-slate-200 pb-2">Dettagli e Vincoli</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Budget Assegnato (€)</label>
                    <input type="number" step="0.01" required name="amountAssigned" value={formData.amountAssigned || ''} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm font-mono text-blue-700" placeholder="0.00" />
                  </div>
                  
                  {formData.period !== 'A_CONTRATTO' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Anno di Riferimento</label>
                      <input type="number" name="year" value={formData.year || new Date().getFullYear()} onChange={handleChange} className="w-full neu-input px-4 py-2.5 rounded-xl text-sm" placeholder="Es. 2026" />
                    </div>
                  )}
                </div>

                {/* Sezione Vincoli Item */}
                {(formData.assignmentMode === 'VINCOLO_ITEM' || formData.assignmentMode === 'VINCOLO_ITEM_TEMPO') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Categoria</label>
                      <input name="category" value={formData.category || ''} onChange={handleChange} className="w-full neu-input px-3 py-2 rounded-lg text-sm" placeholder="Tutte" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Prefisso (Org)</label>
                      <input name="skuPrefix" value={formData.skuPrefix || ''} onChange={handleChange} className="w-full neu-input px-3 py-2 rounded-lg text-sm" placeholder="Tutti" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Gruppo</label>
                      <input name="group" value={formData.group || ''} onChange={handleChange} className="w-full neu-input px-3 py-2 rounded-lg text-sm" placeholder="Tutti" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Macrofamiglia</label>
                      <input name="macroFamily" value={formData.macroFamily || ''} onChange={handleChange} className="w-full neu-input px-3 py-2 rounded-lg text-sm" placeholder="Tutte" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">Famiglia</label>
                      <input name="family" value={formData.family || ''} onChange={handleChange} className="w-full neu-input px-3 py-2 rounded-lg text-sm" placeholder="Tutte" />
                    </div>
                  </div>
                )}
                
                {formData.assignmentMode === 'VINCOLO_ITEM_TEMPO' && formData.period !== 'ANNUALE' && formData.period !== 'A_CONTRATTO' && (
                  <div className="pt-3 border-t border-slate-200 mt-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">
                          Valore Periodo ({formData.period === 'MENSILE' ? 'Mese 1-12' : formData.period === 'TRIMESTRALE' ? 'Trimestre 1-4' : 'Semestre 1-2'})
                        </label>
                        <input type="number" name="periodValue" value={formData.periodValue || ''} onChange={handleChange} className="w-full max-w-[200px] neu-input px-4 py-2.5 rounded-xl text-sm" placeholder="Es. 1" />
                     </div>
                  </div>
                )}
                
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Note Aggiuntive</label>
                <textarea name="notes" value={formData.notes || ''} onChange={handleChange} className="w-full neu-input px-4 py-3 rounded-xl text-sm min-h-[80px]" placeholder="Opzionale" />
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-end space-x-3 bg-slate-50">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors">
              Annulla
            </button>
            <button 
              type="submit" 
              form="budgetForm" 
              disabled={isSaving}
              className={`neu-btn px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center gap-2 ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSaving ? 'Salvataggio...' : 'Salva Budget'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BudgetModal;
