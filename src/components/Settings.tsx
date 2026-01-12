
import React, { useState, useEffect } from 'react';
import { AVAILABLE_TENANTS, fetchAdminProfile, saveAdminProfile } from '../services/dataService';
import { useToast } from './ui/Toast';
import { Tenant, SiteDetails, AdminProfile } from '../types';

interface SettingsProps {
    tenantId: string;
}

const Settings: React.FC<SettingsProps> = ({ tenantId }) => {
    const [activeTab, setActiveTab] = useState<'tenant' | 'seasonal' | 'admin'>('tenant');

    // Local state for form data
    const [tenantData, setTenantData] = useState<Tenant | undefined>(undefined);
    const [adminProfile, setAdminProfile] = useState<AdminProfile>({
        companyName: '', vatNumber: '', address: '', city: '', phone: '', email: ''
    });

    // Seasonal Events State
    const [seasonalEvents, setSeasonalEvents] = useState([
        { id: 'summer', name: 'Chiusura Estiva (Ferragosto)', start: '2026-08-10', end: '2026-08-23', active: true, risk: 'High' },
        { id: 'winter', name: 'Chiusura Natalizia (Dicembre)', start: '2026-12-24', end: '2027-01-06', active: true, risk: 'Medium' },
        { id: 'easter', name: 'Pasqua / Pasquetta', start: '2026-04-04', end: '2026-04-06', active: false, risk: 'Low' },
        { id: 'patron', name: 'Festa Patronale', start: '', end: '', active: false, risk: 'Low' },
        { id: 'inv1', name: 'Chiusura Inventariale 1', start: '', end: '', active: false, risk: 'Medium' },
        { id: 'inv2', name: 'Chiusura Inventariale 2', start: '', end: '', active: false, risk: 'Medium' },
        { id: 'weather', name: 'Chiusura Eventi Meteo', start: '', end: '', active: false, risk: 'High' },
    ]);

    useEffect(() => {
        // Load initial data based on logged in tenant
        const t = AVAILABLE_TENANTS.find(t => t.id === tenantId);
        if (t) setTenantData(t);

        // Load Admin Profile
        fetchAdminProfile().then(setAdminProfile);
    }, [tenantId]);

    const handleAdminProfileChange = (field: keyof AdminProfile, value: string) => {
        setAdminProfile(prev => ({ ...prev, [field]: value }));
    };

    const { showToast } = useToast();

    const handleSaveAll = async () => {
        try {
            await saveAdminProfile(adminProfile);
            showToast("Impostazioni salvate con successo!", 'success');
        } catch (e) {
            showToast("Errore durante il salvataggio", 'error');
        }
    };

    if (!tenantData || !tenantData.details) return <div className="p-8 text-center text-slate-500">Caricamento impostazioni...</div>;

    // Helper to render an Address Section
    const renderAddressSection = (title: string, data: SiteDetails, type: 'legal' | 'operational' | 'warehouse') => (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                <h3 className="text-md font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
                {type !== 'legal' && (
                    <div className="flex items-center">
                        <span className="text-xs mr-2 text-slate-500">{data.isActive ? 'Attivo' : 'Inattivo'}</span>
                        <div className={`w-10 h-5 flex items-center bg-slate-300 rounded-full p-1 cursor-not-allowed ${data.isActive ? 'bg-green-500' : ''}`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${data.isActive ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </div>
                )}
            </div>

            {data.isActive && (
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* ADDRESS FIELDS */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase border-b pb-1 mb-2">Recapiti Geografici</h4>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Partita IVA (Vat ID)</label>
                            <input type="text" defaultValue={data.address.vatNumber} className="w-full border-slate-300 rounded-md text-sm bg-slate-50" readOnly />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Indirizzo Completo</label>
                            <input type="text" defaultValue={data.address.street} className="w-full border-slate-300 rounded-md text-sm" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">CAP</label>
                                <input type="text" defaultValue={data.address.zipCode} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Città</label>
                                <input type="text" defaultValue={data.address.city} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Prov.</label>
                                <input type="text" defaultValue={data.address.province} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                            <div className="col-span-2">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Stato</label>
                                <input type="text" defaultValue={data.address.country} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                        </div>
                    </div>

                    {/* CONTACT FIELDS */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold text-slate-400 uppercase border-b pb-1 mb-2">Contatti & Email</h4>
                        <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Telefono Principale</label>
                            <input type="text" defaultValue={data.contacts.phone} className="w-full border-slate-300 rounded-md text-sm" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Info</label>
                                <input type="email" defaultValue={data.contacts.emailInfo} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Amministrazione</label>
                                <input type="email" defaultValue={data.contacts.emailAdmin} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Email Uff. Tecnico</label>
                                <input type="email" defaultValue={data.contacts.emailTech} className="w-full border-slate-300 rounded-md text-sm" />
                            </div>

                            {/* Dynamic Contact Fields based on Type */}
                            {type === 'legal' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1">Email Vendite</label>
                                    <input type="email" defaultValue={data.contacts.emailSales} className="w-full border-slate-300 rounded-md text-sm" />
                                </div>
                            )}
                            {(type === 'operational' || type === 'warehouse') && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email Referente</label>
                                        <input type="email" defaultValue={data.contacts.emailReferent} className="w-full border-slate-300 rounded-md text-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">Email Vendite/Magazzino</label>
                                        <input type="email" defaultValue={data.contacts.emailWarehouse} className="w-full border-slate-300 rounded-md text-sm" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Impostazioni</h2>
                    <p className="text-slate-500 text-sm">Configurazione Globale Tenant e Parametri MRP</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex space-x-1 bg-slate-200 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('tenant')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'tenant' ? 'bg-white text-epicor-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    A. Configurazione Tenant
                </button>
                <button
                    onClick={() => setActiveTab('seasonal')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'seasonal' ? 'bg-white text-epicor-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    B. Eventi Stagionali
                </button>
                <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'admin' ? 'bg-white text-epicor-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    C. Profilo Admin (Email)
                </button>
            </div>

            {activeTab === 'tenant' && (
                /* SECTION A: TENANT CONFIGURATION */
                <div className="animate-fade-in-up">
                    {/* General Info Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                        <h3 className="text-lg font-semibold mb-4 text-slate-800">Identità Aziendale</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Nome Azienda (Tenant ID)</label>
                                <div className="mt-1 flex items-center">
                                    <span className={`w-3 h-3 rounded-full mr-2 ${tenantData.color}`}></span>
                                    <input type="text" value={tenantData.name} readOnly className="block w-full border border-slate-300 rounded-md p-2 bg-slate-50 text-slate-600" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Valuta di Sistema</label>
                                <input type="text" value={tenantData.currency} readOnly className="mt-1 block w-full border border-slate-300 rounded-md p-2 bg-slate-50 text-slate-600" />
                            </div>
                        </div>
                    </div>

                    {/* Detailed Site Forms */}
                    {renderAddressSection('A.3 Sede Legale', tenantData.details.legal, 'legal')}
                    {renderAddressSection('Sede Operativa', tenantData.details.operational, 'operational')}
                    {renderAddressSection('Magazzino Principale', tenantData.details.warehouseMain, 'warehouse')}
                    {renderAddressSection('Magazzino Satellite', tenantData.details.warehouseSatellite, 'warehouse')}
                </div>
            )}

            {activeTab === 'seasonal' && (
                /* SECTION B: SEASONAL EVENTS */
                <div className="animate-fade-in-up">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-semibold mb-2 text-slate-800">Calendario Chiusure (MRP Impact)</h3>
                        <p className="text-sm text-slate-500 mb-6">Definisci i periodi di chiusura per permettere all'algoritmo MRP di anticipare gli ordini di approvvigionamento.</p>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Evento</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Inizio Chiusura</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fine Chiusura</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stato</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-slate-200">
                                    {seasonalEvents.map((evt, idx) => (
                                        <tr key={evt.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`w-2 h-8 rounded-l mr-3 ${evt.risk === 'High' ? 'bg-red-500' : evt.risk === 'Medium' ? 'bg-yellow-500' : 'bg-blue-400'}`}></div>
                                                    <div>
                                                        <div className="text-sm font-medium text-slate-900">{evt.name}</div>
                                                        <div className="text-xs text-slate-500">Rischio: {evt.risk}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input type="date" className="border-slate-300 rounded text-sm text-slate-600" defaultValue={evt.start} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <input type="date" className="border-slate-300 rounded text-sm text-slate-600" defaultValue={evt.end} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input type="checkbox" className="sr-only peer" defaultChecked={evt.active} />
                                                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-epicor-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-epicor-600"></div>
                                                </label>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'admin' && (
                /* SECTION C: ADMIN PROFILE */
                <div className="animate-fade-in-up">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Profilo Amministratore (Mittente Email)</h3>
                        <p className="text-sm text-slate-500 mb-6">Questi dati verranno utilizzati come firma e intestazione nelle email inviate ai fornitori tramite il pulsante "Invia Ordine".</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Azienda / Admin</label>
                                <input
                                    type="text"
                                    className="w-full border-slate-300 rounded-md p-2 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder="Es. Mario Rossi (Purchasing Mgr)"
                                    value={adminProfile.companyName}
                                    onChange={e => handleAdminProfileChange('companyName', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Partita IVA (P.IVA)</label>
                                <input
                                    type="text"
                                    className="w-full border-slate-300 rounded-md p-2 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder="IT00000000000"
                                    value={adminProfile.vatNumber}
                                    onChange={e => handleAdminProfileChange('vatNumber', e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Indirizzo Completo</label>
                                <input
                                    type="text"
                                    className="w-full border-slate-300 rounded-md p-2 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder="Via Roma 1, 20100 Milano (MI)"
                                    value={adminProfile.address}
                                    onChange={e => handleAdminProfileChange('address', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Telefono / Cellulare</label>
                                <input
                                    type="tel"
                                    className="w-full border-slate-300 rounded-md p-2 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder="+39 333 1234567"
                                    value={adminProfile.phone}
                                    onChange={e => handleAdminProfileChange('phone', e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Mittente (Tua Email)</label>
                                <input
                                    type="email"
                                    className="w-full border-slate-300 rounded-md p-2 focus:ring-epicor-500 focus:border-epicor-500"
                                    placeholder="acquisti@azienda.com"
                                    value={adminProfile.email}
                                    onChange={e => handleAdminProfileChange('email', e.target.value)}
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Questa email apparirà nella firma, non come mittente tecnico (che dipende dal tuo client).</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-6 right-6">
                <button
                    onClick={handleSaveAll}
                    className="bg-epicor-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-epicor-700 font-bold transition-transform transform hover:scale-105 flex items-center"
                >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Salva Modifiche
                </button>
            </div>
        </div>
    );
};

export default Settings;
