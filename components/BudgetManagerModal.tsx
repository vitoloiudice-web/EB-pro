import React, { useState, useEffect } from 'react';
import { Client, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BudgetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  categories: any[];
  onSave: () => void;
}

const BudgetManagerModal: React.FC<BudgetManagerModalProps> = ({ isOpen, onClose, client, categories, onSave }) => {
  const [localCategories, setLocalCategories] = useState(categories);
  const [editMode, setEditMode] = useState<string | null>(null); // Category Name
  const [tempBudget, setTempBudget] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
        setLocalCategories(categories);
        const fetchProfile = async () => {
            const profile = await dataService.getAdminProfile(client);
            if (profile) setAdminProfile(profile as AdminProfile);
        };
        fetchProfile();
    }
  }, [isOpen, categories, client]);

  if (!isOpen) return null;

  const handleEdit = (cat: any) => {
    setEditMode(cat.name);
    setTempBudget(cat.budget);
  };

  const handleSaveLine = (catName: string) => {
    setLocalCategories(prev => prev.map(c => c.name === catName ? { ...c, budget: tempBudget } : c));
    setEditMode(null);
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleDateString('it-IT');

    // Header
    if (adminProfile?.logoUrl) {
        // In a real app we'd need to handle image loading/base64
        // For now we just put text if we can't easily get the image bytes
    }
    
    doc.setFontSize(22);
    doc.setTextColor(59, 130, 246);
    doc.text("RICHIESTA APPROVAZIONE BUDGET", 20, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${now}`, 20, 40);
    doc.text(`Cliente: ${client.name}`, 20, 45);
    
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text("Dettaglio Scostamenti Proposti:", 20, 60);

    const tableRows = localCategories.map(cat => {
        const delta = cat.budget - cat.spent;
        return [
            cat.name,
            `€ ${cat.spent.toLocaleString('it-IT')}`,
            `€ ${cat.budget.toLocaleString('it-IT')}`,
            `${delta >= 0 ? '+' : '-'} € ${Math.abs(delta).toLocaleString('it-IT')}`
        ];
    });

    autoTable(doc, {
      startY: 70,
      head: [['Categoria', 'Speso (YTD)', 'Budget Proposto', 'Scostamento']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // Signature Area
    const finalY = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.text("Firma Centrale Acquisti", 20, finalY);
    
    doc.setFontSize(10);
    doc.text(adminProfile?.companyName || "EB-pro Centrale Acquisti", 20, finalY + 10);
    if (adminProfile?.address) doc.text(adminProfile.address, 20, finalY + 15);
    
    return doc;
  };

  const handleQuickSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const allocations = localCategories.map(cat => ({
        category_name: cat.name,
        budget_amount: cat.budget
      }));
      
      await dataService.saveBudgetAllocations(client, allocations, 'APPROVED');
      
      setSuccess("Modifiche salvate e consolidate!");
      onSave();
      
      setTimeout(() => {
          setSuccess(null);
          onClose();
      }, 2000);
    } catch (err: any) {
      setError("Errore durante il salvataggio.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalRequest = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Save as PENDING in DB
      const allocations = localCategories.map(cat => ({
        category_name: cat.name,
        budget_amount: cat.budget
      }));
      await dataService.saveBudgetAllocations(client, allocations, 'PENDING');

      // 2. Generate PDF
      const doc = generatePDF();
      
      // Save locally
      doc.save(`Richiesta_Budget_${client.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);

      // 3. Send via Email
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      const emailBody = `Spettabile ${client.name},

Si invia in allegato la proposta di revisione del budget per le categorie merceologiche in oggetto.
Restiamo in attesa di un vostro riscontro per procedere con il consolidamento delle allocazioni.

Cordiali saluti,

--
${adminProfile?.companyName || "EB-pro Centrale Acquisti"}
${adminProfile?.address || ""}`;

      const response = await fetch('/api/send-budget-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           to: client.email || adminProfile?.email || "v.loiudice@easybuypro.com", // Fallback for demo
           subject: `Richiesta Approvazione Variazione Budget - ${client.name}`,
           body: emailBody,
           pdfBase64: pdfBase64,
           fileName: `Richiesta_Budget_${client.name}.pdf`
        })
      });

      let result: any;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
          result = await response.json();
      } else {
          const text = await response.text();
          console.error("Non-JSON response from server:", text);
          throw new Error("Il server ha restituito una risposta non valida (non-JSON). Verifica i log del server.");
      }
      
      if (!response.ok) throw new Error(result.error || "Errore invio email");

      setSuccess("Richiesta inviata al cliente via email e PDF salvato!");
      onSave();
      
      setTimeout(() => {
          setSuccess(null);
          onClose();
      }, 3000);
    } catch (err: any) {
      console.error("Workflow failed:", err);
      setError(err.message || "Errore durante il processo di approvazione.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      {error && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-red-50 border border-red-200 rounded-xl shadow-xl text-red-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}

      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white/50 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-slate-700">Gestione Budget</h3>
                <p className="text-sm text-slate-500">Revisione allocazioni per categoria merceologica per {client.name}.</p>
            </div>
            <button onClick={onClose} className="neu-icon-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-auto custom-scrollbar flex-1">
            <div className="min-w-[700px]">
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
                                                value={tempBudget || 0}
                                                onChange={(e) => setTempBudget(Number(e.target.value) || 0)}
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
                                            <button onClick={() => handleSaveLine(cat.name)} className="text-green-600 hover:text-green-800 font-bold text-xs uppercase text-[10px] tracking-tighter">Salva Riga</button>
                                        ) : (
                                            <button onClick={() => handleEdit(cat)} className="text-blue-600 hover:text-blue-800 font-bold text-xs uppercase text-[10px] tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Modifica</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-between items-center">
            <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">
               Centrale Acquisti: {adminProfile?.companyName || 'Caricamento...'}
            </div>
            <div className="flex gap-4">
                <button 
                  disabled={loading}
                  onClick={handleQuickSave} 
                  className="neu-btn px-6 py-3 text-slate-600 bg-white shadow-md disabled:opacity-50 text-xs font-bold"
                >
                    SALVA MODIFICHE ALLOCAZIONE
                </button>
                <button 
                  disabled={loading}
                  onClick={handleApprovalRequest} 
                  className="neu-btn px-6 py-3 text-white bg-blue-600 shadow-lg disabled:opacity-50 text-xs font-bold"
                >
                    {loading ? 'Elaborazione...' : 'INVIA RICHIESTA APPROVAZIONE'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetManagerModal;