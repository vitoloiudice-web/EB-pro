
import React, { useState, useEffect } from 'react';
import { Item, Supplier, Customer } from '../types';

type EntityType = 'ITEMS' | 'SUPPLIERS' | 'CUSTOMERS';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: EntityType;
  initialData: any | null;
  onSave: (data: any) => void;
}

const MasterDataModal: React.FC<MasterDataModalProps> = ({ isOpen, onClose, type, initialData, onSave }) => {
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        // Reset form for creation based on type
        const defaults = type === 'ITEMS' 
          ? { sku: '', name: '', category: 'Generico', cost: 0, stock: 0, supplierId: '', leadTimeDays: 0 }
          : type === 'SUPPLIERS'
          ? { id: '', name: '', rating: 3, email: '', paymentTerms: '' }
          : { name: '', vatNumber: '', email: '', region: '', paymentTerms: '' };
        setFormData(defaults);
      }
    }
  }, [isOpen, initialData, type]);

  if (!isOpen) return null;

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
    onClose();
  };

  // Helper for Inputs
  const InputGroup = ({ label, field, type = "text", placeholder = "", width = "w-full" }: any) => (
    <div className={`mb-4 ${width}`}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 pl-1">{label}</label>
      <input 
        type={type}
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
        className="w-full neu-input px-4 py-2 text-sm font-medium text-slate-700 placeholder-slate-300"
        placeholder={placeholder}
      />
    </div>
  );

  const SelectGroup = ({ label, field, options }: any) => (
    <div className="mb-4 w-full">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1 pl-1">{label}</label>
      <select 
        value={formData[field] || ''}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full neu-input px-4 py-2 text-sm font-medium text-slate-700 bg-transparent"
      >
        {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-700">
              {initialData ? 'Modifica' : 'Nuovo'} {type === 'ITEMS' ? 'Articolo' : type === 'SUPPLIERS' ? 'Fornitore' : 'Cliente'}
            </h3>
            <p className="text-sm text-slate-500">Compila i dati dell'anagrafica</p>
          </div>
          <button onClick={onClose} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 overflow-y-auto custom-scrollbar">
            
            {/* ITEM FORM */}
            {type === 'ITEMS' && (
              <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="Codice SKU" field="sku" placeholder="es. HYD-001" />
                 <SelectGroup label="Categoria" field="category" options={['Idraulica', 'Carpenteria', 'Elettronica', 'Verniciatura', 'Saldatura', 'Generico']} />
                 <div className="col-span-2">
                    <InputGroup label="Descrizione Prodotto" field="name" />
                 </div>
                 <InputGroup label="Costo (€)" field="cost" type="number" />
                 <InputGroup label="Giacenza Attuale" field="stock" type="number" />
                 <InputGroup label="Scorta Sicurezza" field="safetyStock" type="number" />
                 <InputGroup label="Lead Time (gg)" field="leadTimeDays" type="number" />
                 <div className="col-span-2">
                   <InputGroup label="ID Fornitore Preferenziale" field="supplierId" />
                 </div>
              </div>
            )}

            {/* SUPPLIER FORM */}
            {type === 'SUPPLIERS' && (
              <div className="grid grid-cols-2 gap-4">
                 <InputGroup label="ID Fornitore" field="id" placeholder="es. SUP-001" />
                 <div className="col-span-2">
                    <InputGroup label="Ragione Sociale" field="name" />
                 </div>
                 <InputGroup label="Email Contatto" field="email" type="email" />
                 <InputGroup label="Termini Pagamento" field="paymentTerms" />
                 <InputGroup label="Rating Interno (1-5)" field="rating" type="number" />
              </div>
            )}

            {/* CUSTOMER FORM */}
            {type === 'CUSTOMERS' && (
              <div className="grid grid-cols-2 gap-4">
                 <div className="col-span-2">
                    <InputGroup label="Ragione Sociale" field="name" />
                 </div>
                 <InputGroup label="Partita IVA" field="vatNumber" />
                 <InputGroup label="Zona / Regione" field="region" />
                 <InputGroup label="Email Amministrazione" field="email" type="email" />
                 <InputGroup label="Indirizzo Sede" field="address" />
                 <div className="col-span-2">
                    <InputGroup label="Condizioni Pagamento" field="paymentTerms" />
                 </div>
              </div>
            )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end space-x-4">
          <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Annulla</button>
          <button onClick={handleSubmit} className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md">
            Salva Modifiche
          </button>
        </div>

      </div>
    </div>
  );
};

export default MasterDataModal;
