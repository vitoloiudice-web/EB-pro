import unittest
from datetime import datetime, timedelta

# Logic ported from utils/seasonalAlgorithms.ts and MRP.tsx

DEFAULT_SEASONAL_EVENTS = [
  { "name": 'Chiusura Estiva (Ferragosto)', "startMonth": 7, "endMonth": 7, "riskLevel": 'High' }, # August (Index 7)
  { "name": 'Festività Natalizie', "startMonth": 11, "endMonth": 11, "riskLevel": 'Medium' } # December (Index 11)
]

def calculate_mrp_suggestion(needed_date: datetime, lead_time_days: int):
    # Ported from seasonalAlgorithms.ts
    base_order_date = needed_date - timedelta(days=lead_time_days)
    adjusted_order_date = base_order_date
    alert_message = None
    
    # 2. Check for Seasonal Conflicts
    order_month = base_order_date.month - 1 # JS is 0-indexed, Python 1-indexed. Adjusting to match JS logic.
    
    conflict = next((e for e in DEFAULT_SEASONAL_EVENTS if e["startMonth"] <= order_month and e["endMonth"] >= order_month), None)
    
    if conflict:
        # Logic: Anticipate by 15 days
        adjusted_order_date = adjusted_order_date - timedelta(days=15)
        alert_message = f"Attenzione: La data ordine cade durante \"{conflict['name']}\""

    return {
        "base_order_date": base_order_date,
        "adjusted_order_date": adjusted_order_date,
        "alert_message": alert_message
    }

class TestMRPCalculation(unittest.TestCase):
    
    def test_standard_lead_time(self):
        # Need date: 2026-06-01 (June)
        # Lead time: 10 days
        # Base Order: 2026-05-22
        # No Seasonality (May/June is free)
        
        need = datetime(2026, 6, 1)
        res = calculate_mrp_suggestion(need, 10)
        
        expected_order = datetime(2026, 5, 22)
        self.assertEqual(res["base_order_date"], expected_order)
        self.assertEqual(res["adjusted_order_date"], expected_order)
        self.assertIsNone(res["alert_message"])

    def test_ferragosto_conflict(self):
        # Ferragosto acts on August (Month 7 in JS, 8 in Python). JS: 7.
        # Need Date: 2026-09-01
        # Lead Time: 20 days
        # Base Order: 2026-08-12 (August -> Conflict!)
        
        need = datetime(2026, 9, 1)
        res = calculate_mrp_suggestion(need, 20)
        
        base = datetime(2026, 8, 12)
        self.assertEqual(res["base_order_date"], base)
        
        # Logic: -15 days
        expected_adj = base - timedelta(days=15) # 2026-07-28
        
        self.assertEqual(res["adjusted_order_date"], expected_adj)
        self.assertIsNotNone(res["alert_message"])
        print(f"Ferragosto Alert: {res['alert_message']}")

    def test_december_conflict(self):
        # Christmas in December (Month 11 JS)
        # Need Date: 2027-01-10
        # Lead Time: 30 days
        # Base Order: 2026-12-11 (December -> Conflict!)
        
        need = datetime(2027, 1, 10)
        res = calculate_mrp_suggestion(need, 30)
        
        base = datetime(2026, 12, 11)
        self.assertEqual(res["base_order_date"], base)
        
        # Logic: -15 days
        expected_adj = base - timedelta(days=15) # 2026-11-26
        
        self.assertEqual(res["adjusted_order_date"], expected_adj)
        self.assertIsNotNone(res["alert_message"])

if __name__ == '__main__':
    unittest.main()
