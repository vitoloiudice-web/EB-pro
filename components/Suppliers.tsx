
import React, { useState, useEffect } from 'react';
import { Supplier, SupplierType, SupplierMarket } from '../types';
import { fetchSuppliers, addSupplier, updateSupplier, AVAILABLE_TENANTS } from '../services/dataService';

interface SuppliersProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const MARKETS: SupplierMarket[] = [
    'Energia / Commodity', 'Materia Prima', 'Carpenteria', 'Torneria', 'Oleodinamica', 
    'Elettrica', 'Elettronica', 'Pneumatica', 'Plastica', 'Bulloneria', 'Utensileria', 
    'DPI', 'Automotive', 'Multimarket', 'Ferramenta', 'Logistica', 'Manodopera', 'Generico'
];

const Suppliers: React.FC<SuppliersProps> = ({ tenantId, isMultiTenant }) => {
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterMarket, setFilterMarket] = useState<string>('All');
    
    // MODAL STATE
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<Partial<Supplier>>({
        name: '', vatNumber: '', address: '', city: '', zipCode: '', country: 'Italia',
        emailOrder: '', phone: '', type: 'Commerciale', market: 'Generico', status: 'Active'
    });

    useEffect(() => {
        loadData();
    }, [tenantId, isMultiTenant]);

    const loadData = async () => {
        setLoading(true);
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const data = await fetchSuppliers(effectiveFilter);
        setSuppliers(data);
        setLoading(false);
    };

    const handleEditClick = (supplier: Supplier) => {
        setModalMode('edit');
        setFormData(supplier);
        setIsModalOpen(true);
    };

    const handleCreateClick = () => {
        setModalMode('create');
        setFormData({
            name: '', vatNumber: '', address: '', city: '', zipCode: '', country: 'Italia',
            emailOrder: '', phone: '', type: 'Commerciale', market: 'Generico', status: 'Active',
            tenantId: isMultiTenant ? 'main' : tenantId
        });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (modalMode === 'create') {
            await addSupplier(formData as Supplier);
        } else {
            await updateSupplier(formData as Supplier);
        }
        
        setIsModalOpen(false);
        loadData();
    };

    const filteredSuppliers = suppliers.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.vatNumber.includes(searchQuery) ||
                              s.market.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMarket = filterMarket === 'All' || s.market === filterMarket;
        return matchesSearch && matchesMarket;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">
                        Fornitori (SRM) {isMultiTenant && '(Global)'}
                    </h2>
                    <p className="text-slate-500 text-sm">Gestione anagrafica, contatti e categorie merceologiche</p>
                </div>
                <button 
                    onClick={handleCreateClick}
                    className="flex items-center px-4 py-2 bg-epicor-600 text-white rounded-md font-medium hover:bg-epicor-700 shadow-md transition"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Nuovo Fornitore
                </button>
            </div>

            {/* FILTERS */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <input 
                        type="text" 
                        placeholder="Cerca fornitore, P.IVA o mercato..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-epicor-500 focus:border-epicor-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                    <svg className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <div className="w-full md:w-64">
                    <select 
                        className="w-full border border-slate-300 rounded-lg p-2 bg-slate-50"
                        value={filterMarket}
                        onChange={e => setFilterMarket(e.target.value)}
                    >
                        <option value="All">Tutti i Mercati</option>
                        {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Ragione Sociale / P.IVA</th>
                            {isMultiTenant && <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tenant</th>}
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Tipo</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Mercato</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Contatti (Ordini)</th>
                            <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Azioni</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan={isMultiTenant ? 6 : 5} className="p-4 text-center text-slate-500">Caricamento...</td></tr>
                        ) : filteredSuppliers.length === 0 ? (
                            <tr><td colSpan={isMultiTenant ? 6 : 5} className="p-8 text-center text-slate-400 italic">Nessun fornitore trovato.</td></tr>
                        ) : (
                            filteredSuppliers.map(s => (
                                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{s.name}</div>
                                        <div className="text-xs text-slate-500 font-mono">{s.vatNumber}</div>
                                    </td>
                                    {isMultiTenant && (
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded text-white ${AVAILABLE_TENANTS.find(t => t.id === s.tenantId)?.color || 'bg-gray-400'}`}>
                                                {s.tenantId}
                                            </span>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                            s.type === 'Produttore' ? 'bg-blue-100 text-blue-700' : 
                                            s.type === 'Vettore' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {s.type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{s.market}</td>
                                    <td className="px-6 py-4 text-sm">
                                        <div className="flex items-center text-slate-600 mb-1">
                                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                            {s.emailOrder}
                                        </div>
                                        <div className="flex items-center text-slate-500 text-xs">
                                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            {s.phone}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleEditClick(s)}
                                            className="text-epicor-600 hover:text-epicor-800 font-medium text-sm hover:underline"
                                        >
                                            Modifica
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white shrink-0">
                            <h3 className="text-xl font-bold">{modalMode === 'create' ? 'Nuovo Fornitore' : 'Modifica Anagrafica'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                            <form id="supplierForm" onSubmit={handleSubmit} className="space-y-6">
                                
                                {/* SECTION 1: IDENTITY */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-3 border-b pb-1">Dati Identificativi</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ragione Sociale</label>
                                            <input required type="text" className="w-full border rounded p-2" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Partita IVA</label>
                                            <input required type="text" className="w-full border rounded p-2" value={formData.vatNumber} onChange={e => setFormData({...formData, vatNumber: e.target.value})} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Sito Web</label>
                                            <input type="text" className="w-full border rounded p-2" placeholder="www.example.com" value={formData.website || ''} onChange={e => setFormData({...formData, website: e.target.value})} />
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 2: CLASSIFICATION */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-3 border-b pb-1">Classificazione</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo Fornitore</label>
                                            <select className="w-full border rounded p-2 bg-slate-50" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as SupplierType})}>
                                                <option value="Produttore">Produttore</option>
                                                <option value="Commerciale">Commerciale</option>
                                                <option value="Vettore">Vettore (Logistica)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mercato</label>
                                            <select className="w-full border rounded p-2 bg-slate-50" value={formData.market} onChange={e => setFormData({...formData, market: e.target.value as SupplierMarket})}>
                                                {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* SECTION 3: ADDRESS & CONTACTS */}
                                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <h4 className="text-sm font-bold text-slate-700 uppercase mb-3 border-b pb-1">Sede & Contatti</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Indirizzo</label>
                                            <input type="text" className="w-full border rounded p-2" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Città</label>
                                                <input type="text" className="w-full border rounded p-2" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CAP</label>
                                                <input type="text" className="w-full border rounded p-2" value={formData.zipCode} onChange={e => setFormData({...formData, zipCode: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazione</label>
                                                <input type="text" className="w-full border rounded p-2" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Ordini (Cruciale)</label>
                                                <input required type="email" className="w-full border border-blue-300 rounded p-2 bg-blue-50" placeholder="ordini@fornitore.com" value={formData.emailOrder} onChange={e => setFormData({...formData, emailOrder: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefono</label>
                                                <input type="tel" className="w-full border rounded p-2" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                            </form>
                        </div>

                        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-200 font-medium">
                                Annulla
                            </button>
                            <button type="submit" form="supplierForm" className="px-6 py-2 bg-epicor-600 text-white rounded-md hover:bg-epicor-700 font-bold shadow-md">
                                {modalMode === 'create' ? 'Salva Fornitore' : 'Aggiorna Dati'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
