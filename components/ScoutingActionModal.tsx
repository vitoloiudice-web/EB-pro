import React, { useState, useEffect } from 'react';
import { geminiService } from '../services/geminiService';
import { Client, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import { jsPDF } from 'jspdf';
import { applyStandardHeader, applyStandardSignature, applyPageFooter, PDF_CONFIG } from '../services/pdfService';

interface ScoutingActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidateName: string;
  itemName: string;
  client: Client;
}

type TabType = 'RFI' | 'NDA' | 'RFQ';

const ScoutingActionModal: React.FC<ScoutingActionModalProps> = ({ isOpen, onClose, candidateName, itemName, client }) => {
  const [activeTab, setActiveTab] = useState<TabType>('RFI');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && candidateName) {
      generateContent(activeTab);
    }
  }, [isOpen, activeTab, candidateName]);

  const loadProfile = async () => {
    try {
      const profile = await dataService.getAdminProfile(client);
      if (profile) setAdminProfile(profile as AdminProfile);
    } catch (e) {
      console.error("Failed to load profile for scouting modal", e);
    }
  };

  const generateContent = async (type: TabType) => {
    setLoading(true);
    setContent('');
    try {
      const text = await geminiService.generateEngagementContent(type, candidateName, itemName, client.name);
      setContent(text);
    } catch (e) {
      setContent("Errore durante la generazione.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setSuccess("Contenuto copiato negli appunti!");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const { margin } = PDF_CONFIG;

    const titles = {
        'RFI': 'RICHIESTA DI INFORMAZIONI (RFI)',
        'NDA': 'NON-DISCLOSURE AGREEMENT (NDA)',
        'RFQ': 'RICHIESTA DI OFFERTA (RFQ)'
    };

    const docNum = `${activeTab}-${new Date().getTime().toString().slice(-6)}`;

    // Standard Header
    const startY = applyStandardHeader(
      doc, 
      titles[activeTab] || activeTab, 
      candidateName, 
      docNum, 
      adminProfile
    );

    // Body
    doc.setFontSize(10);
    doc.setTextColor(50);
    
    // Split text to fit page width
    const splitText = doc.splitTextToSize(content, doc.internal.pageSize.width - (margin * 2));
    
    // Check for page overflow
    let y = startY;
    const pageHeight = doc.internal.pageSize.height;
    
    for (const line of splitText) {
        if (y > pageHeight - 40) {
            doc.addPage();
            y = 20;
        }
        doc.text(line, margin, y);
        y += 6;
    }

    // Standard Signature
    const nextY = applyStandardSignature(doc, y + 20, adminProfile);

    // Standard Page Footer (ISO + Pagination)
    applyPageFooter(doc, `MOD-SCT-${activeTab}-01`);

    doc.save(`${activeTab}_${candidateName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
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
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto custom-scrollbar">
            {(['RFI', 'NDA', 'RFQ'] as TabType[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 min-w-[120px] py-4 text-sm font-bold text-center transition-colors ${
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
        <div className="p-4 sm:p-6 flex-1 overflow-auto custom-scrollbar flex flex-col">
            <div className="min-w-[300px] flex-1 flex flex-col">
                <div className="neu-input bg-white p-6 rounded-xl flex-1 font-mono text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-inner overflow-auto custom-scrollbar">
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
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white/50 flex justify-end space-x-4">
            <button onClick={onClose} className="neu-btn px-6 py-2 text-slate-600">Chiudi</button>
            <button 
                onClick={handleExportPDF} 
                disabled={loading || !content}
                className="neu-btn px-6 py-2 text-blue-600 font-bold border border-blue-100 flex items-center"
            >
                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Esporta PDF
            </button>
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