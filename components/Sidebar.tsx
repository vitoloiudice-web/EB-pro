
import React from 'react';
import { ViewState, Tenant } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isOpen: boolean;
  currentTenant?: Tenant;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, currentTenant }) => {
  
  const menuGroups = [
    {
      title: 'AREA AMMINISTRATIVA',
      items: [
        { id: ViewState.DASHBOARD, label: 'Cruscotto Direzionale', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
        { id: ViewState.HUB_FTE, label: 'HUB B2B / FTE', icon: 'M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2' }, // New FTE Icon
        { id: ViewState.REPORTS, label: 'Analisi & Bilanci', icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
      ]
    },
    {
      title: 'AREA LOGISTICA',
      items: [
        { id: ViewState.FORNITORI, label: 'Anagrafica Fornitori', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
        { id: ViewState.LOGISTICA_MAGAZZINO, label: 'Logistica di Magazzino', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { id: ViewState.CICLO_PASSIVO, label: 'Ciclo Passivo (Acquisti)', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
      ]
    },
    {
      title: 'AREA PRODUZIONE',
      items: [
        { id: ViewState.DISTINTA_BASE, label: 'Distinta Base (BOM)', icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
        { id: ViewState.PIANIFICAZIONE, label: 'Pianificazione Commesse', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
        { id: ViewState.MRP, label: 'Elaborazione MRP', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z' },
        { id: ViewState.CONTROLLO_QUALITA, label: 'Controllo Qualità (QC)', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
      ]
    }
  ];

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-72 bg-slate-850 text-white transition-transform duration-300 ease-in-out flex flex-col shadow-xl`}>
      <div className="h-16 flex items-center justify-center border-b border-slate-700 bg-slate-900">
        <h1 className="text-xl font-bold tracking-wider text-white">eSolver <span className="text-epicor-400 font-light">CLOUD</span></h1>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
        {menuGroups.map((group, idx) => (
          <div key={idx}>
            <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{group.title}</h3>
            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                    currentView === item.id 
                      ? 'bg-epicor-600 text-white shadow-md' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <svg className={`mr-3 h-5 w-5 flex-shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                  </svg>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        ))}
        
        {/* Settings always at bottom */}
        <div className="mt-4 pt-4 border-t border-slate-700">
           <button
              onClick={() => onChangeView(ViewState.SETTINGS)}
              className={`flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 group ${
                currentView === ViewState.SETTINGS 
                  ? 'bg-slate-700 text-white' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <svg className="mr-3 h-5 w-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              </svg>
              Configurazione Sistema
            </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-700 bg-slate-900">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold shadow-md ${currentTenant ? currentTenant.color : 'bg-epicor-500'}`}>
               {currentTenant ? currentTenant.name.charAt(0) : 'S'}
            </div>
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">Operatore Sistemi</p>
            <p className="text-[10px] text-slate-400 truncate uppercase tracking-wide">
              {currentTenant ? currentTenant.name : 'Configuratore'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
