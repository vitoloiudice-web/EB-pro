import React, { useState } from 'react';
import { MOCK_ORDERS } from '../constants';
import { PurchaseOrder } from '../types';

const Purchasing: React.FC = () => {
  const [orders, setOrders] = useState<PurchaseOrder[]>(MOCK_ORDERS);

  // Simulated Paste Update handler
  const handlePaste = () => {
    alert("Funzionalità 'Paste Update' simulata: Incolla dati da Excel per aggiornare massivamente date e prezzi.");
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestione Ordini & MRP</h2>
          <p className="text-slate-500 text-sm">Epicor Transactional Interface</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
             {/* Excel Integration Button */}
            <button 
                onClick={handlePaste}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 shadow-md transition"
            >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Paste Update (Excel)
            </button>
            <button className="px-4 py-2 bg-epicor-600 text-white rounded-md text-sm font-medium hover:bg-epicor-700 shadow-md transition">
                Nuovo Ordine
            </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="relative max-w-sm w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    type="text" 
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md leading-5 bg-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-epicor-500 focus:border-epicor-500 sm:text-sm" 
                    placeholder="Cerca PO, Fornitore o Parte..." 
                />
            </div>
            <div className="flex space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    MRP Active
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
              {orders.map((order) => (
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
                    <button className="text-red-600 hover:text-red-900">Cancel</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 sm:px-6">
            <div className="flex justify-between items-center sm:justify-end">
                <button className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                    Previous
                </button>
                <button className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50">
                    Next
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Purchasing;