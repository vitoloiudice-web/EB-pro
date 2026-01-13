
import React, { useState } from 'react';
import { MOCK_INVOICES } from '../constants';
import { FatturaElettronica, EsitoSDI } from '../types';

interface HubFteProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const HubFTE: React.FC<HubFteProps> = ({ tenantId, isMultiTenant }) => {
    const [filterFlow, setFilterFlow] = useState<'All' | 'Attivo' | 'Passivo'>('All');
    
    // Filter logic
    const invoices = MOCK_INVOICES.filter(inv => {
        if (filterFlow !== 'All' && inv.flusso !== filterFlow) return false;
        if (!isMultiTenant && inv.tenantId !== tenantId) return false;
        return true;
    });

    const getStatusColor = (status: EsitoSDI) => {
        switch (status) {
            case 'Consegnata': return 'bg-green-100 text-green-800 border-green-200';
            case 'Inviata': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Scartata': return 'bg-red-100 text-red-800 border-red-200';
            case 'Mancata Consegna': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                        <span className="bg-blue-600 text-white p-2 rounded-lg mr-3">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                        </span>
                        HUB FTE B2B
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 ml-14">Cruscotto Monitoraggio Flussi SDI (Sistema di Interscambio)</p>
                </div>
                <div className="mt-4 md:mt-0 flex space-x-2">
                    <div className="text-right mr-4">
                        <p className="text-xs text-slate-400 uppercase font-bold">Stato Connessione SDI</p>
                        <p className="text-sm font-bold text-green-600 flex items-center justify-end">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                            ONLINE
                        </p>
                    </div>
                </div>
            </div>

            {/* KPI CARDS for SDI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Fatture Inviate (Mese)</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">128</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold">Fatture Ricevute (Mese)</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1">85</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 shadow-sm">
                    <p className="text-xs text-red-600 uppercase font-bold">Scartate da Gestire</p>
                    <p className="text-2xl font-bold text-red-700 mt-1">3</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 shadow-sm">
                    <p className="text-xs text-blue-600 uppercase font-bold">In Elaborazione HUB</p>
                    <p className="text-2xl font-bold text-blue-700 mt-1">12</p>
                </div>
            </div>

            {/* MAIN CONSOLE */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <div className="flex space-x-4">
                        <button 
                            onClick={() => setFilterFlow('All')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterFlow === 'All' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Tutti i Flussi
                        </button>
                        <button 
                            onClick={() => setFilterFlow('Attivo')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterFlow === 'Attivo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Ciclo Attivo (Vendite)
                        </button>
                        <button 
                            onClick={() => setFilterFlow('Passivo')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${filterFlow === 'Passivo' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                        >
                            Ciclo Passivo (Acquisti)
                        </button>
                    </div>
                    <div className="flex space-x-2">
                        <button className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Aggiorna Stati SDI
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Stato SDI</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Flusso</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Documento</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Controparte</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Totale (€)</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Data Invio</th>
                                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {invoices.map((inv) => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(inv.statoSDI)}`}>
                                            {inv.statoSDI}
                                        </span>
                                        {inv.messaggioErrore && (
                                            <div className="text-[10px] text-red-600 mt-1 max-w-[150px] truncate" title={inv.messaggioErrore}>
                                                {inv.messaggioErrore}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                        {inv.flusso === 'Attivo' ? <span className="text-green-600 font-bold">Vendita ↗</span> : <span className="text-orange-600 font-bold">Acquisto ↙</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-slate-800">{inv.numeroDocumento}</div>
                                        <div className="text-xs text-slate-500">{inv.dataDocumento}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-slate-900">{inv.controparte}</div>
                                        <div className="text-xs text-slate-500 font-mono">P.IVA: {inv.pivaControparte}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-slate-800">
                                        € {inv.importoTotale.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 font-mono">
                                        {inv.dataInvioSDI ? new Date(inv.dataInvioSDI).toLocaleString() : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">XML</button>
                                        <button className="text-slate-600 hover:text-slate-900">PDF</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HubFTE;
