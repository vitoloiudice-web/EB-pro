// Barrel file for Purchasing module
// Provides clean imports for extracted components and hooks

export { default as MrpProposalList } from './MrpProposalList';
export { usePurchasingData } from './usePurchasingData';

// Re-export the main component from parent directory for backwards compatibility
// This allows gradual migration without breaking existing imports
