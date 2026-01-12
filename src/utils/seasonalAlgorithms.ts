import { SeasonalEvent } from "../types";

// Default seasonal events (e.g., Ferragosto in Italy, Christmas)
export const DEFAULT_SEASONAL_EVENTS: SeasonalEvent[] = [
  { name: 'Chiusura Estiva (Ferragosto)', startMonth: 7, endMonth: 7, riskLevel: 'High' }, // August
  { name: 'Festività Natalizie', startMonth: 11, endMonth: 11, riskLevel: 'Medium' } // December
];

export const calculateMrpSuggestion = (
  neededDate: Date, 
  leadTimeDays: number, 
  events: SeasonalEvent[] = DEFAULT_SEASONAL_EVENTS
) => {
  // 1. Calculate Base Order Date
  const baseOrderDate = new Date(neededDate);
  baseOrderDate.setDate(baseOrderDate.getDate() - leadTimeDays);

  let adjustedOrderDate = new Date(baseOrderDate);
  let alertMessage = null;
  let riskMultiplier = 1.0;

  // 2. Check for Seasonal Conflicts
  const orderMonth = baseOrderDate.getMonth();
  
  const conflict = events.find(e => e.startMonth <= orderMonth && e.endMonth >= orderMonth);

  if (conflict) {
    // Logic: Anticipate by 15 days buffer if landing in closed period
    adjustedOrderDate.setDate(adjustedOrderDate.getDate() - 15);
    riskMultiplier = 1.5;
    alertMessage = `Attenzione: La data ordine cade durante "${conflict.name}". Suggerito anticipo al ${adjustedOrderDate.toLocaleDateString()}.`;
  }

  return {
    baseOrderDate,
    adjustedOrderDate,
    alertMessage,
    riskMultiplier
  };
};