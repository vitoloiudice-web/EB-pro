
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Client, Item, Supplier, Customer, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import Pagination from './common/Pagination';
import { usePaginatedData } from '../hooks/usePaginatedData';
import MasterDataModal from './MasterDataModal';
import CodingSchemaModal from './CodingSchemaModal';
import { CodingSchema } from '../types';
import Tooltip from './common/Tooltip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyStandardHeader, applyStandardSignature, applyPageFooter, PDF_CONFIG } from '../services/pdfService';

interface MasterDataViewProps {
  client: Client;
  initialTab?: string;
  initialSubTab?: string;
}

type MainTab = 'ARTICOLI' | 'SUPPLIERS' | 'CUSTOMERS';
type ArticoliSubTab = 'CODIFICA' | 'ITEMS';

const MasterDataView: React.FC<MasterDataViewProps> = ({ client, initialTab, initialSubTab }) => {
  const [activeMainTab, setActiveMainTab] = useState<MainTab>((initialTab as MainTab) || 'ARTICOLI');
  const [activeSubTab, setActiveSubTab] = useState<ArticoliSubTab>((initialSubTab as ArticoliSubTab) || 'ITEMS');
  
  // Update state if props change (e.g. from sidebar navigation)
  useEffect(() => {
    if (initialTab) setActiveMainTab(initialTab as MainTab);
    if (initialSubTab) setActiveSubTab(initialSubTab as ArticoliSubTab);
  }, [initialTab, initialSubTab]);

  // State for Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await dataService.getAdminProfile(client);
        if (profile) setAdminProfile(profile as AdminProfile);
      } catch (e) {
        console.error("Failed to load admin profile for MasterDataView", e);
      }
    };
    loadProfile();
  }, [client]);

  // Define fetchers wrapped in useCallback to prevent infinite loops in hook
  const fetchItems = useCallback((p: number, s: number, q: string, f?: any) => client ? dataService.getItems(client, p, s, q, f) : Promise.resolve({ data: [], total: 0 }), [client]);
  const fetchSuppliers = useCallback((p: number, s: number, q: string) => client ? dataService.getSuppliers(client, p, s, q) : Promise.resolve({ data: [], total: 0 }), [client]);
  const fetchCustomers = useCallback((p: number, s: number, q: string) => client ? dataService.getCustomers(client, p, s, q) : Promise.resolve({ data: [], total: 0 }), [client]);

  const activeFetchMethod = useMemo(() => {
      if (activeMainTab === 'SUPPLIERS') return fetchSuppliers;
      if (activeMainTab === 'CUSTOMERS') return fetchCustomers;
      if (activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS') return fetchItems;
      return fetchItems; // Fallback
  }, [activeMainTab, activeSubTab, fetchSuppliers, fetchCustomers, fetchItems]);

  const { 
    data, setData, loading, total, page, setPage, search, setSearch, filters, setFilters, pageSize, refresh 
  } = usePaginatedData<Item | Supplier | Customer | Client>({
    fetchMethod: activeFetchMethod,
    pageSize: 15
  });

  // Handlers
  const handleCreate = () => {
    setEditingEntity(null);
    setIsModalOpen(true);
  };

  const handleEdit = (entity: any) => {
    setEditingEntity(entity);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
        const isNew = !editingEntity;
        
        // 1. Backend Persistance
        if (activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS') {
            await dataService.saveItem(client, { ...formData, id: editingEntity?.id }, isNew);
        } else if (activeMainTab === 'SUPPLIERS') {
            await dataService.saveSupplier(client, { ...formData, id: editingEntity?.id }, isNew);
        } else if (activeMainTab === 'CUSTOMERS') {
            await dataService.saveCustomer(client, { ...formData, id: editingEntity?.id }, isNew);
        }

        setIsModalOpen(false);
        setSuccess("Salvataggio completato con successo!");
        setTimeout(() => setSuccess(null), 3000);
        refresh(); // Refresh data to get sync IDs

    } catch (error: any) {
        console.error("Save failed:", error);
        setError(`Errore salvataggio: ${error.message}`);
        setTimeout(() => setError(null), 5000);
    }
  };

  const handleDelete = async (id: string) => {
    try {
        if (activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS') {
            await dataService.deleteItem(id);
        } else if (activeMainTab === 'SUPPLIERS') {
            await dataService.deleteSupplier(id);
        } else if (activeMainTab === 'CUSTOMERS') {
            await dataService.deleteCustomer(id);
        }
        setIsModalOpen(false);
        setSuccess("Eliminazione completata con successo!");
        setTimeout(() => setSuccess(null), 3000);
        refresh();
    } catch (error: any) {
        console.error("Delete failed:", error);
        setError(`Errore eliminazione: ${error.message}`);
        setTimeout(() => setError(null), 5000);
    }
  };

  const handleExportContractPDF = (cust: Customer) => {
    const doc = new jsPDF();
    const { margin } = PDF_CONFIG;

    const docNum = `CTR-${cust.id}-${new Date().getTime().toString().slice(-4)}`;
    
    // Standard Header
    const startY = applyStandardHeader(
      doc, 
      "CONTRATTO DI SERVIZIO", 
      cust.name, 
      docNum, 
      adminProfile
    );

    doc.setFontSize(14);
    doc.text("Oggetto: Fornitura Servizi di Centrale Acquisti", margin, startY);

    const bodyText = `
Il presente contratto regola la fornitura dei servizi tra ${adminProfile?.companyName || 'Centrale Acquisti'} ed il cliente ${cust.name}.

Dettagli Cliente:
- P.IVA: ${cust.vatNumber}
- Indirizzo: ${cust.address}
- Pagamento: ${cust.paymentTerms}

Validità:
- Dal: ${cust.contractStartDate || 'N.D.'}
- Al: ${cust.contractEndDate || 'N.D.'}
- Canone Mensile: € ${cust.monthlyFee?.toLocaleString('it-IT') || '0,00'}

Termini Generali:
I servizi includono l'accesso alla piattaforma EB-pro, la gestione fornitori e l'analisi della spesa.
    `;

    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(bodyText, doc.internal.pageSize.width - (margin * 2));
    doc.text(splitText, margin, startY + 15);

    applyStandardSignature(doc, startY + 110, adminProfile, "Firma per Accettazione Cliente");
    applyPageFooter(doc, "MOD-CTR-01 REV. 00", adminProfile);

    doc.save(`Contratto_${cust.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleExportInvoicePDF = (cust: Customer) => {
    const doc = new jsPDF();
    const { margin, primaryColor } = PDF_CONFIG;

    const docNum = `FT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    
    // Standard Header
    const startY = applyStandardHeader(
      doc, 
      "FATTURA COMMERCIALE", 
      cust.name, 
      docNum, 
      adminProfile
    );

    doc.setFontSize(12);
    doc.text("Dettaglio Servizi:", margin, startY);

    autoTable(doc, {
      startY: startY + 5,
      head: [['Descrizione', 'Periodo', 'Importo']],
      body: [[
        'Servizio Canone EB-pro Centrale Acquisti',
        new Date().toLocaleString('it-IT', { month: 'long', year: 'numeric' }),
        `€ ${cust.monthlyFee?.toLocaleString('it-IT') || '0,00'}`
      ]],
      theme: 'grid',
      margin: { left: margin, right: margin },
      headStyles: { fillColor: primaryColor }
    });

    const finalY = (doc as any).lastAutoTable.finalY;
    
    doc.setFontSize(11);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text(`TOTALE A PAGARE: € ${cust.monthlyFee?.toLocaleString('it-IT') || '0,00'}`, doc.internal.pageSize.width - margin - 60, finalY + 15);

    applyStandardSignature(doc, finalY + 40, adminProfile);
    applyPageFooter(doc, "MOD-FAT-01 REV. 00", adminProfile);

    doc.save(`Fattura_${cust.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const renderTable = () => {
    if (activeMainTab === 'ARTICOLI' && activeSubTab === 'CODIFICA') {
        return (
          <div className="flex flex-col h-full space-y-6">
             <div className="flex justify-end">
                 <button 
                    onClick={() => setIsSchemaModalOpen(true)}
                    className="neu-btn px-4 py-2 text-blue-600 font-bold flex items-center gap-2"
                 >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Configura Schema
                 </button>
             </div>
             <div className="neu-flat p-8 bg-white/50 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                </div>
                <h3 className="text-xl font-bold text-slate-700">Sistema di Codifica Tassonomico</h3>
                <p className="text-slate-500 max-w-md mx-auto">
                    La configurazione dello schema di codifica è un prerequisito per la corretta classificazione e auto-generazione degli SKU durante la creazione di nuovi articoli.
                </p>
                <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100 mt-4">
                    <strong>Nota:</strong> Definisci categorie, gruppi e famiglie per automatizzare il processo di anagrafica.
                </div>
             </div>
          </div>
        );
    }

    return (
      <div className="neu-flat flex-1 flex flex-col p-4 overflow-hidden">
        <div className="overflow-auto flex-1 custom-scrollbar rounded-xl">
          <table className="w-full text-left">
              <thead className="sticky top-0 bg-[#EEF2F6] z-10">
                <tr>
                  {activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS' && (
                      <>
                          <th className="p-4">Articolo</th>
                          <th className="p-4 hidden sm:table-cell">Rev.</th>
                          <th className="p-4 hidden md:table-cell">Classificazione</th>
                          <th className="p-4 text-right">Costo</th>
                          <th className="p-4 hidden lg:table-cell">Produttore</th>
                      </>
                  )}
                  {activeMainTab === 'SUPPLIERS' && (
                       <>
                          <th className="p-4 hidden sm:table-cell">ID</th>
                          <th className="p-4">Ragione Sociale</th>
                          <th className="p-4 text-center">Rating</th>
                          <th className="p-4 hidden md:table-cell">Email</th>
                          <th className="p-4 hidden lg:table-cell">Pagamento</th>
                       </>
                  )}
                  {activeMainTab === 'CUSTOMERS' && (
                       <>
                          <th className="p-4">Cliente</th>
                          <th className="p-4 hidden sm:table-cell">P.IVA</th>
                          <th className="p-4 hidden md:table-cell">Email</th>
                          <th className="p-4">Zona</th>
                          <th className="p-4 hidden lg:table-cell">Pagamento</th>
                       </>
                  )}
                  <th className="p-4 text-center w-24">Azioni</th>
                </tr>
              </thead>
              <tbody className="space-y-2">
                
                {loading && (
                    <tr><td colSpan={7} className="p-10 text-center text-slate-500 animate-pulse">Caricamento in corso...</td></tr>
                )}

                {!loading && activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS' && (data as Item[]).map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-4">
                        <div className="font-mono text-[10px] font-bold text-slate-400">{item.sku}</div>
                        <div className="font-bold text-slate-700 text-sm">{item.name}</div>
                        <div className="text-xs text-slate-400 sm:line-clamp-1">{item.description}</div>
                        {item.manufacturer?.mpn && <div className="font-mono text-[10px] text-slate-400">MPN: {item.manufacturer.mpn}</div>}
                    </td>
                    <td className="p-4 hidden sm:table-cell font-mono text-xs text-slate-500 font-bold text-center">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded">{item.revision}</span>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black text-blue-700 bg-blue-100 uppercase">
                          {item.category}
                        </span>
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-200 uppercase">
                          {item.family}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-mono text-slate-600 font-bold whitespace-nowrap">€ {(item.cost || 0).toFixed(2)}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500 text-xs">
                        {item.manufacturer?.name || '-'}
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                         <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && activeMainTab === 'SUPPLIERS' && (data as Supplier[]).map((sup, idx) => (
                  <tr key={idx}>
                    <td className="p-4 hidden sm:table-cell font-mono text-[10px] text-slate-400 uppercase tracking-tighter truncate max-w-[80px]">{sup.id}</td>
                    <td className="p-4">
                      <div className="font-bold text-slate-700 text-sm truncate max-w-[150px]">{sup.name}</div>
                      <div className="text-[10px] text-slate-400 md:hidden truncate max-w-[150px]">{sup.email}</div>
                    </td>
                    <td className="p-4 text-center">
                         <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                           String(sup.rating) === 'A' || sup.rating >= 4 ? 'text-emerald-700 bg-emerald-100' : 
                           String(sup.rating) === 'B' || sup.rating === 3 ? 'text-blue-700 bg-blue-100' : 
                           'text-amber-700 bg-amber-100'
                         }`}>
                           RATING {sup.rating}
                         </span>
                    </td>
                    <td className="p-4 hidden md:table-cell text-slate-600 text-xs truncate max-w-[150px]">{sup.email}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500 text-xs whitespace-nowrap">{sup.paymentTerms}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleEdit(sup)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}

                {!loading && activeMainTab === 'CUSTOMERS' && (data as Customer[]).map((cust, idx) => (
                  <tr key={idx}>
                    <td className="p-4">
                      <div className="font-bold text-slate-700 text-sm">{cust.name}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{cust.address}</div>
                    </td>
                    <td className="p-4 hidden sm:table-cell font-mono text-[10px] text-slate-500">{cust.vatNumber}</td>
                    <td className="p-4 hidden md:table-cell text-blue-600 text-xs truncate max-w-[120px]">{cust.email}</td>
                    <td className="p-4 text-slate-600 text-xs font-bold uppercase tracking-tighter">{cust.region}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500 text-xs">{cust.paymentTerms}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button 
                            onClick={() => handleExportContractPDF(cust)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Contratto"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleEdit(cust)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title="Modifica"
                        >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!loading && data.length === 0 && (
                   <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nessun elemento trovato.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="pt-4 px-2">
             <Pagination 
               currentPage={page}
               totalItems={total}
               itemsPerPage={pageSize}
               onPageChange={setPage}
             />
          </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 flex flex-col min-h-full animate-fade-in relative">
      {error && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-red-50 border border-red-200 rounded-xl shadow-xl text-red-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      
      {/* Modals */}
      <CodingSchemaModal 
        isOpen={isSchemaModalOpen} 
        onClose={() => setIsSchemaModalOpen(false)} 
        client={client} 
        onSchemaUpdated={(schema) => {
            setSuccess("Schema di codifica aggiornato con successo!");
            setTimeout(() => setSuccess(null), 3000);
        }} 
      />

      {/* Edit/Create Modal */}
      <MasterDataModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={activeMainTab === 'ARTICOLI' ? 'ITEMS' : activeMainTab as any}
        initialData={editingEntity}
        onSave={handleSave}
        onDelete={handleDelete}
        client={client}
      />

      <div className="flex justify-end">
        {!(activeMainTab === 'ARTICOLI' && activeSubTab === 'CODIFICA') && (
          <Tooltip position="bottom" content={{ title: "Crea Nuovo Record", description: "Avvia la creazione di un nuovo articolo, fornitore o cliente.", usage: "Clicca per aprire il modulo di inserimento." }}>
            <button 
                onClick={handleCreate}
                className="neu-btn px-6 py-2.5 text-blue-600"
            >
                + Nuova Voce
            </button>
          </Tooltip>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex flex-col gap-4">
        <div className="flex space-x-4">
            {(['ARTICOLI', 'SUPPLIERS', 'CUSTOMERS'] as MainTab[]).map((tab) => (
            <Tooltip key={tab} position="bottom" content={{ 
                title: tab === 'ARTICOLI' ? "Gestione Articoli" : tab === 'SUPPLIERS' ? "Gestione Fornitori" : "Gestione Clienti",
                description: `Visualizza e modifica l'anagrafica completa di ${tab.toLowerCase()}.`,
                usage: "Clicca per cambiare la vista principale."
            }}>
                <button
                    onClick={() => { setActiveMainTab(tab); setPage(1); setSearch(''); }}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                    activeMainTab === tab 
                    ? 'neu-pressed text-blue-600' 
                    : 'neu-flat text-slate-500 hover:text-slate-700'
                    }`}
                >
                    {tab === 'ARTICOLI' && 'Articoli'}
                    {tab === 'SUPPLIERS' && 'Fornitori'}
                    {tab === 'CUSTOMERS' && 'Clienti'}
                </button>
            </Tooltip>
            ))}
        </div>

        {/* Sub Tabs for Articoli */}
        {activeMainTab === 'ARTICOLI' && (
          <div className="flex space-x-3 pl-4 border-l-2 border-slate-200">
            {(['CODIFICA', 'ITEMS'] as ArticoliSubTab[]).map((sub) => (
              <Tooltip key={sub} position="bottom" content={{
                  title: sub === 'CODIFICA' ? "Gestione Codifica" : "Elenco Articoli",
                  description: sub === 'CODIFICA' ? "Configura le definizioni e i valori per la tassonomia degli articoli." : "Visualizza e gestisci i singoli articoli (SKU).",
                  usage: "Clicca per cambiare la modalità di gestione articoli."
              }}>
                <button
                    onClick={() => { setActiveSubTab(sub); setPage(1); setSearch(''); }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeSubTab === sub 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'
                    }`}
                >
                    {sub === 'CODIFICA' && 'Codifica'}
                    {sub === 'ITEMS' && 'Items'}
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Search and Filters (only if not in Codifica) */}
      {!(activeMainTab === 'ARTICOLI' && activeSubTab === 'CODIFICA') && (
        <div className="flex flex-col sm:flex-row justify-end gap-3">
          {activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS' && (
            <>
              <div className="relative w-full sm:w-48">
                <select
                  className="neu-input w-full px-3 py-2 text-sm text-slate-600 font-medium bg-transparent"
                  value={filters.category || ''}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                >
                  <option value="">Tutte le Categorie</option>
                  <option value="DIRETTO">DIRETTO (D)</option>
                  <option value="INDIRETTO">INDIRETTO (I)</option>
                </select>
              </div>
              <div className="relative w-full sm:w-48">
                <select
                  className="neu-input w-full px-3 py-2 text-sm text-slate-600 font-medium bg-transparent"
                  value={filters.skuPrefix || ''}
                  onChange={(e) => setFilters({ ...filters, skuPrefix: e.target.value })}
                >
                  <option value="">Tutti i Prefissi Org</option>
                  <option value="MP">MP - Materie Prime</option>
                  <option value="SL">SL - Semilavorati</option>
                  <option value="PF">PF - Prodotti Finiti</option>
                  <option value="MO">MO - Materiali di Consumo</option>
                  <option value="CE">CE - Cespiti</option>
                </select>
              </div>
            </>
          )}
          <div className="relative w-full sm:w-72">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
              </div>
              <input 
                type="text"
                className="neu-input w-full pl-10 pr-4 py-2 text-sm text-slate-600 font-medium placeholder-slate-400"
                placeholder={`Cerca...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
          </div>
        </div>
      )}

      {/* Content Area */}
      {renderTable()}
    </div>
  );
};

export default MasterDataView;
