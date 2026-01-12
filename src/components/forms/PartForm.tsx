import React, { useState } from 'react';
import { useToast } from './ui/Toast';
import { accessibleButtonClasses, accessibleInputClasses, useKeyboardNavigation } from '../utils/a11y';

interface PartFormProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  mode?: 'create' | 'edit';
}

export const PartForm: React.FC<PartFormProps> = ({
  isOpen,
  isLoading = false,
  onClose,
  onSubmit,
  mode = 'create'
}) => {
  const { success, error } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    sku: '',
    description: '',
    uom: 'PZ',
    stock: 0,
    safetyStock: 0,
    leadTime: 0,
    cost: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sku.trim()) {
      error('SKU è obbligatorio');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(formData);
      success(`Parte ${mode === 'create' ? 'creata' : 'aggiornata'} con successo`);
      onClose();
    } catch (err) {
      error(`Errore: ${err instanceof Error ? err.message : 'Operazione fallita'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = useKeyboardNavigation(onClose);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="presentation"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg p-6 max-w-md w-full max-h-96 overflow-y-auto shadow-lg"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-title"
        onKeyDown={handleKeyDown}
      >
        <h2 
          id="form-title" 
          className="text-2xl font-bold mb-4 text-gray-900"
        >
          {mode === 'create' ? 'Nuova Parte' : 'Modifica Parte'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SKU Field */}
          <div>
            <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500" aria-label="obbligatorio">*</span>
            </label>
            <input
              id="sku"
              type="text"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className={accessibleInputClasses}
              aria-required="true"
              aria-describedby="sku-hint"
              disabled={submitting}
              required
            />
            <p id="sku-hint" className="text-xs text-gray-500 mt-1">
              Identificativo univoco della parte
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descrizione
            </label>
            <input
              id="description"
              type="text"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className={accessibleInputClasses}
              aria-describedby="desc-hint"
              disabled={submitting}
            />
            <p id="desc-hint" className="text-xs text-gray-500 mt-1">
              Descrizione breve della parte
            </p>
          </div>

          {/* UOM */}
          <div>
            <label htmlFor="uom" className="block text-sm font-medium text-gray-700 mb-1">
              Unità di Misura
            </label>
            <select
              id="uom"
              name="uom"
              value={formData.uom}
              onChange={handleChange}
              className={accessibleInputClasses}
              disabled={submitting}
              aria-label="Seleziona unità di misura"
            >
              <option value="PZ">Pezzo</option>
              <option value="KG">Chilogrammo</option>
              <option value="MT">Metro</option>
              <option value="LT">Litro</option>
            </select>
          </div>

          {/* Stock */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock
              </label>
              <input
                id="stock"
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className={accessibleInputClasses}
                disabled={submitting}
                min="0"
              />
            </div>
            <div>
              <label htmlFor="safetyStock" className="block text-sm font-medium text-gray-700 mb-1">
                Stock Minimo
              </label>
              <input
                id="safetyStock"
                type="number"
                name="safetyStock"
                value={formData.safetyStock}
                onChange={handleChange}
                className={accessibleInputClasses}
                disabled={submitting}
                min="0"
              />
            </div>
          </div>

          {/* LeadTime & Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="leadTime" className="block text-sm font-medium text-gray-700 mb-1">
                Lead Time (gg)
              </label>
              <input
                id="leadTime"
                type="number"
                name="leadTime"
                value={formData.leadTime}
                onChange={handleChange}
                className={accessibleInputClasses}
                disabled={submitting}
                min="0"
              />
            </div>
            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-700 mb-1">
                Costo €
              </label>
              <input
                id="cost"
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                className={accessibleInputClasses}
                disabled={submitting}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className={`${accessibleButtonClasses} bg-gray-300 text-gray-700 hover:bg-gray-400`}
              disabled={submitting}
              aria-label="Annulla"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={submitting || isLoading}
              className={`${accessibleButtonClasses} bg-blue-500 text-white hover:bg-blue-600 disabled:bg-blue-400`}
              aria-label={submitting ? 'Salvataggio in corso...' : 'Salva parte'}
            >
              {submitting ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
