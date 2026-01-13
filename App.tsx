
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth'; // Keeping types but not using auth logic
import Sidebar from './components/Sidebar';
import TenantHeader from './components/TenantHeader';
import Dashboard from './components/Dashboard';
import Purchasing from './components/Purchasing'; 
import Inventory from './components/Inventory'; 
import Quality from './components/Quality';
import Reports from './components/Reports';
import Settings from './components/Settings';
import EVAAssistant from './components/EVAAssistant';
import BillOfMaterialsView from './components/BillOfMaterials';
import SalesPlan from './components/SalesPlan';
import MRP from './components/MRP';
import Suppliers from './components/Suppliers';
import HubFTE from './components/HubFTE';
import { ViewState, GoogleConnectionState } from './types';
import { AVAILABLE_TENANTS, syncPendingOperations } from './services/dataService';
import { initGapiClient, initGisClient, handleGoogleLogin } from './services/googleService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // GOOGLE DRIVE STATE
  const [googleState, setGoogleState] = useState<GoogleConnectionState>({
      isConnected: false,
      isInitialized: false
  });

  // TENANT STATE
  const [currentTenantId, setCurrentTenantId] = useState<string>('main');
  const [isMultiTenant, setIsMultiTenant] = useState<boolean>(false);

  // SESSION STATE (For Log Out / Tenant Selection)
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  // INITIALIZE GOOGLE CLIENTS
  useEffect(() => {
      const initializeGoogle = async () => {
          try {
              await initGapiClient();
              initGisClient((response) => {
                  if (response && response.access_token) {
                      setGoogleState(prev => ({ ...prev, isConnected: true, userEmail: 'Google User' }));
                      // Here we will trigger Step 2: DB Connection later
                  }
              });
              setGoogleState(prev => ({ ...prev, isInitialized: true }));
              setAuthLoading(false);
          } catch (error) {
              console.error("Google Init Failed:", error);
              setGoogleState(prev => ({ ...prev, error: "Impossibile inizializzare servizi Google." }));
              setAuthLoading(false);
          }
      };
      initializeGoogle();
  }, []);

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("Network restored.");
      syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleTenantLogin = (tenantId: string) => {
    setCurrentTenantId(tenantId);
    setIsMultiTenant(false);
    setIsSessionActive(true);
  };

  const handleLogout = () => {
    setIsSessionActive(false);
    setCurrentView(ViewState.DASHBOARD); 
    // In a real Google app, we might revoke token here, but strictly not required for this session flow
  };

  // MAPPING
  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.HUB_FTE:
        return <HubFTE tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.FORNITORI:
        return <Suppliers tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.LOGISTICA_MAGAZZINO: 
        return <Inventory tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.CICLO_PASSIVO: 
        return <Purchasing tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.DISTINTA_BASE: 
        return <BillOfMaterialsView tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.PIANIFICAZIONE: 
        return <SalesPlan tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.MRP:
        return <MRP tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.CONTROLLO_QUALITA: 
        return <Quality tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.REPORTS:
        return <Reports tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.SETTINGS:
        return <Settings tenantId={currentTenantId} />; 
      default:
        return <Dashboard tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epicor-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Inizializzazione Google Services...</p>
        </div>
      </div>
    );
  }

  // --- CONNECT GOOGLE DRIVE SCREEN (REPLACES LOGIN) ---
  if (!googleState.isConnected) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden p-8 text-center animate-fade-in-up">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-800 mb-2">EB-pro Serverless</h1>
                <p className="text-slate-500 mb-8">
                    Connetti il tuo Google Drive per inizializzare il Database ERP. Nessun server, controllo totale dei tuoi dati.
                </p>

                <button 
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 px-4 rounded-lg transition-all shadow-sm group"
                >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                    <span className="group-hover:text-blue-600">Connetti Google Drive</span>
                </button>

                {googleState.error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-200">
                        {googleState.error}
                    </div>
                )}
                
                <p className="mt-6 text-xs text-slate-400">
                    Utilizza l'account Google dove desideri salvare i fogli di calcolo dell'ERP.
                </p>
            </div>
        </div>
      );
  }

  // --- TENANT SELECTION SCREEN (AFTER GOOGLE AUTH) ---
  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-slate-200 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-lg shadow-xl overflow-hidden flex flex-col md:flex-row">

          {/* Left Side: Branding Sistemi */}
          <div className="bg-slate-900 p-12 md:w-5/12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-xs font-mono text-green-400">DRIVE CONNECTED</span>
              </div>
              <h1 className="text-4xl font-bold tracking-wide">eSolver</h1>
              <p className="mt-2 text-slate-400 font-light uppercase tracking-widest text-sm">Sistemi SpA</p>
            </div>

            <div className="relative z-10 mt-8">
              <h3 className="text-lg font-semibold mb-2">Portale Accesso Cloud</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Gestione Aziendale Integrata su Database Distribuito.
              </p>
            </div>
            
            <div className="mt-auto pt-8">
               <p className="text-xs text-slate-500">Versione 2.2 Serverless</p>
            </div>
          </div>

          {/* Right Side: Tenant Selection */}
          <div className="p-12 md:w-7/12 bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Seleziona Ambiente (Azienda)</h2>

            <div className="space-y-4">
              {AVAILABLE_TENANTS.map(tenant => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantLogin(tenant.id)}
                  className="w-full bg-white border border-slate-300 hover:border-blue-500 hover:shadow-md rounded p-4 flex items-center transition-all duration-200 group text-left"
                >
                  <div className={`w-10 h-10 rounded flex items-center justify-center text-white font-bold text-lg shadow-sm ${tenant.color}`}>
                    {tenant.name.substring(0, 1)}
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{tenant.name}</h4>
                    <p className="text-xs text-slate-500">Codice Ditta: {tenant.id.toUpperCase()}</p>
                  </div>
                  <div className="text-slate-300 group-hover:text-blue-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center border-t border-slate-200 pt-4">
              <p className="text-xs text-slate-400">© 2026 Sistemi S.p.A. - Powered by Google Drive</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  const currentTenantObj = AVAILABLE_TENANTS.find(t => t.id === currentTenantId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 font-sans">
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <Sidebar
        currentView={currentView}
        onChangeView={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }}
        isOpen={isSidebarOpen}
        currentTenant={currentTenantObj} 
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile Header Toggle */}
        <div className="flex flex-col">
          <header className="lg:hidden bg-slate-900 border-b border-slate-700 flex items-center justify-between p-4 text-white">
            <h1 className="text-xl font-bold">eSolver</h1>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-slate-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>

          <TenantHeader
            currentTenantId={currentTenantId}
            isMultiTenant={isMultiTenant}
            onTenantChange={(id) => {
              setCurrentTenantId(id);
              setIsMultiTenant(false);
            }}
            onToggleMultiTenant={() => setIsMultiTenant(!isMultiTenant)}
            onLogout={handleLogout}
          />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          {!isOnline && (
            <div className="mb-4 bg-red-600 text-white p-2 text-sm text-center font-bold rounded shadow">
                ⚠️ MODALITÀ OFFLINE - Le modifiche Drive verranno sincronizzate al ripristino.
            </div>
          )}

          <div className="max-w-screen-2xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      <EVAAssistant />
    </div>
  );
};

export default App;
