import React, { useState, useEffect } from 'react';
import { fetchParts, addPart } from '../services/dataService';
import { Part } from '../types';

const Inventory: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newPart, setNewPart] = useState<Partial<Part>>({ category: 'General' });

  useEffect(() => {
    loadParts();
  }, []);

  const loadParts = async () => {
    setLoading(true);
    const data = await fetchParts();
    setParts(data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPart.sku && newPart.description) {
      await addPart(newPart as Part);
      setShowModal(false);
      setNewPart({ category: 'General' });
      loadParts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Inventory & Part Master</h2>
           <p className="text-slate-500 text-sm">Gestione anagrafica articoli e livelli stock</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-epicor-600 text-white px-4 py-2 rounded-md hover:bg-epicor-700">
          + Nuova Parte
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Descrizione</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Lead Time (gg)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Categoria</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {loading ? <tr><td colSpan={5} className="p-4 text-center">Loading...</td></tr> : parts.map(part => (
              <tr key={part.id}>
                <td className="px-6 py-4 text-sm font-medium text-slate-900">{part.sku}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{part.description}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${part.stock <= part.safetyStock ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {part.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{part.leadTime}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{part.category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h3 className="text-lg font-bold mb-4">Aggiungi Parte</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input placeholder="SKU" className="w-full border p-2 rounded" onChange={e => setNewPart({...newPart, sku: e.target.value})} required />
              <input placeholder="Descrizione" className="w-full border p-2 rounded" onChange={e => setNewPart({...newPart, description: e.target.value})} required />
              <div className="flex gap-2">
                 <input type="number" placeholder="Stock" className="w-1/2 border p-2 rounded" onChange={e => setNewPart({...newPart, stock: Number(e.target.value)})} />
                 <input type="number" placeholder="Safety" className="w-1/2 border p-2 rounded" onChange={e => setNewPart({...newPart, safetyStock: Number(e.target.value)})} />
              </div>
              <div className="flex gap-2">
                 <input type="number" placeholder="Lead Time" className="w-1/2 border p-2 rounded" onChange={e => setNewPart({...newPart, leadTime: Number(e.target.value)})} />
                 <input placeholder="Category" className="w-1/2 border p-2 rounded" onChange={e => setNewPart({...newPart, category: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-epicor-600 text-white rounded">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;