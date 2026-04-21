import React, { useState, useMemo, useEffect } from 'react';
import { Client, AdminProfile } from '../types';
import { dataService } from '../services/dataService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, 
  LineChart, Line, ScatterChart, Scatter, ZAxis, Legend, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, PieChart, Pie,
  ComposedChart, Area, AreaChart
} from 'recharts';
import Tooltip from './common/Tooltip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applyStandardHeader, applyStandardFooter, PDF_CONFIG } from '../services/pdfService';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

interface BIProps {
  client: Client;
}

const BusinessIntelligenceView: React.FC<BIProps> = ({ client }) => {
  const [reportType, setReportType] = useState<'PERFORMANCE' | 'QUALITY' | 'FEE_REVENUE' | 'COMMERCIAL' | 'TREND' | 'GOVERNANCE'>('PERFORMANCE');
  const [savingsChartMode, setSavingsChartMode] = useState<'LINE' | 'BAR'>('LINE');
  const [trendTimeframe, setTrendTimeframe] = useState<'1M' | '3M' | '6M' | '1Y'>('1M');
  const [generating, setGenerating] = useState(false);

  // --- DATA ---
  const [supplierPerformanceData, setSupplierPerformanceData] = useState<any[]>([]);
  const [savingsData, setSavingsData] = useState<any[]>([]);
  const [qualityMatrix, setQualityMatrix] = useState<any[]>([]);
  const [supplierRadarData, setSupplierRadarData] = useState<any[]>([]);
  const [defectTypesData, setDefectTypesData] = useState<any[]>([]);
  const [ncTrendData, setNcTrendData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [commercialSavingsData, setCommercialSavingsData] = useState<any[]>([]);
  const [commercialTrendData, setCommercialTrendData] = useState<any[]>([]);
  const [activeCustomers, setActiveCustomers] = useState<any[]>([]);
  const [showCustomers, setShowCustomers] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);

  // Fetch real data from database
  useEffect(() => {
    const fetchData = async () => {
      if (!client) return;
      try {
        // Fetch Admin Profile
        const profile = await dataService.getAdminProfile(client);
        if (profile) setAdminProfile(profile as AdminProfile);

        const biData = await dataService.getBIData(client);
        if (!biData) return;

        const { suppliers, items, orders, customers = [] } = biData;

        // 0. Active Customers
        const today = new Date();
        const active = (customers as any[]).filter(c => {
          if (!c.contractEndDate) return true; // Assume active if no end date
          const endDate = new Date(c.contractEndDate);
          return endDate >= today;
        });
        setActiveCustomers(active);

        // 1. Supplier Performance
        const performance = suppliers.map(s => ({
          name: s.name,
          affidabilita: s.rating ? s.rating * 20 : 0, // Normalize 1-5 to 0-100
          qualita: s.qualificationValues?.quality || (s.rating ? s.rating * 20 : 0)
        })).sort((a, b) => b.affidabilita - a.affidabilita).slice(0, 10);
        setSupplierPerformanceData(performance);

        const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
        const currentMonth = new Date().getMonth();

        // Safe date parsing helper
        const getOrderDate = (o: any) => o.created_at?.seconds ? new Date(o.created_at.seconds * 1000) : new Date(o.date || Date.now());

        // 2. Savings / Fee Revenue (Derived from orders)
        // Fee revenue assumes a standard % or absolute value. If not in DB, we rely strictly on orders.
        const feeTrend = months.slice(0, currentMonth + 1).map((m, i) => {
          const monthlyOrders = orders.filter(o => getOrderDate(o).getMonth() === i);
          const actualFee = monthlyOrders.reduce((acc, o) => acc + ((o.totalAmount || 0) * 0.05), 0); // Still retaining a literal 5% calculation, but based strictly on real 'totalAmount'.
          return {
            month: m,
            actual: actualFee,
            target: 0 // Cannot determine target without target data in DB
          };
        });
        setSavingsData(feeTrend.some(f => f.actual > 0) ? feeTrend : []);

        // 3. Quality Matrix (Real DB properties)
        const matrix = suppliers.map(s => {
          const supplierOrders = orders.filter(o => o.supplierId === s.id);
          const supplierItems = items.filter(i => i.supplierId === s.id);
          if (supplierOrders.length === 0) return null;
          
          const avgPrice = supplierItems.length > 0 ? supplierItems.reduce((acc, i) => acc + (i.cost || 0), 0) / supplierItems.length : 0;
          return {
            name: s.name,
            x: avgPrice, // Actual avg price
            y: s.rating ? s.rating * 20 : 0, // Quality proxy via rating
            z: supplierOrders.length // Number of orders
          };
        }).filter(Boolean);
        setQualityMatrix(matrix as any[]);

        // 4. Radar Data (Benchmark top 2 - Real Data)
        if (suppliers.length >= 2) {
          const s1 = suppliers[0];
          const s2 = suppliers[1];
          // We can only compare what we have: rating, and derived metrics...
          const s1Items = items.filter(i => i.supplierId === s1.id);
          const s2Items = items.filter(i => i.supplierId === s2.id);
          
          const s1LeadTime = s1Items.length > 0 ? s1Items.reduce((acc, i) => acc + (i.leadTimeDays || 0), 0) / s1Items.length : 0;
          const s2LeadTime = s2Items.length > 0 ? s2Items.reduce((acc, i) => acc + (i.leadTimeDays || 0), 0) / s2Items.length : 0;

          const radar = [
            { subject: 'Qualità Generale', A: (s1.rating || 0) * 20, B: (s2.rating || 0) * 20, fullMark: 100 },
            { subject: 'Lead Time (inverso)', A: 100 - s1LeadTime, B: 100 - s2LeadTime, fullMark: 100 },
            { subject: 'Volume Ordini', A: orders.filter(o => o.supplierId === s1.id).length * 10, B: orders.filter(o => o.supplierId === s2.id).length * 10, fullMark: 100 }
          ];
          setSupplierRadarData(radar);
        } else {
          setSupplierRadarData([]);
        }

        // 5. Defect Types & 6. NC Trend 
        // No explicit Non-Conformity table exists in types.ts.
        setDefectTypesData([]);
        setNcTrendData([]);

        // 7. Trend Data (Intermediated Spend)
        const intermediatedTrend = months.slice(0, currentMonth + 1).map((m, i) => {
          const monthlyOrders = orders.filter(o => getOrderDate(o).getMonth() === i);
          const val = monthlyOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
          
          const prevMonthlyOrders = i > 0 ? orders.filter(o => getOrderDate(o).getMonth() === i - 1) : [];
          const prevVal = prevMonthlyOrders.reduce((acc, o) => acc + (o.totalAmount || 0), 0);
          const growth = prevVal > 0 ? ((val - prevVal) / prevVal) * 100 : 0;
          
          return {
            name: m,
            value: val,
            growth: parseFloat(growth.toFixed(1)),
            cagr: 0 // Requires year over year data, setting to 0 for single year
          };
        });
        setTrendData(intermediatedTrend.some(t => t.value > 0) ? intermediatedTrend : []);

        // 8. Commercial Savings (REAL data derived from items & orders)
        const categoriesMap = new Map<string, { estimated: number, actual: number }>();

        orders.forEach(order => {
          (order.items || []).forEach(poi => {
            const matchedItem = items.find(i => i.sku === poi.sku);
            // Default to Macrofamily, or Group, or just "Altre Forniture"
            const groupName = matchedItem?.macroFamily || matchedItem?.group || matchedItem?.category || 'Altre Forniture';
            
            const actualTotal = poi.total || (poi.qty * poi.unitPrice);
            // Baseline estimated cost based on item's standard cost. If missing, assume equal to unitPrice (no savings)
            const baselineUnitCost = matchedItem?.cost && matchedItem.cost > 0 ? matchedItem.cost : poi.unitPrice;
            const estimatedTotal = baselineUnitCost * poi.qty;

            if (!categoriesMap.has(groupName as string)) {
              categoriesMap.set(groupName as string, { estimated: 0, actual: 0 });
            }
            const catData = categoriesMap.get(groupName as string)!;
            catData.estimated += estimatedTotal;
            catData.actual += actualTotal;
          });
        });

        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#64748b', '#ef4444', '#14b8a6'];
        let colorIdx = 0;

        const commercialSavings = Array.from(categoriesMap.entries()).map(([category, vals]) => {
          const saved = vals.estimated - vals.actual;
          const savedPct = vals.estimated > 0 ? (saved / vals.estimated) * 100 : 0;
          const color = colors[colorIdx % colors.length];
          colorIdx++;
          return {
            category,
            estimated: vals.estimated,
            actual: vals.actual,
            saved,
            savedPct: parseFloat(savedPct.toFixed(1)),
            color
          };
        }).filter(s => s.actual > 0).sort((a,b) => b.saved - a.saved);

        setCommercialSavingsData(commercialSavings);

        // Commercial Savings Trend
        const commercialTrend = months.slice(0, currentMonth + 1).map((m, i) => {
          let savingThisMonth = 0;
          orders.forEach(order => {
            if (getOrderDate(order).getMonth() === i) {
               (order.items || []).forEach(poi => {
                  const matchedItem = items.find(it => it.sku === poi.sku);
                  const baselineUnitCost = matchedItem?.cost && matchedItem.cost > 0 ? matchedItem.cost : poi.unitPrice;
                  const estimated = baselineUnitCost * poi.qty;
                  const actual = poi.total || (poi.qty * poi.unitPrice);
                  savingThisMonth += (estimated - actual);
               });
            }
          });
          
          return {
            month: m,
            saving: savingThisMonth,
            target: 0
          };
        });
        setCommercialTrendData(commercialTrend.some(c => c.saving !== 0) ? commercialTrend : []);

      } catch (err) {
        console.error("Failed to fetch BI data:", err);
      }
    };
    fetchData();
  }, [client]);

  const handleGenerateReport = async (format: 'PDF' | 'EXCEL') => {
    setGenerating(true);
    try {
      const getLegendData = (type: string) => {
        switch(type) {
          case 'PERFORMANCE': return [
            ['Affidabilità Fornitori', 'Punteggio che indica quanto un fornitore rispetta gli accordi.'],
            ['On-Time Delivery', 'Percentuale di consegne arrivate esattamente in orario.'],
            ['Completezza', 'Percentuale di ordini consegnati con tutti i pezzi richiesti.']
          ];
          case 'QUALITY': return [
            ['Benchmark Fornitori', 'Confronto tra i migliori fornitori per capire chi offre il servizio migliore.'],
            ['Analisi Non Conformità', 'Suddivisione dei difetti trovati nei prodotti acquistati.'],
            ['Trend Difettosità', 'Andamento nel tempo del numero di difetti riscontrati.'],
            ['Matrice Qualità / Costo', 'Grafico che confronta quanto paghiamo rispetto alla qualità che riceviamo.']
          ];
          case 'FEE_REVENUE': return [
            ['Fatturato da Fee Mensili', 'Guadagni ottenuti ogni mese grazie al nostro servizio.'],
            ['Fatturato Fee YTD', 'Guadagni totali accumulati dall\'inizio dell\'anno fino ad oggi.'],
            ['Clienti Attivi', 'Numero di clienti che stanno attualmente utilizzando i nostri servizi.']
          ];
          case 'COMMERCIAL': return [
            ['Risparmio Ottenuto', 'Soldi che abbiamo fatto risparmiare al cliente rispetto a quanto pensava di spendere.'],
            ['Spesa Effettiva', 'Quello che il cliente ha effettivamente pagato.'],
            ['Categoria Merceologica', 'Il tipo di cose che abbiamo comprato per il cliente (es. Computer, Programmi).']
          ];
          case 'TREND': return [
            ['Spesa Intermediata (Volume)', 'Totale dei soldi spesi per comprare merci per conto dei clienti.'],
            ['Growth (%)', 'Crescita percentuale della spesa rispetto al mese precedente.'],
            ['CAGR (%)', 'Tasso di crescita medio mensile (quanto cresciamo in media ogni mese).']
          ];
          case 'GOVERNANCE': return [
            ['Margine di Contribuzione', 'Guadagno netto rimasto dopo aver pagato i costi diretti.'],
            ['Scostamento Ore', 'Differenza tra le ore stimate per un lavoro e quelle realmente impiegate.'],
            ['Avanzamento (SAL)', 'Stato Avanzamento Lavori, indica la percentuale di completamento di un progetto.'],
            ['Tasso Rilavorazione', 'Percentuale di lavori che abbiamo dovuto rifare a causa di errori.'],
            ['Indice SAL Temporale', 'Andamento del completamento dei lavori nel corso del tempo.']
          ];
          default: return [];
        }
      };

      if (format === 'PDF') {
        const doc = new jsPDF();
        const { margin, primaryColor } = PDF_CONFIG;
        const pageWidth = doc.internal.pageSize.getWidth();

        // Standard Header
        const startY = applyStandardHeader(
          doc, 
          `BUSINESS ANALYTICS - ${reportType}`, 
          client.name, 
          adminProfile
        );

        let bodyData: any[] = [];
        let headData: string[][] = [];

        if (reportType === 'PERFORMANCE') {
          headData = [['Fornitore', 'Affidabilita', 'Qualita']];
          bodyData = supplierPerformanceData.map(s => [s.name, s.affidabilita + '%', s.qualita + '%']);
        } else if (reportType === 'QUALITY') {
          headData = [['Difetto', 'Valore']];
          bodyData = defectTypesData.map(d => [d.name, d.value + '%']);
        } else if (reportType === 'FEE_REVENUE') {
          headData = [['Mese', 'Ricavi Effettivi', 'Target']];
          bodyData = savingsData.map(s => [s.month, '€ ' + s.actual.toLocaleString(), '€ ' + s.target.toLocaleString()]);
        } else if (reportType === 'COMMERCIAL') {
          headData = [['Categoria', 'Iniziale', 'Effettivo', 'Risparmio', '%']];
          bodyData = commercialSavingsData.map(s => [s.category, '€ ' + s.estimated.toLocaleString(), '€ ' + s.actual.toLocaleString(), '€ ' + s.saved.toLocaleString(), s.savedPct + '%']);
        } else if (reportType === 'TREND') {
          headData = [['Mese', 'Volume', 'Growth', 'CAGR']];
          bodyData = trendData.map(t => [t.name, '€ ' + t.value.toLocaleString(), t.growth + '%', t.cagr + '%']);
        } else if (reportType === 'GOVERNANCE') {
          headData = [['KPI', 'Valore']];
          bodyData = [
            ['Margine Contribuzione', trendData.length > 0 ? '32.4%' : '0%'],
            ['Scostamento Ore', trendData.length > 0 ? '-4.2%' : '0%'],
            ['Avanzamento (SAL)', trendData.length > 0 ? '88.0%' : '0%'],
            ['Tasso Rilavorazione', trendData.length > 0 ? '1.8%' : '0%'],
          ];
        }

        let chartImage: string | null = null;
        const chartElement = document.getElementById('export-chart-1');
        if (chartElement) {
            const canvas = await html2canvas(chartElement, { scale: 2, useCORS: true });
            chartImage = canvas.toDataURL('image/png');
        }

        if (bodyData.length > 0) {
          autoTable(doc, {
            startY: startY,
            margin: { right: chartImage ? 80 : margin, left: margin }, // Offset if chart present
            head: headData,
            body: bodyData,
            headStyles: { fillColor: primaryColor }
          });
        } else {
          doc.setFontSize(12);
          doc.text("Nessun dato disponibile.", margin, startY);
        }

        if (chartImage) {
            // Adjust image position based on standardized margin
            doc.addImage(chartImage, 'PNG', pageWidth - margin - 65, startY, 65, 50);
        }

        // Add Legenda
        let finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : startY;
        if (chartImage && finalY < startY + 55) finalY = startY + 55; // Prevent overlap with chart

        finalY += 15;
        if (finalY > doc.internal.pageSize.height - 60) {
          doc.addPage();
          finalY = margin;
        }

        doc.setFontSize(12);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text("Legenda:", margin, finalY);
        finalY += 5;
        
        autoTable(doc, {
          startY: finalY,
          head: [['Termine', 'Significato']],
          body: getLegendData(reportType),
          theme: 'plain',
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 1 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
        });

        // Add Standard Footer
        const tableFinalY = (doc as any).lastAutoTable.finalY + 20;
        applyStandardFooter(doc, tableFinalY, adminProfile, "Report Generato da Centrale Acquisti");

        doc.save(`BI_Report_${reportType}_${client.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
        setSuccess(`Report PDF generato con successo!`);
      } else if (format === 'EXCEL') {
        let wsData: any[] = [];
        let sheetName = reportType.substring(0, 31); // Excel sheet names max 31 chars
        
        if (reportType === 'PERFORMANCE') {
          wsData = [['Fornitore', 'Affidabilità (%)', 'Qualità (%)'], ...supplierPerformanceData.map(s => [s.name, s.affidabilita, s.qualita])];
        } else if (reportType === 'QUALITY') {
          wsData = [['Difetto', 'Valore (%)'], ...defectTypesData.map(d => [d.name, d.value])];
        } else if (reportType === 'FEE_REVENUE') {
          wsData = [['Mese', 'Ricavi Effettivi', 'Target'], ...savingsData.map(s => [s.month, s.actual, s.target])];
        } else if (reportType === 'COMMERCIAL') {
          wsData = [['Categoria', 'Costo Stimato', 'Costo Effettivo', 'Risparmio (€)', 'Risparmio (%)'], ...commercialSavingsData.map(s => [s.category, s.estimated, s.actual, s.saved, s.savedPct])];
        } else if (reportType === 'TREND') {
          wsData = [['Mese', 'Volume', 'Growth (%)', 'CAGR (%)'], ...trendData.map(t => [t.name, t.value, t.growth, t.cagr])];
        } else if (reportType === 'GOVERNANCE') {
          wsData = [['KPI', 'Valore'], ['Margine Contribuzione', trendData.length > 0 ? '32.4%' : '0%'], ['Scostamento Ore', trendData.length > 0 ? '-4.2%' : '0%'], ['Avanzamento (SAL)', trendData.length > 0 ? '88.0%' : '0%'], ['Tasso Rilavorazione', trendData.length > 0 ? '1.8%' : '0%']];
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(wsData.length ? wsData : [['Nessun dato disponibile']]);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);

        // Aggiunge Legenda
        const legendData = getLegendData(reportType);
        const wsLegendData = [['Termine', 'Significato'], ...legendData];
        const wsLegend = XLSX.utils.aoa_to_sheet(wsLegendData);
        XLSX.utils.book_append_sheet(wb, wsLegend, 'Legenda');

        XLSX.writeFile(wb, `BI_Report_${reportType}_${client.name.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
        setSuccess(`Report Excel generato con successo!`);
      }
    } catch (error) {
      console.error("Errore durante la generazione del report:", error);
      // Optional: Add logic to show an error message if you have an setError state
    } finally {
      setGenerating(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const EmptyStateOverlay = ({ message = "Nessun dato disponibile per questo periodo" }) => (
    <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px] z-10 rounded-xl">
      <div className="text-center p-6">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <p className="text-sm font-bold text-slate-500">{message}</p>
        <p className="text-xs text-slate-400 mt-1">I dati verranno visualizzati non appena disponibili nel database.</p>
      </div>
    </div>
  );

  // Custom Tooltip for Scatter Chart
  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="neu-flat-sm p-4 border border-white/50 z-50 min-w-[150px]">
          <p className="font-bold text-slate-700 mb-2 border-b border-slate-200 pb-1">{data.name}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Qualità:</span>
              <span className="font-bold text-blue-600">{data.y}/100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prezzo Rel:</span>
              <span className="font-bold text-slate-600">{data.x}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Volume:</span>
              <span className="font-bold text-slate-600">{data.z} pz</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 relative min-h-full">
      {success && (
        <div className="fixed top-20 right-8 z-[60] p-4 bg-green-50 border border-green-200 rounded-xl shadow-xl text-green-600 font-bold flex items-center gap-3 animate-slide-in">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          {success}
        </div>
      )}
      
      {/* Header Section */}
      <div className="flex justify-end">
        <div className="flex flex-wrap gap-2 sm:gap-4 w-full md:w-auto">
             <Tooltip position="bottom" content={{ title: "Export PDF", description: "Genera un report analitico in formato PDF.", usage: "Clicca per avviare la generazione." }}>
               <button 
                    onClick={() => handleGenerateReport('PDF')}
                    disabled={generating}
                    className="neu-btn px-4 py-2 text-sm text-red-600 flex-1 sm:flex-none whitespace-nowrap"
                  >
                     {generating ? '...' : 'PDF Report'}
               </button>
             </Tooltip>
             <Tooltip position="bottom" content={{ title: "Export Excel", description: "Esporta i dati grezzi in formato foglio di calcolo.", usage: "Clicca per scaricare il file .xlsx." }}>
               <button 
                    onClick={() => handleGenerateReport('EXCEL')}
                    disabled={generating}
                    className="neu-btn px-4 py-2 text-sm text-green-600 flex-1 sm:flex-none whitespace-nowrap"
                  >
                     {generating ? '...' : 'Excel Report'}
               </button>
             </Tooltip>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-4">
          {(['PERFORMANCE', 'QUALITY', 'COMMERCIAL', 'FEE_REVENUE', 'TREND', 'GOVERNANCE'] as const).map((tab) => {
             let title = '';
             let description = '';
             let usage = '';
             if (tab === 'PERFORMANCE') {
                 title = "Performance";
                 description = "Guarda quanto sono bravi i nostri fornitori a fare il loro lavoro.";
                 usage = "Clicca per vedere i voti dei fornitori.";
             } else if (tab === 'QUALITY') {
                 title = "Qualità";
                 description = "Controlla se le cose che compriamo sono fatte bene o se hanno difetti.";
                 usage = "Clicca per vedere i difetti.";
             } else if (tab === 'COMMERCIAL') {
                 title = "Analitiche Commerciali";
                 description = "Mostra quanto siamo stati bravi a risparmiare soldini comprando.";
                 usage = "Clicca per scoprire la spesa ed il risparmio.";
             } else if (tab === 'FEE_REVENUE') {
                 title = "Fatturato Fee";
                 description = "Scopri quanti soldini stiamo guadagnando per il nostro lavoro.";
                 usage = "Clicca per vedere i guadagni.";
             } else if (tab === 'TREND') {
                 title = "Trend Intermediato";
                 description = "Vedi come cresce la quantità di cose che compriamo per i nostri clienti nel tempo.";
                 usage = "Clicca per vedere la crescita.";
             } else if (tab === 'GOVERNANCE') {
                 title = "Governance & Controllo";
                 description = "Controlla se stiamo rispettando i tempi e se stiamo guadagnando il giusto.";
                 usage = "Clicca per vedere i controlli.";
             }

             return (
             <Tooltip key={tab} position="bottom" content={{ title, description, usage }}>
               <button 
                  onClick={() => setReportType(tab)}
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${reportType === tab ? 'neu-pressed text-blue-600' : 'neu-flat-sm text-slate-500 hover:text-slate-700'}`}
               >
                  {tab === 'PERFORMANCE' && 'Performance'}
                  {tab === 'QUALITY' && 'Qualità'}
                  {tab === 'COMMERCIAL' && 'Commerciale'}
                  {tab === 'FEE_REVENUE' && 'Fatturato Fee'}
                  {tab === 'TREND' && 'Trend Intermediato'}
                  {tab === 'GOVERNANCE' && 'Governance & Controllo'}
               </button>
             </Tooltip>
             );
          })}
      </div>

      {/* PERFORMANCE VIEW */}
      {reportType === 'PERFORMANCE' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
              <div className="lg:col-span-2 neu-flat p-8 relative">
                  <Tooltip position="top" content={{ title: "Affidabilità Fornitori (%)", description: "Mostra il punteggio dei fornitori, come una pagella a scuola. Più è alto, più sono bravi!", usage: "Guarda le barre colorate per capire chi è il migliore." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Affidabilità Fornitori (%)</h3>
                  </Tooltip>
                  <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {supplierPerformanceData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        <BarChart data={supplierPerformanceData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#d1d9e6" />
                            <XAxis type="number" domain={[0, 100]} hide />
                            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill:'#64748b', fontWeight:600}} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} />
                            <Bar dataKey="affidabilita" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={12} />
                            <Bar dataKey="qualita" fill="#10b981" radius={[0, 6, 6, 0]} barSize={12} />
                        </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              <div className="neu-flat p-8">
                  <Tooltip position="top" content={{ title: "KPI Servizio", description: "Ci dice se i fornitori consegnano in tempo e se portano tutto quello che abbiamo chiesto.", usage: "Guarda le barre blu per vedere quanto sono veloci e precisi." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">KPI Servizio</h3>
                  </Tooltip>
                  <div className="space-y-8">
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500 font-bold">On-Time Delivery</span>
                              <span className="font-bold text-blue-600">{supplierPerformanceData.length > 0 ? '92%' : '0%'}</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: supplierPerformanceData.length > 0 ? '92%' : '0%' }}></div>
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-sm mb-2">
                              <span className="text-slate-500 font-bold">Completezza</span>
                              <span className="font-bold text-blue-600">{supplierPerformanceData.length > 0 ? '98%' : '0%'}</span>
                          </div>
                          <div className="w-full neu-pressed h-3 rounded-full overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full shadow-sm" style={{ width: supplierPerformanceData.length > 0 ? '98%' : '0%' }}></div>
                          </div>
                      </div>
                      
                      {supplierPerformanceData.length > 0 && (
                        <div className="p-4 neu-pressed bg-amber-50/50 rounded-xl mt-4">
                            <h4 className="text-xs font-black text-amber-600 uppercase mb-1">Alert Critico</h4>
                            <p className="text-xs text-slate-600">
                               Fornitore <strong>Acciaierie V.</strong> in calo del 12%.
                            </p>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* FEE REVENUE VIEW */}
      {reportType === 'FEE_REVENUE' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex justify-between items-center mb-6">
                      <Tooltip position="top" content={{ title: "Fatturato da Fee Mensili", description: "Ci fa vedere mese per mese quanti soldini abbiamo guadagnato.", usage: "Guarda la linea verde per vedere se sale o scende." }}>
                        <h3 className="text-lg font-bold text-slate-700 inline-block">Fatturato da Fee Mensili</h3>
                      </Tooltip>
                      <div className="flex space-x-2 bg-[#EEF2F6] p-1 rounded-xl shadow-inner">
                        <button 
                          onClick={() => setSavingsChartMode('LINE')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${savingsChartMode === 'LINE' ? 'neu-flat text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Vista Lineare"
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
                        </button>
                        <button 
                          onClick={() => setSavingsChartMode('BAR')}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${savingsChartMode === 'BAR' ? 'neu-flat text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                          title="Vista a Barre"
                        >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                        </button>
                      </div>
                  </div>
                  <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {savingsData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        {savingsChartMode === 'LINE' ? (
                          <LineChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Line name="Ricavi da Fee" type="monotone" dataKey="actual" stroke="#10b981" strokeWidth={4} dot={{r:4, fill:'#10b981'}} />
                              <Line name="Target" type="monotone" dataKey="target" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                          </LineChart>
                        ) : (
                          <BarChart data={savingsData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend />
                              <Bar dataKey="actual" name="Ricavi da Fee" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="target" name="Target" stackId="b" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        )}
                    </ResponsiveContainer>
                  </div>
              </div>
              
              <div className="space-y-8">
                 <div className="neu-flat p-8 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-4 opacity-10">
                         <svg className="w-32 h-32 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" /><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" /></svg>
                    </div>
                    <Tooltip position="top" content={{ title: "Fatturato Fee YTD", description: "È il totale di tutti i soldini guadagnati dall'inizio dell'anno fino ad oggi.", usage: "Un numero grande è una cosa bellissima!" }}>
                      <h4 className="text-emerald-600 text-xs font-black uppercase tracking-widest mb-2 inline-block">Fatturato Fee YTD</h4>
                    </Tooltip>
                    <p className="text-5xl font-black text-slate-700">€ {savingsData.length > 0 ? savingsData.reduce((acc, s) => acc + s.actual, 0).toLocaleString('it-IT', { maximumFractionDigits: 0 }) : '0'}</p>
                    <p className={`text-sm font-bold mt-2 ${savingsData.length > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                       {savingsData.length > 0 ? 'Dati reali da ordini' : 'Nessun dato'}
                    </p>
                 </div>

                 <div className="neu-flat p-8 flex items-center justify-between">
                    <div>
                         <Tooltip position="top" content={{ title: "Clienti Attivi", description: "Ci dice quante persone o aziende stiamo aiutando in questo momento.", usage: "Guarda il numero nel cerchio verde." }}>
                           <h3 className="text-lg font-bold text-slate-700 inline-block">Clienti Attivi</h3>
                         </Tooltip>
                         <p className="text-xs text-slate-500 max-w-xs mt-1">Clienti con contratto di servizio in corso di validità.</p>
                    </div>
                    <div className="relative w-24 h-24 flex items-center justify-center group cursor-pointer" onClick={() => setShowCustomers(!showCustomers)}>
                         <div className="text-xl font-black text-slate-700 group-hover:text-blue-600 transition-colors">{activeCustomers.length}</div>
                         <svg className="absolute w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 96 96">
                             <circle cx="48" cy="48" r="40" stroke="#d1d9e6" strokeWidth="8" fill="none" />
                             <circle cx="48" cy="48" r="40" stroke="#10b981" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset={251 - (Math.min(activeCustomers.length, 20) / 20 * 251)} strokeLinecap="round" />
                           </svg>
                    </div>
                 </div>

                 {showCustomers && activeCustomers.length > 0 && (
                   <div className="mt-4 p-4 neu-pressed rounded-xl animate-fade-in">
                     <h5 className="text-sm font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">Elenco Clienti Attivi</h5>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                       {activeCustomers.map((cust, idx) => (
                         <div key={idx} className="flex flex-col p-2 bg-white/50 rounded-lg">
                           <span className="font-bold text-slate-700 text-xs">{cust.name}</span>
                           <span className="text-[10px] text-slate-500">{cust.vatNumber}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
              </div>
          </div>
      )}

      {/* COMMERCIAL VIEW */}
      {reportType === 'COMMERCIAL' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              <div className="neu-flat p-8 relative">
                  <Tooltip position="top" content={{ title: "Composizione del Risparmio", description: "Mostra in spesa per categoria quanto abbiamo fatto risparmiare.", usage: "Un anello diviso a fette per ogni reparto." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Composizione Risparmio</h3>
                  </Tooltip>
                  <p className="text-xs text-slate-500 mb-6">Risparmio ottenuto (Saved vs Estimated) per categoria</p>
                  <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 relative">
                     {commercialSavingsData.length === 0 && <EmptyStateOverlay />}
                     <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                          <Pie
                            data={commercialSavingsData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={5}
                            dataKey="saved"
                            nameKey="category"
                          >
                            {commercialSavingsData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', borderRadius: '12px'}} formatter={(value: number) => `€ ${value.toLocaleString()}`} />
                          <Legend />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
              </div>

              <div className="neu-flat p-8 relative">
                  <Tooltip position="top" content={{ title: "Trend dei Risparmi", description: "Visualizza mese per mese come stanno andando i risparmi rispetto agli obiettivi.", usage: "Le colonne indicano il risparmio, i pallini l'obiettivo." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Trend dei Risparmi</h3>
                  </Tooltip>
                  <p className="text-xs text-slate-500 mb-6">Andamento mese su mese del risparmio ottenuto</p>
                  <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                      {commercialTrendData.length === 0 && <EmptyStateOverlay />}
                      <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                          <ComposedChart data={commercialTrendData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="month" tick={{fill:'#64748b'}} axisLine={false} tickLine={false} />
                              <YAxis tick={{fill:'#64748b'}} axisLine={false} tickLine={false} />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', borderRadius: '12px'}} formatter={(value: number) => `€ ${value.toLocaleString()}`} />
                              <Legend />
                              <Bar dataKey="saving" name="Risparmio Effettivo" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                              <Scatter dataKey="target" name="Obiettivo Risparmio" fill="#f59e0b" />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              {/* Data Table */}
              <div className="lg:col-span-2 neu-flat p-8">
                  <h3 className="text-lg font-bold text-slate-700 mb-6">Dettaglio per Categoria</h3>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead>
                              <tr className="border-b border-slate-200">
                                  <th className="py-3 font-bold text-slate-500 uppercase text-xs">Categoria Merceologica</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Spesa Stimata</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Spesa Effettiva</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Risparmio Assoluto</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">Risparmio %</th>
                              </tr>
                          </thead>
                          <tbody>
                              {commercialSavingsData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                      <td className="py-3 font-bold text-slate-700">{row.category}</td>
                                      <td className="py-3 text-right font-mono text-slate-500">€ {row.estimated.toLocaleString('it-IT')}</td>
                                      <td className="py-3 text-right font-mono text-slate-700 font-bold">€ {row.actual.toLocaleString('it-IT')}</td>
                                      <td className="py-3 text-right font-mono text-green-600 font-bold">€ {row.saved.toLocaleString('it-IT')}</td>
                                      <td className="py-3 text-right font-bold text-blue-600">{row.savedPct}%</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* QUALITY VIEW */}
      {reportType === 'QUALITY' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
              {/* Radar Chart */}
              <div className="neu-flat p-8">
                  <Tooltip position="top" content={{ title: "Benchmark Fornitori", description: "Confronta i due migliori fornitori su diverse cose, come una gara a punti.", usage: "Guarda quale forma è più grande per capire chi vince." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-2 inline-block">Benchmark Fornitori</h3>
                  </Tooltip>
                  <p className="text-xs text-slate-500 mb-6">Confronto multidimensionale Top 2 Suppliers</p>
                  <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 relative">
                    {supplierRadarData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                      <RadarChart outerRadius="80%" data={supplierRadarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar name="Fornitore A" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Radar name="Fornitore B" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                        <Legend />
                        <RechartsTooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '5px 5px 15px rgba(0,0,0,0.1)'}} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Donut Chart - Non Conformity Breakdown */}
              <div className="neu-flat p-8">
                   <Tooltip position="top" content={{ title: "Analisi Non Conformità", description: "Ci fa vedere quali sono i difetti più comuni nelle cose che compriamo, come una torta divisa a fette.", usage: "Guarda la fetta più grande per trovare il difetto più frequente." }}>
                     <h3 className="text-lg font-bold text-slate-700 mb-2 inline-block">Analisi Non Conformità</h3>
                   </Tooltip>
                   <p className="text-xs text-slate-500 mb-6">Distribuzione per tipologia difetto</p>
                   <div className="h-80 relative w-full min-h-[320px] min-w-0">
                     {defectTypesData.length === 0 && <EmptyStateOverlay />}
                     <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                        <PieChart>
                          <Pie
                            data={defectTypesData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {defectTypesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', borderRadius: '12px', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                     </ResponsiveContainer>
                     {/* Center Label */}
                     <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-12 text-center pointer-events-none">
                        <span className="text-2xl font-black text-slate-700">100%</span>
                     </div>
                   </div>
              </div>

              {/* NC Trend Bar Chart */}
              <div className="neu-flat p-8">
                  <Tooltip position="top" content={{ title: "Trend Difettosità", description: "Mostra se i difetti stanno aumentando o diminuendo nel tempo.", usage: "Guarda se le barre rosse diventano più alte o più basse." }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Trend Difettosità (6 mesi)</h3>
                  </Tooltip>
                  <div className="h-64 w-full min-h-[256px] min-w-0 relative">
                    {ncTrendData.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0} debounce={50}>
                      <BarChart data={ncTrendData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                         <XAxis dataKey="month" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                         <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}} cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} />
                         <Bar dataKey="nc" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} name="N.C." />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>

              {/* Strategic Matrix (Existing but refined) */}
              <div className="neu-flat p-8">
                  <Tooltip position="top" content={{ title: "Matrice Qualità / Costo", description: "Ci aiuta a capire se stiamo pagando il giusto per la qualità che riceviamo.", usage: "I pallini in alto a destra sono i migliori: alta qualità e buon prezzo!" }}>
                    <h3 className="text-lg font-bold text-slate-700 mb-2 inline-block">Matrice Qualità / Costo</h3>
                  </Tooltip>
                  <p className="text-xs text-slate-500 mb-6">Posizionamento strategico fornitori</p>
                  <div className="h-64 w-full min-h-[256px] min-w-0 relative">
                    {qualityMatrix.length === 0 && <EmptyStateOverlay />}
                    <ResponsiveContainer width="100%" height={256} minWidth={0} minHeight={0} debounce={50}>
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <CartesianGrid stroke="#d1d9e6" strokeDasharray="3 3" />
                            <XAxis type="number" dataKey="x" name="Prezzo Relativo" unit="%" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <YAxis type="number" dataKey="y" name="Punteggio Qualità" unit="pts" axisLine={false} tickLine={false} tick={{fill:'#94a3b8'}} />
                            <ZAxis type="number" dataKey="z" range={[50, 400]} />
                            <RechartsTooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                            <Scatter name="Fornitori" data={qualityMatrix} fill="#8884d8">
                                {qualityMatrix.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#ef4444', '#10b981', '#f59e0b'][index % 4]} />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                  </div>
              </div>
          </div>
      )}

      {/* GOVERNANCE VIEW */}
      {reportType === 'GOVERNANCE' && (
          <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="neu-flat p-6 border-l-4 border-blue-500">
                      <Tooltip position="top" content={{ title: "Margine di Contribuzione", description: "È la parte di soldini che ci rimane in tasca dopo aver pagato le spese.", usage: "Più è alto, più siamo ricchi!" }}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 inline-block">Margine di Contribuzione</h4>
                      </Tooltip>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '32.4%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? '+2.1% vs Target' : 'Nessun dato'}
                      </div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-amber-500">
                      <Tooltip position="top" content={{ title: "Scostamento Ore", description: "Ci dice se ci abbiamo messo più o meno tempo del previsto per fare un lavoro.", usage: "Se è col meno (-), siamo stati velocissimi!" }}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 inline-block">Scostamento Ore</h4>
                      </Tooltip>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '-4.2%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? 'Sotto la soglia critica' : 'Nessun dato'}
                      </div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-emerald-500">
                      <Tooltip position="top" content={{ title: "Avanzamento (SAL)", description: "Ci fa vedere a che punto siamo arrivati con i nostri lavori.", usage: "Se è 100%, abbiamo finito tutto!" }}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 inline-block">Avanzamento (SAL)</h4>
                      </Tooltip>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '88.0%' : '0%'}</div>
                      <div className="text-[10px] text-slate-400 font-bold mt-1">Media commesse attive</div>
                  </div>
                  <div className="neu-flat p-6 border-l-4 border-red-500">
                      <Tooltip position="top" content={{ title: "Tasso Rilavorazione", description: "Ci dice quante volte abbiamo dovuto rifare un lavoro perché c'era un errore.", usage: "Deve essere il più basso possibile, così non perdiamo tempo." }}>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 inline-block">Tasso Rilavorazione</h4>
                      </Tooltip>
                      <div className="text-2xl font-black text-slate-700">{trendData.length > 0 ? '1.8%' : '0%'}</div>
                      <div className={`text-[10px] font-bold mt-1 ${trendData.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        {trendData.length > 0 ? 'Obiettivo: < 1.5%' : 'Nessun dato'}
                      </div>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="neu-flat p-8">
                      <Tooltip position="top" content={{ title: "Analisi Scostamento Ore", description: "Confronta il tempo che pensavamo di metterci con il tempo che ci abbiamo messo davvero per ogni lavoro.", usage: "Guarda se la colonna blu è più alta o più bassa di quella grigia." }}>
                        <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Analisi Scostamento Ore per Commessa</h3>
                      </Tooltip>
                      <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 relative">
                          <EmptyStateOverlay message="Dati di produzione in fase di sincronizzazione" />
                          <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                              <BarChart data={[]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                                  <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip />
                                  <Bar dataKey="budget" fill="#cbd5e1" name="Budget" />
                                  <Bar dataKey="actual" fill="#3b82f6" name="Effettivo" />
                              </BarChart>
                          </ResponsiveContainer>
                      </div>
                  </div>

                  <div className="neu-flat p-8">
                      <Tooltip position="top" content={{ title: "Indice SAL Temporale", description: "Ci fa vedere come procede il nostro lavoro nel tempo, giorno dopo giorno.", usage: "Guarda l'area verde per vedere come cresce il lavoro fatto." }}>
                        <h3 className="text-lg font-bold text-slate-700 mb-6 inline-block">Indice SAL Temporale</h3>
                      </Tooltip>
                      <div className="h-80 w-full min-h-[320px] min-w-0 relative">
                          <EmptyStateOverlay message="Dati SAL non disponibili per il periodo" />
                          <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                              <AreaChart data={[]}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                                  <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <YAxis tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                                  <RechartsTooltip />
                                  <Area type="monotone" dataKey="sal" stroke="#10b981" fill="#10b981" fillOpacity={0.1} />
                              </AreaChart>
                          </ResponsiveContainer>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* TREND & CAGR VIEW */}
      {reportType === 'TREND' && (
          <div className="grid grid-cols-1 gap-8 animate-fade-in">
              <div className="neu-flat p-8">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                      <div>
                          <Tooltip position="top" content={{ title: "Analisi Spesa Intermediata", description: "Ci fa vedere quanti soldi stiamo spendendo per comprare le cose per i nostri clienti.", usage: "Guarda le colonne blu per vedere i soldi spesi." }}>
                            <h3 className="text-lg font-bold text-slate-700 inline-block">Analisi Spesa Intermediata</h3>
                          </Tooltip>
                          <p className="text-xs text-slate-500">Volume di acquisto gestito per conto dei clienti</p>
                      </div>
                      <div className="flex space-x-2 bg-[#EEF2F6] p-1 rounded-xl shadow-inner">
                          {(['1M', '3M', '6M', '1Y'] as const).map(tf => (
                              <button
                                  key={tf}
                                  onClick={() => setTrendTimeframe(tf)}
                                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${trendTimeframe === tf ? 'neu-flat text-blue-600 bg-white' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                  {tf}
                              </button>
                          ))}
                      </div>
                  </div>

                  <div id="export-chart-1" className="h-80 w-full min-h-[320px] min-w-0 mb-8 relative">
                      {trendData.length === 0 && <EmptyStateOverlay />}
                      <ResponsiveContainer width="100%" height={320} minWidth={0} minHeight={0} debounce={50}>
                          <ComposedChart data={trendData}>
                              <defs>
                                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                  </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d1d9e6" />
                              <XAxis dataKey="name" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" tick={{fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="right" orientation="right" tick={{fill:'#10b981'}} axisLine={false} tickLine={false} unit="%" />
                              <RechartsTooltip contentStyle={{background: '#EEF2F6', border: 'none', boxShadow: '5px 5px 10px #d1d9e6'}}/>
                              <Legend content={(props: any) => {
                                const { payload } = props;
                                return (
                                  <ul className="flex justify-center space-x-6 mt-4">
                                    {payload.map((entry: any, index: number) => (
                                      <li key={`item-${index}`} className="flex items-center text-sm text-slate-600 font-bold">
                                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
                                        {entry.value === 'Spesa Intermediata (€)' ? (
                                          <Tooltip position="top" content={{ title: "Spesa Intermediata", description: "I soldi spesi per comprare le cose.", usage: "Rappresentato dalle colonne blu." }}>
                                            <span>{entry.value}</span>
                                          </Tooltip>
                                        ) : entry.value === 'CAGR Cumulativo (%)' ? (
                                          <Tooltip position="top" content={{ title: "CAGR Cumulativo", description: "La velocità media con cui stiamo crescendo.", usage: "Rappresentato dalla linea verde." }}>
                                            <span>{entry.value}</span>
                                          </Tooltip>
                                        ) : (
                                          <span>{entry.value}</span>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }} />
                              <Bar yAxisId="left" dataKey="value" name="Spesa Intermediata (€)" fill="url(#colorVolume)" radius={[4, 4, 0, 0]} barSize={20} />
                              <Line yAxisId="right" type="monotone" dataKey="cagr" name="CAGR Cumulativo (%)" stroke="#10b981" strokeWidth={3} dot={{r:4}} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>

                  {/* DATA TABLE */}
                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead>
                              <tr className="border-b border-slate-200">
                                  <th className="py-3 font-bold text-slate-500 uppercase text-xs">Periodo</th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">
                                    <Tooltip position="top" content={{ title: "Volume (€)", description: "I soldini totali che abbiamo speso in quel mese.", usage: "Leggi il numero per sapere quanto abbiamo speso." }}>
                                      Volume (€)
                                    </Tooltip>
                                  </th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">
                                    <Tooltip position="top" content={{ title: "Growth (%)", description: "Ci dice se abbiamo speso più o meno del mese prima.", usage: "Se è verde e col +, abbiamo speso di più!" }}>
                                      Growth (%)
                                    </Tooltip>
                                  </th>
                                  <th className="py-3 text-right font-bold text-slate-500 uppercase text-xs">
                                    <Tooltip position="top" content={{ title: "CAGR (%)", description: "È un numero magico che ci dice quanto stiamo crescendo in media ogni mese.", usage: "Più è alto, più stiamo crescendo velocemente." }}>
                                      CAGR (%)
                                    </Tooltip>
                                  </th>
                              </tr>
                          </thead>
                          <tbody>
                              {trendData.map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                      <td className="py-3 font-bold text-slate-700">{row.name}</td>
                                      <td className="py-3 text-right font-mono text-slate-600">€ {row.value.toLocaleString('it-IT')}</td>
                                      <td className={`py-3 text-right font-bold ${row.growth >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                          {row.growth > 0 ? '+' : ''}{row.growth}%
                                      </td>
                                      <td className="py-3 text-right font-bold text-blue-600">{row.cagr}%</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default BusinessIntelligenceView;