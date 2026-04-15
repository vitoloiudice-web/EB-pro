import React, { useState, useRef } from 'react';

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (base64String: string) => void;
  currentLogo: string | null;
}

const LogoUploadModal: React.FC<LogoUploadModalProps> = ({ isOpen, onClose, onSave, currentLogo }) => {
  const [preview, setPreview] = useState<string | null>(currentLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (preview) {
      onSave(preview);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="neu-flat w-full max-w-md p-6 flex flex-col max-h-[90vh] animate-slide-up">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-slate-700">Importa Logo Aziendale</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-6">
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-4">
              Il logo verrà utilizzato su tutti i documenti emessi dalla Centrale Acquisti (Ordini, Contratti, Report).
            </p>
            
            <div 
              className="w-48 h-48 mx-auto neu-pressed rounded-2xl overflow-hidden flex items-center justify-center bg-white/50 border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors cursor-pointer relative group"
              onClick={() => fileInputRef.current?.click()}
            >
              {preview ? (
                <img src={preview} alt="Logo Preview" className="w-full h-full object-contain p-4" />
              ) : (
                <div className="text-slate-400 flex flex-col items-center">
                  <svg className="w-12 h-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  <span className="text-sm font-bold">Clicca per caricare</span>
                </div>
              )}
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white font-bold text-sm">Cambia Immagine</span>
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/svg+xml" 
              onChange={handleFileChange} 
            />
            <p className="text-xs text-slate-400 mt-3">Formati supportati: PNG, JPG, SVG. Max 2MB.</p>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-slate-200">
          <button onClick={onClose} className="neu-btn px-5 py-2 text-slate-600 font-bold">
            Annulla
          </button>
          <button 
            onClick={handleSave} 
            disabled={!preview}
            className="neu-btn px-5 py-2 text-blue-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Salva Logo
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoUploadModal;
