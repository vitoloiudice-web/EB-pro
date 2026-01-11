import { useState, useEffect, useCallback } from 'react';
import { PurchaseOrder, Part, MrpProposal, AdminProfile } from '../../types';
import {
    fetchOrders,
    addOrder,
    updateOrder,
    fetchParts,
    fetchMrpProposals,
    deleteMrpProposal,
    fetchAdminProfile
} from '../../services/dataService';

interface UsePurchasingDataParams {
    tenantId: string;
    isMultiTenant: boolean;
}

interface UsePurchasingDataReturn {
    orders: PurchaseOrder[];
    parts: Part[];
    mrpProposals: MrpProposal[];
    adminProfile: AdminProfile | null;
    loading: boolean;
    selectedOrderIds: Set<string>;
    refreshData: () => Promise<void>;
    toggleSelectAll: () => void;
    toggleSelectOrder: (id: string) => void;
    handleCreateOrder: (order: Omit<PurchaseOrder, 'id'> & { customId?: string }) => Promise<void>;
    handleUpdateOrder: (order: PurchaseOrder) => Promise<void>;
    handleConvertMrpProposal: (proposal: MrpProposal) => Promise<void>;
}

/**
 * Custom hook for managing Purchasing module data and operations.
 * Extracted from Purchasing.tsx to improve maintainability.
 */
export const usePurchasingData = ({
    tenantId,
    isMultiTenant
}: UsePurchasingDataParams): UsePurchasingDataReturn => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [parts, setParts] = useState<Part[]>([]);
    const [mrpProposals, setMrpProposals] = useState<MrpProposal[]>([]);
    const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

    const refreshData = useCallback(async () => {
        setLoading(true);
        const effectiveFilter = isMultiTenant ? 'all' : tenantId;
        const [ordersData, partsData, mrpData, adminData] = await Promise.all([
            fetchOrders(effectiveFilter),
            fetchParts(effectiveFilter),
            fetchMrpProposals(effectiveFilter),
            fetchAdminProfile()
        ]);
        setOrders(ordersData);
        setParts(partsData);
        setMrpProposals(mrpData.filter(p => p.status === 'Pending'));
        setAdminProfile(adminData);
        setLoading(false);
        setSelectedOrderIds(new Set());
    }, [tenantId, isMultiTenant]);

    useEffect(() => {
        refreshData();
    }, [refreshData]);

    const toggleSelectAll = useCallback(() => {
        if (selectedOrderIds.size === orders.length) {
            setSelectedOrderIds(new Set());
        } else {
            setSelectedOrderIds(new Set(orders.map(o => o.id)));
        }
    }, [orders, selectedOrderIds.size]);

    const toggleSelectOrder = useCallback((id: string) => {
        const newSet = new Set(selectedOrderIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedOrderIds(newSet);
    }, [selectedOrderIds]);

    const handleCreateOrder = useCallback(async (order: Omit<PurchaseOrder, 'id'> & { customId?: string }) => {
        await addOrder(order);
        await refreshData();
    }, [refreshData]);

    const handleUpdateOrder = useCallback(async (order: PurchaseOrder) => {
        await updateOrder(order);
        await refreshData();
    }, [refreshData]);

    const handleConvertMrpProposal = useCallback(async (proposal: MrpProposal) => {
        const orderPayload = {
            tenantId: proposal.tenantId,
            vendor: proposal.suggestedVendor,
            description: `MRP: ${proposal.partSku} - ${proposal.description}`,
            date: new Date().toISOString().split('T')[0],
            deliveryDate: proposal.orderByDate,
            amount: proposal.estimatedCost,
            items: proposal.missingQty,
            status: 'Pending Approval' as const,
            partId: proposal.partId
        };

        await addOrder(orderPayload);
        await deleteMrpProposal(proposal.id);
        await refreshData();
    }, [refreshData]);

    return {
        orders,
        parts,
        mrpProposals,
        adminProfile,
        loading,
        selectedOrderIds,
        refreshData,
        toggleSelectAll,
        toggleSelectOrder,
        handleCreateOrder,
        handleUpdateOrder,
        handleConvertMrpProposal
    };
};

export default usePurchasingData;
