
import React, { useState, useEffect } from 'react';
import { Customer } from '../types';

interface ServiceContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSave?: (updates: Partial<Customer>) => void;
}

const ServiceContractModal: React.FC<ServiceContractModalProps> = ({ isOpen, onClose, customer, onSave }) => {
  const [fee, setFee] = useState<number>(0);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [expenseBudget, setExpenseBudget] = useState<number>(0);
  const [expenseFrequency, setExpenseFrequency] = useState<string>('mese');
  const [expensePreventivo, setExpensePreventivo] = useState<boolean>(false);
  const [expensePreventivoText, setExpensePreventivoText] = useState<string>('');
  const [expenseConsuntivo, setExpenseConsuntivo] = useState<boolean>(false);
  const [expenseConsuntivoText, setExpenseConsuntivoText] = useState<string>('');
  const [savingTarget, setSavingTarget] = useState<number>(5);
  const [penaltyReduction, setPenaltyReduction] = useState<number>(10);
  const [contractNumber, setContractNumber] = useState<string>('');
  const [paymentMethods, setPaymentMethods] = useState<any>({});
  const [paymentMethodsCentral, setPaymentMethodsCentral] = useState<any>({});
  const [standardGeneralTerms, setStandardGeneralTerms] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen && customer) {
      setFee(customer.monthlyFee || customer.standardMonthlyFee || 0);
      setStartDate(customer.contractStartDate || '');
      setEndDate(customer.contractEndDate || '');
      setNotes(customer.customContractNotes || '');
      setExpenseBudget(customer.expenseBudget || 0);
      setExpenseFrequency(customer.expenseFrequency || 'mese');
      setExpensePreventivo(customer.expensePreventivo || false);
      setExpensePreventivoText(customer.expensePreventivoText || '');
      setExpenseConsuntivo(customer.expenseConsuntivo || false);
      setExpenseConsuntivoText(customer.expenseConsuntivoText || '');
      setSavingTarget(customer.savingTarget || 5);
      setPenaltyReduction(customer.penaltyReduction || 10);
      setContractNumber(customer.contractNumber || '');
      setPaymentMethods(customer.paymentMethods || {
        riba: { enabled: false, description: '', terms: [] },
        bb: { enabled: false, description: '', terms: [] },
        rd: { enabled: false, description: '', terms: [] },
        titoli: { enabled: false, description: '', terms: [] },
        altro: { enabled: false, description: '', terms: [], customLabel: '' }
      });
      setPaymentMethodsCentral(customer.paymentMethodsCentral || {
        riba: { enabled: false, description: '', terms: [] },
        bb: { enabled: false, description: '', terms: [] },
        rd: { enabled: false, description: '', terms: [] },
        titoli: { enabled: false, description: '', terms: [] },
        altro: { enabled: false, description: '', terms: [], customLabel: '' }
      });
      setStandardGeneralTerms(customer.standardGeneralTerms || []);
    }
  }, [isOpen, customer]);

  if (!isOpen || !customer) return null;

  const handleSave = () => {
    if (onSave) {
      onSave({
        monthlyFee: fee,
        contractStartDate: startDate,
        contractEndDate: endDate,
        customContractNotes: notes,
        expenseBudget,
        expenseFrequency,
        expensePreventivo,
        expensePreventivoText,
        expenseConsuntivo,
        expenseConsuntivoText,
        savingTarget,
        penaltyReduction,
        contractNumber,
        paymentMethods,
        paymentMethodsCentral,
        standardGeneralTerms
      });
    }
    onClose();
  };

  const AVAILABLE_TERMS = ['A VISTA', '30 GG', '60 GG', '90 GG', '120 GG', '180 GG'];

  const renderPaymentMethodRow = (type: 'F' | 'C', methodKey: string, label: string) => {
    const dataObj = type === 'F' ? paymentMethods : paymentMethodsCentral;
    const setObj = type === 'F' ? setPaymentMethods : setPaymentMethodsCentral;
    const data = dataObj[methodKey] || { enabled: false, description: '', terms: [] };
    const isAltro = methodKey === 'altro';

    return (
      <div className="flex flex-col sm:flex-row items-start gap-3 mt-4">
        <div className="flex items-center gap-3 pt-2 w-full sm:w-32 shrink-0">
          <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" 
            checked={data.enabled}
            onChange={(e) => {
              setObj({ ...dataObj, [methodKey]: { ...data, enabled: e.target.checked } });
            }}
          />
          <div className="font-bold text-slate-600 text-sm whitespace-nowrap">{label}</div>
        </div>

        <div className="flex-1 w-full space-y-2">
          {isAltro && (
            <input type="text" className="neu-input w-full px-3 py-1.5 text-xs font-bold text-slate-700" placeholder="Descrizione metodo (es. Carta)..." 
              disabled={!data.enabled}
              value={data.customLabel || ''}
              onChange={(e) => setObj({ ...dataObj, [methodKey]: { ...data, customLabel: e.target.value } })}
            />
          )}
          
          <div className="flex flex-wrap gap-2 items-center">
            {AVAILABLE_TERMS.map(term => (
              <label key={term} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] cursor-pointer transition-colors ${data.enabled ? 'hover:bg-white' : 'opacity-50 cursor-not-allowed'} ${data.terms?.includes(term) ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-200 text-slate-500'}`}>
                <input type="checkbox" className="hidden" 
                  disabled={!data.enabled}
                  checked={data.terms?.includes(term) || false}
                  onChange={(e) => {
                    const newTerms = e.target.checked 
                      ? [...(data.terms || []), term]
                      : (data.terms || []).filter((t: string) => t !== term);
                    setObj({ ...dataObj, [methodKey]: { ...data, terms: newTerms } });
                  }}
                />
                {term}
              </label>
            ))}
          </div>

          <input type="text" className="neu-input w-full px-3 py-1.5 text-xs font-medium text-slate-600" placeholder={isAltro ? "Note aggiuntive..." : "Campi extra (es. DF, FM)..."} 
            disabled={!data.enabled}
            value={data.description || ''}
            onChange={(e) => setObj({ ...dataObj, [methodKey]: { ...data, description: e.target.value } })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="neu-flat bg-[#F1F5F9] w-full max-w-2xl rounded-3xl overflow-hidden animate-scale-up border border-white/50 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white/30 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Piano Servizi - {customer.name}</h2>
            <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Personalizzazione Contratto EB-PRO</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">0. Riferimenti Contratto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Numero Contratto</label>
                <input 
                  type="text"
                  value={contractNumber}
                  onChange={(e) => setContractNumber(e.target.value)}
                  className="w-full neu-input px-4 py-2.5 text-sm font-bold text-slate-700 bg-white/50"
                  placeholder="Es. CTR-001"
                />
                <p className="text-[10px] text-slate-400 mt-1 pl-1">Il numero progressivo viene assegnato automaticamente alla registrazione.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">1. Contratto di Servizio (Centrale Acquisti)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Canone Mensile Personalizzato (€)</label>
                <input 
                  type="number"
                  step="0.01"
                  value={fee}
                  onChange={(e) => setFee(Number(e.target.value))}
                  className="w-full neu-input px-4 py-2.5 text-sm font-bold text-slate-700"
                  placeholder="0,00"
                />
              </div>

              <div className="col-span-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Data Inizio</label>
                  <input 
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full neu-input px-3 py-2.5 text-xs font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Data Fine</label>
                  <input 
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full neu-input px-3 py-2.5 text-xs font-medium text-slate-700"
                  />
                </div>
              </div>
              
              <div className="col-span-full">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Termini Generali Standard (Uno per riga)</label>
                <textarea 
                    className="w-full neu-input p-3 text-xs min-h-[100px] font-medium text-slate-600"
                    value={standardGeneralTerms.join('\n')}
                    onChange={(e) => setStandardGeneralTerms(e.target.value.split('\n'))}
                    placeholder="Inserisci i punti del contratto, uno per riga..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">2. Condizioni Pagamento vs. Centrale Acquisti</h3>
            <div className="bg-white/50 p-4 rounded-2xl border border-slate-100">
              {renderPaymentMethodRow('C', 'riba', 'Ri.Ba')}
              {renderPaymentMethodRow('C', 'bb', 'Bonifico (BB)')}
              {renderPaymentMethodRow('C', 'rd', 'Rim. Diretta')}
              {renderPaymentMethodRow('C', 'titoli', 'Titoli (Ass.)')}
              {renderPaymentMethodRow('C', 'altro', 'Altro')}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">3. Condizioni Pagamento vs. Fornitori</h3>
            <div className="bg-white/50 p-4 rounded-2xl border border-slate-100">
              {renderPaymentMethodRow('F', 'riba', 'Ri.Ba')}
              {renderPaymentMethodRow('F', 'bb', 'Bonifico (BB)')}
              {renderPaymentMethodRow('F', 'rd', 'Rim. Diretta')}
              {renderPaymentMethodRow('F', 'titoli', 'Titoli (Ass.)')}
              {renderPaymentMethodRow('F', 'altro', 'Altro')}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">4. Parametri Spese e KPI</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Budget Spese Esecuzione (€)</label>
                <div className="flex gap-2">
                  <input 
                    type="number"
                    step="0.01"
                    value={expenseBudget}
                    onChange={(e) => setExpenseBudget(Number(e.target.value))}
                    className="flex-1 neu-input px-4 py-2.5 text-sm font-bold text-slate-700"
                    placeholder="0,00"
                  />
                  <div className="flex flex-wrap gap-1 items-center bg-white/50 p-1 rounded-xl border border-slate-100">
                    {['mese', 'trimestre', 'semestre', 'anno'].map(freq => (
                      <button
                        key={freq}
                        onClick={() => setExpenseFrequency(freq)}
                        className={`px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${expenseFrequency === freq ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="col-span-full space-y-4">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">Frequenza Spese</label>
                
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer shrink-0">
                      <input 
                        type="checkbox"
                        checked={expensePreventivo}
                        onChange={(e) => setExpensePreventivo(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold text-slate-600 min-w-[100px]">a preventivo</span>
                    </label>
                    <input 
                      type="text"
                      value={expensePreventivoText}
                      onChange={(e) => setExpensePreventivoText(e.target.value)}
                      className="w-full neu-input px-3 py-1.5 text-xs font-medium text-slate-700 bg-white/50"
                      placeholder="Note preventivo..."
                      disabled={!expensePreventivo}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <label className="flex items-center gap-3 cursor-pointer shrink-0">
                      <input 
                        type="checkbox"
                        checked={expenseConsuntivo}
                        onChange={(e) => setExpenseConsuntivo(e.target.checked)}
                        className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-bold text-slate-600 min-w-[100px]">a consuntivo</span>
                    </label>
                    <input 
                      type="text"
                      value={expenseConsuntivoText}
                      onChange={(e) => setExpenseConsuntivoText(e.target.value)}
                      className="w-full neu-input px-3 py-1.5 text-xs font-medium text-slate-700 bg-white/50"
                      placeholder="Note consuntivo..."
                      disabled={!expenseConsuntivo}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Soglia Target Saving (%)</label>
                <input 
                    type="number"
                    value={savingTarget}
                    onChange={(e) => setSavingTarget(Number(e.target.value))}
                    className="w-full neu-input px-4 py-2.5 text-sm font-bold text-slate-700"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1.5 pl-1">Riduzione Indennizzo (%)</label>
                <input 
                    type="number"
                    value={penaltyReduction}
                    onChange={(e) => setPenaltyReduction(Number(e.target.value))}
                    className="w-full neu-input px-4 py-2.5 text-sm font-bold text-slate-700"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">5. Note e Termini Specifici (Dinamici)</h3>
            <div className="col-span-full">
              <textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full neu-input px-4 py-3 text-sm font-medium text-slate-700 min-h-[120px]"
                placeholder="Inserisci termini particolari solo per questo cliente..."
              />
              <p className="text-[10px] text-slate-400 mt-1 pl-1">Queste note verranno aggiunte alla sezione "Termini Generali" nel PDF.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/30 flex justify-end gap-4 shrink-0">
          <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600 font-bold text-sm">Annulla</button>
          <button onClick={handleSave} className="neu-btn px-8 py-2.5 bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all">
            Salva Configurazioni
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceContractModal;
