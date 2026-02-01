import React from 'react';
import { AiAnalysisResult } from '../types';

interface GeminiActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: AiAnalysisResult | null;
}

const GeminiActionModal: React.FC<GeminiActionModalProps> = ({ isOpen, onClose, analysis }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-[#EEF2F6] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Gemini Branding */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
             </div>
             <div>
                <h3 className="text-xl font-bold text-slate-800">Gemini Decision Center</h3>
                <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Analisi & Intervento Proattivo</p>
             </div>
          </div>
          <button onClick={onClose} className="neu-icon-btn text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
           
           <div className="mb-8 neu-flat p-6 border-l-4 border-indigo-500 bg-white/50">
               <h4 className="text-sm font-bold text-slate-500 uppercase mb-2">Sintesi Analisi</h4>
               <p className="text-lg font-medium text-slate-700 leading-relaxed italic">
                   "{analysis?.summary || 'Nessuna analisi disponibile.'}"
               </p>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               
               {/* 1. STRATEGIC PILLAR */}
               <div className="neu-flat p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                   <div>
                       <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-4 neu-pressed">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                       </div>
                       <h4 className="text-lg font-bold text-slate-700 mb-2">Strategia</h4>
                       <p className="text-sm text-slate-500 mb-4">Diversificazione della Supply Chain per mitigare i rischi di approvvigionamento.</p>
                       <ul className="text-xs text-slate-600 space-y-2 mb-6">
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2"></span>Analisi nuovi fornitori</li>
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-slate-400 rounded-full mr-2"></span>Riduzione dipendenza Single-Source</li>
                       </ul>
                   </div>
                   <button className="neu-btn w-full py-3 text-sm text-slate-700 font-bold border-t border-slate-100">
                       Avvia Qualifica Fornitori
                   </button>
               </div>

               {/* 2. OPERATIONAL PILLAR */}
               <div className="neu-flat p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform border-t-4 border-blue-500">
                   <div>
                       <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-4 neu-pressed">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <h4 className="text-lg font-bold text-slate-700 mb-2">Operatività</h4>
                       <p className="text-sm text-slate-500 mb-4">Ottimizzazione livelli di scorta e gestione urgenze per evitare rotture di stock.</p>
                       <ul className="text-xs text-slate-600 space-y-2 mb-6">
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>Riordino articoli critici (Elettronica)</li>
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-2"></span>Bilanciamento magazzino</li>
                       </ul>
                   </div>
                   <button className="neu-btn w-full py-3 text-sm text-white bg-blue-600 shadow-md">
                       Genera Ordini Bozza
                   </button>
               </div>

               {/* 3. ECONOMIC PILLAR */}
               <div className="neu-flat p-6 flex flex-col justify-between hover:scale-[1.02] transition-transform">
                   <div>
                       <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 neu-pressed">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                       </div>
                       <h4 className="text-lg font-bold text-slate-700 mb-2">Economico</h4>
                       <p className="text-sm text-slate-500 mb-4">Leva commerciale per migliorare margini e condizioni di pagamento.</p>
                       <ul className="text-xs text-slate-600 space-y-2 mb-6">
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>Richiesta sconti su volumi</li>
                           <li className="flex items-center"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2"></span>Consolidamento acquisti</li>
                       </ul>
                   </div>
                   <button className="neu-btn w-full py-3 text-sm text-emerald-700 font-bold border-t border-emerald-100">
                       Prepara Email Rinegoziazione
                   </button>
               </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default GeminiActionModal;