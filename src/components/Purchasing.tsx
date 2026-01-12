
import React, { useState, useEffect } from 'react';
import { PurchaseOrder, Part, MrpProposal, AdminProfile } from '../types';
import { fetchOrders, addOrder, updateOrder, fetchParts, fetchMrpProposals, deleteMrpProposal, AVAILABLE_TENANTS, fetchAdminProfile } from '../services/dataService';

interface PurchasingProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const Purchasing: React.FC<PurchasingProps> = ({ tenantId, isMultiTenant }) => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [mrpProposals, setMrpProposals] = useState<MrpProposal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Admin Profile for Emails
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // SELECTION STATE
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // State for "New Order" Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // State for "MRP Conversion" Modal
  const [mrpModal, setMrpModal] = useState<{isOpen: boolean, proposal: MrpProposal | null}>({
      isOpen: false,
      proposal: null
  });

  // State for "Edit Order" Modal
  const [editModal, setEditModal] = useState<{isOpen: boolean, order: PurchaseOrder | null}>({
      isOpen: false,
      order: null
  });
  
  // Tab State for Edit Modal
  const [editTab, setEditTab] = useState<'details' | 'commercial' | 'logistics'>('details');
  // State for splitting logic
  const [splitQty, setSplitQty] = useState(0);
  const [splitDate, setSplitDate] = useState('');

  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    vendor: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    items: 1,
    status: 'Open' as const,
    partId: '' // Track part ID for later pricing updates
  });

  const refreshData = async () => {
    setLoading(true);
    const effectiveFilter = isMultiTenant ? 'all' : tenantId;
    const [ordersData, partsData, mrpData, adminData] = await Promise.all([
        fetchOrders(effectiveFilter), 
        fetchParts(effectiveFilter),
        fetchMrpProposals(effectiveFilter),
        fetchAdminProfile()
    ]);
    setOrders(ordersData);
    setParts(partsData);
    setMrpProposals(mrpData.filter(p => p.status === 'Pending')); // Only show pending proposals
    setAdminProfile(adminData);
    setLoading(false);
    setSelectedOrderIds(new Set()); // Reset selection on refresh
  };

  useEffect(() => {
    refreshData();
  }, [tenantId, isMultiTenant]);

  // --- SELECTION LOGIC ---
  const toggleSelectAll = () => {
      if (selectedOrderIds.size === orders.length) {
          setSelectedOrderIds(new Set());
      } else {
          setSelectedOrderIds(new Set(orders.map(o => o.id)));
      }
  };

  const toggleSelectOrder = (id: string) => {
      const newSet = new Set(selectedOrderIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedOrderIds(newSet);
  };

  // --- BULK ACTIONS ---
  const handleBulkApprove = async () => {
      if (!confirm(`Vuoi approvare ${selectedOrderIds.size} ordini selezionati?`)) return;

      const updates = orders
        .filter(o => selectedOrderIds.has(o.id))
        .map(o => ({ ...o, status: 'Open' as const })); // Approve to Open directly

      // Update locally and persist
      for (const updatedOrder of updates) {
          await updateOrder(updatedOrder);
      }
      
      refreshData();
      alert("Ordini approvati con successo.");
  };

  const handleBulkSendEmail = async () => {
      const selected = orders.filter(o => selectedOrderIds.has(o.id));
      const validToSend = selected.filter(o => o.status === 'Open' || o.status === 'Approved');
      
      if (validToSend.length === 0) {
          alert("Nessuno degli ordini selezionati è in stato 'Open' o 'Approved' per l'invio.");
          return;
      }

      alert("⚠️ Attenzione: La funzione di invio massivo richiede un'integrazione Backend SMTP (es. SendGrid) per inviare email separate. \n\nUsa il tasto 'Invio' singolo (aeroplanino) per aprire il tuo client di posta locale.");
  };

  const handleSingleSendEmail = (order: PurchaseOrder) => {
      if (!adminProfile) {
          alert("Configura prima il profilo Admin nelle Impostazioni.");
          return;
      }

      // 1. Determine Recipient Email (Mock Logic: order@vendorname.com)
      const vendorSafe = order.vendor.replace(/\s+/g, '').toLowerCase();
      const recipientEmail = `ordini@${vendorSafe}.com`;

      // 2. Construct Subject
      const subject = `Nuovo Ordine di Acquisto: ${order.customId || order.id} - ${adminProfile.companyName}`;

      // 3. Construct Body
      const body = `Spett.le ${order.vendor},

Con la presente inviamo il nostro ordine nr. ${order.customId || order.id} del ${order.date}.

Dettagli Ordine:
---------------------------------------------
Oggetto: ${order.description}
Quantità: ${order.items}
Importo Stimato: € ${order.amount.toLocaleString()}
Data Consegna Richiesta: ${order.deliveryDate || order.date}
Luogo di Consegna: ${order.logistics?.destination || adminProfile.address}
---------------------------------------------

In attesa di vostra conferma d'ordine e data di spedizione.

Cordiali Saluti,

${adminProfile.companyName}
${adminProfile.address}
P.IVA: ${adminProfile.vatNumber}
Tel: ${adminProfile.phone}
Email: ${adminProfile.email}`;

      // 4. Open Mail Client
      window.location.href = `mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // --- EXISTING HANDLERS ---

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Clipboard vuota!");
      
      const rows = text.split('\n');
      let count = 0;
      
      for (const row of rows) {
          const cols = row.split(/[\t,]+/);
          if (cols.length >= 2) {
              await addOrder({
                  tenantId: isMultiTenant ? 'main' : tenantId, // Default to main if in multi-view
                  vendor: cols[0].trim(),
                  description: 'Importato da Excel',
                  date: new Date().toISOString().split('T')[0],
                  amount: parseFloat(cols[1].replace(/[^0-9.]/g, '')) || 0,
                  status: 'Pending Approval',
                  items: parseInt(cols[2]) || 1,
                  customId: `IMP-${Date.now()}-${count}`
              });
              count++;
          }
      }
      
      alert(`Importati ${count} ordini dalla clipboard.`);
      refreshData();
    } catch (err) {
      alert("Errore accesso clipboard o formato non valido.");
      console.error(err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMultiTenant) {
        alert("Attenzione: In modalità Multi-Tenant, l'ordine verrà creato sul Tenant 'Main Corp' di default.");
    }
    await addOrder({
        tenantId: isMultiTenant ? 'main' : tenantId,
        vendor: newOrder.vendor,
        description: newOrder.description || 'Ordine Manuale',
        date: newOrder.date,
        deliveryDate: newOrder.date, // Default delivery same as order
        amount: Number(newOrder.amount),
        items: Number(newOrder.items),
        status: newOrder.status,
        partId: newOrder.partId // Save link to part
    });
    setIsModalOpen(false);
    setNewOrder({ vendor: '', description: '', date: new Date().toISOString().split('T')[0], amount: 0, items: 1, status: 'Open', partId: '' });
    refreshData();
  };

  // STEP 1: Open Modal instead of confirm()
  const handleConvertMrp = (proposal: MrpProposal) => {
      console.log("👉 [Purchasing] Apertura modale conferma per:", proposal.id);
      setMrpModal({ isOpen: true, proposal });
  };

  // STEP 2: Execute Logic inside Modal Context
  const executeMrpConversion = async () => {
      const proposal = mrpModal.proposal;
      if (!proposal) return;

      try {
          console.log("🚀 [Purchasing] Inizio conversione proposta:", proposal.id);
          
          const orderPayload = {
              tenantId: proposal.tenantId,
              vendor: proposal.suggestedVendor,
              description: `MRP: ${proposal.partSku} - ${proposal.description}`,
              date: new Date().toISOString().split('T')[0],
              deliveryDate: proposal.orderByDate, // Use MRP optimized date
              amount: proposal.estimatedCost,
              items: proposal.missingQty,
              status: 'Pending Approval' as const,
              partId: proposal.partId // Important linkage
          };
          
          await addOrder(orderPayload);
          console.log("✅ [Purchasing] Ordine creato DB.");

          await deleteMrpProposal(proposal.id);
          console.log("🗑️ [Purchasing] Proposta eliminata.");
          
          await refreshData();
          console.log("🔄 [Purchasing] Dati aggiornati.");

          // Close Modal
          setMrpModal({ isOpen: false, proposal: null });
      } catch (error) {
          console.error("🔥 [Purchasing] Errore critico:", error);
          alert("Errore durante la generazione dell'ordine.");
      }
  };

  // --- EDITING LOGIC ---

  const handleEditClick = (order: PurchaseOrder) => {
      setEditModal({ isOpen: true, order: { ...order } }); // Clone to avoid direct mutation
      setEditTab('details');
      setSplitQty(0);
      setSplitDate('');
  };

  const handleEditSave = async () => {
      if (!editModal.order) return;
      await updateOrder(editModal.order);
      setEditModal({ isOpen: false, order: null });
      refreshData();
  };

  const handleVendorChange = (newVendor: string) => {
      if (!editModal.order) return;
      
      const updatedOrder = { ...editModal.order, vendor: newVendor };

      // Dynamic Price Update Logic
      if (updatedOrder.partId) {
          const part = parts.find(p => p.id === updatedOrder.partId);
          if (part) {
              let newPrice = 0;
              // Check habitual
              if (part.suppliers?.habitual?.name === newVendor) {
                  newPrice = part.suppliers.habitual.price;
              } else {
                  // Check alternatives
                  const alt = part.suppliers?.alternatives?.find(a => a.name === newVendor);
                  if (alt) newPrice = alt.price;
                  else if (part.manufacturer?.name === newVendor) newPrice = part.manufacturer.price;
              }

              if (newPrice > 0) {
                  updatedOrder.amount = newPrice * updatedOrder.items;
                  alert(`Prezzo aggiornato automaticamente in base al listino fornitore: €${newPrice}/pz`);
              }
          }
      }
      
      setEditModal({ ...editModal, order: updatedOrder });
  };

  // --- SPLIT LOGIC ---
  const handleSplitOrder = async () => {
      if (!editModal.order || splitQty <= 0 || !splitDate) {
          alert("Inserisci una quantità valida e una data per il frazionamento.");
          return;
      }

      if (splitQty >= editModal.order.items) {
          alert("La quantità frazionata deve essere inferiore alla quantità totale dell'ordine.");
          return;
      }

      const originalOrder = editModal.order;
      const unitPrice = originalOrder.amount / originalOrder.items;

      // 1. Identify Base ID and Suffixes
      const currentCustomId = originalOrder.customId || originalOrder.id;
      const dotIndex = currentCustomId.lastIndexOf('.');
      const hasSuffix = dotIndex !== -1 && /^[A-Z]$/.test(currentCustomId.substring(dotIndex + 1));
      
      const baseId = hasSuffix ? currentCustomId.substring(0, dotIndex) : currentCustomId;
      
      // 2. Determine Next Suffix
      const siblingOrders = orders.filter(o => {
          const cid = o.customId || o.id;
          return cid.startsWith(baseId);
      });

      let maxCharCode = 64; 
      siblingOrders.forEach(o => {
          const cid = o.customId || o.id;
          if (cid === baseId) return; // The root
          const suffix = cid.split('.').pop();
          if (suffix && suffix.length === 1) {
              const code = suffix.charCodeAt(0);
              if (code > maxCharCode) maxCharCode = code;
          }
      });

      let newOriginalSuffix = "";
      let newChildSuffix = "";

      if (!hasSuffix) {
          newOriginalSuffix = ".A";
          newChildSuffix = ".B";
      } else {
          newOriginalSuffix = ""; 
          newChildSuffix = `.${String.fromCharCode(maxCharCode + 1)}`;
      }

      // 3. Update Original Order
      const updatedOriginal = {
          ...originalOrder,
          customId: !hasSuffix ? `${baseId}${newOriginalSuffix}` : originalOrder.customId,
          items: originalOrder.items - splitQty,
          amount: unitPrice * (originalOrder.items - splitQty)
      };

      // 4. Create Child Order
      const childOrder = {
          tenantId: originalOrder.tenantId,
          vendor: originalOrder.vendor,
          description: originalOrder.description, 
          date: originalOrder.date, 
          deliveryDate: splitDate, 
          items: splitQty,
          amount: unitPrice * splitQty,
          status: originalOrder.status,
          partId: originalOrder.partId,
          logistics: originalOrder.logistics,
          customId: `${baseId}${newChildSuffix}`
      };

      await updateOrder(updatedOriginal);
      await addOrder(childOrder);
      
      alert(`Ordine frazionato con successo!\nOriginale: ${updatedOriginal.customId}\nNuovo: ${childOrder.customId}`);
      setEditModal({ isOpen: false, order: null });
      refreshData();
  };

  const getTenantAddresses = () => {
      const orderTenantId = editModal.order?.tenantId || (isMultiTenant ? 'main' : tenantId);
      const t = AVAILABLE_TENANTS.find(t => t.id === orderTenantId);
      if (!t || !t.details) return [];

      const options = [
          { label: `Sede Legale (${t.details.legal.address.city})`, val: `${t.details.legal.address.street}, ${t.details.legal.address.city}` },
          { label: `Sede Operativa (${t.details.operational.address.city})`, val: `${t.details.operational.address.street}, ${t.details.operational.address.city}` },
          { label: `Magazzino Principale (${t.details.warehouseMain.address.city})`, val: `${t.details.warehouseMain.address.street}, ${t.details.warehouseMain.address.city}` },
      ];
      if (t.details.warehouseSatellite.isActive) {
          options.push({ label: `Magazzino Satellite (${t.details.warehouseSatellite.address.city})`, val: `${t.details.warehouseSatellite.address.street}, ${t.details.warehouseSatellite.address.city}` });
      }
      return options;
  };

  const getPartCodes = (order: PurchaseOrder | null) => {
      if (!order || !order.partId) return { mfg: 'N/A', vendorSku: 'N/A' };
      
      const part = parts.find(p => p.id === order.partId);
      if (!part) return { mfg: 'N/A', vendorSku: 'N/A' };

      const mfg = part.manufacturer?.partCode || 'N/A';
      let vendorSku = 'N/A';

      if (part.suppliers?.habitual?.name === order.vendor) {
          vendorSku = part.suppliers.habitual.partCode;
      } else if (part.manufacturer?.name === order.vendor) {
          vendorSku = part.manufacturer.partCode;
      } else {
          const alt = part.suppliers?.alternatives?.find(a => a.name === order.vendor);
          if (alt) vendorSku = alt.partCode;
      }

      return { mfg, vendorSku };
  };

  const handlePartSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const partId = e.target.value;
    const selectedPart = parts.find(p => p.id === partId);
    if (selectedPart) {
        setNewOrder(prev => ({
            ...prev,
            partId: selectedPart.id,
            description: selectedPart.description,
            vendor: selectedPart.suppliers?.habitual?.name || selectedPart.manufacturer?.name || '',
            amount: selectedPart.cost * prev.items // Auto-calc cost assumption
        }));
    }
  };

  return (
    <div className="space-y-6 relative pb-16">
       
       {/* MODALS UNCHANGED (Only Logic Updated in handlers) */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-fade-in-up">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Nuovo Ordine di Acquisto</h3>
                <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Seleziona Articolo (Opzionale)</label>
                        <select 
                            className="mt-1 block w-full border border-slate-300 rounded-md p-2 bg-slate-50"
                            onChange={handlePartSelect}
                        >
                            <option value="">-- Seleziona SKU da Magazzino --</option>
                            {parts.map(p => (
                                <option key={p.id} value={p.id}>{p.sku} - {p.description}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Descrizione Ordine</label>
                        <input required type="text" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                            value={newOrder.description} onChange={e => setNewOrder({...newOrder, description: e.target.value})} placeholder="Es. Riordino Stagionale" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Fornitore</label>
                        <input required type="text" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                            value={newOrder.vendor} onChange={e => setNewOrder({...newOrder, vendor: e.target.value})} />
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700">Importo Totale (€)</label>
                            <input required type="number" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                                value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: Number(e.target.value)})} />
                        </div>
                        <div className="flex-1">
                             <label className="block text-sm font-medium text-slate-700">Quantità (Pz)</label>
                            <input required type="number" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                                value={newOrder.items} onChange={e => {
                                    setNewOrder(prev => ({...prev, items: Number(e.target.value)}));
                                }} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700">Data Ordine</label>
                         <input required type="date" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                            value={newOrder.date} onChange={e => setNewOrder({...newOrder, date: e.target.value})} />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-epicor-600 text-white rounded-md hover:bg-epicor-700">Crea Ordine</button>
                    </div>
                </form>
            </div>
        </div>
       )}

       {editModal.isOpen && editModal.order && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[650px] animate-fade-in-up">
                   <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
                       <div>
                           <h3 className="text-lg font-bold">Modifica Ordine: {editModal.order.customId || editModal.order.id}</h3>
                           <p className="text-xs text-slate-400">Tenant: {editModal.order.tenantId}</p>
                       </div>
                       <button onClick={() => setEditModal({isOpen: false, order: null})} className="text-slate-400 hover:text-white">✕</button>
                   </div>
                   
                   {/* Tabs */}
                   <div className="flex bg-slate-100 p-1 border-b border-slate-200">
                       <button onClick={() => setEditTab('details')} className={`flex-1 py-2 text-sm font-bold rounded ${editTab === 'details' ? 'bg-white shadow-sm text-epicor-600' : 'text-slate-500 hover:text-slate-700'}`}>Dettagli & Split</button>
                       <button onClick={() => setEditTab('commercial')} className={`flex-1 py-2 text-sm font-bold rounded ${editTab === 'commercial' ? 'bg-white shadow-sm text-epicor-600' : 'text-slate-500 hover:text-slate-700'}`}>Commerciale</button>
                       <button onClick={() => setEditTab('logistics')} className={`flex-1 py-2 text-sm font-bold rounded ${editTab === 'logistics' ? 'bg-white shadow-sm text-epicor-600' : 'text-slate-500 hover:text-slate-700'}`}>Logistica</button>
                   </div>

                   <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
                       
                       {/* TAB 1: DETAILS & SPLIT */}
                       {editTab === 'details' && (
                           <div className="space-y-6">
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Quantità Totale</label>
                                       <input type="number" className="w-full border p-2 rounded text-lg font-bold text-slate-700" 
                                            value={editModal.order.items} 
                                            onChange={e => setEditModal({...editModal, order: {...editModal.order!, items: Number(e.target.value)}})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Consegna Richiesta</label>
                                       <input type="date" className="w-full border p-2 rounded" 
                                            value={editModal.order.deliveryDate || editModal.order.date} 
                                            onChange={e => setEditModal({...editModal, order: {...editModal.order!, deliveryDate: e.target.value}})} />
                                       <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                                           <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                           </svg>
                                           Data Ordine Iniziale: <span className="font-mono ml-1 font-bold">{editModal.order.date}</span>
                                       </p>
                                   </div>
                               </div>
                               
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrizione Riga Ordine</label>
                                   <textarea className="w-full border p-2 rounded h-16"
                                        value={editModal.order.description || ''}
                                        onChange={e => setEditModal({...editModal, order: {...editModal.order!, description: e.target.value}})}
                                   />
                                   
                                   {/* CODES DISPLAY */}
                                   <div className="mt-2 p-3 bg-slate-100 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 text-xs">
                                       {(() => {
                                           const { mfg, vendorSku } = getPartCodes(editModal.order);
                                           return (
                                               <>
                                                   <div className="flex-1">
                                                       <span className="text-slate-500 block">Cod. Produttore (Master)</span>
                                                       <span className="font-mono font-bold text-slate-700">{mfg}</span>
                                                   </div>
                                                   <div className="flex-1">
                                                       <span className="text-slate-500 block">SKU Fornitore ({editModal.order.vendor})</span>
                                                       <span className="font-mono font-bold text-slate-700">{vendorSku}</span>
                                                   </div>
                                               </>
                                           );
                                       })()}
                                   </div>
                               </div>

                               {/* SPLIT SECTION */}
                               <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                   <h4 className="font-bold text-yellow-800 text-sm mb-3 flex items-center">
                                       <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                       </svg>
                                       Frazionamento Ordine (JIT)
                                   </h4>
                                   <p className="text-xs text-yellow-700 mb-3">
                                       Separa una quantità dall'ordine corrente. L'ordine originale verrà rinominato con suffisso (es. .A) e ne verrà creato uno nuovo (es. .B).
                                   </p>
                                   <div className="flex items-end gap-3">
                                       <div className="flex-1">
                                           <label className="text-xs font-bold text-slate-500">Q.tà da Separare</label>
                                           <input type="number" className="w-full border p-2 rounded text-sm" placeholder="Es. 50" value={splitQty} onChange={e => setSplitQty(Number(e.target.value))} />
                                       </div>
                                       <div className="flex-1">
                                           <label className="text-xs font-bold text-slate-500">Nuova Data Consegna</label>
                                           <input type="date" className="w-full border p-2 rounded text-sm" value={splitDate} onChange={e => setSplitDate(e.target.value)} />
                                       </div>
                                       <button onClick={handleSplitOrder} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded text-sm font-bold shadow-sm whitespace-nowrap">
                                           Applica Split
                                       </button>
                                   </div>
                               </div>
                           </div>
                       )}

                       {/* TAB 2: COMMERCIAL */}
                       {editTab === 'commercial' && (
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fornitore</label>
                                   <select className="w-full border p-2 rounded" 
                                        value={editModal.order.vendor}
                                        onChange={e => handleVendorChange(e.target.value)}
                                   >
                                       <option value={editModal.order.vendor}>{editModal.order.vendor} (Attuale)</option>
                                       {parts.map(p => {
                                           if (p.id === editModal.order!.partId) {
                                               return [
                                                   p.manufacturer?.name,
                                                   p.suppliers?.habitual?.name,
                                                   ...(p.suppliers?.alternatives?.map(a => a.name) || [])
                                               ].filter(Boolean).map(v => (
                                                   v !== editModal.order!.vendor && <option key={v} value={v}>{v}</option>
                                               ));
                                           }
                                           return null;
                                       })}
                                   </select>
                                   <p className="text-xs text-slate-400 mt-1">Modificando il fornitore il prezzo verrà ricalcolato se disponibile in anagrafica.</p>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prezzo Totale (€)</label>
                                   <input type="number" className="w-full border p-2 rounded bg-slate-100" 
                                        value={editModal.order.amount} 
                                        onChange={e => setEditModal({...editModal, order: {...editModal.order!, amount: Number(e.target.value)}})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Ordine</label>
                                   <select className="w-full border p-2 rounded" 
                                        value={editModal.order.status}
                                        onChange={e => setEditModal({...editModal, order: {...editModal.order!, status: e.target.value as any}})}
                                   >
                                       <option value="Draft">Draft</option>
                                       <option value="Pending Approval">Pending Approval</option>
                                       <option value="Approved">Approved</option>
                                       <option value="Open">Open (Sent)</option>
                                       <option value="Closed">Closed</option>
                                   </select>
                               </div>
                           </div>
                       )}

                       {/* TAB 3: LOGISTICS */}
                       {editTab === 'logistics' && (
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Luogo di Consegna Finale</label>
                                   <select 
                                        className="w-full border p-2 rounded"
                                        value={editModal.order.logistics?.destination || ''}
                                        onChange={e => setEditModal({...editModal, order: {...editModal.order!, logistics: {...editModal.order!.logistics, destination: e.target.value}}})}
                                   >
                                       <option value="">-- Seleziona Destinazione --</option>
                                       {getTenantAddresses().map((addr, idx) => (
                                           <option key={idx} value={addr.val}>{addr.label}</option>
                                       ))}
                                       <option value="Altro">Altro (Specificare nelle note)</option>
                                   </select>
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vettore (Corriere)</label>
                                       <input type="text" className="w-full border p-2 rounded" placeholder="Es. DHL, Bartolini"
                                            value={editModal.order.logistics?.carrier || ''}
                                            onChange={e => setEditModal({...editModal, order: {...editModal.order!, logistics: {...editModal.order!.logistics, carrier: e.target.value}}})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Incoterms</label>
                                       <input type="text" className="w-full border p-2 rounded" placeholder="Es. DDP, EXW"
                                            value={editModal.order.logistics?.incoterms || ''}
                                            onChange={e => setEditModal({...editModal, order: {...editModal.order!, logistics: {...editModal.order!.logistics, incoterms: e.target.value}}})} />
                                   </div>
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Note Logistiche</label>
                                   <textarea className="w-full border p-2 rounded h-24" placeholder="Istruzioni per scarico, referente..."
                                        value={editModal.order.logistics?.notes || ''}
                                        onChange={e => setEditModal({...editModal, order: {...editModal.order!, logistics: {...editModal.order!.logistics, notes: e.target.value}}})} />
                               </div>
                           </div>
                       )}

                   </div>
                   
                   <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                       <button onClick={() => setEditModal({isOpen: false, order: null})} className="px-4 py-2 border border-slate-300 rounded text-slate-600 hover:bg-slate-50">Annulla</button>
                       <button onClick={handleEditSave} className="px-4 py-2 bg-epicor-600 text-white rounded font-bold hover:bg-epicor-700 shadow-sm">Salva Modifiche</button>
                   </div>
               </div>
           </div>
       )}

       {/* MRP MODAL UNCHANGED */}
       {mrpModal.isOpen && mrpModal.proposal && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                   <div className="bg-orange-500 p-4 flex justify-between items-center text-white">
                       <h3 className="font-bold text-lg flex items-center">
                           <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                           </svg>
                           Conferma Generazione Ordine
                       </h3>
                       <button onClick={() => setMrpModal({isOpen: false, proposal: null})} className="hover:bg-orange-600 rounded-full p-1">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                           </svg>
                       </button>
                   </div>
                   
                   <div className="p-6 space-y-4">
                       <p className="text-sm text-slate-500">Stai per trasformare la seguente proposta MRP in un ordine d'acquisto effettivo:</p>
                       
                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm space-y-2">
                           <div className="flex justify-between">
                               <span className="text-slate-500">Articolo:</span>
                               <span className="font-bold text-slate-800">{mrpModal.proposal.partSku}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-500">Fornitore Suggerito:</span>
                               <span className="font-medium text-slate-700">{mrpModal.proposal.suggestedVendor}</span>
                           </div>
                           <div className="flex justify-between">
                               <span className="text-slate-500">Quantità:</span>
                               <span className="font-bold text-orange-600 text-lg">{mrpModal.proposal.missingQty}</span>
                           </div>
                           <div className="flex justify-between border-t border-slate-200 pt-2 mt-2">
                               <span className="text-slate-500">Costo Stimato:</span>
                               <span className="font-bold text-slate-800">€ {mrpModal.proposal.estimatedCost.toLocaleString()}</span>
                           </div>
                       </div>

                       <div className="bg-yellow-50 p-3 rounded text-xs text-yellow-800 border border-yellow-200">
                           <strong>Causale MRP:</strong> {mrpModal.proposal.reason}
                       </div>
                   </div>

                   <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                       <button 
                            onClick={() => setMrpModal({isOpen: false, proposal: null})}
                            className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-white transition-colors"
                        >
                           Annulla
                       </button>
                       <button 
                            onClick={executeMrpConversion}
                            className="px-4 py-2 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shadow-md transition-colors flex items-center"
                        >
                           <span>Conferma e Invia Ordine</span>
                           <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                           </svg>
                       </button>
                   </div>
               </div>
           </div>
       )}

       <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
              Gestione Ordini & MRP {isMultiTenant && <span className="text-purple-600 text-lg">(Aggregato)</span>}
          </h2>
          <p className="text-slate-500 text-sm">Transazioni Live su Database Easy Buy</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
            <button 
                onClick={handlePaste}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-md transition"
                title="Copia righe da Excel (Fornitore, Importo, Items) e clicca qui"
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Incolla da Excel
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-epicor-600 text-white rounded-md text-sm font-medium hover:bg-epicor-700 shadow-md transition"
            >
                + Nuovo Ordine
            </button>
        </div>
      </div>

      {/* MRP PROPOSALS SECTION */}
      {mrpProposals.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-fade-in-up shadow-sm">
              <h3 className="font-bold text-orange-800 text-lg mb-4 flex items-center">
                  <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Proposte d'Acquisto da MRP ({mrpProposals.length})
              </h3>
              <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                      <thead className="bg-orange-100 text-orange-800 uppercase text-xs font-bold">
                          <tr>
                              <th className="px-4 py-2 text-left">SKU</th>
                              <th className="px-4 py-2 text-left">Descrizione</th>
                              <th className="px-4 py-2 text-left">Fornitore</th>
                              <th className="px-4 py-2 text-right">Q.tà</th>
                              <th className="px-4 py-2 text-right">Stima</th>
                              <th className="px-4 py-2 text-center">Azione</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-orange-100 bg-white">
                          {mrpProposals.map(p => (
                              <tr key={p.id}>
                                  <td className="px-4 py-3 font-bold text-slate-700">{p.partSku}</td>
                                  <td className="px-4 py-3 text-slate-600">{p.description}</td>
                                  <td className="px-4 py-3 text-slate-600">{p.suggestedVendor}</td>
                                  <td className="px-4 py-3 text-right font-bold text-orange-600">{p.missingQty}</td>
                                  <td className="px-4 py-3 text-right">€ {p.estimatedCost.toLocaleString()}</td>
                                  <td className="px-4 py-3 text-center">
                                      <button 
                                        onClick={() => handleConvertMrp(p)}
                                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs px-3 py-1.5 rounded font-bold shadow-sm transition-colors"
                                      >
                                          Genera Ordine
                                      </button>
                                  </td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* EXISTING ORDERS TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <input 
                    type="text" 
                    className="block w-full pl-3 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-epicor-500 focus:border-epicor-500 sm:text-sm" 
                    placeholder="Cerca ordine, fornitore o SKU..." 
                />
            </div>
            <div className="flex space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Live Data
                </span>
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">
                    <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-epicor-600 focus:ring-epicor-500 h-4 w-4"
                        checked={orders.length > 0 && selectedOrderIds.size === orders.length}
                        onChange={toggleSelectAll}
                    />
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID Ordine</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tenant</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Descrizione / SKU</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fornitore</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Consegna</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Totale</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-slate-500">Caricamento dati...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                    <td colSpan={9} className="px-6 py-4 text-center text-slate-500">Nessun ordine trovato. Creane uno nuovo.</td>
                </tr>
              ) : (
                  orders.map((order) => (
                    <tr key={order.id} className={`hover:bg-slate-50 transition-colors ${selectedOrderIds.has(order.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-6 py-4">
                            <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-epicor-600 focus:ring-epicor-500 h-4 w-4"
                                checked={selectedOrderIds.has(order.id)}
                                onChange={() => toggleSelectOrder(order.id)}
                            />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-epicor-600 cursor-pointer hover:underline" onClick={() => handleEditClick(order)}>
                            {order.customId || order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-400 uppercase">{order.tenantId}</td>
                        <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                            {order.description || 'N/A'}
                            <div className="text-xs text-slate-500">{order.items} pezzi</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{order.vendor}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                            {order.deliveryDate || order.date}
                            {order.deliveryDate && order.deliveryDate !== order.date && <span className="text-[10px] bg-blue-50 text-blue-600 px-1 ml-1 rounded">REQ</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">€ {order.amount.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                ${order.status === 'Open' ? 'bg-green-100 text-green-800' : 
                                order.status === 'Closed' ? 'bg-slate-100 text-slate-800' : 
                                'bg-yellow-100 text-yellow-800'}`}>
                            {order.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end space-x-2">
                             <button 
                                onClick={() => handleEditClick(order)}
                                className="text-slate-400 hover:text-epicor-600 transition-colors"
                                title="Modifica Ordine"
                             >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                             </button>
                             {/* SEND BUTTON - Only if Open or Approved */}
                             {(order.status === 'Open' || order.status === 'Approved') && (
                                 <button
                                    onClick={() => handleSingleSendEmail(order)}
                                    className="text-slate-400 hover:text-green-600 transition-colors"
                                    title="Invia Ordine a Fornitore (Client Posta)"
                                 >
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9-2-9-18-9 18 9-2zm0 0v-8" />
                                     </svg>
                                 </button>
                             )}
                        </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK ACTION BAR */}
      {selectedOrderIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl z-40 flex items-center space-x-6 animate-fade-in-up">
              <span className="font-bold text-sm">{selectedOrderIds.size} Ordini Selezionati</span>
              <div className="h-4 w-px bg-slate-600"></div>
              <button 
                onClick={handleBulkApprove}
                className="text-sm font-medium hover:text-green-400 flex items-center transition-colors"
              >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approva Selezionati
              </button>
              <button 
                onClick={handleBulkSendEmail}
                className="text-sm font-medium hover:text-blue-400 flex items-center transition-colors"
              >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Invia Email
              </button>
              <button 
                onClick={() => setSelectedOrderIds(new Set())}
                className="ml-4 text-slate-400 hover:text-white"
              >
                  ✕
              </button>
          </div>
      )}
    </div>
  );
};

export default Purchasing;
