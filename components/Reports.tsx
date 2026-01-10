import React from 'react';
import Analytics from './Analytics'; // Reusing existing charts for Phase 1 of Reports

const Reports: React.FC = () => {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Reports & Business Intelligence</h2>
                <div className="space-x-2">
                     <button className="px-3 py-1 text-sm border rounded bg-white">Export PDF</button>
                     <button className="px-3 py-1 text-sm border rounded bg-white">Export Excel</button>
                </div>
            </div>
            <Analytics />
        </div>
    );
};

export default Reports;