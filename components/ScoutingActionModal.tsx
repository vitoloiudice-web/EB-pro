import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';

interface ScoutingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  itemName: string;
  companyName: string;
}

type TabType = 'RFI' | 'NDA' | 'RFQ';

const ScoutingActionModal: React.FC<ScoutingActionModalProps> = ({ isOpen, onClose, candidateName, itemName, companyName }) => {
  const [activeTab, setActiveTab] = useState<TabType>('RFI');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && candidateName) {
      generateContent(activeTab);
    }
  }, [isOpen, activeTab, candidateName]);

  const generateContent = async (type: TabType) => {
    setLoading(true);
    setContent('');
    try {
      const text = await geminiService.generateEngagementContent(type, candidateName, itemName, companyName);
      setContent(text);
    } catch (e) {
      setContent("Errore durante la generazione.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    alert("Contenuto copiato negli appunti!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 bg-white/50 flex justify-between items-center">
            <div>
                <h3 className="text-xl font-bold text-slate-700">Strategia di Contatto</h3>
                <p className="text-sm text-slate-500">Gestione interazione con <span className="font-bold text-blue-600">{candidateName}</span></p>
            </div>
            <button onClick={onClose} className="neu-icon-btn">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
            {(['RFI', 'NDA', 'RFQ'] as TabType[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-4 text-sm font-bold text-center transition-colors ${
                        activeTab === tab 
                        ? 'text-blue-600 border-b-2 border-blue-600 bg-white' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                >
                    {tab === 'RFI' && '1. Request for Info'}
                    {tab === 'NDA' && '2. Non-Disclosure Agreement'}
                    {tab === 'RFQ' && '3. Request for Quotation'}
                </button>
            ))}
        </div>

        {/* Content Area */}
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="neu-input bg-white p-6 rounded-xl flex-1 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full space-y-4">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-slate-400 font-bold animate-pulse">Generazione documento con Gemini AI...</p>
                    </div>
                ) : (
                    content
                )}
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end space-x-4">
            <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Chiudi</button>
            <button 
                onClick={handleCopy} 
                disabled={loading || !content}
                className="neu-btn px-6 py-2 text-white bg-blue-600 shadow-md flex items-center"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                Copia Testo
            </button>
        </div>

      </div>
    </div>
  );
};

export default ScoutingActionModal;