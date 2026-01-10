import { GoogleGenAI } from "@google/genai";

const API_KEY = process.env.API_KEY || '';

// Initialize the Gemini AI client
// We strictly follow the rule: const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
// However, since we are in a browser environment, we handle the potential missing key gracefully in the UI.
let ai: GoogleGenAI | null = null;

if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

export const sendMessageToEVA = async (message: string, context: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. EVA is in simulation mode.");
    return "EVA System: API Key not configured. Please check environment variables.";
  }

  try {
    const modelId = 'gemini-3-flash-preview'; 
    
    // System instruction to behave like EasyBuy Virtual Agent
    const systemInstruction = `You are EVA (EasyBuy Virtual Agent), an intelligent assistant for the EB-pro Enterprise system.
    Current Context: ${context}
    
    Capabilities:
    1. Answer questions about inventory, purchase orders, and supplier performance.
    2. Assist with MRP (Material Requirement Planning) queries.
    3. Provide technical summaries of attached CAD drawings (simulated).
    4. Be professional, concise, and business-oriented.
    
    If asked about data specific to the user's company, assume you have access to the "EasyBuy Corporation" database.`;

    const response = await ai.models.generateContent({
      model: modelId,
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for faster chat response
      }
    });

    return response.text || "I processed your request but could not generate a text response.";

  } catch (error) {
    console.error("Error communicating with EVA:", error);
    return "I apologize, but I am currently unable to connect to the EasyBuy Knowledge Base (Gemini API Error).";
  }
};