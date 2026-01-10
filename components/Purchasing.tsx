import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '../types';
import { fetchOrders, addOrder } from '../services/dataService';

const Purchasing: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Order Form State
  const [newOrder, setNewOrder] = useState({
    vendor: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    items: 1,
    status: 'Open' as const
  });

  const refreshOrders = async () => {
    setLoading(true);
    const data = await fetchOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshOrders();
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return alert("Clipboard vuota!");
      
      // Simple parser: Assume tab or comma separated, newline for rows
      // Format assumption: Vendor, Amount, Items
      const rows = text.split('\n');
      let count = 0;
      
      for (const row of rows) {
          const cols = row.split(/[\t,]+/);
          if (cols.length >= 2) {
              await addOrder({
                  vendor: cols[0].trim(),
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
      refreshOrders();
    } catch (err) {
      alert("Errore accesso clipboard o formato non valido. Assicurati di aver dato i permessi.");
      console.error(err);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    await addOrder({
        vendor: newOrder.vendor,
        date: newOrder.date,
        amount: Number(newOrder.amount),
        items: Number(newOrder.items),
        status: newOrder.status
    });
    setIsModalOpen(false);
    // Reset form
    setNewOrder({ vendor: '', date: new Date().toISOString().split('T')[0], amount: 0, items: 1, status: 'Open' });
    refreshOrders();
  };

  return (
    <div className="space-y-6 relative">
       {/* Modal for New Order */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold text-slate-800 mb-4">Nuovo Ordine di Acquisto</h3>
                <form onSubmit={handleCreateOrder} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Fornitore</label>
                        <input required type="text" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                            value={newOrder.vendor} onChange={e => setNewOrder({...newOrder, vendor: e.target.value})} />
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700">Importo (€)</label>
                            <input required type="number" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                                value={newOrder.amount} onChange={e => setNewOrder({...newOrder, amount: Number(e.target.value)})} />
                        </div>
                        <div className="flex-1">
                             <label className="block text-sm font-medium text-slate-700">N. Articoli</label>
                            <input required type="number" className="mt-1 block w-full border border-slate-300 rounded-md p-2" 
                                value={newOrder.items} onChange={e => setNewOrder({...newOrder, items: Number(e.target.value)})} />
                        </div>
                    </div>
                    <div>
                         <label className="block text-sm font-medium text-slate-700">Data</label>
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

       <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestione Ordini & MRP</h2>
          <p className="text-slate-500 text-sm">Transazioni Live su Database Easy Buy</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
             {/* Excel Integration Button */}
            <button 
                onClick={handlePaste}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-md transition"
                title="Copia righe da Excel (Fornitore, Importo, Items) e clicca qui"
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Update
            </button>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-epicor-600 text-white rounded-md text-sm font-medium hover:bg-epicor-700 shadow-md transition"
            >
                Nuovo Ordine
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <input 
                    type="text" 
                    className="block w-full pl-3 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-epicor-500 focus:border-epicor-500 sm:text-sm" 
                    placeholder="Filtra Database..." 
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">ID Ordine</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fornitore</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Totale</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {loading ? (
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">Caricamento dati...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">Nessun ordine trovato. Creane uno nuovo.</td>
                </tr>
              ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-epicor-600">{order.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{order.vendor}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{order.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 font-semibold">€ {order.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${order.status === 'Open' ? 'bg-green-100 text-green-800' : 
                            order.status === 'Closed' ? 'bg-slate-100 text-slate-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                        {order.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-epicor-600 hover:text-epicor-900 mr-3">Edit</button>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Purchasing;