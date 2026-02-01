import React, { useState, useEffect } from 'react';
import { COMPANIES } from './constants';
import { Company, ViewState } from './types';
import Dashboard from './components/Dashboard';
import MRPView from './components/MRPView';
import MasterDataView from './components/MasterDataView';
import AdminProfileView from './components/AdminProfileView';
import BusinessIntelligenceView from './components/BusinessIntelligenceView';
import LogisticsView from './components/LogisticsView';
import SupplierQualificationView from './components/SupplierQualificationView';
import SupplierScoutingView from './components/SupplierScoutingView';
import { googleSheetsService } from './services/googleSheetsService';

function App() {
  const [currentCompany, setCurrentCompany] = useState<Company>(COMPANIES[0]);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [fontSize, setFontSize] = useState<'text-sm' | 'text-base' | 'text-lg'>('text-base');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  
  // State for Navigation Parameters (e.g. Filter Logistics by Status)
  const [viewParams, setViewParams] = useState<any>(null);

  useEffect(() => {
    const handleResize = () => {
        if (window.innerWidth >= 1024) setSidebarOpen(true);
        else setSidebarOpen(false);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    googleSheetsService.initClient().then(() => {
        console.log("Google API Initialized");
    });
  }, []);

  const handleLogin = () => {
    googleSheetsService.signIn();
    setIsAuthenticated(true);
  };

  const cycleFontSize = () => {
    if (fontSize === 'text-sm') setFontSize('text-base');
    else if (fontSize === 'text-base') setFontSize('text-lg');
    else setFontSize('text-sm');
  };

  const navigateTo = (view: ViewState, params?: any) => {
    setViewParams(params || null);
    setCurrentView(view);
    if(window.innerWidth < 1024) setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard company={currentCompany} onNavigate={navigateTo} />;
      case ViewState.MRP:
        return <MRPView company={currentCompany} />;
      case ViewState.LOGISTICS:
        return <LogisticsView company={currentCompany} initialFilter={viewParams?.filter} />;
      case ViewState.BI:
        return <BusinessIntelligenceView company={currentCompany} />;
      case ViewState.SUPPLIER_QUALIFICATION:
        return <SupplierQualificationView company={currentCompany} />;
      case ViewState.SUPPLIER_SCOUTING:
        return <SupplierScoutingView company={currentCompany} />;
      case ViewState.MASTER_DATA:
        return <MasterDataView company={currentCompany} />;
      case ViewState.SETTINGS:
        return <AdminProfileView company={currentCompany} />;
      default:
        return <div className="p-10 text-center text-slate-500">Modulo in costruzione</div>;
    }
  };

  const NavItem = ({ view, label, icon }: { view: ViewState, label: string, icon?: React.ReactNode }) => (
    <button 
      onClick={() => navigateTo(view)}
      className={`w-full text-left px-5 py-3.5 mb-3 rounded-xl flex items-center transition-all duration-200 group ${currentView === view ? 'neu-pressed text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
    >
      {icon && <span className={`mr-3 ${currentView === view ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>}
      {label}
    </button>
  );

  return (
    <div className={`min-h-screen flex bg-[#EEF2F6] text-slate-700 font-sans ${fontSize} overflow-hidden`}>
      
      {/* Sidebar - Responsive: Fixed/Absolute on mobile, Relative on Desktop */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside className={`
          fixed lg:relative inset-y-0 left-0 z-40 bg-[#EEF2F6]
          ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'} 
          transition-all duration-300 overflow-hidden border-r border-slate-200/50 lg:border-none shadow-2xl lg:shadow-none flex-shrink-0
      `}>
         <div className="h-full p-6 flex flex-col w-72">
            {/* Logo Area */}
            <div className="flex items-center space-x-3 mb-10 px-2">
              <div className="w-12 h-12 neu-flat flex items-center justify-center rounded-2xl text-blue-600 font-black text-xl tracking-tighter flex-shrink-0">
                EB
              </div>
              <div className="flex flex-col overflow-hidden">
                 <span className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap">EB-pro</span>
                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider whitespace-nowrap">Procurement OS</span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
               <NavItem 
                 view={ViewState.DASHBOARD} 
                 label="Dashboard" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>}
               />
               
               <div className="my-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Operations</div>
               
               <NavItem 
                 view={ViewState.MRP} 
                 label="MRP & Scorte" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
               />
               <NavItem 
                 view={ViewState.LOGISTICS} 
                 label="Logistica & Ordini" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
               />
               <NavItem 
                 view={ViewState.SUPPLIER_QUALIFICATION} 
                 label="Qualifica Fornitori" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
               />
               <NavItem 
                 view={ViewState.SUPPLIER_SCOUTING} 
                 label="Scouting AI" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>}
               />

               <div className="my-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Intelligence</div>

               <NavItem 
                 view={ViewState.BI} 
                 label="Business Analytics" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
               />
               
               <NavItem 
                 view={ViewState.MASTER_DATA} 
                 label="Anagrafiche" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
               />
               
               <div className="mt-8 border-t border-slate-200 pt-4">
                 <NavItem 
                   view={ViewState.SETTINGS} 
                   label="Impostazioni" 
                   icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
                 />
               </div>
            </nav>
         </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
        
        {/* Header - Transparent/Glassy feel */}
        <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 z-20 flex-shrink-0 bg-[#EEF2F6]/90 backdrop-blur-sm">
          <div className="flex items-center">
             <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="mr-3 sm:mr-4 neu-icon-btn flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
             </button>
             <h1 className="text-lg sm:text-2xl font-bold text-slate-700 tracking-tight hidden sm:block truncate">
               {currentView === ViewState.DASHBOARD && 'Panoramica'}
               {currentView === ViewState.MRP && 'MRP & Fabbisogni'}
               {currentView === ViewState.LOGISTICS && 'Logistica & Ordini'}
               {currentView === ViewState.BI && 'Analisi Business'}
               {currentView === ViewState.SUPPLIER_QUALIFICATION && 'Qualifica Fornitori'}
               {currentView === ViewState.SUPPLIER_SCOUTING && 'Scouting AI'}
               {currentView === ViewState.MASTER_DATA && 'Anagrafiche'}
               {currentView === ViewState.SETTINGS && 'Profilo Aziendale'}
             </h1>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            
            {/* Company Selector */}
            <div className="relative group">
              <select 
                value={currentCompany.id}
                onChange={(e) => {
                  const c = COMPANIES.find(c => c.id === e.target.value);
                  if (c) setCurrentCompany(c);
                }}
                className="neu-pressed appearance-none pl-3 pr-8 py-2 text-xs sm:text-sm font-bold text-slate-600 cursor-pointer focus:text-blue-600 transition-colors w-32 sm:w-48 truncate"
              >
                {COMPANIES.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-slate-400">
                <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
               {/* Font Toggle */}
              <button 
                onClick={cycleFontSize} 
                className="neu-icon-btn hidden sm:flex"
                title="Cambia dimensione testo"
              >
                <span className="text-lg">A</span>
              </button>

              {/* Login / Profile */}
              {!isAuthenticated ? (
                <button 
                  onClick={handleLogin}
                  className="neu-btn px-3 py-2 sm:px-6 sm:py-2.5 text-xs sm:text-sm"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4 mr-0 sm:mr-2" alt="Google" />
                  <span className="hidden sm:inline">Accedi</span>
                </button>
              ) : (
                <div className="flex items-center space-x-3 pl-0 sm:pl-4 border-l-0 sm:border-l border-slate-300/50">
                  <div className="text-right hidden md:block">
                     <div className="text-sm font-bold text-slate-700">Admin</div>
                     <div className="text-xs text-slate-400">Super User</div>
                  </div>
                  <button className="neu-flat w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-600 font-bold border-2 border-[#EEF2F6]">
                    SA
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-8 w-full custom-scrollbar">
          <div className="max-w-8xl mx-auto h-auto lg:h-full flex flex-col">
             {renderContent()}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;