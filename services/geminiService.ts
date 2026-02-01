import { GoogleGenAI, Type } from "@google/genai";
import { Item, Supplier, AiAnalysisResult, ScoutingResult } from "../types";
import { GOOGLE_API_KEY } from "../constants";

// Use process.env.API_KEY if available, otherwise fallback to the constant for this demo environment.
const API_KEY = process.env.API_KEY || GOOGLE_API_KEY;

// Note: Using a system instruction to set the persona
const SYSTEM_INSTRUCTION = `Sei un esperto analista di approvvigionamento AI per un ERP di produzione di compattatori per rifiuti. 
Il tuo obiettivo è analizzare i dati dell'inventario e dei fornitori per identificare opportunità di risparmio, rischi e KPI di performance.`;

export const geminiService = {
  analyzeProcurementData: async (items: Item[], suppliers: Supplier[]): Promise<AiAnalysisResult> => {
    // 1. Prepare context for the AI
    const dataContext = JSON.stringify({
      inventorySummary: items.map(i => ({ sku: i.sku, name: i.name, stock: i.stock, cost: i.cost, supplier: i.supplierId })),
      supplierSummary: suppliers.map(s => ({ id: s.id, name: s.name, rating: s.rating }))
    });

    const prompt = `
    Analizza i seguenti dati JSON che rappresentano il nostro inventario attuale e la lista fornitori.
    1. Calcola il valore totale dell'inventario attuale.
    2. Identifica il fornitore principale per volume di articoli collegati.
    3. Suggerisci eventuali rischi basati su bassi livelli di scorta (assumi logica scorta di sicurezza).
    4. Restituisci una risposta strutturata con un riepilogo, 3 KPI distinti e raccomandazioni operative.
    
    Dati: ${dataContext}
    `;

    try {
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      // Updated to 'gemini-3-flash-preview' as per latest guidelines for Basic Text Tasks
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', 
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              kpis: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING },
                    trend: { type: Type.STRING, enum: ["up", "down", "neutral"] }
                  }
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("Nessuna risposta dall'AI");
      
      return JSON.parse(text) as AiAnalysisResult;

    } catch (error: any) {
      console.error("Gemini AI Analysis failed:", error);
      // More descriptive error for debugging
      let errorMessage = "Servizio AI non disponibile.";
      if (error.message?.includes("404")) errorMessage = "Modello AI non trovato o API Key non valida.";
      
      // Fallback response
      return {
        summary: `${errorMessage} Visualizzazione calcoli base.`,
        kpis: [
          { label: "Totale Articoli", value: items.length.toString(), trend: "neutral" },
          { label: "Fornitori Attivi", value: suppliers.length.toString(), trend: "up" }
        ],
        recommendations: ["Controllare registri inventario manuali", "Verificare configurazione API Key"]
      };
    }
  },

  scoutSuppliers: async (target: Item | Supplier, contextName: string, mode: 'ITEM' | 'SUPPLIER'): Promise<ScoutingResult> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    let prompt = "";

    if (mode === 'ITEM') {
        const item = target as Item;
        prompt = `
          Sto cercando nuovi fornitori alternativi per questo articolo:
          - Prodotto: ${item.name} (${item.category})
          - Descrizione tecnica: ${item.description}
          - Fornitore Attuale: ${contextName}
          - Costo attuale: € ${item.cost}
          
          Usa Google Search per trovare 2-3 produttori o distributori reali e affidabili (preferibilmente in Europa/Italia) che vendono prodotti simili.
          
          Per ogni candidato trovato:
          1. Spiega il motivo della scelta (specializzazione, certificazioni visibili, posizione geografica).
          2. Fai una breve analisi comparativa rispetto al fornitore attuale (se possibile dedurre posizionamento prezzo/qualità dal web).
          3. Fornisci un link al sito web se disponibile.
    
          Formatta la risposta in Markdown chiaro e leggibile, usando elenchi puntati e grassetti.
        `;
    } else {
        const supplier = target as Supplier;
        prompt = `
          Sto cercando COMPETITORS diretti del seguente fornitore:
          - Azienda Target: ${supplier.name}
          - Settore: Forniture industriali / Metalmeccanica
          - Rating Interno: ${supplier.rating}/5
          
          Usa Google Search per trovare 2-3 aziende concorrenti che operano nello stesso mercato (Italia/Europa).
          
          Per ogni competitor trovato:
          1. Analizza i punti di forza rispetto a ${supplier.name} (es. gamma prodotti più ampia, tecnologie più recenti, logistica).
          2. Valuta la reputazione online se disponibile.
          3. Fornisci link al sito web.
          
          Formatta la risposta in Markdown chiaro.
        `;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Use Pro for complex reasoning + search
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }] // Enable Google Search Grounding
        }
      });

      // Extract Sources from Grounding Metadata
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk: any) => ({
          title: chunk.web?.title || 'Fonte Web',
          uri: chunk.web?.uri || '#'
        }))
        .filter((s: any) => s.uri !== '#') || [];

      // Remove duplicates based on URI
      const uniqueSources = Array.from(new Set(sources.map((s: any) => s.uri)))
        .map(uri => sources.find((s: any) => s.uri === uri));

      return {
        analysisText: response.text || "Nessun risultato trovato.",
        sources: uniqueSources
      };

    } catch (error) {
      console.error("Scouting failed:", error);
      return {
        analysisText: "Impossibile completare la ricerca web al momento. Verifica la connessione o l'API Key.",
        sources: []
      };
    }
  },

  generateEngagementContent: async (type: 'RFI' | 'NDA' | 'RFQ', candidateName: string, itemName: string, companyName: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    let prompt = "";
    if (type === 'RFI') {
      prompt = `Scrivi una email formale di Request For Information (RFI) indirizzata a "${candidateName}". 
      Noi siamo "${companyName}". Siamo interessati al loro prodotto "${itemName}" per la nostra produzione di compattatori.
      Chiedi informazioni su capacità produttiva, certificazioni ISO e lead time standard. Tono professionale ma diretto.`;
    } else if (type === 'NDA') {
      prompt = `Genera un breve testo per un accordo di riservatezza (NDA) standard tra "${companyName}" e "${candidateName}".
      Oggetto: Scambio informazioni tecniche per fornitura di "${itemName}". Includi clausole standard su durata (2 anni) e penali generiche.`;
    } else if (type === 'RFQ') {
      prompt = `Scrivi una email di Request For Quotation (RFQ) per "${candidateName}".
      Richiediamo quotazione per 1000 unità di "${itemName}". Chiedi scontistica per volumi, termini di pagamento e resa (Incoterms).`;
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      return response.text || "Errore generazione contenuto.";
    } catch (error) {
      return "Errore durante la generazione del testo.";
    }
  }
};