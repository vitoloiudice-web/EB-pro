import React, { useState, useEffect } from 'react';
import { fetchNCRs, addNCR, fetchParts } from '../services/dataService';
import { NonConformance, Part } from '../types';

const Quality: React.FC = () => {
  const [ncrs, setNcrs] = useState<NonConformance[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newNcr, setNewNcr] = useState({ partId: '', qtyFailed: 1, reason: '', status: 'Open' as const });

  useEffect(() => {
    const init = async () => {
        setNcrs(await fetchNCRs());
        setParts(await fetchParts());
    };
    init();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addNCR({ ...newNcr, date: new Date().toISOString().split('T')[0] });
    setNcrs(await fetchNCRs());
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Quality Control (QC)</h2>
          <p className="text-slate-500 text-sm">Non-Conformances & RMA Management</p>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
          ! Segnala Difetto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ncrs.map(ncr => {
              const part = parts.find(p => p.id === ncr.partId) || { sku: 'Unknown', description: 'Unknown' };
              return (
                <div key={ncr.id} className="bg-white p-4 rounded-lg shadow border-l-4 border-red-500">
                    <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-800">{part.sku}</h4>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">{ncr.status}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">{part.description}</p>
                    <div className="mt-4 text-sm">
                        <p><strong>Qty Failed:</strong> {ncr.qtyFailed}</p>
                        <p><strong>Reason:</strong> {ncr.reason}</p>
                        <p className="text-slate-400 text-xs mt-2">{ncr.date}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button className="text-xs bg-slate-100 px-2 py-1 rounded hover:bg-slate-200">Genera RMA</button>
                        <button className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded hover:bg-green-100">Risolvi</button>
                    </div>
                </div>
              );
          })}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h3 className="text-lg font-bold mb-4 text-red-600">Nuova Non-Conformità</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <select className="w-full border p-2 rounded" onChange={e => setNewNcr({...newNcr, partId: e.target.value})} required>
                        <option value="">Seleziona Parte</option>
                        {parts.map(p => <option key={p.id} value={p.id}>{p.sku}</option>)}
                    </select>
                    <input type="number" min="1" className="w-full border p-2 rounded" placeholder="Quantità Difettosa" onChange={e => setNewNcr({...newNcr, qtyFailed: Number(e.target.value)})} />
                    <textarea className="w-full border p-2 rounded" placeholder="Motivo del difetto..." onChange={e => setNewNcr({...newNcr, reason: e.target.value})} required />
                    
                    <div className="flex justify-end gap-2 mt-4">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600">Annulla</button>
                        <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded">Invia Report</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default Quality;