
import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Conferma", 
  cancelText = "Annulla",
  type = 'info'
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-white/50">
          <h3 className={`text-lg font-bold ${type === 'danger' ? 'text-red-600' : 'text-slate-700'}`}>{title}</h3>
        </div>
        <div className="p-6">
          <p className="text-slate-600 text-sm font-medium leading-relaxed">{message}</p>
        </div>
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end space-x-4">
          <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600 text-sm font-bold">{cancelText}</button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`neu-btn px-6 py-2 text-white text-sm font-bold shadow-md ${type === 'danger' ? 'bg-red-500' : 'bg-blue-600'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
