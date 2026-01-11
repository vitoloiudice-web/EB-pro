import unittest
from typing import List, Optional, Dict

# MOCK DATA STRUCTURES based on types.ts and MRP.tsx usage

class BOMItem:
    def __init__(self, id: str, part_number: Optional[str], quantity: int, node_type: str, children: List['BOMItem'] = None):
        self.id = id
        self.part_number = part_number
        self.quantity = quantity
        self.node_type = node_type
        self.children = children if children else []

class BOM:
    def __init__(self, id: str, name: str, items: List[BOMItem]):
        self.id = id
        self.name = name
        self.items = items

# LOGIC TO TEST (Ported from MRP.tsx)
class MRPEngine:
    def __init__(self):
        self.demand_events = {} # Map<sku, List[Event]>

    def get_events(self, sku):
        if sku not in self.demand_events:
            self.demand_events[sku] = []
        return self.demand_events[sku]

    def explode_bom(self, items: List[BOMItem], multiplier: float):
        """
        Original Logic from MRP.tsx:
        items.forEach(item => {
            if (item.partNumber) {
                 // add demand
            }
            if (item.children && item.children.length > 0) {
                 explodeBom(item.children, item.quantity * multiplier, ...);
            }
        });
        """
        for item in items:
            # Logic observed in MRP.tsx
            if item.part_number:
                qty_needed = item.quantity * multiplier
                self.get_events(item.part_number).append({
                    "qty": -qty_needed,
                    "type": "DEMAND_BOM"
                })
            
            # Recurse
            if item.children:
                # The code in MRP.tsx passes `item.quantity * multiplier`
                self.explode_bom(item.children, item.quantity * multiplier)

class TestBOMExplosion(unittest.TestCase):
    
    def test_recursive_explosion(self):
        """
        Test Structure:
        Root (Vehicle)
         |
         +-- SubAssembly A (Engine) - Qty 1
             |
             +-- Component A1 (Piston) - Qty 4
             |
             +-- SubAssembly B (Valve Set) - Qty 8
                 |
                 +-- Component B1 (Valve) - Qty 2
        
        If we build 1 Vehicle:
        - Engine: 1
        - Piston: 1 * 4 = 4
        - Valve Set: 1 * 8 = 8
        - Valve: 1 * 8 * 2 = 16
        """
        
        # Level 2
        comp_b1 = BOMItem("c-b1", "SKU-VALVE", 2, "Component")
        
        # Level 1
        sub_b = BOMItem("s-b", "SKU-VALVE-SET", 8, "Sub-Assembly", [comp_b1])
        comp_a1 = BOMItem("c-a1", "SKU-PISTON", 4, "Component")
        
        # Level 0
        sub_a = BOMItem("s-a", "SKU-ENGINE", 1, "Sub-Assembly", [comp_a1, sub_b])
        
        root_items = [sub_a]
        
        engine = MRPEngine()
        engine.explode_bom(root_items, 1) # Build 1 unit
        
        events = engine.demand_events
        print("Captured Events:", events)
        
        # Assertions
        self.assertTrue("SKU-ENGINE" in events, "Should find SKU-ENGINE")
        self.assertEqual(events["SKU-ENGINE"][0]["qty"], -1)
        
        self.assertTrue("SKU-PISTON" in events, "Should find SKU-PISTON")
        self.assertEqual(events["SKU-PISTON"][0]["qty"], -4, "Should be 1 * 4 = 4")
        
        self.assertTrue("SKU-VALVE-SET" in events, "Should find SKU-VALVE-SET")
        self.assertEqual(events["SKU-VALVE-SET"][0]["qty"], -8, "Should be 1 * 8 = 8")
        
        self.assertTrue("SKU-VALVE" in events, "Should find SKU-VALVE")
        self.assertEqual(events["SKU-VALVE"][0]["qty"], -16, "Should be 1 * 8 * 2 = 16")

    def test_missing_subassembly_logic(self):
        """
        Verify the 'bug' claimed in report: that Sub-Assemblies might be ignored if nodeType check is restrictive.
        MRP.tsx logic read: `if (item.partNumber) { ... }` which is correct.
        However, if there was a node WITHOUT partNumber (just structural) but WITH children, does it recurse?
        """
        # Node without part number (e.g. valid structural grouping)
        comp_child = BOMItem("c-1", "SKU-CHILD", 5, "Component")
        group_node = BOMItem("g-1", None, 1, "Structural", [comp_child]) # No part number
        
        engine = MRPEngine()
        engine.explode_bom([group_node], 10)
        
        events = engine.demand_events
        
        # Parent has no part number, so no demand for it
        self.assertTrue(group_node.part_number not in events)
        
        # Child MUST be found if recursion happens
        self.assertTrue("SKU-CHILD" in events, "Recursion should happen even if parent has no partNumber")
        self.assertEqual(events["SKU-CHILD"][0]["qty"], -50, "10 * 1 * 5 = 50")

if __name__ == '__main__':
    unittest.main()
