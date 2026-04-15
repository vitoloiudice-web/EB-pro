
import React, { useState, useEffect } from 'react';
import { CLIENTS } from './constants';
import { Client, ViewState } from './types';
import Dashboard from './components/Dashboard';
import MRPView from './components/MRPView';
import MasterDataView from './components/MasterDataView';
import AdminProfileView from './components/AdminProfileView';
import BusinessIntelligenceView from './components/BusinessIntelligenceView';
import LogisticsView from './components/LogisticsView';
import SupplierQualificationView from './components/SupplierQualificationView';
import SupplierScoutingView from './components/SupplierScoutingView';
import { dataService } from './services/dataService';
import { googleSheetsService } from './services/googleSheetsService';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';
import Tooltip from './components/common/Tooltip';

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      let errorData: any = null;
      try {
        errorData = JSON.parse(this.state.error.message);
      } catch (e) {
        // Not a JSON error
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-[#EEF2F6] p-6">
          <div className="max-w-2xl w-full neu-flat p-10 rounded-[2.5rem] text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.268 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 mb-4">Si è verificato un errore</h2>
            <p className="text-slate-500 mb-8 leading-relaxed">
              {errorData?.error || "L'applicazione ha riscontrato un problema imprevisto."}
            </p>

            {errorData?.indexLink && (
              <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl mb-8 text-left">
                <h3 className="text-blue-700 font-bold mb-2 flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Azione Richiesta: Creazione Indice
                </h3>
                <p className="text-blue-600 text-sm mb-4">
                  Questa operazione richiede un indice composito in Firestore. Clicca il pulsante sotto per crearlo automaticamente nella console Firebase.
                </p>
                <a 
                  href={errorData.indexLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-all"
                >
                  Crea Indice su Firebase
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              </div>
            )}

            <button 
              onClick={() => window.location.reload()}
              className="neu-btn px-8 py-3 font-bold"
            >
              Ricarica Applicazione
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const adminWorkspace: Client = { id: 'centrale-acquisti', name: 'Centrale Acquisti', spreadsheetId: 'default' };
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string>(''); // Store logged-in user email
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
    // Firebase Auth Listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || '');
      } else {
        setIsAuthenticated(false);
        setUserEmail('');
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
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
        return <Dashboard clients={[adminWorkspace]} onNavigate={navigateTo} />;
      case ViewState.MRP:
        return <MRPView client={adminWorkspace} />;
      case ViewState.LOGISTICS:
        return <LogisticsView client={adminWorkspace} initialFilter={viewParams?.filter} />;
      case ViewState.BI:
        return <BusinessIntelligenceView client={adminWorkspace} />;
      case ViewState.SUPPLIER_QUALIFICATION:
        return <SupplierQualificationView client={adminWorkspace} />;
      case ViewState.SUPPLIER_SCOUTING:
        return <SupplierScoutingView client={adminWorkspace} />;
      case ViewState.MASTER_DATA:
        return <MasterDataView 
          client={adminWorkspace} 
          initialTab={viewParams?.tab} 
          initialSubTab={viewParams?.subTab} 
        />;
      case ViewState.SETTINGS:
        return <AdminProfileView client={adminWorkspace} />;
      default:
        return <div className="p-10 text-center text-slate-500">Modulo in costruzione</div>;
    }
  };

  const NavItem = ({ view, label, icon, params, tooltip }: { view: ViewState, label: string, icon?: React.ReactNode, params?: any, tooltip?: { title: string, description: string, usage: string } }) => {
    const isActive = currentView === view && (!params || JSON.stringify(viewParams) === JSON.stringify(params));
    const button = (
      <button 
        onClick={() => navigateTo(view, params)}
        className={`w-full text-left px-5 py-3.5 mb-1 rounded-xl flex items-center transition-all duration-200 group ${isActive ? 'neu-pressed text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
      >
        {icon && <span className={`mr-3 ${isActive ? 'text-blue-500' : 'text-slate-400 group-hover:text-slate-600'}`}>{icon}</span>}
        {label}
      </button>
    );

    return tooltip ? <Tooltip content={tooltip} position="right" className="w-full">{button}</Tooltip> : button;
  };

  const SubNavItem = ({ view, label, params, tooltip }: { view: ViewState, label: string, params?: any, tooltip?: { title: string, description: string, usage: string } }) => {
    const isActive = currentView === view && JSON.stringify(viewParams) === JSON.stringify(params);
    const button = (
      <button 
        onClick={() => navigateTo(view, params)}
        className={`w-full text-left px-5 py-2 mb-1 rounded-lg flex items-center transition-all duration-200 text-xs ${isActive ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700 hover:bg-white/30'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full mr-3 ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></span>
        {label}
      </button>
    );

    return tooltip ? <Tooltip content={tooltip} position="right" className="w-full">{button}</Tooltip> : button;
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F6]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Caricamento sessione...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#EEF2F6] p-4">
        <div className="max-w-md w-full neu-flat p-8 sm:p-12 rounded-[2rem] text-center">
          <div className="w-20 h-20 neu-flat flex items-center justify-center rounded-3xl text-blue-600 font-black text-3xl tracking-tighter mx-auto mb-8">
            EB
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">EB-pro</h1>
          <p className="text-slate-500 mb-10 leading-relaxed">
            Benvenuto nel sistema operativo per il procurement industriale. Accedi per gestire la tua azienda.
          </p>
          
          <button 
            onClick={handleLogin}
            className="neu-btn w-full py-4 flex items-center justify-center space-x-3 text-lg font-bold group"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 transition-transform group-hover:scale-110" alt="Google" />
            <span>Accedi con Google</span>
          </button>
          
          <div className="mt-12 pt-8 border-t border-slate-200/60">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-[0.2em]">
              Powered by EB-pro Enterprise
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`h-screen flex bg-[#EEF2F6] text-slate-700 font-sans ${fontSize} overflow-hidden`}>
      
      {/* Sidebar - Responsive: Fixed/Absolute on mobile, Static/Relative on Desktop */}
      <div 
        className={`fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <aside className={`
          fixed lg:static inset-y-0 left-0 z-40 bg-[#EEF2F6] h-screen
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
                 tooltip={{
                    title: "Dashboard Strategica",
                    description: "Visione d'insieme del 'Sistema Impresa'. Monitora KPI critici, scadenze e flussi operativi in tempo reale.",
                    usage: "Clicca per tornare alla panoramica generale dell'azienda."
                 }}
               />
               
               <div className="my-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Operations</div>
               
               <NavItem 
                 view={ViewState.MRP} 
                 label="MRP & Scorte" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                 tooltip={{
                    title: "Motore MRP e-Solver",
                    description: "Algoritmo di bilanciamento tra continuità produttiva e minimizzazione del capitale immobilizzato.",
                    usage: "Gestisci fabbisogni netti, lead time e proposte d'ordine."
                 }}
               />
               <NavItem 
                 view={ViewState.LOGISTICS} 
                 label="Logistica & Ordini" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                 tooltip={{
                    title: "Logistica & Supply Chain",
                    description: "Gestione flussi di entrata/uscita, DDT conto lavoro e tracciabilità lotti/matricole.",
                    usage: "Monitora lo stato degli ordini d'acquisto e le spedizioni."
                 }}
               />
               <NavItem 
                 view={ViewState.SUPPLIER_QUALIFICATION} 
                 label="Qualifica Fornitori" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                 tooltip={{
                    title: "Sistema Qualità ISO 9001",
                    description: "Valutazione e monitoraggio delle performance dei partner strategici basata su dati oggettivi.",
                    usage: "Gestisci criteri di qualifica, rating e audit fornitori."
                 }}
               />
               <NavItem 
                 view={ViewState.SUPPLIER_SCOUTING} 
                 label="Scouting AI" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>}
                 tooltip={{
                    title: "Scouting AI Integrato",
                    description: "Ricerca semantica e mapping intelligente per identificare nuovi partner e proteggere l'univocità del database.",
                    usage: "Usa l'AI per trovare fornitori alternativi o mappare codici esterni."
                 }}
               />

               <div className="my-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Intelligence</div>

               <NavItem 
                 view={ViewState.BI} 
                 label="Business Analytics" 
                 icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
                 tooltip={{
                    title: "Simpresa BI",
                    description: "Trasformazione della mole di dati operativi in dashboard interattive per il controllo di gestione.",
                    usage: "Analizza margini, scostamenti ore e stati avanzamento lavori (SAL)."
                 }}
               />
               
               <div className="my-4 px-4 text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">Anagrafiche</div>
               
               <div className="space-y-1">
                 <NavItem 
                   view={ViewState.MASTER_DATA} 
                   label="ANAGRAFE" 
                   icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                 />
                 {(currentView === ViewState.MASTER_DATA) && (
                    <div className="ml-8 space-y-1 animate-fade-in">
                      <SubNavItem view={ViewState.MASTER_DATA} label="Articoli" params={{ tab: 'ARTICOLI' }} tooltip={{ title: "Anagrafe Articoli", description: "Gestione record articoli con logiche e-Solver (Phantom, Conto Lavoro, Multi-UM).", usage: "Seleziona per gestire il catalogo prodotti." }} />
                      <SubNavItem view={ViewState.MASTER_DATA} label="Fornitori" params={{ tab: 'SUPPLIERS' }} tooltip={{ title: "Anagrafe Fornitori", description: "Database centralizzato dei partner di fornitura con rating e termini di pagamento.", usage: "Seleziona per gestire i fornitori." }} />
                      <SubNavItem view={ViewState.MASTER_DATA} label="Clienti" params={{ tab: 'CUSTOMERS' }} tooltip={{ title: "Anagrafe Clienti", description: "Anagrafica clienti con gestione contratti e canoni mensili.", usage: "Seleziona per gestire il portafoglio clienti." }} />
                    </div>
                  )}
               </div>
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
        
        {/* Header - Neomorphic style */}
        <header className="h-16 sm:h-20 flex items-center justify-between px-4 sm:px-8 z-20 flex-shrink-0 neu-flat rounded-bl-[2rem] !border-none">
          <div className="flex items-center">
             <button 
               onClick={() => setSidebarOpen(!isSidebarOpen)} 
               className="mr-3 sm:mr-4 neu-icon-btn flex-shrink-0 hover:text-blue-600 transition-colors"
               title={isSidebarOpen ? "Chiudi Menu" : "Apri Menu"}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isSidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
             </button>
             <div className="flex flex-col">
                <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight hidden sm:block truncate">
                  {currentView === ViewState.DASHBOARD && 'Panoramica'}
                  {currentView === ViewState.MRP && 'MRP & Fabbisogni'}
                  {currentView === ViewState.LOGISTICS && 'Logistica & Ordini'}
                  {currentView === ViewState.BI && 'Analisi Business'}
                  {currentView === ViewState.SUPPLIER_QUALIFICATION && 'Qualifica Fornitori'}
                  {currentView === ViewState.SUPPLIER_SCOUTING && 'Scouting AI'}
                  {currentView === ViewState.MASTER_DATA && 'Anagrafe Enterprise'}
                  {currentView === ViewState.SETTINGS && 'Profilo Aziendale'}
                </h1>
                <div className="flex items-center space-x-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest sm:hidden">
                   <span>EB-pro</span>
                   <span className="opacity-30">/</span>
                   <span className="text-blue-500">
                      {currentView === ViewState.DASHBOARD && 'Dashboard'}
                      {currentView === ViewState.MRP && 'MRP'}
                      {currentView === ViewState.LOGISTICS && 'Logistica'}
                      {currentView === ViewState.BI && 'BI'}
                      {currentView === ViewState.SUPPLIER_QUALIFICATION && 'Qualifica'}
                      {currentView === ViewState.SUPPLIER_SCOUTING && 'Scouting'}
                      {currentView === ViewState.MASTER_DATA && 'Anagrafiche'}
                      {currentView === ViewState.SETTINGS && 'Impostazioni'}
                   </span>
                </div>
             </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-6">
            
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
                     {userEmail && <div className="text-[10px] text-blue-500 font-medium truncate max-w-[150px] mt-0.5">{userEmail}</div>}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="neu-flat w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-slate-600 font-bold border-2 border-[#EEF2F6] hover:text-red-500 transition-colors"
                    title="Logout"
                  >
                    {userEmail ? userEmail.charAt(0).toUpperCase() : 'U'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 w-full custom-scrollbar">
          <div className="w-full min-h-full flex flex-col">
             {renderContent()}
          </div>
        </div>

      </main>
    </div>
    </ErrorBoundary>
  );
}

export default App;
