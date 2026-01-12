
import React from 'react';
import { AVAILABLE_TENANTS } from '../services/dataService';

interface TenantHeaderProps {
    currentTenantId: string;
    isMultiTenant: boolean;
    onTenantChange: (id: string) => void;
    onToggleMultiTenant: () => void;
    onLogout: () => void; // Added logout handler
}

const TenantHeader: React.FC<TenantHeaderProps> = ({ 
    currentTenantId, 
    isMultiTenant, 
    onTenantChange, 
    onToggleMultiTenant,
    onLogout
}) => {
    
    const currentTenant = AVAILABLE_TENANTS.find(t => t.id === currentTenantId);

    return (
        <div className="bg-white border-b border-slate-200 px-6 py-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
            
            {/* Left: Branding & Current Context */}
            <div className="flex items-center space-x-4">
                <div className="hidden md:flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase">Active Context</span>
                        <span className="text-slate-300">|</span>
                        <button 
                            onClick={onLogout}
                            className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline uppercase tracking-wide transition-colors"
                        >
                            Log-Out
                        </button>
                    </div>
                    <div className="flex items-center space-x-2 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${isMultiTenant ? 'bg-purple-600 animate-pulse' : currentTenant?.color}`}></span>
                        <span className="font-bold text-slate-800 text-sm">
                            {isMultiTenant ? 'MULTI-TENANT VIEW (AGGREGATED)' : currentTenant?.name}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center space-x-4">
                
                {/* Multi-Tenant Toggle */}
                <button 
                    onClick={onToggleMultiTenant}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                        isMultiTenant 
                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-inner' 
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                >
                    <svg className={`w-4 h-4 ${isMultiTenant ? 'text-purple-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span className="text-xs font-bold">MULTI-TENANT</span>
                </button>

                <div className="h-6 w-px bg-slate-200 mx-2"></div>

                {/* Tenant Selector */}
                <div className="relative group">
                    <button className="flex items-center space-x-2 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors">
                        <div className={`w-5 h-5 rounded text-white flex items-center justify-center text-[10px] font-bold ${currentTenant?.color}`}>
                            {currentTenant?.name.substring(0, 1)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{currentTenant?.name}</span>
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    {/* Dropdown */}
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden hidden group-hover:block animate-fade-in-up z-50">
                        <div className="p-2">
                            <p className="text-xs text-slate-400 px-2 py-1 uppercase font-semibold">Switch Tenant</p>
                            {AVAILABLE_TENANTS.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => onTenantChange(t.id)}
                                    className={`w-full text-left flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                        currentTenantId === t.id ? 'bg-slate-50 text-slate-900 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${t.color}`}></span>
                                    <span>{t.name}</span>
                                    {currentTenantId === t.id && (
                                        <svg className="w-4 h-4 text-green-500 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantHeader;
