import React, { lazy, Suspense, ReactNode } from 'react';
import { LoadingState } from '../components/ui/StateComponents';

/**
 * LAZY LOADING UTILITY
 * Supporta code-splitting e lazy loading dei componenti
 */

export function lazyComponent<P extends object>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: ReactNode
) {
  const Component = lazy(importFunc);

  return (props: P) => (
    <Suspense fallback={fallback || <LoadingState message="Caricamento componente..." />}>
      <Component {...props} />
    </Suspense>
  );
}

/**
 * Versione che importa specificamente da una cartella
 */
export const lazyLoadComponent = (componentPath: string) => {
  return lazy(() => import(componentPath).catch(() => {
    throw new Error(`Impossibile caricare componente: ${componentPath}`);
  }));
};

/**
 * HOC per aggiungere error boundary a componenti lazy
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error) => ReactNode
) {
  return function BoundaryComponent(props: P) {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const handleError = (event: ErrorEvent) => {
        setError(event.error);
      };

      window.addEventListener('error', handleError);
      return () => window.removeEventListener('error', handleError);
    }, []);

    if (error) {
      return (
        fallback?.(error) || (
          <div className="p-4 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800 font-semibold">Errore nel caricamento</p>
            <p className="text-red-600 text-sm">{error.message}</p>
          </div>
        )
      );
    }

    return <Component {...props} />;
  };
}

/**
 * Lazy load delle view principali
 */
export const lazyViews = {
  Dashboard: lazyComponent(() => import('../components/Dashboard')),
  Inventory: lazyComponent(() => import('../components/Inventory')),
  Purchasing: lazyComponent(() => import('../components/Purchasing')),
  Quality: lazyComponent(() => import('../components/Quality')),
  Analytics: lazyComponent(() => import('../components/Analytics')),
  Settings: lazyComponent(() => import('../components/Settings')),
  BOM: lazyComponent(() => import('../components/BillOfMaterials')),
  SalesPlan: lazyComponent(() => import('../components/SalesPlan')),
  MRP: lazyComponent(() => import('../components/MRP')),
  Suppliers: lazyComponent(() => import('../components/Suppliers')),
  Reports: lazyComponent(() => import('../components/Reports')),
  EVAAssistant: lazyComponent(() => import('../components/EVAAssistant'))
};
