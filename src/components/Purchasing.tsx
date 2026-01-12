import React, { useState, useEffect } from 'react';
import { PurchaseOrder, Part, MrpProposal } from '../types';
import { fetchOrders, addOrder, updateOrder, fetchParts, fetchMrpProposals, deleteMrpProposal, AVAILABLE_TENANTS } from '../services/dataService';
import { PurchasingTable } from './Purchasing/PurchasingTable';
import { LoadingState, ErrorState, EmptyState } from './ui/StateComponents';
import { Pagination, usePagination } from './ui/Pagination';
import { useToast } from './ui/Toast';

interface PurchasingProps {
  tenantId: string;
  isMultiTenant: boolean;
}

type PurchasingTab = 'orders' | 'mrp' | 'stats';

/**
 * PURCHASING COMPONENT - REFACTORED (FASE 4.4)
 * Ridotto da 983 a ~350 righe, integra nuovi componenti UI
 */
const Purchasing: React.FC<PurchasingProps> = ({ tenantId, isMultiTenant }) => {
  const { showToast } = useToast();

  // Tab & Loading State
  const [activeTab, setActiveTab] = useState<PurchasingTab>('orders');
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [mrpProposals, setMrpProposals] = useState<MrpProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [selectedMrpProposal, setSelectedMrpProposal] = useState<MrpProposal | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    vendor: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    status: 'pending' as const,
    partId: ''
  });

  // Selection & Search
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Filter & Paginate
  const filteredOrders = orders.filter(o =>
    !searchQuery || o.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.vendor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagination = usePagination({ items: filteredOrders, pageSize: 15 });

  useEffect(() => {
    loadData();
  }, [tenantId, isMultiTenant]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const effectiveFilter = isMultiTenant ? 'all' : tenantId;
      const [ordersData, partsData, mrpData] = await Promise.all([
        fetchOrders(effectiveFilter),
        fetchParts(effectiveFilter),
        fetchMrpProposals(effectiveFilter)
      ]);

      setOrders(ordersData);
      setParts(partsData);
      setMrpProposals(mrpData.filter(p => p.status === 'Pending'));
      showToast(`${ordersData.length} ordini caricati`, 'info');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Errore durante il caricamento';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addOrder({
        tenantId: isMultiTenant ? 'main' : tenantId,
        poNumber: `PO-${Date.now()}`,
        ...formData
      });
      showToast('Ordine creato con successo', 'success');
      setShowCreateModal(false);
      resetForm();
      loadData();
    } catch (err) {
      showToast('Errore durante la creazione', 'error');
    }
  };

  const handleUpdateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      await updateOrder({
        id: editingOrder.id,
        tenantId: editingOrder.tenantId,
        ...formData
      });
      showToast('Ordine aggiornato con successo', 'success');
      setEditingOrder(null);
      resetForm();
      loadData();
    } catch (err) {
      showToast('Errore durante l\'aggiornamento', 'error');
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo ordine?')) return;
    try {
      const order = orders.find(o => o.id === orderId);
      if (order) {
        await updateOrder({ id: orderId, tenantId: order.tenantId, ...order, status: 'deleted' });
        showToast('Ordine eliminato', 'success');
        loadData();
      }
    } catch (err) {
      showToast('Errore durante l\'eliminazione', 'error');
    }
  };

  const handleConvertMrpToOrder = async (proposal: MrpProposal) => {
    try {
      await addOrder({
        tenantId: isMultiTenant ? 'main' : tenantId,
        poNumber: `PO-MRP-${Date.now()}`,
        vendor: proposal.suggestedVendor,
        description: `MRP Proposal - ${proposal.partSku}`,
        date: new Date().toISOString().split('T')[0],
        amount: proposal.suggestedQuantity * (parts.find(p => p.sku === proposal.partSku)?.cost || 0),
        status: 'pending',
        partId: proposal.partId
      });

      await deleteMrpProposal(proposal.id);
      showToast('Proposta MRP convertita in ordine', 'success');
      loadData();
    } catch (err) {
      showToast('Errore durante la conversione', 'error');
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

  const handleBulkApprove = async () => {
    if (selectedOrderIds.size === 0 || !confirm(`Approvare ${selectedOrderIds.size} ordini?`)) return;

    try {
      for (const orderId of selectedOrderIds) {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          await updateOrder({ ...order, id: orderId, status: 'completed' });
        }
      }
      showToast('Ordini approvati', 'success');
      setSelectedOrderIds(new Set());
      loadData();
    } catch (err) {
      showToast('Errore durante l\'approvazione', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      vendor: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      status: 'pending',
      partId: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* HEADER & TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ordini di Acquisto</h2>
          <p className="text-slate-500 text-sm">Gestione PO, proposte MRP e statistiche</p>
        </div>

        <div className="flex bg-slate-200 p-1 rounded-lg">
          {(['orders', 'mrp', 'stats'] as PurchasingTab[]).map((tab, idx) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === tab ? 'bg-white text-epicor-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              {idx + 1}. {tab === 'orders' ? 'Ordini' : tab === 'mrp' ? 'Proposte MRP' : 'Statistiche'}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Cerca per numero PO o fornitore..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-epicor-600 text-white px-4 py-2 rounded-md hover:bg-epicor-700 whitespace-nowrap"
            >
              + Nuovo Ordine
            </button>
          </div>

          {selectedOrderIds.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4 flex justify-between items-center">
              <span className="text-sm text-blue-900">
                {selectedOrderIds.size} ordine(i) selezionato(i)
              </span>
              <button
                onClick={handleBulkApprove}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Approva Selezionati
              </button>
            </div>
          )}

          {loading && <LoadingState message="Caricamento ordini..." />}
          {error && <ErrorState title="Errore" message={error} onRetry={loadData} />}
          {!loading && !error && orders.length === 0 && (
            <EmptyState title="Nessun ordine" message="Crea il primo ordine di acquisto" />
          )}
          {!loading && !error && orders.length > 0 && (
            <>
              <PurchasingTable
                orders={pagination.getCurrentPageItems()}
                loading={false}
                onOrderClick={(order) => {
                  setEditingOrder(order);
                  setFormData({
                    vendor: order.vendor,
                    description: order.description,
                    date: order.date,
                    amount: order.amount,
                    status: order.status as any,
                    partId: order.partId || ''
                  });
                }}
                onDeleteOrder={handleDeleteOrder}
              />
              {filteredOrders.length > 15 && <Pagination {...pagination} />}
            </>
          )}
        </div>
      )}

      {/* TAB 2: MRP PROPOSALS */}
      {activeTab === 'mrp' && (
        <div className="space-y-4">
          {mrpProposals.length === 0 ? (
            <EmptyState title="Nessuna proposta" message="Nessuna proposta MRP pending" />
          ) : (
            <div className="space-y-3">
              {mrpProposals.map(proposal => (
                <div key={proposal.id} className="bg-white rounded-lg p-4 border border-slate-200 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-800">{proposal.partSku}</p>
                    <p className="text-sm text-slate-600">
                      Quantità: {proposal.suggestedQuantity} | Fornitore: {proposal.suggestedVendor}
                    </p>
                  </div>
                  <button
                    onClick={() => handleConvertMrpToOrder(proposal)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Converti in Ordine
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STATS */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 text-white">
            <p className="text-slate-400 text-xs uppercase mb-1">Ordini Totali</p>
            <h3 className="text-3xl font-bold">{orders.length}</h3>
            <p className="text-xs text-slate-400 mt-3">Valore: € {orders.reduce((sum, o) => sum + o.amount, 0).toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-slate-500 text-xs uppercase mb-1">Ordini Pending</p>
            <h3 className="text-3xl font-bold text-yellow-600">
              {orders.filter(o => o.status === 'pending').length}
            </h3>
          </div>
          <div className="bg-white rounded-xl p-6 border border-slate-200">
            <p className="text-slate-500 text-xs uppercase mb-1">Proposte MRP</p>
            <h3 className="text-3xl font-bold text-epicor-600">{mrpProposals.length}</h3>
          </div>
        </div>
      )}

      {/* CREATE/EDIT MODAL */}
      {(showCreateModal || editingOrder) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-800">
              {editingOrder ? 'Modifica Ordine' : 'Nuovo Ordine'}
            </h2>

            <form onSubmit={editingOrder ? handleUpdateOrder : handleAddOrder} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fornitore</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Importo (€)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full border border-slate-300 rounded px-2 py-1 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingOrder(null);
                    resetForm();
                  }}
                  className="flex-1 px-3 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 text-sm"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-epicor-600 text-white rounded hover:bg-epicor-700 text-sm font-medium"
                >
                  {editingOrder ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Purchasing;
