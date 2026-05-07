
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Client, Item, Supplier, Customer, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import Pagination from './common/Pagination';
import { usePaginatedData } from '../hooks/usePaginatedData';
import MasterDataModal from './MasterDataModal';
import CodingSchemaModal from './CodingSchemaModal';
import ServiceContractModal from './ServiceContractModal';
import { CodingSchema } from '../types';
import Tooltip from './common/Tooltip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { applyMinimalHeader, applyDocumentMetadata, applyStandardHeader, applyStandardSignature, applyPageFooter, PDF_CONFIG } from '../services/pdfService';
import { getNextDocumentNumber, persistGeneratedDocument } from '../services/documentService';
import { geminiService } from '../services/geminiService';

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
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSmartImporting, setIsSmartImporting] = useState(false);
  const smartImportInputRef = React.useRef<HTMLInputElement>(null);
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

  const handleOpenContractModal = (cust: Customer) => {
    setEditingEntity(cust);
    setIsContractModalOpen(true);
  };

  const handleSave = async (formData: any) => {
    try {
        const isNew = !editingEntity;
        
        // 1. Anti-Duplicate Check for Customers
        if (activeMainTab === 'CUSTOMERS' && isNew) {
            // Check for VAT duplicate
            const vatResponse = await dataService.getCustomers(client, 1, 10, formData.vatNumber);
            const duplicateVat = (vatResponse.data as Customer[]).find(c => 
                c.vatNumber?.replace(/\s+/g, '') === formData.vatNumber?.replace(/\s+/g, '')
            );
            
            if (duplicateVat) {
                alert(`ATTENZIONE: Partita IVA ${formData.vatNumber} già presente in anagrafica per "${duplicateVat.name}".`);
                setIsModalOpen(false);
                setSearch(formData.vatNumber); // Focus on the duplicate
                return;
            }

            // Check for Name duplicate
            const nameResponse = await dataService.getCustomers(client, 1, 10, formData.name);
            const duplicateName = (nameResponse.data as Customer[]).find(c => 
                c.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
            );

            if (duplicateName) {
                alert(`ATTENZIONE: Ragione Sociale "${formData.name}" già presente in anagrafica.`);
                setIsModalOpen(false);
                setSearch(formData.name);
                return;
            }
        }

        // 2. Backend Persistance
        if (activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS') {
            await dataService.saveItem(client, { ...formData, id: editingEntity?.id }, isNew);
        } else if (activeMainTab === 'SUPPLIERS') {
            await dataService.saveSupplier(client, { ...formData, id: editingEntity?.id }, isNew);
        } else if (activeMainTab === 'CUSTOMERS') {
            const customerToSave = { ...formData, id: editingEntity?.id };
            
            // Assign contract number if new
            if (isNew && !customerToSave.contractNumber) {
                try {
                    const nextNum = await getNextDocumentNumber('CONTRATTO');
                    customerToSave.contractNumber = `CTR-${nextNum}`;
                } catch (err) {
                    console.error("Error generating initial contract number:", err);
                }
            }
            
            await dataService.saveCustomer(client, customerToSave, isNew);
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

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExportExcel = async () => {
    try {
      if (activeMainTab === 'ARTICOLI') {
        const fullResponse = await fetchItems(1, 10000, search, filters);
        const itemsToExport = fullResponse.data as Item[];
        
        const worksheetData = itemsToExport.map(item => ({
          SKU: item.sku,
          Descrizione: item.description,
          Gruppo: item.group,
          Categoria: item.category,
          MacroFamiglia: item.macroFamily,
          Famiglia: item.family,
          UnitaMisura: item.unit,
          CostoUnitario: item.cost,
          TempoConsegnaGG: item.leadTimeDays,
          FornitoreID: item.supplierId
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Articoli");
        XLSX.writeFile(wb, `Export_Articoli_${client.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (activeMainTab === 'SUPPLIERS') {
        const fullResponse = await fetchSuppliers(1, 10000, search);
        const suppliersToExport = fullResponse.data as Supplier[];
        
        const worksheetData = suppliersToExport.map(sup => ({
          ID: sup.id,
          RagioneSociale: sup.name,
          Email: sup.email,
          Pagamento: sup.paymentTerms,
          Telefono: sup.phone || '',
          Status: sup.status || 'PENDING',
          Rating: sup.rating
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Fornitori");
        XLSX.writeFile(wb, `Export_Fornitori_${client.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
      }
    } catch (err: any) {
      setError(`Errore Esportazione: ${err.message}`);
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const dataJson = XLSX.utils.sheet_to_json(ws);

        let importedCount = 0;
        let updatedCount = 0;
        
        if (activeMainTab === 'ARTICOLI') {
          // Fetch existing items for anti-duplicate check
          const fullResponse = await dataService.getItemsForClients([client], 1, 10000, '');
          const existingItems = fullResponse.data as Item[];
          const existingSkuMap = new Map<string, Item>();
          existingItems.forEach(item => existingSkuMap.set(item.sku, item));

          // Mass import and update logic for items
          for (const row of dataJson as any[]) {
            const sku = row.SKU?.toString() || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const existingItem = existingSkuMap.get(sku);

            const item: Item = {
              id: existingItem ? existingItem.id : `IMPORT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              sku: sku,
              name: row.Descrizione || (existingItem?.name || 'Senza Descrizione'),
              description: row.Descrizione || (existingItem?.description || 'Senza Descrizione'),
              category: row.Categoria || (existingItem?.category || ''),
              group: row.Gruppo || (existingItem?.group || ''),
              macroFamily: row.MacroFamiglia || (existingItem?.macroFamily || ''),
              family: row.Famiglia || (existingItem?.family || ''),
              revision: existingItem?.revision || '0',
              variant: existingItem?.variant || 'A',
              progressive: existingItem?.progressive || '001',
              unit: row.UnitaMisura || (existingItem?.unit || 'PZ'),
              weightKg: existingItem?.weightKg || 0,
              isPhantom: existingItem ? existingItem.isPhantom : false,
              isSubcontracting: existingItem ? existingItem.isSubcontracting : false,
              leadTimeOffset: existingItem?.leadTimeOffset || 0,
              cost: typeof row.CostoUnitario === 'number' ? row.CostoUnitario : (parseFloat(row.CostoUnitario) || existingItem?.cost || 0),
              stock: existingItem?.stock || 0,
              safetyStock: existingItem?.safetyStock || 0,
              leadTimeDays: typeof row.TempoConsegnaGG === 'number' ? row.TempoConsegnaGG : (parseInt(row.TempoConsegnaGG) || existingItem?.leadTimeDays || 0),
              supplierId: row.FornitoreID?.toString() || (existingItem?.supplierId || '')
            };
            
            if (existingItem) {
              await dataService.saveItem(client, item, false);
              updatedCount++;
              existingSkuMap.set(sku, item); // Update map per evitare duplicati infragruppo
            } else {
              await dataService.saveItem(client, item, true);
              importedCount++;
              existingSkuMap.set(sku, item); // Aggiungi a map per evitare duplicati del file corrente
            }
          }
        } else if (activeMainTab === 'SUPPLIERS') {
          // Fetch existing suppliers for anti-duplicate check (match by name or ID)
          const fullResponse = await dataService.getSuppliers(client, 1, 10000, '');
          const existingSuppliers = fullResponse.data as Supplier[];
          const existingNameMap = new Map<string, Supplier>();
          existingSuppliers.forEach(sup => existingNameMap.set(sup.name.toLowerCase(), sup));

          for (const row of dataJson as any[]) {
            const rawName = row.RagioneSociale || 'Senza Nome';
            const existingSupplier = existingNameMap.get(rawName.toLowerCase()) || 
                                     (row.ID ? existingSuppliers.find(s => s.id === row.ID?.toString()) : undefined);

            const supplier: Supplier = {
              id: existingSupplier ? existingSupplier.id : `SUP-IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              name: rawName,
              email: row.Email || (existingSupplier?.email || ''),
              paymentTerms: row.Pagamento?.toString() || (existingSupplier?.paymentTerms || 'BB 30 GG'),
              phone: row.Telefono?.toString() || (existingSupplier?.phone || ''),
              status: row.Status || (existingSupplier?.status || 'PENDING'),
              rating: typeof row.Rating === 'number' ? row.Rating : (parseFloat(row.Rating) || existingSupplier?.rating || 0),
            };
            
            if (existingSupplier) {
              await dataService.saveSupplier(client, supplier, false);
              updatedCount++;
              existingNameMap.set(rawName.toLowerCase(), supplier); // Update map
            } else {
              await dataService.saveSupplier(client, supplier, true);
              importedCount++;
              existingNameMap.set(rawName.toLowerCase(), supplier); // Evita duplicati dello stesso file
            }
          }
        }
        
        setSuccess(`Elaborazione completata: ${importedCount} nuovi caricati, ${updatedCount} aggiornati.`);
        setTimeout(() => setSuccess(null), 3000);
        refresh(); // Reload paginated lists
      } catch (err: any) {
        setError(`Errore Importazione: ${err.message}`);
      }
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleSmartImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSmartImporting(true);
    setSuccess(null);
    setError(null);

    try {
      // FileReader to get Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => resolve(evt.target?.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
      });

      // Call Gemini for extraction
      const analysisResult = await geminiService.analyzeDatasheet(base64Data, file.type);
      
      const { summary, item: extractedItem } = analysisResult;
      
      // Attempt to find a match in DB
      const fullResponse = await dataService.getItemsForClients([client], 1, 10000, '');
      const existingItems = fullResponse.data as Item[];
      
      // Match by manufacturer MPN or closely matching name/SKU
      let matchedItem = existingItems.find(i => 
        (extractedItem.manufacturer?.mpn && i.manufacturer?.mpn === extractedItem.manufacturer.mpn) || 
        (extractedItem.sku && i.sku === extractedItem.sku)
      );

      if (matchedItem) {
        // Prepare to Edit
        setEditingEntity({
          ...matchedItem,
          description: matchedItem.description !== 'Senza Descrizione' ? matchedItem.description : extractedItem.description,
          category: matchedItem.category || extractedItem.category || '',
          group: matchedItem.group || extractedItem.group || '',
          family: matchedItem.family || extractedItem.family || ''
        });
        setSuccess(`Trovata corrispondenza: ${matchedItem.sku}. Verificare i dati e salvare.`);
      } else {
        // Prepare to Create New
        setEditingEntity({
          id: '',
          sku: `SKU-${Date.now().toString().slice(-4)}`,
          name: extractedItem.name || 'Nuovo Prodotto da Datasheet',
          description: extractedItem.description || summary || '',
          category: extractedItem.category || '',
          group: extractedItem.group || '',
          family: extractedItem.family || '',
          unit: extractedItem.unit || 'PZ',
          manufacturer: extractedItem.manufacturer || undefined,
          cost: 0,
          stock: 0,
          leadTimeDays: 0,
          weightKg: 0,
          revision: '0',
          variant: 'A',
          progressive: '001',
          isPhantom: false,
          isSubcontracting: false,
          leadTimeOffset: 0,
          safetyStock: 0,
          supplierId: ''
        });
        setSuccess(`Nuovo articolo identificato dal datasheet. Rivedi e salva.`);
      }
      setIsModalOpen(true);
      
      // To alert user of summary
      setTimeout(() => alert(`Analisi AI completata.\n\nContesto intuito: ${summary}`), 500);

    } catch (err: any) {
      console.error(err);
      setError(`Errore Smart Import: ${err.message}`);
    } finally {
      setIsSmartImporting(false);
      if (smartImportInputRef.current) smartImportInputRef.current.value = '';
    }
  };

  const formatCustomerPayments = (cust: any) => {
    const pm = cust.paymentMethods;
    if (!pm) return '-';
    let parts: string[] = [];
    if (pm.riba?.enabled) parts.push(`Ri.Ba. ${pm.riba.terms?.join(', ') || ''} ${pm.riba.description || ''}`.trim());
    if (pm.bb?.enabled) parts.push(`BB ${pm.bb.terms?.join(', ') || ''} ${pm.bb.description || ''}`.trim());
    if (pm.rd?.enabled) parts.push(`RD ${pm.rd.terms?.join(', ') || ''} ${pm.rd.description || ''}`.trim());
    if (pm.titoli?.enabled) parts.push(`Titoli ${pm.titoli.terms?.join(', ') || ''} ${pm.titoli.description || ''}`.trim());
    if (pm.altro?.enabled) parts.push(`Altro (${pm.altro.customLabel || ''}) ${pm.altro.terms?.join(', ') || ''} ${pm.altro.description || ''}`.trim());
    
    return parts.join(' | ').trim() || '-';
  };

  const formatCentralPayments = (cust: Customer) => {
    const pm = cust.paymentMethodsCentral;
    if (!pm) return '-';
    let parts: string[] = [];
    if (pm.riba?.enabled) parts.push(`Ri.Ba. ${pm.riba.terms?.join(', ') || ''} ${pm.riba.description || ''}`.trim());
    if (pm.bb?.enabled) parts.push(`BB ${pm.bb.terms?.join(', ') || ''} ${pm.bb.description || ''}`.trim());
    if (pm.rd?.enabled) parts.push(`RD ${pm.rd.terms?.join(', ') || ''} ${pm.rd.description || ''}`.trim());
    if (pm.titoli?.enabled) parts.push(`Titoli ${pm.titoli.terms?.join(', ') || ''} ${pm.titoli.description || ''}`.trim());
    if (pm.altro?.enabled) parts.push(`Altro (${pm.altro.customLabel || ''}) ${pm.altro.terms?.join(', ') || ''} ${pm.altro.description || ''}`.trim());
    
    return parts.join(' | ').trim() || '-';
  };

  const handleSaveContract = async (updates: Partial<Customer>) => {
    if (!editingEntity) return;
    try {
      await dataService.saveCustomer(client, { ...editingEntity, ...updates }, false);
      setSuccess("Parametri contrattuali aggiornati correttamente.");
      setTimeout(() => setSuccess(null), 3000);
      refresh();
    } catch (err: any) {
      setError(`Errore aggiornamento contratto: ${err.message}`);
    }
  };

  const handleExportContractPDF = async (cust: Customer) => {
    const doc = new jsPDF();
    const { margin, primaryColor, secondaryColor } = PDF_CONFIG;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // ENTERPRISE FONT SCALE
    const FONT_FAMILY = 'helvetica';
    const TITLE_SIZE = 18;
    const SUBJECT_SIZE = 12;
    const SECTION_SIZE = 11;
    const BODY_SIZE = 9.5;
    const DETAIL_SIZE = 9;
    const LABEL_SIZE = 8;

    const docNum = cust.contractNumber || 'CTR-PENDING';
    const docTitle = "CONVENZIONE SERVIZIO DI CENTRALE ACQUISTI";
    const recipientName = cust.name;

    const reapplyMinimalHeader = () => {
      return applyMinimalHeader(doc, adminProfile);
    };

    // 1. Header & Metadata (First Page Full)
    const lineY = reapplyMinimalHeader();
    const startY = applyDocumentMetadata(doc, docTitle, recipientName, docNum, lineY);
    // 2. Intro Parties - REDESIGNED per mockup
    doc.setFontSize(BODY_SIZE);
    doc.setFont(FONT_FAMILY, 'normal');
    const partiesHeaderY = startY + 5;
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text("TRA LE SOTTOSCRITTE PARTI:", pageWidth / 2, partiesHeaderY, { align: 'center' });
    
    let currentY = partiesHeaderY + 8;

    // FORNITORE SECTION
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text("EASYBUY", margin, currentY);
    currentY += 4;
    doc.setFont(FONT_FAMILY, 'normal');
    const supplierText = `con sede legale in ${adminProfile?.address || '...'}, ${adminProfile?.zipCode || ''} ${adminProfile?.city || ''} (BA), P.IVA: ${adminProfile?.vatNumber || '...'}, in persona del legale rappresentante pro tempore, Sig. Vito Loiudice (di seguito denominata "Fornitore" o "Centrale Acquisti") c.f. ${adminProfile?.taxId || '...'}.`;
    const splitSupplier = doc.splitTextToSize(supplierText, pageWidth - (margin * 2));
    doc.text(splitSupplier, margin, currentY, { align: 'justify', maxWidth: pageWidth - (margin * 2) });
    currentY += splitSupplier.length * 4 + 4;

    // "E" separator
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text("E", pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // CLIENTE SECTION
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text(`${cust.name.toUpperCase()}`, margin, currentY);
    currentY += 4;
    doc.setFont(FONT_FAMILY, 'normal');
    const fullAddress = [cust.address, cust.zipCode, cust.city, cust.province ? `(${cust.province})` : ''].filter(Boolean).join(' ');
    const clientText = `con sede legale in ${fullAddress || '...'}, P.IVA: ${cust.vatNumber || '...'}, in persona del suo legale rappresentante pro tempore, Sig. ${cust.legalRepresentative || '...'} (di seguito denominata "Cliente") c.f. ${cust.taxId || '...'}.`;
    const splitClient = doc.splitTextToSize(clientText, pageWidth - (margin * 2));
    doc.text(splitClient, margin, currentY, { align: 'justify', maxWidth: pageWidth - (margin * 2) });
    currentY += splitClient.length * 4 + 4;

    currentY += 6;

    // 3. ARTICLES - EXACT TEXT FROM contratto_testo.txt
    const finalFee = cust.monthlyFee !== undefined ? cust.monthlyFee : (cust.standardMonthlyFee || 0);
    const hasMonthlyFee = finalFee > 0;
    const formattedFee = finalFee.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const centralPayStr = formatCentralPayments(cust);
    const supplierPayStr = formatCustomerPayments(cust);
    const formattedExpenseBudget = (cust.expenseBudget || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const articles = [
      {
        title: "ART. 1 – OGGETTO DELLA CONVENZIONE, PIATTAFORMA, SERVIZIO, OBIETTIVI E OBBLIGHI",
        paragraphs: [
          "1.1. Il presente contratto ha per oggetto la fornitura del \"Servizio di Centrale Acquisti\" erogato dal Fornitore a favore del Cliente.",
          "1.2. L’utilizzo di metodi, strumenti, mezzi, tecnologie e competenze (d'ora in avanti identificati come \"piattaforma\") proprietarie EASYBUY è interamente ed esclusivamente gestito (accesso, utilizzo, manutenzione) dal Fornitore che ne detiene i diritti in via esclusiva.",
          "1.3 Il Servizio è finalizzato al perseguimento dei seguenti obiettivi strategici e operativi:",
          "  * Gestione completa degli acquisti: affidamento integrale ed esclusivo dei processi di approvvigionamento alla Centrale Acquisti.",
          "  * Vantaggi di saving: ottenimento ove possibile di risparmi economici diretti ed efficientamento dei costi di acquisto.",
          "  * Ottimizzazione della spesa e delle scorte: razionalizzazione ove possibile dei flussi finanziari e logistici legati all'approvvigionamento e allo stoccaggio.",
          "  * Miglioramento Quali-Quantitativo: innalzamento ove possibile degli standard qualitativi dei beni e servizi e ottimizzazione dei volumi di fornitura.",
          "  * Reportistica Periodica: fornitura di analisi sistematiche sui KPI (indicatori) di performance e sui vantaggi competitivi conseguiti.",
          "1.4. Il Fornitore si impegna per la durata della convenzione a:",
          "  * Gestire gli acquisti per conto del Cliente attraverso l’utilizzo della piattaforma proprietaria EASYBUY.",
          "  * Ottenere da fornitori terzi l'approvvigionamento dei beni necessari a realizzare gli obiettivi di programmazione acquisti e il fabbisogno tecnico del Cliente.",
          "  * Intervenire tempestivamente nei confronti dei fornitori terzi per evitare ove possibile o risolvere eventuali problemi/criticità nelle forniture, con esclusione di criticità logistiche (trasporti) e/o altre problematiche derivanti e/o legate a eventi non prevedibili e non direttamente imputabili o riconducibili al Fornitore o alla Centrale Acquisti.",
          "1.5. Il Cilente si impegna per la durata della convenzione a:",
          "  * Pagare gli acquisti effettuati per suo conto dalla Centrale Acquisti alle scadenze e con i modi definiti nel presente accordo.",
          "  * Fornire con congruo anticipo alla Centrale Acquisti la programmazione dei propri acquisti e il fabbisogno tecnico.",
          "  * Fornire alla Centrale Acquisti idoneo elenco di fornitori terzi (abituali/storici/preferenziali/graditi/secondari/sgraditi) e/o qualificati per la programmazione degli acquisti e del fabbisogno tecnico.",
          "  * Nominare il RU (Referente Unico) per la fase di esecuzione e coordinamento con la Centrale Acquisti.",
          "  * Garantire verso i fornitori terzi la puntuale copertura economica e finanziaria degli acquisti effettuati dalla Centrale Acquisti, nei modi e alle scadenze definite dalla Centrale Acquisti.",
          "  * Garantire verso il Fornitore la puntuale copertura economica e finanziaria di tutto quanto previsto al successivo art. 4."
        ]
      },
      {
        title: "ART. 2 – DURATA, RINNOVO E RECESSO",
        paragraphs: [
          `2.1. Il presente contratto ha validità temporale dal: ${cust.contractStartDate || '...'} al: ${cust.contractEndDate || '...'}.`,
          "2.2. Salvo disdetta o recesso potrà essere tacitamente rinnovato per la stessa durata senza necessità di formali comunicazioni.",
          "2.3. Ciascuna delle parti potrà recedere dal presente contratto mediante comunicazione scritta da inviarsi tramite PEC o raccomandata A/R con un preavviso obbligatorio non inferiore a 60 (sessanta) giorni. In caso di recesso, il Cliente resta obbligato al saldo di tutte le prestazioni già rese e delle fee maturate fino alla data di effettiva cessazione del rapporto."
        ]
      },
      {
        title: "ART. 3 – REGIME DI ESCLUSIVA E PENALE PER VIOLAZIONE",
        paragraphs: [
          "3.1. Per tutta la durata del presente accordo, il Cliente si impegna ad affidare in via esclusiva la gestione dei propri acquisti alla Centrale Acquisti.",
          "3.2. È fatto espresso divieto al Cliente di concludere accordi di acquisto per beni o servizi rientranti nel perimetro del presente contratto o ulteriori accordi di servizio finalizzati all'ottenimento degli obiettivi di cui all'art. 1, senza l'intermediazione del Fornitore.",
          "3.3. In caso di violazione del predetto obbligo di esclusiva, il Cliente sarà tenuto a corrispondere ad EASYBUY, a titolo di penale ex art. 1382 c.c., una somma pari al 20% del valore di ogni acquisto effettuato in violazione, fatto salvo il diritto del Fornitore al risarcimento del maggior danno e alla risoluzione del contratto per inadempimento."
        ]
      },
      {
        title: "ART. 4 – CORRISPETTIVI E SPESE, MODALITÀ E TERMINI DI PAGAMENTO, MODIFICHE",
        paragraphs: [
          "4.1. Per i servizi prestati, le parti concordano le seguenti condizioni economiche:",
          "  CORRISPETTIVI (FEE), MODALITÀ E TERMINI",
          `    * Importi: € ${formattedFee}`,
          `    * Da corrispondere: [[${hasMonthlyFee ? 'X' : ' '}]] mensilmente`,
          `      [[${!hasMonthlyFee ? 'X' : ' '}]] in Unica Soluzione per il periodo di riferimento.`,
          `    * Modalità e Termini: ${centralPayStr}`,
          "  SPESE PER L'ESECUZIONE DEL SERVIZIO, MODALITÀ E TERMINI",
          `    * Importi: nel limite di € ${formattedExpenseBudget} / ${cust.expenseFrequency || 'mese'}`,
          `    * Da corrispondere: [[${cust.expensePreventivo ? 'X' : ' '}]] a preventivo ${cust.expensePreventivoText ? cust.expensePreventivoText : ''}`,
          `      [[${cust.expenseConsuntivo ? 'X' : ' '}]] a consuntivo ${cust.expenseConsuntivoText ? cust.expenseConsuntivoText : ''}`,
          `    * Modalità e Termini: ${centralPayStr}`,
          "4.2. Salvo possibili conguagli, revisioni o modifiche (tempestivamente comunicati al Cliente), corrispettivi e spese ivi pattuiti saranno fatturati dal Fornitore con i modi, nei termini e per gli importi qui sopra definiti e saranno pagati dal Cliente previa ricezione di apposite fatture emesse dal Fornitore."
        ]
      },
      {
        title: "ART. 5 – METRICHE TECNICHE DI SAVING (KPI)",
        paragraphs: [
          "L'efficacia della gestione sarà monitorata sulla base dei seguenti \"indicatori\" Key Performance Indicators (KPI) concordati con il Cliente:",
          "[TABLE]|Parametro di Misurazione|Descrizione|Frequenza\nDelta Prezzo (Saving)|Differenza tra Prezzo Target (storico/mercato) e Prezzo d'Acquisto EASYBUY|Monitoraggio trimestrale\nEfficienza Scorte|Riduzione dell'indice di invenduto e ottimizzazione rotazione stock|Monitoraggio semestrale\nQualità Fornitura|Rapporto tra conformità tecnica dei beni e ordini eseguiti|Monitoraggio periodico concordato"
        ]
      },
      {
        title: "ART. 6 – PENALI",
        paragraphs: [
          "6.1. Il Fornitore garantisce la diligenza professionale nel perseguimento dei livelli di saving concordati.",
          `6.2. Qualora il saving accertato in sede di monitoraggio trimestrale risulti inferiore al ${cust.savingTarget || '[...]'}% rispetto ai parametri target, per cause direttamente ed esclusivamente imputabili a negligenza del Fornitore, quest'ultimo applicherà una riduzione proporzionale del ${cust.penaltyReduction || '[...]'}% sulla Fee professionale dovuta per il periodo di fatturazione successivo, a titolo di indennizzo per il mancato raggiungimento degli obiettivi minimi di efficienza.`
        ]
      },
      {
        title: "ART. 7 – CLAUSOLA NDA E SEGRETO INDUSTRIALE",
        paragraphs: [
          "7.1. Il Cliente riconosce che la piattaforma, le strategie negoziali, i listini riservati e le analisi di mercato costituiscono segreto industriale (Artt. 98-99 D.Lgs. 30/2005) di proprietà di EASYBUY.",
          "7.2. Il Cliente si impegna a non divulgare tali informazioni e a utilizzarle esclusivamente per l'esecuzione del presente contratto. La violazione di tale obbligo comporterà la risoluzione di diritto del contratto e l'obbligo di risarcimento del danno emergente e del lucro cessante."
        ]
      },
      {
        title: "ART. 8 – PRIVACY E RESPONSABILE DEL TRATTAMENTO (GDPR)",
        paragraphs: [
          "Ai sensi del Regolamento UE 2016/679, il Cliente, in qualità di Titolare, nomina espressamente EASYBUY quale Responsabile del Trattamento dei dati necessari all'esecuzione del servizio. Il Responsabile opererà conformemente alle istruzioni impartite dal Titolare e alle normative vigenti in materia di sicurezza dei dati."
        ]
      },
      {
        title: "ART. 9 – FORO COMPETENTE",
        paragraphs: [
          "Per ogni controversia relativa alla validità, interpretazione, esecuzione o risoluzione del presente contratto, le parti stabiliscono la competenza esclusiva ed inderogabile del Foro di Bari (BA)."
        ]
      }
    ];

    articles.forEach(art => {
      // 1. ESTIMATE ARTICLE HEIGHT (including Table if any)
      let estHeight = 8; 
      art.paragraphs.forEach(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('[TABLE]')) {
          const rows = trimmed.split('\n').length;
          estHeight += (rows * 8) + 15;
        } else {
          const isBullet = trimmed.startsWith('*');
          // Match the indent used during text split:
          const contentWidth = pageWidth - (margin * 2) - (isBullet ? 5 : 0);
          const textToSplit = trimmed.replace(/^[\s*]+/, ''); // remove bullet for length
          const lines = doc.splitTextToSize(textToSplit, contentWidth).length;
          const gap = isBullet ? 1 : 1.5;
          estHeight += (lines * 4) + gap;
        }
      });
      estHeight += 1.5;

      const pageBottomLimit = pageHeight - 15;
      const remainingSpace = pageBottomLimit - currentY;
      
      const isArt1 = art.title.includes("ART. 1");
      const isArt2 = art.title.includes("ART. 2");
      const isArt3 = art.title.includes("ART. 3");
      const isArt4 = art.title.includes("ART. 4");
      const isArt5 = art.title.includes("ART. 5");

      // FORCED MILESTONE FOR ART 5 OR STANDARD OVERFLOW
      if (isArt5) {
          doc.addPage();
          currentY = reapplyMinimalHeader() + 10;
      } else if (!isArt1 && !isArt2 && !isArt3 && !isArt4 && ((estHeight > remainingSpace && estHeight < (pageHeight - 60)) || remainingSpace < 20)) {
          doc.addPage();
          currentY = reapplyMinimalHeader() + 10;
      }

      doc.setFont(FONT_FAMILY, 'bold');
      doc.setFontSize(SECTION_SIZE);
      doc.text(art.title, margin, currentY);
      currentY += 7;

      doc.setFont(FONT_FAMILY, 'normal');
      doc.setFontSize(BODY_SIZE);
      art.paragraphs.forEach((p) => {
        const trimmed = p.trim();
        
        // MANUAL FORCED PAGE BREAK FOR PARAGRAPH 1.5
        if (art.title.includes("ART. 1") && trimmed.startsWith("1.5.")) {
            doc.addPage();
            currentY = reapplyMinimalHeader() + 10;
            doc.setFont(FONT_FAMILY, 'normal');
            doc.setFontSize(BODY_SIZE);
        }

        const leadingSpaces = p.match(/^\s*/)?.[0].length || 0;

        if (trimmed.startsWith('[TABLE]')) {
           const rows = trimmed.split('\n');
           const headers = [rows[0].replace('[TABLE]', '').split('|').filter(s => s.trim() !== '')];
           const data = rows.slice(1).map(row => row.split('|'));

           autoTable(doc, {
              startY: currentY,
              head: headers,
              body: data,
              theme: 'grid',
              styles: { fontSize: 8, cellPadding: 3 },
              headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: 'bold' },
              margin: { top: 40, bottom: 25, left: margin, right: margin },
              didDrawPage: () => {
                reapplyMinimalHeader();
              }
           });
           currentY = (doc as any).lastAutoTable.finalY + 8;
           return;
        }
        
        const isNumbered = /^\d+\.\d+\.?/.test(trimmed);
        const isBulletStar = trimmed.startsWith('*');
        const isBulletDash = trimmed.startsWith('-');
        const isBullet = isBulletStar || isBulletDash;
        const hasCheckbox = trimmed.includes('[[X]]') || trimmed.includes('[[ ]]');
        
        let textX = margin;
        let contentWidth = pageWidth - (margin * 2);

        if (isNumbered) {
          textX = margin + 10;
          contentWidth -= 10;
        } else if (isBullet) {
          textX = margin + 18;
          contentWidth -= 18;
        } else if (leadingSpaces > 2 || (hasCheckbox && !isBullet)) {
          textX = margin + 18;
          contentWidth -= 18;
        }
        
        if (hasCheckbox) contentWidth -= 35;

        let textToSplit = isBullet ? trimmed.substring(1).trim() : trimmed;
        let lineLabel = "";
        
        if (hasCheckbox) {
          textToSplit = textToSplit.replace('[[X]]', '').replace('[[ ]]', '').trim();
          if (textToSplit.startsWith("Scadenze:")) {
            lineLabel = "Scadenze: ";
            textToSplit = textToSplit.replace("Scadenze:", "").trim();
          } else if (textToSplit.startsWith("Da corrispondere:")) {
            lineLabel = "Da corrispondere: ";
            textToSplit = textToSplit.replace("Da corrispondere:", "").trim();
          }
        }

        const splitP = doc.splitTextToSize(textToSplit, contentWidth);
        const paragraphHeight = (splitP.length * 4);
        const limitCurrentY = art.title.includes("ART. 4") ? pageHeight - 5 : pageBottomLimit;
        if (currentY + paragraphHeight > limitCurrentY) {
          doc.addPage();
          currentY = reapplyMinimalHeader() + 10;
          doc.setFont(FONT_FAMILY, 'normal');
          doc.setFontSize(BODY_SIZE);
        }

        if (isBullet) {
          doc.setFont(FONT_FAMILY, 'bold');
          doc.text(isBulletStar ? "•" : "–", margin + 14, currentY);
          doc.setFont(FONT_FAMILY, 'normal');
        }

        if (hasCheckbox) {
          const isChecked = trimmed.includes('[[X]]');
          const boxSize = 3;
          const fixedBoxX = margin + 50;
          if (lineLabel) doc.text(lineLabel, textX, currentY);
          const boxY = currentY - 2.5;
          doc.setDrawColor(150);
          doc.rect(fixedBoxX, boxY, boxSize, boxSize);
          if (isChecked) {
            doc.line(fixedBoxX, boxY, fixedBoxX + boxSize, boxY + boxSize);
            doc.line(fixedBoxX + boxSize, boxY, fixedBoxX, boxY + boxSize);
          }
          doc.text(splitP, fixedBoxX + 5, currentY);
        } else {
          doc.text(splitP, textX, currentY, { align: 'justify', maxWidth: contentWidth });
        }
        const gap = isBullet ? 1 : 1.5;
        currentY += (splitP.length * 4) + gap;
      });
      currentY += 1.5; 
    });

    // 4. SOTTOSCRIZIONE
    let signatureY = currentY + 6;
    if (signatureY > pageHeight - 15) {
      doc.addPage();
      signatureY = reapplyMinimalHeader() + 10;
    }

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(SECTION_SIZE);
    doc.text("SOTTOSCRIZIONE", pageWidth / 2, signatureY, { align: 'center' });
    signatureY += 7;
    
    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(BODY_SIZE);
    doc.text(`Luogo e data: ${adminProfile?.city || 'Bari'}, ${new Date().toLocaleDateString('it-IT')}`, margin, signatureY);
    signatureY += 15;

    const colWidthSize = (pageWidth - (margin * 2)) / 2;
    
    // EASYBUY (Left)
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text("EASYBUY", margin, signatureY);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.text("L'Amministratore", margin, signatureY + 5);
    doc.text("Vito Loiudice", margin, signatureY + 10);
    doc.line(margin, signatureY + 25, margin + 60, signatureY + 25);

    // CLIENTE (Right)
    const signRightX = margin + colWidthSize + 5;
    doc.setFont(FONT_FAMILY, 'bold');
    doc.text("(Timbro e Firma)", signRightX, signatureY);
    doc.text(`${cust.name}`, signRightX, signatureY + 5);
    doc.setFont(FONT_FAMILY, 'normal');
    doc.text("L'Amministratore", signRightX, signatureY + 10);
    doc.line(signRightX, signatureY + 25, signRightX + 60, signatureY + 25);

    // 5. APPROVAZIONE VESSATORIE
    doc.addPage();
    currentY = reapplyMinimalHeader() + 10;

    doc.setFont(FONT_FAMILY, 'bold');
    doc.setFontSize(DETAIL_SIZE);
    doc.text("APPROVAZIONE SPECIFICA DELLE CLAUSOLE VESSATORIE", pageWidth / 2, currentY, { align: 'center' });
    currentY += 8;

    doc.setFont(FONT_FAMILY, 'normal');
    doc.setFontSize(BODY_SIZE - 0.5);
    const vexText = `Ai sensi e per gli effetti degli artt. 1341 e 1342 del Codice Civile, il Cliente dichiara di aver letto attentamente e di approvare specificamente i seguenti articoli: Art. 2.2 (Rinnovo e recesso); Art. 3 (Regime di esclusiva e penale del 20%); Art. 6 (Penali per mancato saving); Art. 7 (Segreto industriale e risoluzione); Art. 9 (Foro competente esclusivo di Bari).`;
    const splitVexLines = doc.splitTextToSize(vexText, pageWidth - (margin * 2));
    doc.text(splitVexLines, margin, currentY);
    currentY += (splitVexLines.length * 4) + 10;

    doc.setFont(FONT_FAMILY, 'bold');
    doc.text(`${cust.name} (L'Amministratore)`, signRightX, currentY);
    doc.line(signRightX, currentY + 10, signRightX + 60, currentY + 10);

    applyPageFooter(doc, "MOD-CTR-01 REV. 02", adminProfile);

    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await persistGeneratedDocument({
        doc_tipo: 'REPORT_ANALYTICS',
        doc_num: docNum,
        doc_data: new Date().toISOString(),
        doc_ref_id: cust.id,
        doc_ref_type: 'CLIENT',
        pdf_backup_url: pdfBase64
      });
    } catch (err) {
      console.error("Failed to backup Contract PDF:", err);
    }

    doc.save(`Contratto_${cust.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleExportSupplierPDF = async (sup: Supplier) => {
    const doc = new jsPDF();
    const { margin, primaryColor, secondaryColor } = PDF_CONFIG;
    const pageWidth = doc.internal.pageSize.getWidth();

    let docNum = `CTR-SUP-PENDING`;
    try {
      const nextNum = await getNextDocumentNumber('REPORT_ANALYTICS');
      docNum = `SUP-${nextNum}`;
    } catch (err) {
      console.error("Error generating supplier contract doc number:", err);
    }
    
    const docNumStr = `SUP-${docNum.split('-').pop()}`; // Keep generated number
    const docTitle = "ACCORDO DI FORNITURA";
    const recipientName = sup.name;

    const reapplyMinimalHeader = () => {
      return applyMinimalHeader(doc, adminProfile);
    };

    // 1. Header & Metadata (First Page Full)
    const lineY = reapplyMinimalHeader();
    const startY = applyDocumentMetadata(doc, docTitle, recipientName, docNumStr, lineY);

    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("Oggetto: Partnership per la Fornitura Centralizzata", margin, startY);

    doc.setFontSize(10);
    let currentY = startY + 15;

    // Body text
    const introText = `Il presente accordo costituisce l'oggetto della collaborazione tra ${adminProfile?.companyName || 'Centrale Acquisti'} ed il fornitore ${sup.name} al fine di raggiungere obiettivi di reciproco vantaggio.`;
    const splitIntro = doc.splitTextToSize(introText, pageWidth - (margin * 2));
    doc.text(splitIntro, margin, currentY);
    currentY += (splitIntro.length * 4);

    // Supplier Details
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text("Dettagli Fornitore:", margin, currentY);
    doc.setFont(doc.getFont().fontName, 'normal');
    currentY += 6;
    doc.text(`- Ragione Sociale: ${sup.name}`, margin + 5, currentY);
    currentY += 5;
    doc.text(`- Email: ${sup.email}`, margin + 5, currentY);
    currentY += 5;
    doc.text(`- Termini di Pagamento: ${sup.paymentTerms}`, margin + 5, currentY);
    currentY += 10;

    // General Terms
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text("Termini e Condizioni di Partnership:", margin, currentY);
    doc.setFont(doc.getFont().fontName, 'normal');
    currentY += 6;
    
    const terms = [
        "Il Fornitore si impegna a garantire la massima priorità nell'evasione degli ordini pervenuti tramite la Centrale Acquisti EB-Pro.",
        "Il Fornitore si impegna ad applicare ai Clienti Finali le migliori condizioni economiche e di servizio target concordate attraverso la Centrale Acquisti.",
        "Il Fornitore collaborerà attivamente per il monitoraggio e l'ottimizzazione dei livelli di scorte e per garantire la continuità del servizio.",
        "È fatto obbligo al Fornitore di fornire report periodici sulle performance di fornitura e sui livelli di servizio (SLA) raggiunti.",
        "Il Fornitore parteciperà attivamente alle iniziative di saving e di miglioramento quali-quantitativo promosse dalla Centrale Acquisti.",
        "La Centrale Acquisti garantisce al Fornitore la visibilità dei fabbisogni e canali privilegiati per la negoziazione centralizzata."
    ];

    terms.forEach(line => {
        const splitLine = doc.splitTextToSize(line, doc.internal.pageSize.width - (margin * 2) - 10);
        doc.setLineWidth(0.05);
        doc.text("•", margin + 2, currentY);
        doc.text(splitLine, margin + 5, currentY);
        currentY += (splitLine.length * 4) + 2;
    });

    // Signature Area
    const signatureY = 240;
    
    // Left: EB-Pro
    doc.setFontSize(10);
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text("EasyBuy", margin, signatureY);
    doc.setFont(doc.getFont().fontName, 'normal');
    doc.text("L'amministratore", margin, signatureY + 5);
    doc.text("Vito Loiudice", margin, signatureY + 10);
    doc.line(margin, signatureY + 25, margin + 60, signatureY + 25);

    // Right: Supplier
    const rightX = pageWidth - margin - 60;
    doc.setFont(doc.getFont().fontName, 'bold');
    doc.text("Timbro e Firma Fornitore", rightX, signatureY);
    doc.setFont(doc.getFont().fontName, 'normal');
    doc.text(sup.name, rightX, signatureY + 5);
    doc.text("L'Amministratore", rightX, signatureY + 10);
    doc.line(rightX, signatureY + 25, pageWidth - margin, signatureY + 25);

    applyPageFooter(doc, "MOD-FOR-01 REV. 01", adminProfile);

    // PERSISTENCE & BACKUP
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await persistGeneratedDocument({
        doc_tipo: 'REPORT_ANALYTICS',
        doc_num: docNum,
        doc_data: new Date().toISOString(),
        doc_ref_id: sup.id,
        doc_ref_type: 'SUPPLIER',
        pdf_backup_url: pdfBase64
      });
    } catch (err) {
      console.error("Failed to backup Supplier Contract PDF:", err);
    }

    doc.save(`Accordo_Fornitore_${sup.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  const handleExportInvoicePDF = async (cust: Customer) => {
    const doc = new jsPDF();
    const { margin, primaryColor } = PDF_CONFIG;

    let docNum = `FT-PENDING`;
    try {
      const nextNum = await getNextDocumentNumber('ORDINE_ACQUISTO');
      docNum = `FT-${new Date().getFullYear()}-${nextNum}`;
    } catch (err) {
      console.error("Error generating invoice doc number:", err);
    }
    
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

    // PERSISTENCE & BACKUP
    try {
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      await persistGeneratedDocument({
        doc_tipo: 'ORDINE_ACQUISTO',
        doc_num: docNum,
        doc_data: new Date().toISOString(),
        doc_ref_id: cust.id,
        doc_ref_type: 'CLIENT',
        pdf_backup_url: pdfBase64
      });
    } catch (err) {
      console.error("Failed to backup Invoice PDF:", err);
    }

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
                          <th className="p-4">Stato</th>
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
                      <div className="flex justify-center gap-1">
                        <button 
                            onClick={() => handleExportSupplierPDF(sup)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Contratto"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleEdit(sup)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title="Modifica"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                      </div>
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
                    <td className="p-4 text-slate-600 text-xs font-bold uppercase tracking-tighter">{cust.region}{cust.province ? ` (${cust.province})` : ''}</td>
                    <td className="p-4 hidden lg:table-cell text-slate-500 text-xs">{formatCustomerPayments(cust)}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1">
                        <button 
                            onClick={() => handleOpenContractModal(cust)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Gestione Contratti"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleExportContractPDF(cust)}
                            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded transition-colors"
                            title="Esporta PDF Contratto"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </button>
                        <button 
                            onClick={() => handleEdit(cust)}
                            className="p-1.5 text-slate-400 hover:bg-slate-50 rounded transition-colors"
                            title="Modifica Anagrafica"
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

    <ServiceContractModal 
        isOpen={isContractModalOpen}
        onClose={() => setIsContractModalOpen(false)}
        customer={editingEntity}
        onSave={handleSaveContract}
      />

      <div className="flex justify-end space-x-3">
        {activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS' && (
          <div className="flex space-x-3 mr-4 border-r border-slate-300 pr-4">
            <input 
              type="file" 
              accept=".pdf,image/*" 
              className="hidden" 
              ref={smartImportInputRef} 
              onChange={handleSmartImport} 
            />
            <Tooltip position="bottom" content={{ title: "Smart Import AI", description: "Carica un PDF o un'immagine datasheet/blueprint per far estrarre automaticamente i dati articolo all'intelligenza artificiale.", usage: "Clicca, scegli un PDF/Immagine e aspetta l'analisi." }}>
              <button 
                  onClick={() => smartImportInputRef.current?.click()}
                  disabled={isSmartImporting}
                  className={`neu-btn px-4 py-2.5 flex items-center gap-2 ${isSmartImporting ? 'text-slate-400 bg-slate-100 cursor-not-allowed' : 'text-purple-600 font-bold hover:bg-purple-50'}`}
              >
                  {isSmartImporting ? (
                    <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  {isSmartImporting ? 'Analisi in corso...' : 'Smart Import AI'}
              </button>
            </Tooltip>
          </div>
        )}
        {((activeMainTab === 'ARTICOLI' && activeSubTab === 'ITEMS') || activeMainTab === 'SUPPLIERS') && (
          <div className="flex space-x-3 mr-4 border-r border-slate-300 pr-4">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImportExcel} 
            />
            <Tooltip position="bottom" content={{ title: "Importa", description: "Carica un file Excel per caricare o aggiornare massivamente i dati.", usage: "Clicca per selezionare il file dal tuo computer." }}>
              <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="neu-btn px-4 py-2.5 text-slate-600 flex items-center gap-2"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Importa
              </button>
            </Tooltip>
            <Tooltip position="bottom" content={{ title: "Esporta", description: "Scarica l'intera lista in formato Excel per un uso esterno o backup.", usage: "Clicca per avviare il download." }}>
              <button 
                  onClick={handleExportExcel}
                  className="neu-btn px-4 py-2.5 text-slate-600 flex items-center gap-2"
              >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Esporta
              </button>
            </Tooltip>
          </div>
        )}
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
