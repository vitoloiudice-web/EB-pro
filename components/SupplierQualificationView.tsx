import React, { useState, useMemo } from 'react';
import { Company, Supplier, QualificationCriterion } from '../types';
import { 
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  BarChart, Bar, Legend
} from 'recharts';
import CriteriaManagerModal from './CriteriaManagerModal';

interface SupplierQualificationViewProps {
  company: Company;
}

// --- INITIAL MOCK DATA ---
const DEFAULT_CRITERIA: QualificationCriterion[] = [
  { id: 'iso9001', label: 'Certificazione ISO 9001', type: 'BOOLEAN', weight: 15, isActive: true, category: 'CERTIFICATION' },
  { id: 'financial', label: 'Solidità Finanziaria', type: 'SCORE', weight: 25, isActive: true, category: 'FINANCIAL' },
  { id: 'esg', label: 'Rating ESG', type: 'SCORE', weight: 20, isActive: true, category: 'ESG' },
  { id: 'quality', label: 'Qualità Forniture (Storico)', type: 'SCORE', weight: 30, isActive: true, category: 'OPERATIONAL' },
  { id: 'ethics', label: 'Codice Etico', type: 'BOOLEAN', weight: 10, isActive: true, category: 'ESG' },
];

const MOCK_SUPPLIERS_FULL: Supplier[] = [
  { 
    id: 'SUP-01', name: 'HydraForce Italia', rating: 4.8, email: 'sales@hydraforce.it', paymentTerms: '60 DFFM', status: 'QUALIFIED', auditDate: '2023-05-10',
    qualificationValues: { 'iso9001': 100, 'financial': 90, 'esg': 85, 'quality': 95, 'ethics': 100 }
  },
  { 
    id: 'SUP-02', name: 'Acciaierie Venete', rating: 4.2, email: 'ordini@acciaierie.it', paymentTerms: '30 DF', status: 'PENDING', auditDate: '2024-01-15',
    qualificationValues: { 'iso9001': 100, 'financial': 80, 'esg': 60, 'quality': 85, 'ethics': 100 }
  },
  { 
    id: 'SUP-03', name: 'AutoElectric Pro', rating: 3.9, email: 'info@autoelectric.com', paymentTerms: 'RB 30/60', status: 'EXPIRED', auditDate: '2022-11-20',
    qualificationValues: { 'iso9001': 0, 'financial': 70, 'esg': 40, 'quality': 78, 'ethics': 0 }
  },
  { 
    id: 'SUP-04', name: 'Vernici PRO', rating: 2.5, email: 'vendite@vernicipro.it', paymentTerms: 'BB 30', status: 'REJECTED', auditDate: '2023-09-01',
    qualificationValues: { 'iso9001': 0, 'financial': 40, 'esg': 20, 'quality': 50, 'ethics': 0 }
  },
];

const SupplierQualificationView: React.FC<SupplierQualificationViewProps> = ({ company }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS_FULL);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [criteria, setCriteria] = useState<QualificationCriterion[]>(DEFAULT_CRITERIA);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // --- DYNAMIC SCORE CALCULATION ---
  const calculateDynamicScore = (sup: Supplier) => {
    let totalScore = 0;
    let totalWeight = 0;

    criteria.filter(c => c.isActive).forEach(c => {
       const val = sup.qualificationValues?.[c.id] || 0; // If missing, 0
       totalScore += val * c.weight;
       totalWeight += c.weight;
    });

    if (totalWeight === 0) return 0;
    return Math.round(totalScore / totalWeight);
  };

  const calculateCategoryBreakdown = (sup: Supplier) => {
     const breakdown: Record<string, number> = {};
     criteria.filter(c => c.isActive).forEach(c => {
         const val = sup.qualificationValues?.[c.id] || 0;
         const weightedVal = (val * c.weight); // Raw weighted contribution
         breakdown[c.category] = (breakdown[c.category] || 0) + weightedVal;
     });
     // Normalize to fit 0-100 scale approximately for chart visuals
     // Note: This is simplified. Real math would normalize by total weight per category.
     return breakdown;
  };

  // --- CHART DATA PREPARATION ---
  const chartData = useMemo(() => {
    let totalWeight = criteria.filter(c => c.isActive).reduce((acc, c) => acc + c.weight, 0);
    if(totalWeight === 0) totalWeight = 1;

    return suppliers.map(sup => {
      const breakdown = calculateCategoryBreakdown(sup);
      return {
        name: sup.name,
        // Normalize values to represent contribution to the final 0-100 score
        CERTIFICATION: Math.round((breakdown['CERTIFICATION'] || 0) / totalWeight),
        FINANCIAL: Math.round((breakdown['FINANCIAL'] || 0) / totalWeight),
        ESG: Math.round((breakdown['ESG'] || 0) / totalWeight),
        OPERATIONAL: Math.round((breakdown['OPERATIONAL'] || 0) / totalWeight),
        total: calculateDynamicScore(sup)
      };
    }).sort((a,b) => b.total - a.total); // Sort by highest score
  }, [suppliers, criteria]);

  // --- ACTIONS ---
  const handleExportPDF = () => {
    setIsExporting(true);
    setTimeout(() => {
        setIsExporting(false);
        alert("Report Qualifica Fornitori (PDF) generato e scaricato!");
    }, 1500);
  };

  // Status Badge Helper
  const getStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'QUALIFIED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-600">Qualificato</span>;
      case 'PENDING': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-600">In Revisione</span>;
      case 'EXPIRED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-600">Scaduto</span>;
      case 'REJECTED': return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-600">Non Idoneo</span>;
      default: return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-500">N/A</span>;
    }
  };

  return (
    <div className="flex flex-col h-auto lg:h-full space-y-6">
      
      <CriteriaManagerModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        criteria={criteria} 
        onUpdateCriteria={setCriteria} 
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-700">Qualifica Fornitori</h2>
          <p className="text-sm text-slate-500 font-medium">Gestione Audit e Vendor Rating</p>
        </div>
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="neu-btn px-4 py-2 text-slate-600 text-sm flex-1 sm:flex-none whitespace-nowrap"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Configura Parametri
          </button>
          <button className="neu-btn px-4 py-2 text-blue-600 text-sm font-bold flex-1 sm:flex-none whitespace-nowrap">
            + Nuovo Fornitore
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 lg:overflow-hidden">
        
        {/* LEFT LIST */}
        <div className="w-full lg:w-1/3 neu-flat flex flex-col lg:overflow-hidden max-h-[400px] lg:max-h-[600px]">
           <div className="p-4 border-b border-slate-200/50 bg-slate-50/50">
             <h3 className="font-bold text-slate-700">Elenco Fornitori</h3>
           </div>
           <div className="overflow-y-auto flex-1 custom-scrollbar p-2 space-y-2">
             {suppliers.map(sup => {
               const score = calculateDynamicScore(sup);
               return (
                 <div 
                   key={sup.id}
                   onClick={() => setSelectedSupplier(sup)}
                   className={`p-4 rounded-xl cursor-pointer transition-all ${selectedSupplier?.id === sup.id ? 'neu-pressed border-l-4 border-blue-500' : 'neu-flat hover:bg-slate-50'}`}
                 >
                   <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-slate-700 text-sm">{sup.name}</span>
                     {getStatusBadge(sup.status)}
                   </div>
                   <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>ID: {sup.id}</span>
                      <span className="flex items-center">
                        Ranking: 
                        <div className="w-16 h-2 bg-slate-200 rounded-full ml-2 overflow-hidden">
                           <div className="bg-blue-600 h-full" style={{width: `${score}%`}}></div>
                        </div>
                        <b className="ml-1 text-slate-700">{score}</b>
                      </span>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>

        {/* RIGHT DETAIL & CHART */}
        <div className="w-full lg:w-2/3 flex flex-col gap-6 lg:overflow-y-auto custom-scrollbar pr-0 lg:pr-2 pb-4">
           {selectedSupplier ? (
             <>
               {/* Main Info Card */}
               <div className="neu-flat p-8 relative overflow-hidden">
                  <div className="flex justify-between items-start z-10 relative">
                     <div>
                       <h2 className="text-xl sm:text-2xl font-black text-slate-700 mb-1">{selectedSupplier.name}</h2>
                       <p className="text-slate-500 text-sm mb-4">Ultimo Audit: <b>{selectedSupplier.auditDate}</b></p>
                       <div className="flex space-x-2">
                         {getStatusBadge(selectedSupplier.status)}
                       </div>
                     </div>
                     <div className="text-right">
                       <div className="text-4xl sm:text-5xl font-black text-blue-600">{calculateDynamicScore(selectedSupplier)}</div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Global Score</div>
                     </div>
                  </div>
                  
                  {/* Decorative Background Icon */}
                  <div className="absolute -bottom-6 -right-6 text-slate-100 transform rotate-12 -z-0">
                     <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </div>
               </div>

               {/* Matrix Position & Dynamic Criteria */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 
                 {/* Mini Matrix - Keeping it as "Quality vs Price" for now, can be updated later */}
                 <div className="neu-flat p-6">
                    <h4 className="text-sm font-bold text-slate-600 mb-4 uppercase">Posizionamento Strategico</h4>
                    <div className="h-48 w-full min-h-[192px]">
                       <ResponsiveContainer width="100%" height="100%">
                          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
                              <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" />
                              <XAxis type="number" dataKey="x" name="Cost" hide domain={[0, 100]} />
                              <YAxis type="number" dataKey="y" name="Quality" hide domain={[0, 100]} />
                              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                              <Scatter name="Current" data={[{ x: 50, y: selectedSupplier.rating * 20, z: 100 }]} fill="#3b82f6">
                                <Cell fill="#3b82f6" />
                              </Scatter>
                          </ScatterChart>
                       </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Dynamic Criteria List */}
                 <div className="neu-flat p-6 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-600 mb-4 uppercase">Valutazione Criteri Attivi</h4>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                         {criteria.filter(c => c.isActive).map(c => {
                             const rawVal = selectedSupplier.qualificationValues?.[c.id];
                             const displayVal = rawVal !== undefined 
                                ? (c.type === 'BOOLEAN' ? (rawVal === 100 ? 'Sì' : 'No') : `${rawVal}/100`) 
                                : 'N/A';
                             const colorClass = rawVal >= 70 ? 'text-green-600' : (rawVal >= 50 ? 'text-amber-600' : 'text-red-500');

                             return (
                                <div key={c.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-1 last:border-0">
                                    <span className="text-slate-600 truncate mr-2" title={c.label}>{c.label}</span>
                                    <span className={`font-bold whitespace-nowrap ${rawVal !== undefined ? colorClass : 'text-slate-400'}`}>{displayVal}</span>
                                </div>
                             );
                         })}
                      </div>
                    </div>
                    
                    <div className="mt-4 flex space-x-3">
                       {selectedSupplier.status === 'QUALIFIED' ? (
                          <button className="flex-1 neu-btn py-2 text-xs text-amber-600">Pianifica Audit</button>
                       ) : (
                          <button className="flex-1 neu-btn py-2 text-xs text-green-600 font-bold">Approva</button>
                       )}
                    </div>
                 </div>
               </div>

               {/* New Bottom Chart Section - Trend & Comparison */}
               <div className="neu-flat p-8 mt-2">
                   <div className="flex justify-between items-center mb-6">
                       <div>
                           <h3 className="text-lg font-bold text-slate-700">Analisi Comparativa Strategica</h3>
                           <p className="text-xs text-slate-500">Composizione punteggio per categoria di criterio</p>
                       </div>
                       <button 
                           onClick={handleExportPDF}
                           disabled={isExporting}
                           className="neu-btn px-4 py-2 text-xs text-red-600 flex items-center"
                        >
                           {isExporting ? 'Generazione...' : (
                               <>
                                <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                Export PDF
                               </>
                           )}
                       </button>
                   </div>
                   
                   <div className="h-64 w-full min-h-[256px]">
                       <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={chartData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#d1d9e6" />
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="name" type="category" width={120} tick={{fontSize: 11, fill:'#64748b', fontWeight:700}} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6', borderRadius: '12px'}} />
                                <Legend iconType="circle" />
                                {/* Stacked Bars */}
                                <Bar dataKey="CERTIFICATION" name="Certificazioni" stackId="a" fill="#3b82f6" barSize={20} />
                                <Bar dataKey="FINANCIAL" name="Finanziario" stackId="a" fill="#10b981" barSize={20} />
                                <Bar dataKey="ESG" name="ESG/Etica" stackId="a" fill="#14b8a6" barSize={20} />
                                <Bar dataKey="OPERATIONAL" name="Operativo" stackId="a" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                           </BarChart>
                       </ResponsiveContainer>
                   </div>
               </div>

             </>
           ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-10 neu-pressed rounded-3xl border-2 border-dashed border-slate-300 m-4">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p>Seleziona un fornitore dalla lista per visualizzare i dettagli di qualifica.</p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default SupplierQualificationView;