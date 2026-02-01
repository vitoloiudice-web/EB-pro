import React, { useCallback } from 'react';
import { Company } from '../types';
import { googleSheetsService } from '../services/googleSheetsService';
import Pagination from './common/Pagination';
import { usePaginatedData } from '../hooks/usePaginatedData';

interface MRPViewProps {
  company: Company;
}

const MRPView: React.FC<MRPViewProps> = ({ company }) => {
  
  const fetchMRP = useCallback((p: number, s: number, q: string) => 
    googleSheetsService.calculateMRP(company, p, s, q), 
  [company]);

  const { data: rows, loading, total, page, setPage, pageSize } = usePaginatedData({
    fetchMethod: fetchMRP,
    pageSize: 50
  });

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-700">Pianificazione Fabbisogni</h3>
          <p className="text-sm text-slate-500 font-medium">Analisi scorte e riordino</p>
        </div>
        <button className="neu-btn px-6 py-2.5 text-blue-600">
          Genera Ordini Acquisto
        </button>
      </div>
      
      {/* Table Container - Neomorphic */}
      <div className="neu-flat flex-1 overflow-hidden flex flex-col p-4">
        <div className="flex-1 overflow-auto custom-scrollbar rounded-xl">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-[#EEF2F6] z-10">
              <tr>
                <th className="p-4">Codice / Articolo</th>
                <th className="p-4">Categoria</th>
                <th className="p-4 text-right">Giacenza</th>
                <th className="p-4 text-right">Scorta Sic.</th>
                <th className="p-4 text-right">Da Ordinare</th>
                <th className="p-4 text-right">Costo Est.</th>
                <th className="p-4 text-center">Stato</th>
              </tr>
            </thead>
            <tbody className="text-sm space-y-2">
              {loading ? (
                 <tr><td colSpan={7} className="p-10 text-center text-slate-400 animate-pulse font-medium">Calcolo MRP in corso...</td></tr>
              ) : rows.map((row: any, idx) => (
                <tr key={idx}>
                  <td className="p-4">
                    <div className="font-bold text-slate-700">{row.item.name}</div>
                    <div className="text-xs text-slate-400 font-mono font-bold">{row.item.sku}</div>
                  </td>
                  <td className="p-4 text-slate-500 font-semibold text-xs uppercase tracking-wide">{row.item.category}</td>
                  <td className="p-4 text-right font-mono text-slate-600 font-bold">{row.item.stock}</td>
                  <td className="p-4 text-right font-mono text-slate-400 font-medium">{row.item.safetyStock}</td>
                  <td className="p-4 text-right font-mono font-bold text-blue-600">
                    {row.qtyToOrder > 0 ? row.qtyToOrder : '-'}
                  </td>
                  <td className="p-4 text-right font-mono text-slate-600">
                    {row.qtyToOrder > 0 ? `€ ${row.estimatedCost.toLocaleString('it-IT')}` : '-'}
                  </td>
                  <td className="p-4 text-center">
                    {row.isShortage ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-600 shadow-sm">
                        Sottoscorta
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-600 shadow-sm">
                        OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400 italic">Nessun dato disponibile.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-4 px-2">
          <Pagination 
            currentPage={page}
            totalItems={total}
            itemsPerPage={pageSize}
            onPageChange={setPage}
          />
        </div>
      </div>
    </div>
  );
};

export default MRPView;