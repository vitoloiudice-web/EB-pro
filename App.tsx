
import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
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
import SalesPlan from './components/SalesPlan'; // NEW
import MRP from './components/MRP'; // NEW
import Suppliers from './components/Suppliers'; // NEW
import { ViewState } from './types';
import { AVAILABLE_TENANTS, syncPendingOperations } from './services/dataService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // TENANT STATE
  const [currentTenantId, setCurrentTenantId] = useState<string>('main');
  const [isMultiTenant, setIsMultiTenant] = useState<boolean>(false);

  // SESSION STATE (For Log Out / Tenant Selection)
  const [isSessionActive, setIsSessionActive] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setAuthLoading(false);
    });

    signInAnonymously(auth).catch((err) => {
      console.warn("Authentication failed (Demo Mode Activated):", err.code);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- CONNECTIVITY & SYNC ---
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log("Network restored. Attempting sync...");
      syncPendingOperations();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check/sync on mount
    if (navigator.onLine) {
      syncPendingOperations();
    }

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
    setCurrentView(ViewState.DASHBOARD); // Reset view on logout
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.SUPPLIERS: // NEW
        return <Suppliers tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.BOM:
        return <BillOfMaterialsView tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.INVENTORY:
        return <Inventory tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.SALES_PLAN:
        return <SalesPlan tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.MRP:
        return <MRP tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.PURCHASING:
        return <Purchasing tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.QUALITY:
        return <Quality tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.REPORTS:
        return <Reports tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
      case ViewState.SETTINGS:
        return <Settings tenantId={currentTenantId} />; // Passed prop
      default:
        return <Dashboard tenantId={currentTenantId} isMultiTenant={isMultiTenant} />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epicor-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Avvio EB-pro ERP in corso...</p>
        </div>
      </div>
    );
  }

  // --- LOGIN / TENANT SELECTION SCREEN ---
  if (!isSessionActive) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-in-up">

          {/* Left Side: Branding */}
          <div className="bg-slate-900 p-8 md:p-12 md:w-5/12 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <h1 className="text-4xl font-bold tracking-wide">EB-pro</h1>
              <p className="mt-2 text-slate-400 font-medium">Enterprise Resource Planning V.2.0</p>
            </div>

            <div className="relative z-10 mt-8">
              <h3 className="text-lg font-semibold mb-2">Benvenuto Admin</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Accedi al pannello di controllo unificato per la gestione multi-plant e logistica integrata.
              </p>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-epicor-500 rounded-full opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 rounded-full opacity-20 blur-3xl"></div>
          </div>

          {/* Right Side: Tenant Selection */}
          <div className="p-8 md:p-12 md:w-7/12 bg-slate-50">
            <h2 className="text-2xl font-bold text-slate-800 mb-6">Seleziona Cliente (Tenant)</h2>

            <div className="space-y-4">
              {AVAILABLE_TENANTS.map(tenant => (
                <button
                  key={tenant.id}
                  onClick={() => handleTenantLogin(tenant.id)}
                  className="w-full bg-white border border-slate-200 hover:border-epicor-400 hover:shadow-md rounded-xl p-4 flex items-center transition-all duration-200 group text-left"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm ${tenant.color} group-hover:scale-110 transition-transform`}>
                    {tenant.name.substring(0, 1)}
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="font-bold text-slate-800 group-hover:text-epicor-600 transition-colors">{tenant.name}</h4>
                    <p className="text-xs text-slate-500">Accesso Completo (Admin)</p>
                  </div>
                  <div className="text-slate-300 group-hover:text-epicor-500">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 text-center">
              <p className="text-xs text-slate-400">EB-pro © 2026 - Multi-Tenant Architecture</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  const currentTenantObj = AVAILABLE_TENANTS.find(t => t.id === currentTenantId);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
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
        currentTenant={currentTenantObj} // Pass current tenant to Sidebar
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile Header Toggle */}
        <div className="flex flex-col">
          <header className="lg:hidden bg-slate-900 border-b border-slate-700 flex items-center justify-between p-4 text-white">
            <h1 className="text-xl font-bold">EB-pro</h1>
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md hover:bg-slate-800 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </header>

          {/* TENANT HEADER with Logout */}
          <TenantHeader
            currentTenantId={currentTenantId}
            isMultiTenant={isMultiTenant}
            onTenantChange={(id) => {
              setCurrentTenantId(id);
              setIsMultiTenant(false);
            }}
            onToggleMultiTenant={() => setIsMultiTenant(!isMultiTenant)}
            onLogout={handleLogout} // Pass Logout Handler
          />
        </div>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          {!user && (
            <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Modalità Demo Attiva: Database in sola lettura (Mock Data).
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isOnline && (
            <div className="mb-4 bg-slate-800 text-white p-3 rounded-lg shadow-lg flex items-center justify-between animate-pulse">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
                </svg>
                <span><strong>Sei Offline.</strong> Le modifiche saranno salvate localmente e sincronizzate al ritorno della connessione.</span>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto h-full">
            {renderContent()}
          </div>
        </main>
      </div>

      <EVAAssistant />
    </div>
  );
};

export default App;
