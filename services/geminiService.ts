import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const sendMessageToEVA = async (message: string, contextData: any): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. EVA is in simulation mode.");
    return "EVA System: API Key not configured. Please check environment variables.";
  }

  try {
    const modelId = 'gemini-3-flash-preview'; 
    
    // Inject the REAL database data into the system prompt
    const dataContextString = JSON.stringify(contextData, null, 2);

    const systemInstruction = `You are EVA (EasyBuy Virtual Agent), an intelligent assistant for the EB-pro Enterprise system.
    
    CRITICAL: You have access to the LIVE DATABASE of Purchase Orders provided below. 
    Use ONLY this data to answer questions about orders, amounts, vendors, or status.
    
    --- LIVE DATABASE START ---
    ${dataContextString}
    --- LIVE DATABASE END ---

    Capabilities:
    1. Analyze the provided JSON data to calculate totals, counts, or find specific orders.
    2. Assist with MRP (Material Requirement Planning) queries based on this data.
    3. Be professional, concise, and business-oriented.
    
    If the user asks for information not in the database, politely state you don't have that record.`;

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