import React from 'react';
import { MrpProposal } from '../../types';
import { AVAILABLE_TENANTS } from '../../services/dataService';

interface MrpProposalListProps {
    proposals: MrpProposal[];
    isMultiTenant: boolean;
    onConvert: (proposal: MrpProposal) => void;
}

/**
 * Displays pending MRP proposals with option to convert them to purchase orders.
 * Extracted from Purchasing.tsx for better modularity.
 */
const MrpProposalList: React.FC<MrpProposalListProps> = ({
    proposals,
    isMultiTenant,
    onConvert
}) => {
    if (proposals.length === 0) return null;

    return (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 animate-fade-in-up shadow-sm">
            <h3 className="font-bold text-orange-800 text-lg mb-4 flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Proposte d'Acquisto da MRP ({proposals.length})
            </h3>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-orange-100">
                        <tr>
                            {isMultiTenant && (
                                <th className="px-4 py-2 text-left text-xs font-bold text-orange-700">Tenant</th>
                            )}
                            <th className="px-4 py-2 text-left text-xs font-bold text-orange-700">SKU Articolo</th>
                            <th className="px-4 py-2 text-left text-xs font-bold text-orange-700">Descrizione</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-orange-700">Q.tà Mancante</th>
                            <th className="px-4 py-2 text-right text-xs font-bold text-orange-700">Costo Stimato</th>
                            <th className="px-4 py-2 text-center text-xs font-bold text-orange-700">Data Ordine</th>
                            <th className="px-4 py-2 text-center text-xs font-bold text-orange-700">Azione</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-100">
                        {proposals.map(p => (
                            <tr key={p.id} className="hover:bg-orange-100/50">
                                {isMultiTenant && (
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded text-white ${AVAILABLE_TENANTS.find(t => t.id === p.tenantId)?.color || 'bg-gray-400'
                                            }`}>
                                            {p.tenantId}
                                        </span>
                                    </td>
                                )}
                                <td className="px-4 py-3 font-mono font-bold text-slate-700">{p.partSku}</td>
                                <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{p.description}</td>
                                <td className="px-4 py-3 text-right font-bold text-orange-700">{p.missingQty}</td>
                                <td className="px-4 py-3 text-right font-mono">€ {p.estimatedCost.toLocaleString()}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className="font-mono text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                                        {p.orderByDate}
                                    </span>
                                    {p.reason?.includes('⚠️') && (
                                        <span className="ml-2 text-yellow-600" title="Allarme Stagionale">
                                            ⚠️
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => onConvert(p)}
                                        className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded hover:bg-orange-700 shadow-sm transition"
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
    );
};

export default MrpProposalList;
