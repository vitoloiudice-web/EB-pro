import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Settings & Configuration</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Tenant Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Company Name</label>
                <input type="text" value="Main Corp" readOnly className="mt-1 block w-full border border-slate-300 rounded-md p-2 bg-slate-50" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Currency</label>
                <input type="text" value="EUR (€)" readOnly className="mt-1 block w-full border border-slate-300 rounded-md p-2 bg-slate-50" />
            </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Seasonal Events (MRP Algorithm)</h3>
        <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                <div>
                    <span className="font-bold text-slate-800">Chiusura Estiva (Ferragosto)</span>
                    <p className="text-xs text-slate-500">Rischio Alto • Agosto</p>
                </div>
                <span className="text-xs bg-white border px-2 py-1 rounded">Active</span>
            </div>
             <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                <div>
                    <span className="font-bold text-slate-800">Festività Natalizie</span>
                    <p className="text-xs text-slate-500">Rischio Medio • Dicembre</p>
                </div>
                <span className="text-xs bg-white border px-2 py-1 rounded">Active</span>
            </div>
        </div>
      </div>
      
      <div className="flex justify-end">
          <button className="text-red-600 text-sm font-medium hover:underline">Logout Tenant</button>
      </div>
    </div>
  );
};

export default Settings;