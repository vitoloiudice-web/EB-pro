#!/usr/bin/env python3
"""
BOM Validator - Deterministic testing for Bill of Materials explosion logic.
This script validates that ALL nodes with partNumber are correctly exploded,
including Sub-Assembly nodes that were previously skipped.
"""

import json
import sys
from typing import List, Dict, Any, Set

# Sample BOM structure matching TypeScript types
SAMPLE_BOM = {
    "id": "BOM-CMP-22T",
    "name": "Compattatore Rifiuti 22T",
    "items": [
        {"id": "root", "level": 0, "wbs": "1", "nodeType": "Product", "description": "Compattatore 22T Standard", "quantity": 1, "uom": "PZ"},
        {"id": "1", "level": 1, "wbs": "1.1", "nodeType": "Assembly", "description": "Gruppo Autotelaio 6x2", "quantity": 1, "uom": "PZ"},
        {"id": "1-1", "level": 2, "wbs": "1.1.1", "nodeType": "Component", "partNumber": "TRK-VOL-FE320", "description": "Telaio Volvo FE 320", "quantity": 1, "uom": "PZ"},
        {"id": "4", "level": 2, "wbs": "1.3.2", "nodeType": "Sub-Assembly", "partNumber": "SUBASM-HYD-001", "description": "Impianto Idraulico Movimentazione", "quantity": 1, "uom": "PZ"},
        {"id": "4-1", "level": 3, "wbs": "1.3.2.1", "nodeType": "Variant", "partNumber": "IDRA-PUMP-GEAR-036D-0001", "description": "Cilindro Pala (Standard)", "quantity": 2, "uom": "PZ"},
        {"id": "5", "level": 1, "wbs": "1.4", "nodeType": "Assembly", "description": "Impianto Elettrico & Controllo", "quantity": 1, "uom": "PZ"},
        {"id": "5-1", "level": 2, "wbs": "1.4.1", "nodeType": "Component", "partNumber": "ELET-CTRL-BRD-V002-0001", "description": "Centralina PLC CanBus", "quantity": 1, "uom": "PZ"},
    ]
}


def explode_bom_old_logic(items: List[Dict]) -> List[Dict]:
    """
    OLD BROKEN LOGIC - Only processes Component, Variant, Option nodes.
    This is what the current MRP.tsx does.
    """
    result = []
    valid_types = {"Component", "Variant", "Option"}
    
    for item in items:
        if item.get("partNumber") and item.get("nodeType") in valid_types:
            result.append({
                "partNumber": item["partNumber"],
                "quantity": item["quantity"],
                "nodeType": item["nodeType"],
            })
    
    return result


def explode_bom_fixed_logic(items: List[Dict], multiplier: float = 1.0) -> List[Dict]:
    """
    FIXED LOGIC - Processes ALL nodes with partNumber, regardless of nodeType.
    This is the correct implementation that should be used in MRP.tsx.
    """
    result = []
    
    for item in items:
        if item.get("partNumber"):
            effective_qty = item["quantity"] * multiplier
            result.append({
                "partNumber": item["partNumber"],
                "quantity": effective_qty,
                "nodeType": item["nodeType"],
            })
        
        # If there were children (nested structure), we would recurse here
        # For flat list structure, we rely on WBS parsing
        children = item.get("children", [])
        if children:
            child_results = explode_bom_fixed_logic(children, item["quantity"] * multiplier)
            result.extend(child_results)
    
    return result


def validate_explosion(bom_data: Dict) -> Dict[str, Any]:
    """
    Validates BOM explosion by comparing old vs fixed logic.
    Returns validation report.
    """
    items = bom_data.get("items", [])
    
    old_result = explode_bom_old_logic(items)
    fixed_result = explode_bom_fixed_logic(items)
    
    old_parts = {r["partNumber"] for r in old_result}
    fixed_parts = {r["partNumber"] for r in fixed_result}
    
    missing_in_old = fixed_parts - old_parts
    
    report = {
        "bom_id": bom_data.get("id"),
        "bom_name": bom_data.get("name"),
        "total_items": len(items),
        "old_logic": {
            "parts_found": len(old_result),
            "parts": old_result,
        },
        "fixed_logic": {
            "parts_found": len(fixed_result),
            "parts": fixed_result,
        },
        "validation": {
            "missing_in_old_logic": list(missing_in_old),
            "is_complete": len(missing_in_old) == 0,
            "severity": "OK" if len(missing_in_old) == 0 else "CRITICAL",
        }
    }
    
    return report


def main():
    """Main entry point for BOM validation."""
    print("=" * 60)
    print("BOM VALIDATOR - Deterministic Logic Test")
    print("=" * 60)
    
    # Run validation on sample BOM
    report = validate_explosion(SAMPLE_BOM)
    
    print(f"\nBOM: {report['bom_name']} ({report['bom_id']})")
    print(f"Total Items: {report['total_items']}")
    print()
    
    print("OLD LOGIC (Broken):")
    print(f"  Parts found: {report['old_logic']['parts_found']}")
    for p in report['old_logic']['parts']:
        print(f"    - {p['partNumber']} x{p['quantity']} ({p['nodeType']})")
    print()
    
    print("FIXED LOGIC (Correct):")
    print(f"  Parts found: {report['fixed_logic']['parts_found']}")
    for p in report['fixed_logic']['parts']:
        print(f"    - {p['partNumber']} x{p['quantity']} ({p['nodeType']})")
    print()
    
    print("VALIDATION RESULT:")
    if report['validation']['is_complete']:
        print("  [OK] All parts correctly exploded")
        exit_code = 0
    else:
        print(f"  [FAIL] MISSING PARTS in old logic: {report['validation']['missing_in_old_logic']}")
        print(f"  Severity: {report['validation']['severity']}")
        exit_code = 1
    
    print()
    print("JSON Report:")
    print(json.dumps(report, indent=2))
    
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
