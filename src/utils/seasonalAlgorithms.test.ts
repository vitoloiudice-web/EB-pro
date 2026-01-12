import { describe, it, expect } from 'vitest';
import { calculateMrpSuggestion, DEFAULT_SEASONAL_EVENTS } from '../utils/seasonalAlgorithms';

describe('seasonalAlgorithms', () => {
  it('should calculate base order date correctly', () => {
    const neededDate = new Date(2026, 7, 31); // Fine agosto
    const leadTimeDays = 14;
    
    const result = calculateMrpSuggestion(neededDate, leadTimeDays, []);
    
    const expectedBase = new Date(2026, 7, 17);
    expect(result.baseOrderDate.getDate()).toBe(expectedBase.getDate());
    expect(result.baseOrderDate.getMonth()).toBe(expectedBase.getMonth());
  });

  it('should detect seasonal conflict for Ferragosto', () => {
    const neededDate = new Date(2026, 7, 31); // Agosto
    const leadTimeDays = 14;
    
    const result = calculateMrpSuggestion(neededDate, leadTimeDays, DEFAULT_SEASONAL_EVENTS);
    
    expect(result.alertMessage).toBeTruthy();
    expect(result.alertMessage).toContain('Ferragosto');
    expect(result.riskMultiplier).toBe(1.5);
  });

  it('should not alert if no seasonal conflicts', () => {
    const neededDate = new Date(2026, 2, 15); // Marzo (safe)
    const leadTimeDays = 14;
    
    const result = calculateMrpSuggestion(neededDate, leadTimeDays, DEFAULT_SEASONAL_EVENTS);
    
    expect(result.alertMessage).toBeNull();
    expect(result.riskMultiplier).toBe(1.0);
  });

  it('should anticipate order date when conflict detected', () => {
    const neededDate = new Date(2026, 7, 31); // Agosto
    const leadTimeDays = 14;
    
    const result = calculateMrpSuggestion(neededDate, leadTimeDays, DEFAULT_SEASONAL_EVENTS);
    
    // Adjusted dovrebbe essere 15 giorni prima della base
    const expectedAdjustment = 15;
    const daysAfter = Math.floor((result.adjustedOrderDate.getTime() - result.baseOrderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    expect(daysAfter).toBe(-expectedAdjustment);
  });
});
