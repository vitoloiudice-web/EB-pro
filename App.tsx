import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './firebaseConfig';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Purchasing from './components/Purchasing';
import Inventory from './components/Inventory';
import Quality from './components/Quality';
import Reports from './components/Reports';
import Settings from './components/Settings';
import EVAAssistant from './components/EVAAssistant';
import { ViewState } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Removed explicit error blocking state to allow Demo Mode fallback

  useEffect(() => {
    // Attempt anonymous sign-in to satisfy Firestore security rules
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setAuthLoading(false);
    });

    signInAnonymously(auth).catch((err) => {
      console.warn("Authentication failed (Demo Mode Activated):", err.code);
      // Do not block the app. Fallback to unauthenticated state which will trigger Mock Data in dataService.
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD: return <Dashboard />;
      case ViewState.INVENTORY: return <Inventory />;
      case ViewState.PURCHASING: return <Purchasing />;
      case ViewState.QUALITY: return <Quality />;
      case ViewState.REPORTS: return <Reports />;
      case ViewState.SETTINGS: return <Settings />;
      default: return <Dashboard />;
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epicor-600 mb-4"></div>
          <p className="text-slate-600 font-medium">Starting Easy Buy ERP...</p>
        </div>
      </div>
    );
  }

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
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="lg:hidden bg-slate-900 border-b border-slate-700 flex items-center justify-between p-4 text-white">
            <h1 className="text-xl font-bold">Easy Buy</h1>
            <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-md hover:bg-slate-800 focus:outline-none"
            >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
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
            <div className="max-w-7xl mx-auto">
                {renderContent()}
            </div>
        </main>
      </div>

      <EVAAssistant />
    </div>
  );
};

export default App;