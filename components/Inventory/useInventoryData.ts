import { useState, useEffect, useCallback } from 'react';
import { Part, BillOfMaterials } from '../../types';
import {
    fetchParts,
    addPart,
    updatePart,
    deletePart,
    fetchBOMs,
    findPartByManufacturerCode,
    fetchPartSiblings
} from '../../services/dataService';

interface UseInventoryDataParams {
    tenantId: string;
    isMultiTenant: boolean;
}

interface UseInventoryDataReturn {
    parts: Part[];
    boms: BillOfMaterials[];
    loading: boolean;
    selectedPart: Part | null;
    setSelectedPart: (part: Part | null) => void;
    refreshData: () => Promise<void>;
    handleCreatePart: (part: Omit<Part, 'id'>) => Promise<void>;
    handleUpdatePart: (part: Part) => Promise<void>;
    handleDeletePart: (partId: string) => Promise<boolean>;
    searchPartByManufacturerCode: (code: string) => Promise<Part | undefined>;
    getPartSiblings: (sku: string) => Promise<Part[]>;
}

/**
 * Custom hook for managing Inventory module data and operations.
 * Extracted from Inventory.tsx to improve maintainability and testability.
 */
export const useInventoryData = ({
    tenantId,
    isMultiTenant
}: UseInventoryDataParams): UseInventoryDataReturn => {
    const [parts, setParts] = useState<Part[]>([]);
    const [boms, setBoms] = useState<BillOfMaterials[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPart, setSelectedPart] = useState<Part | null>(null);

    const refreshData = useCallback(async () => {
        setLoading(true);
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const [partsData, bomsData] = await Promise.all([
            fetchParts(effectiveFilter),
            fetchBOMs(effectiveFilter)
        ]);
        setParts(partsData);
        setBoms(bomsData);
        setLoading(false);
    }, [tenantId, isMultiTenant]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const handleCreatePart = useCallback(async (part: Omit<Part, 'id'>) => {
        await addPart(part);
        await refreshData();
    }, [refreshData]);

    const handleUpdatePart = useCallback(async (part: Part) => {
        await updatePart(part);
        await refreshData();
    }, [refreshData]);

    const handleDeletePart = useCallback(async (partId: string): Promise<boolean> => {
        const result = await deletePart(partId);
        if (result) {
            await refreshData();
        }
        return result;
    }, [refreshData]);

    const searchPartByManufacturerCode = useCallback(async (code: string): Promise<Part | undefined> => {
        return findPartByManufacturerCode(code);
    }, []);

    const getPartSiblings = useCallback(async (sku: string): Promise<Part[]> => {
        return fetchPartSiblings(sku, tenantId);
    }, [tenantId]);

    return {
        parts,
        boms,
        loading,
        selectedPart,
        setSelectedPart,
        refreshData,
        handleCreatePart,
        handleUpdatePart,
        handleDeletePart,
        searchPartByManufacturerCode,
        getPartSiblings
    };
};

export default useInventoryData;
