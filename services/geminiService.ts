
import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

// Optimization: Strip unnecessary fields to save tokens
const sanitizeContext = (contextData: any) => {
    if (!contextData || !contextData.databaseContent) return contextData;

    const { orders, inventory } = contextData.databaseContent;

    const cleanOrders = Array.isArray(orders) ? orders.map((o: any) => ({
        id: o.id,
        vendor: o.vendor,
        amount: Math.round(o.amount), // Remove decimals
        status: o.status,
        desc: o.description ? o.description.substring(0, 50) : '', // Truncate
        date: o.date
    })) : [];

    const cleanInventory = Array.isArray(inventory) ? inventory.map((p: any) => ({
        sku: p.sku,
        stock: p.stock,
        safety: p.safetyStock,
        desc: p.description ? p.description.substring(0, 50) : '',
        cost: Math.round(p.cost)
    })) : [];

    return {
        ...contextData,
        databaseContent: {
            orders: cleanOrders,
            inventory: cleanInventory
        }
    };
};

export const sendMessageToEVA = async (message: string, contextData: any): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. EVA is in simulation mode.");
    return "EVA System: API Key not configured. Please check environment variables.";
  }

  try {
    const modelId = 'gemini-3-flash-preview'; 
    
    // Sanitize data before sending
    const safeContext = sanitizeContext(contextData);
    const dataContextString = JSON.stringify(safeContext);

    const systemInstruction = `You are EVA (EasyBuy Virtual Agent).
    
    CONTEXT:
    ${dataContextString}

    ROLE:
    Analyze the provided JSON (Orders/Inventory) to answer questions. 
    - Be concise.
    - If stock < safety, flag it.
    - Calculate totals if asked.
    `;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "I processed your request but could not generate a text response.";

  } catch (error) {
    console.error("Error communicating with EVA:", error);
    return "I apologize, but I am currently unable to connect to the EasyBuy Knowledge Base (Gemini API Error).";
  }
};
