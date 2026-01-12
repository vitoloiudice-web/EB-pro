import React from 'react';
import { Part } from '../../types';
import { AccessibleTable } from '../ui/AccessibleTable';

interface InventoryTableProps {
  parts: Part[];
  loading: boolean;
  isMultiTenant: boolean;
  onRowClick: (part: Part) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({
  parts,
  loading,
  isMultiTenant,
  onRowClick
}) => {
  const columns = [
    { key: 'sku', label: 'SKU / Cod. Int.', sortable: true },
    ...(isMultiTenant ? [{ key: 'tenantId', label: 'Tenant', sortable: false }] : []),
    { key: 'description', label: 'Dati Prodotto', sortable: true },
    { key: 'stock', label: 'Stock', sortable: true },
    { key: 'supplier', label: 'Dati Fornitore', sortable: false },
    { key: 'cost', label: 'Prezzo', sortable: true }
  ];

  const getStockColor = (stock: number, safetyStock: number) => {
    return stock <= safetyStock
      ? 'bg-red-100 text-red-800'
      : 'bg-green-100 text-green-800';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase"
                scope="col"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-200">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-slate-500">
                Caricamento parti...
              </td>
            </tr>
          ) : parts.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-4 text-center text-slate-500">
                Nessuna parte trovata
              </td>
            </tr>
          ) : (
            parts.map((part) => (
              <tr
                key={part.id}
                onClick={() => onRowClick(part)}
                className="cursor-pointer hover:bg-blue-50 transition-colors"
                role="button"
                tabIndex={0}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onRowClick(part);
                  }
                }}
                aria-label={`Modifica parte ${part.sku}`}
              >
                <td className="px-6 py-4">
                  <div className="text-sm font-bold text-epicor-600">{part.sku}</div>
                  {part.internalCode && (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Ref: {part.internalCode}
                    </div>
                  )}
                </td>
                {isMultiTenant && (
                  <td className="px-6 py-4 text-xs font-medium text-slate-400 uppercase">
                    {part.tenantId}
                  </td>
                )}
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-800 font-medium">{part.description}</div>
                  {part.manufacturer && (
                    <div className="text-xs text-slate-500 mt-1">
                      {part.manufacturer.name}{' '}
                      <span className="text-slate-400 font-mono">
                        ({part.manufacturer.partCode})
                      </span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${getStockColor(
                      part.stock,
                      part.safetyStock
                    )}`}
                  >
                    {part.stock} {part.uom}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-500">
                    {part.suppliers?.habitual?.name || 'N/A'}
                  </div>
                  {part.suppliers?.habitual?.partCode && (
                    <div className="text-xs text-slate-400">
                      Cod: {part.suppliers.habitual.partCode}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-700">
                  € {part.cost}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};
