import React, { useState } from 'react';
import { Part, SupplierInfo } from '../../types';
import { useToast } from '../ui/Toast';

interface InventoryModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  part: Part | null;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  isMultiTenant: boolean;
}

interface FormState {
  skuComp: { category: string; family: string; product: string; variant: string; progressive: string };
  internalCode: string;
  description: string;
  uom: string;
  manufacturer: SupplierInfo;
  habitualSupplier: SupplierInfo;
  altSuppliers: SupplierInfo[];
  stockInfo: { stock: number; safety: number };
}

const emptySupplier = (): SupplierInfo => ({ name: '', partCode: '', price: 0, moq: 0, leadTime: 0 });

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  mode,
  part,
  onClose,
  onSubmit,
  isMultiTenant
}) => {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(e);
      showToast(
        mode === 'create' ? 'Parte creata con successo' : 'Parte aggiornata con successo',
        'success'
      );
      onClose();
    } catch (error) {
      showToast(
        `Errore durante il ${mode === 'create' ? 'salvataggio' : 'aggiornamento'} della parte`,
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <h2 id="modal-title" className="text-xl font-bold text-slate-800">
            {mode === 'create' ? 'Nuova Parte' : 'Modifica Parte'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Chiudi modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">SKU</label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm"
                placeholder="Auto-calcolato"
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Codice Interno
              </label>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Categoria</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Famiglia</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Prodotto</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Variante</label>
              <input type="text" className="mt-1 block w-full rounded-md border border-slate-300 shadow-sm" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-epicor-600 text-white hover:bg-epicor-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Salvataggio...' : mode === 'create' ? 'Crea Parte' : 'Aggiorna Parte'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
