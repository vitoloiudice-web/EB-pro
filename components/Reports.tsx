
import React from 'react';
import Analytics from './Analytics';

interface ReportsProps {
    tenantId: string;
    isMultiTenant: boolean;
}

const Reports: React.FC<ReportsProps> = ({ tenantId, isMultiTenant }) => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">
                    Reportistica {isMultiTenant && '(Multi-Tenant)'}
                </h2>
                <div className="space-x-2">
                     <button className="px-3 py-1 text-sm border rounded bg-white hover:bg-slate-50">Esporta PDF</button>
                     <button className="px-3 py-1 text-sm border rounded bg-white hover:bg-slate-50">Esporta Excel</button>
                </div>
            </div>
            <Analytics tenantId={tenantId} isMultiTenant={isMultiTenant} />
        </div>
    );
};

export default Reports;
