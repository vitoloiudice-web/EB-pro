
import React, { useState, useEffect } from 'react';
import { Client, PurchaseOrder, Item, Supplier, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import ConfirmModal from './common/ConfirmModal';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyStandardHeader, applyStandardSignature, applyPageFooter, PDF_CONFIG } from '../services/pdfService';
import { getNextDocumentNumber, persistGeneratedDocument } from '../services/documentService';

interface PurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: PurchaseOrder | null;
  onSave: (order: PurchaseOrder) => void;
  onDelete?: (id: string) => void;
  client: Client;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ isOpen, onClose, initialData, onSave, onDelete, client }) => {
  const [formData, setFormData] = useState<Partial<PurchaseOrder>>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierName: '',
    status: 'DRAFT',
    totalAmount: 0,
    items: [],
    trackingCode: ''
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({ ...initialData });
      } else {
        setFormData({
          id: `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          date: new Date().toISOString().split('T')[0],
          supplierId: '',
          supplierName: '',
          status: 'DRAFT',
          totalAmount: 0,
          items: [],
          trackingCode: ''
        });
      }
      loadDependencies();
    }
  }, [isOpen, initialData]);

  const loadDependencies = async () => {
    setLoading(true);
    try {
      const profile = await dataService.getAdminProfile(client);
      if (profile) setAdminProfile(profile as AdminProfile);

      const sups = await dataService.getSuppliers(client, 1, 100, '');
      const its = await dataService.getItems(client, 1, 100, '');
      setSuppliers(sups.data);
      setItems(its.data);
    } catch (err) {
      console.error("Failed to load dependencies for PO modal", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    let docNum = formData.id || "N/A";

    // If ID is random or missing, generate a persistent one
    if (!docNum || docNum === "N/A" || !docNum.startsWith('PO-')) {
      try {
        const nextNum = await getNextDocumentNumber('ORDINE_ACQUISTO');
        docNum = `PO-${nextNum}`;
      } catch (err) {
        console.error("Error generating PO number:", err);
      }
    }

    const doc = new jsPDF();
    const { margin, primaryColor } = PDF_CONFIG;

    // Standard Header
    const startY = applyStandardHeader(
      doc, 
      "ORDINE D'ACQUISTO A FORNITORE", 
      formData.supplierName || "Fornitore non specificato", 
      docNum, 
      adminProfile,
      formData.date
    );

    // ... rest of PDF generation ...
    // [Simulating the rest since we need to persist at the end]
    // Body logic remains same...
    
    // Adding persistence after generation (I'll need to wrap the whole function better)

    // Order Info
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text("Dettaglio Prodotti:", margin, startY);

    const tableRows = (formData.items || []).map(item => [
      item.sku,
      item.description,
      item.qty.toString(),
      `€ ${item.unitPrice.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
      `€ ${item.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: startY + 10,
      head: [['SKU', 'Descrizione', 'Qtà', 'P. Unitario', 'Totale']],
      body: tableRows,
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      columnStyles: {
        2: { halign: 'center' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY;

    // Total Amount
    doc.setFontSize(12);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text(`TOTALE ORDINE: € ${(formData.totalAmount || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`, doc.internal.pageSize.width - margin - 80, finalY + 15);

    // Standard Signature
    applyStandardSignature(doc, finalY + 40, adminProfile);

    // Standard Page Footer (ISO + Pagination)
    applyPageFooter(doc, "MOD-ORD-01 REV. 01", adminProfile);

    // PERSISTENCE & BACKUP
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await persistGeneratedDocument({
        doc_tipo: 'ORDINE_ACQUISTO',
        doc_num: docNum,
        doc_data: formData.date || new Date().toISOString(),
        doc_ref_id: formData.supplierId || client.id,
        doc_ref_type: formData.supplierId ? 'SUPPLIER' : 'CLIENT',
        pdf_backup_url: pdfBase64
      });
    } catch (err) {
      console.error("Failed to backup PO PDF:", err);
    }

    doc.save(`Ordine_${docNum}_${formData.supplierName?.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    const newItem = { sku: '', description: '', qty: 1, unitPrice: 0, total: 0 };
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  const handleRemoveItem = (idx: number) => {
    const updated = (formData.items || []).filter((_, i) => i !== idx);
    const total = updated.reduce((acc, curr) => acc + curr.total, 0);
    setFormData(prev => ({ ...prev, items: updated, totalAmount: total }));
  };

  const updateItem = (idx: number, updates: any) => {
    const updated = (formData.items || []).map((item, i) => {
      if (i === idx) {
        const newItem = { ...item, ...updates };
        newItem.total = newItem.qty * newItem.unitPrice;
        return newItem;
      }
      return item;
    });
    const total = updated.reduce((acc, curr) => acc + curr.total, 0);
    setFormData(prev => ({ ...prev, items: updated, totalAmount: total }));
  };

  const handleSupplierChange = (supId: string) => {
    const sup = suppliers.find(s => s.id === supId);
    setFormData(prev => ({
      ...prev,
      supplierId: supId,
      supplierName: sup?.name || ''
    }));
  };

  const handleSubmit = () => {
    if (!formData.supplierId) {
      setError("Seleziona un fornitore");
      return;
    }
    if (!formData.items || formData.items.length === 0) {
      setError("Aggiungi almeno un articolo");
      return;
    }
    setError(null);
    onSave(formData as PurchaseOrder);
  };

  return (
    <>
      <ConfirmModal 
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={() => onDelete && onDelete(initialData!.id)}
        title="Conferma Eliminazione"
        message="Eliminare definitivamente questo ordine?"
        confirmText="Elimina"
        type="danger"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="p-6 border-b border-slate-200 bg-white/50 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-700">
              {initialData ? 'Modifica Ordine' : 'Nuovo Ordine d\'Acquisto'}
            </h3>
            <p className="text-sm text-slate-500">Gestione flussi di approvvigionamento</p>
          </div>
          <button onClick={onClose} className="neu-icon-btn">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-auto custom-scrollbar flex-1 space-y-6">
          
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Rif. Ordine</label>
              <input 
                type="text" 
                value={formData.id || ''} 
                onChange={(e) => setFormData({...formData, id: e.target.value})}
                className="w-full neu-input px-4 py-2 text-sm font-bold text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Data Ordine</label>
              <input 
                type="date" 
                value={formData.date || ''} 
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className="w-full neu-input px-4 py-2 text-sm text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Stato</label>
              <select 
                value={formData.status || 'DRAFT'} 
                onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                className="w-full neu-input px-4 py-2 text-sm text-slate-700 bg-transparent"
              >
                <option value="DRAFT">Bozza</option>
                <option value="SENT">Inviato</option>
                <option value="CONFIRMED">Confermato</option>
                <option value="SHIPPED">Spedito</option>
                <option value="RECEIVED">Ricevuto</option>
                <option value="CANCELLED">Annullato</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Fornitore</label>
              <select 
                value={formData.supplierId || ''} 
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full neu-input px-4 py-2 text-sm text-slate-700 bg-transparent"
              >
                <option value="">Seleziona Fornitore...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1 pl-1">Tracking Code</label>
              <input 
                type="text" 
                value={formData.trackingCode || ''} 
                onChange={(e) => setFormData({...formData, trackingCode: e.target.value})}
                placeholder="Es. DHL-123456"
                className="w-full neu-input px-4 py-2 text-sm text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-slate-600 uppercase">Articoli in Ordine</h4>
              <button onClick={handleAddItem} className="text-blue-600 text-xs font-bold hover:underline">+ Aggiungi Riga</button>
            </div>
            
            <div className="space-y-2">
              {(formData.items || []).map((item, idx) => (
                <div key={idx} className="neu-flat p-3 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select 
                      value={item.sku || ''}
                      onChange={(e) => {
                        const it = items.find(i => i.sku === e.target.value);
                        updateItem(idx, { sku: it?.sku, description: it?.name, unitPrice: it?.cost || 0 });
                      }}
                      className="w-full bg-transparent text-xs font-bold text-slate-700 border-none focus:ring-0"
                    >
                      <option value="">Seleziona Articolo...</option>
                      {items.map(i => <option key={i.id} value={i.sku}>{i.sku} - {i.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input 
                      type="number" 
                      value={item.qty || 0} 
                      onChange={(e) => updateItem(idx, { qty: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-transparent text-xs text-center border-none focus:ring-0"
                      placeholder="Qtà"
                    />
                  </div>
                  <div className="col-span-3">
                    <input 
                      type="number" 
                      value={item.unitPrice || 0} 
                      onChange={(e) => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-transparent text-xs text-right border-none focus:ring-0"
                      placeholder="Prezzo"
                    />
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs font-bold text-slate-600">
                    € {item.total.toFixed(2)}
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {(formData.items || []).length === 0 && (
                <div className="p-8 text-center text-slate-400 italic text-sm border-2 border-dashed border-slate-200 rounded-xl">
                  Nessun articolo aggiunto all'ordine.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
             <div className="neu-pressed p-4 rounded-xl text-right min-w-[200px]">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Totale Ordine (Imponibile)</p>
                <p className="text-2xl font-black text-blue-600">€ {(formData.totalAmount || 0).toLocaleString('it-IT', {minimumFractionDigits: 2})}</p>
             </div>
          </div>

        </div>

        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-between items-center">
          <div>
            {initialData && onDelete && (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsConfirmDeleteOpen(true)}
                  className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Elimina Ordine
                </button>
                <button 
                  onClick={handleExportPDF}
                  className="text-blue-600 hover:text-blue-800 font-bold text-sm flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Esporta PDF
                </button>
              </div>
            )}
          </div>
          <div className="flex space-x-4">
            <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Annulla</button>
            <button onClick={handleSubmit} className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md">
              Salva Ordine
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default PurchaseOrderModal;
