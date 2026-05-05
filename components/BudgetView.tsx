
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Client, Budget, BudgetAssignmentMode, BudgetTimePeriod, ViewState } from '../types';
import Tooltip from './common/Tooltip';
import { dataService } from '../services/dataService';
import BudgetModal from './BudgetModal';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface BudgetViewProps {
  client: Client;
  onNavigate?: (view: ViewState, params?: any) => void;
}

const BudgetView: React.FC<BudgetViewProps> = ({ client, onNavigate }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ANALYTICS'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<BudgetAssignmentMode | 'ALL'>('ALL');
  const [error, setError] = useState<string|null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Partial<Budget> | null>(null);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const fetchBudgets = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await dataService.getBudgets(client, 1, 1000, searchQuery, { filterMode });
      setBudgets(response.data as Budget[]);
    } catch (err: any) {
      console.error(err);
      setError("Errore durante il caricamento dei budget.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [client, searchQuery, filterMode]);

  const handleSaveBudget = async (budgetData: Partial<Budget>) => {
    try {
      await dataService.saveBudget(client, budgetData, !budgetData.id);
      fetchBudgets();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo budget?')) {
      try {
        await dataService.deleteBudget(id);
        fetchBudgets();
      } catch (err) {
        console.error(err);
        alert("Errore durante l'eliminazione.");
      }
    }
  };

  const handleNewBudget = () => {
    setEditingBudget(null);
    setIsModalOpen(true);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setIsModalOpen(true);
  };

  const handleExportExcel = () => {
    const exportData = budgets.map(b => ({
      'Cliente': b.customerName,
      'Modalità': b.assignmentMode.replace('_', ' '),
      'Periodo': b.period.replace('_', ' '),
      'Assegnato (€)': b.amountAssigned,
      'Speso (€)': b.amountSpent,
      'Residuo (€)': b.amountAssigned - b.amountSpent,
      'Stato': b.status,
      'Categoria': b.category || '-',
      'Prefisso': b.skuPrefix || '-',
      'Gruppo': b.group || '-',
      'Macrofamiglia': b.macroFamily || '-',
      'Famiglia': b.family || '-',
      'Note': b.notes || '-'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Budgets');
    XLSX.writeFile(workbook, `Report_Budgets_${new Date().toISOString().split('T')[0]}.xlsx`);
    setIsExportMenuOpen(false);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text('Report Budget Clienti', 14, 15);
    doc.setFontSize(10);
    doc.text(`Generato il: ${new Date().toLocaleDateString()}`, 14, 22);

    const tableColumn = ["Cliente", "Modalità", "Periodo", "Assegnato (€)", "Speso (€)", "Residuo (€)", "Stato"];
    const tableRows: any[] = [];

    budgets.forEach(b => {
      tableRows.push([
        b.customerName,
        b.assignmentMode.replace('_', ' '),
        b.period.replace('_', ' '),
        b.amountAssigned.toLocaleString(),
        b.amountSpent.toLocaleString(),
        (b.amountAssigned - b.amountSpent).toLocaleString(),
        b.status
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 8 },
    });

    doc.save(`Report_Budgets_${new Date().toISOString().split('T')[0]}.pdf`);
    setIsExportMenuOpen(false);
  };

  const renderStatusBadge = (status: Budget['status']) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      EXHAUSTED: 'bg-red-100 text-red-700 border-red-200',
      EXPIRED: 'bg-amber-100 text-amber-700 border-amber-200',
      DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col space-y-6"
    >
      {/* Header Tab Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex p-1 bg-slate-200/50 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab('LIST')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'LIST' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gestione Budget
          </button>
          <button 
            onClick={() => setActiveTab('ANALYTICS')}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'ANALYTICS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Analisi Scostamenti
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Tooltip position="bottom" content={{ title: "Esporta Report", description: "Genera report Excel o PDF del budget attuale.", usage: "Clicca per scegliere il formato." }}>
              <button 
                className="neu-btn px-4 py-2.5 flex items-center gap-2 text-slate-600"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Esporta
                 <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </Tooltip>
            
            <AnimatePresence>
              {isExportMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 sm:left-auto sm:right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-50"
                >
                  <button 
                    onClick={handleExportExcel}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Esporta Excel
                  </button>
                  <button 
                    onClick={handleExportPDF}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                    Esporta PDF
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={handleNewBudget} className="neu-btn px-6 py-2.5 bg-blue-600 text-white font-bold flex items-center gap-2 hover:bg-blue-700">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
             Nuovo Budget
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="neu-flat rounded-[2.5rem] p-8 min-h-[500px]">
        {activeTab === 'LIST' ? (
          <div className="space-y-6">
            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-slate-100 pb-6">
              <div className="relative w-full md:w-96">
                <input 
                  type="text"
                  placeholder="Cerca per cliente o nota..."
                  className="w-full neu-input pl-10 pr-4 py-3 rounded-xl focus:outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg className="w-5 h-5 absolute left-3 top-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>

              <div className="flex items-center gap-4 w-full md:w-auto">
                <select 
                  className="neu-input px-4 py-3 rounded-xl focus:outline-none text-sm w-full md:w-48 appearance-none bg-no-repeat bg-[right_1rem_center]"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundSize: '1em' }}
                  value={filterMode}
                  onChange={(e) => setFilterMode(e.target.value as any)}
                >
                  <option value="ALL">Tutte le modalità</option>
                  <option value="SVINCOLATO">Svincolato</option>
                  <option value="VINCOLO_ITEM">Vincolo Item</option>
                  <option value="VINCOLO_ITEM_TEMPO">Vincolo Item-Tempo</option>
                </select>
              </div>
            </div>

            {/* Budget Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-50">
                    <th className="pb-4 px-4">Cliente / Periodo</th>
                    <th className="pb-4 px-4">Modalità</th>
                    <th className="pb-4 px-4 text-right">Assegnato</th>
                    <th className="pb-4 px-4 text-right">Speso</th>
                    <th className="pb-4 px-4 text-right">Residuo</th>
                    <th className="pb-4 px-4">Stato</th>
                    <th className="pb-4 px-4 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-slate-400 font-medium">Caricamento archivi budget...</p>
                        </div>
                      </td>
                    </tr>
                  ) : budgets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-40">
                          <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" /></svg>
                          <p className="text-slate-500 font-medium italic">Nessun budget configurato per questo ambiente.</p>
                          <button className="text-blue-600 font-bold hover:underline">Configura il primo budget</button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    budgets.map((budget) => (
                      <tr key={budget.id} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50/30">
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800">{budget.customerName}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{budget.period.replace('_', ' ').toLowerCase()}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                           <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                             {budget.assignmentMode.replace('_', ' ')}
                           </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono text-slate-700">€ {budget.amountAssigned.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="font-mono text-slate-400">€ {budget.amountSpent.toLocaleString()}</span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-mono font-bold ${(budget.amountAssigned - budget.amountSpent) < 0 ? 'text-red-500' : 'text-blue-600'}`}>
                            € {(budget.amountAssigned - budget.amountSpent).toLocaleString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {renderStatusBadge(budget.status)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                             <button onClick={() => handleEditBudget(budget)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Modifica">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                             <button onClick={() => handleDeleteBudget(budget.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Elimina">
                               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center py-20">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <h3 className="text-xl font-bold text-slate-800 mb-2">Analisi e Statistiche Budget</h3>
             <p className="text-slate-400 max-w-md text-center leading-relaxed text-sm mb-6">
                Per offrire una visione centralizzata, tutte le analisi di Budget (distribuzione assegnazioni, logiche di spesa e tracking) sono state integrate nativamente nel pannello Business Intelligence.
             </p>
             <button 
                className="px-6 py-3 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer rounded-xl text-blue-700 font-bold border border-blue-200 flex items-center gap-2"
                onClick={() => onNavigate && onNavigate(ViewState.BI)}
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Naviga in Intelligence &rarr; Business Analytics
              </button>
          </div>
        )}
      </div>

      <BudgetModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveBudget}
        budget={editingBudget}
      />
    </motion.div>
  );
};

export default BudgetView;
