import { BOM, Part } from '../types';

/**
 * RECURSIVE BOM EXPLOSION
 * Esplosione completa della distinta base multi-livello
 */

export interface ExplodedBOMItem {
  partId: string;
  sku: string;
  description: string;
  quantity: number;
  level: number;
  leadTime: number;
  cost: number;
}

const MAX_RECURSION_DEPTH = 10;
const RECURSION_CACHE = new Map<string, BOM>();

/**
 * Esplosione ricorsiva della BOM
 * Gestisce Sub-Assemblies multi-livello
 */
export function explodeBOMRecursive(
  bom: BOM,
  partsMap: Map<string, Part>,
  bomsMap: Map<string, BOM>,
  depth: number = 0,
  maxDepth: number = MAX_RECURSION_DEPTH
): ExplodedBOMItem[] {
  if (depth > maxDepth) {
    console.warn(`[BOM] Max recursion depth (${maxDepth}) reached`);
    return [];
  }

  const result: ExplodedBOMItem[] = [];

  // Processa TUTTI i nodi, non solo Component/Variant
  for (const item of bom.items || []) {
    const nodeQty = (item.quantity || 1) * (bom.quantity || 1);

    // Se è Sub-Assembly con BOM figli
    if (item.nodeType === 'Sub-Assembly' && item.bomId) {
      const childBom = bomsMap.get(item.bomId);
      if (childBom) {
        // Ricorsione
        const childItems = explodeBOMRecursive(
          childBom,
          partsMap,
          bomsMap,
          depth + 1,
          maxDepth
        );

        // Aggiungi item figli con rollup quantità
        for (const childItem of childItems) {
          result.push({
            ...childItem,
            quantity: childItem.quantity * nodeQty,
            level: Math.max(childItem.level, depth + 1)
          });
        }
      }
    } else if (item.partId || item.partNumber) {
      // Component/Variant/Option: è un pezzo finale
      const partId = item.partId || '';
      const part = partsMap.get(partId);

      result.push({
        partId,
        sku: item.partNumber || '',
        description: part?.description || item.partNumber || '',
        quantity: nodeQty,
        level: depth,
        leadTime: part?.leadTime || 0,
        cost: part?.cost || 0
      });
    }
  }

  // Deduplicazione: raggruppa lo stesso part per livello
  const deduplicated = new Map<string, ExplodedBOMItem>();
  for (const item of result) {
    const key = `${item.partId}_${item.level}`;
    if (deduplicated.has(key)) {
      const existing = deduplicated.get(key)!;
      existing.quantity += item.quantity;
    } else {
      deduplicated.set(key, item);
    }
  }

  return Array.from(deduplicated.values());
}

/**
 * Calcola fabbisogni netti da esplosione BOM
 */
export function calculateNetRequirements(
  explodedItems: ExplodedBOMItem[],
  partsInventory: Map<string, number>,
  safetyStocks: Map<string, number>
): Map<string, number> {
  const requirements = new Map<string, number>();

  for (const item of explodedItems) {
    const currentStock = partsInventory.get(item.partId) || 0;
    const safetyStock = safetyStocks.get(item.partId) || 0;
    const available = Math.max(0, currentStock - safetyStock);
    const needed = Math.max(0, item.quantity - available);

    if (needed > 0) {
      requirements.set(item.partId, (requirements.get(item.partId) || 0) + needed);
    }
  }

  return requirements;
}

/**
 * Valida integrità BOM (rileva cicli)
 */
export function validateBOMIntegrity(
  bomId: string,
  bomsMap: Map<string, BOM>,
  visited: Set<string> = new Set()
): { valid: boolean; error?: string } {
  if (visited.has(bomId)) {
    return {
      valid: false,
      error: `Ciclo rilevato nella BOM: ${bomId} → ... → ${bomId}`
    };
  }

  visited.add(bomId);
  const bom = bomsMap.get(bomId);

  if (!bom) {
    return {
      valid: false,
      error: `BOM non trovata: ${bomId}`
    };
  }

  for (const item of bom.items || []) {
    if (item.nodeType === 'Sub-Assembly' && item.bomId) {
      const childResult = validateBOMIntegrity(item.bomId, bomsMap, new Set(visited));
      if (!childResult.valid) {
        return childResult;
      }
    }
  }

  return { valid: true };
}
