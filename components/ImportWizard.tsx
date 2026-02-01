import React, { useState, useRef } from 'react';
import { PurchaseOrder, PurchaseOrderItem, ImportFieldMapping } from '../types';

// Add type definition for window.XLSX since it's loaded via CDN
declare global {
  interface Window {
    XLSX: any;
  }
}

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (orders: PurchaseOrder[]) => void;
}

type Step = 'UPLOAD' | 'MAPPING' | 'PREVIEW';

const REQUIRED_FIELDS: { key: string; label: string; type: 'HEADER' | 'ITEM' }[] = [
  { key: 'id', label: 'ID Ordine (Univoco)', type: 'HEADER' },
  { key: 'date', label: 'Data Ordine', type: 'HEADER' },
  { key: 'supplierName', label: 'Ragione Sociale Fornitore', type: 'HEADER' },
  { key: 'sku', label: 'Codice Articolo (SKU)', type: 'ITEM' },
  { key: 'qty', label: 'Quantità', type: 'ITEM' },
  { key: 'unitPrice', label: 'Prezzo Unitario', type: 'ITEM' },
];

const ImportWizard: React.FC<ImportWizardProps> = ({ isOpen, onClose, onImportComplete }) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [processedOrders, setProcessedOrders] = useState<PurchaseOrder[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- STEP 1: UPLOAD LOGIC ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFile(file);
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = window.XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length > 0) {
          const headers = json[0] as string[];
          const rows = window.XLSX.utils.sheet_to_json(worksheet); // Parse again for easy obj access
          
          setRawHeaders(headers);
          setRawData(rows);
          autoMapFields(headers);
          setStep('MAPPING');
        }
      } catch (err) {
        console.error("Error parsing Excel", err);
        alert("Errore nella lettura del file. Verifica il formato.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const autoMapFields = (headers: string[]) => {
    const newMapping: Record<string, string> = {};
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    REQUIRED_FIELDS.forEach(field => {
      // Simple heuristic: find header that contains the field key or label
      const match = headers.find(h => 
        normalize(h).includes(normalize(field.key)) || 
        normalize(h).includes(normalize(field.label)) ||
        (field.key === 'id' && (normalize(h).includes('num') || normalize(h).includes('doc'))) ||
        (field.key === 'unitPrice' && (normalize(h).includes('prezzo') || normalize(h).includes('costo')))
      );
      if (match) newMapping[field.key] = match;
    });
    setMapping(newMapping);
  };

  // --- STEP 2: MAPPING LOGIC ---
  const handleMapChange = (systemKey: string, fileColumn: string) => {
    setMapping(prev => ({ ...prev, [systemKey]: fileColumn }));
  };

  const handleConfirmMapping = () => {
    // Validate mapping
    const missing = REQUIRED_FIELDS.filter(f => !mapping[f.key]);
    if (missing.length > 0) {
      alert(`Collega tutti i campi obbligatori. Mancano: ${missing.map(m => m.label).join(', ')}`);
      return;
    }

    // Process Raw Data into Orders
    const ordersMap = new Map<string, PurchaseOrder>();

    rawData.forEach((row, idx) => {
      const orderId = String(row[mapping['id']] || `UNKNOWN-${idx}`);
      
      if (!ordersMap.has(orderId)) {
        // Create Header
        ordersMap.set(orderId, {
          id: orderId,
          date: parseDate(row[mapping['date']]),
          supplierId: 'GENERIC', // Logic to match supplier would go here
          supplierName: String(row[mapping['supplierName']] || 'Sconosciuto'),
          status: 'DRAFT', // Default state for imported orders
          items: [],
          totalAmount: 0
        });
      }

      // Add Item
      const order = ordersMap.get(orderId)!;
      const qty = Number(row[mapping['qty']]) || 0;
      const price = parseCurrency(row[mapping['unitPrice']]);
      
      const item: PurchaseOrderItem = {
        sku: String(row[mapping['sku']] || ''),
        description: 'Imported Item', // Could map this too
        qty: qty,
        unitPrice: price,
        total: qty * price
      };

      order.items.push(item);
      order.totalAmount += item.total;
    });

    setProcessedOrders(Array.from(ordersMap.values()));
    setStep('PREVIEW');
  };

  // --- HELPERS ---
  const parseDate = (val: any): string => {
    // Very basic date parsing, assumes Excel serial or ISO string
    if (!val) return new Date().toISOString().split('T')[0];
    if (typeof val === 'number') {
        // Excel date serial
        const date = new Date(Math.round((val - 25569)*86400*1000));
        return date.toISOString().split('T')[0];
    }
    return String(val).substring(0, 10);
  };

  const parseCurrency = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove currency symbols, fix comma
        const clean = val.replace(/[^0-9,-.]/g, '').replace(',', '.');
        return parseFloat(clean) || 0;
    }
    return 0;
  };

  // --- RENDER ---
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-[#EEF2F6] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-700">Importazione Ordini</h3>
            <p className="text-sm text-slate-500">Wizard di caricamento massivo dati</p>
          </div>
          <button onClick={onClose} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className={`flex items-center ${step === 'UPLOAD' ? 'text-blue-600' : 'text-slate-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'UPLOAD' ? 'neu-pressed' : 'neu-flat'}`}>1</span>
                <span className="ml-2 text-sm font-bold">Upload</span>
            </div>
            <div className="w-16 h-1 bg-slate-200 mx-4"></div>
            <div className={`flex items-center ${step === 'MAPPING' ? 'text-blue-600' : 'text-slate-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'MAPPING' ? 'neu-pressed' : 'neu-flat'}`}>2</span>
                <span className="ml-2 text-sm font-bold">Mapping</span>
            </div>
            <div className="w-16 h-1 bg-slate-200 mx-4"></div>
            <div className={`flex items-center ${step === 'PREVIEW' ? 'text-blue-600' : 'text-slate-400'}`}>
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step === 'PREVIEW' ? 'neu-pressed' : 'neu-flat'}`}>3</span>
                <span className="ml-2 text-sm font-bold">Preview</span>
            </div>
          </div>

          {step === 'UPLOAD' && (
            <div className="flex flex-col items-center justify-center py-10">
               <div 
                 className="w-full h-64 neu-pressed rounded-2xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                 <p className="text-slate-600 font-bold mb-1">Clicca per caricare il file</p>
                 <p className="text-xs text-slate-400">Supporta .xlsx, .xls, .csv</p>
                 <input 
                   type="file" 
                   ref={fileInputRef} 
                   className="hidden" 
                   accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                   onChange={handleFileChange}
                 />
               </div>
               {isProcessing && <p className="mt-4 text-blue-600 font-bold animate-pulse">Analisi del file in corso...</p>}
            </div>
          )}

          {step === 'MAPPING' && (
            <div className="space-y-6">
              <div className="neu-flat p-4 mb-4 flex items-center bg-blue-50/50">
                 <svg className="w-6 h-6 text-blue-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <div className="text-sm">
                   <p className="font-bold text-slate-700">Configurazione Colonne</p>
                   <p className="text-slate-500">Collega i campi del file Excel ai campi del sistema ERP.</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                 {REQUIRED_FIELDS.map((field) => (
                   <div key={field.key} className="flex items-center justify-between p-3 neu-flat rounded-xl">
                      <div className="flex flex-col w-1/2">
                        <span className="text-sm font-bold text-slate-700">{field.label}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">{field.type === 'HEADER' ? 'Dati Testata' : 'Dati Riga'}</span>
                      </div>
                      <div className="w-1/2">
                         <select 
                           value={mapping[field.key] || ''}
                           onChange={(e) => handleMapChange(field.key, e.target.value)}
                           className="w-full neu-pressed px-3 py-2 text-sm text-slate-600 font-medium"
                         >
                            <option value="">-- Seleziona Colonna --</option>
                            {rawHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                         </select>
                      </div>
                   </div>
                 ))}
              </div>
            </div>
          )}

          {step === 'PREVIEW' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                 <h4 className="text-lg font-bold text-slate-700">Riepilogo Importazione</h4>
                 <span className="neu-pressed px-3 py-1 text-sm font-bold text-blue-600">{processedOrders.length} Ordini Identificati</span>
              </div>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {processedOrders.slice(0, 10).map((po, idx) => (
                  <div key={idx} className="neu-flat p-4 rounded-xl border-l-4 border-blue-500">
                     <div className="flex justify-between mb-2">
                        <span className="font-bold text-slate-700">{po.id}</span>
                        <span className="text-xs font-bold text-slate-400">{po.date}</span>
                     </div>
                     <div className="flex justify-between items-end">
                        <div className="text-sm text-slate-600">{po.supplierName}</div>
                        <div className="text-right">
                           <div className="text-xs text-slate-400">{po.items.length} Articoli</div>
                           <div className="font-bold text-slate-800">€ {po.totalAmount.toLocaleString('it-IT', {minimumFractionDigits: 2})}</div>
                        </div>
                     </div>
                  </div>
                ))}
                {processedOrders.length > 10 && (
                  <p className="text-center text-sm text-slate-500 italic mt-2">...e altri {processedOrders.length - 10} ordini</p>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-200 bg-[#EEF2F6] flex justify-between">
           <button 
             onClick={() => {
               if(step === 'MAPPING') setStep('UPLOAD');
               if(step === 'PREVIEW') setStep('MAPPING');
               if(step === 'UPLOAD') onClose();
             }}
             className="neu-btn px-6 py-2"
           >
             {step === 'UPLOAD' ? 'Annulla' : 'Indietro'}
           </button>

           {step === 'MAPPING' && (
             <button onClick={handleConfirmMapping} className="neu-btn px-6 py-2 text-blue-600">
               Verifica Dati
             </button>
           )}

           {step === 'PREVIEW' && (
             <button onClick={() => onImportComplete(processedOrders)} className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md">
               Conferma Importazione
             </button>
           )}
        </div>

      </div>
    </div>
  );
};

export default ImportWizard;