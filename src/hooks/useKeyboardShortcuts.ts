import { useEffect, useRef } from 'react';

/**
 * Hook per la gestione del focus in scope specifici
 * Utile per focus management in modal, dialog, e altre componenti
 */
export function useFocusManager() {
  const containerRef = useRef<HTMLDivElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);

  const getFocusableElements = (container: HTMLElement): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    return Array.from(container.querySelectorAll(focusableSelectors.join(',')));
  };

  const setInitialFocus = (selector?: string) => {
    if (!containerRef.current) return;

    if (selector) {
      const element = containerRef.current.querySelector<HTMLElement>(selector);
      if (element) {
        element.focus();
        return;
      }
    }

    focusableElementsRef.current = getFocusableElements(containerRef.current);
    if (focusableElementsRef.current.length > 0) {
      focusableElementsRef.current[0].focus();
    }
  };

  const trapFocus = (e: KeyboardEvent) => {
    if (e.key !== 'Tab' || !containerRef.current) return;

    focusableElementsRef.current = getFocusableElements(containerRef.current);

    const firstElement = focusableElementsRef.current[0];
    const lastElement = focusableElementsRef.current[focusableElementsRef.current.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', trapFocus);
    return () => container.removeEventListener('keydown', trapFocus);
  }, []);

  return {
    containerRef,
    setInitialFocus,
    trapFocus
  };
}

/**
 * Hook per l'annuncio di contenuti dinamici agli screen reader
 */
export function useAriaLive(message: string, type: 'polite' | 'assertive' = 'polite') {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.setAttribute('aria-live', type);
      containerRef.current.setAttribute('aria-atomic', 'true');
    }
  }, [type]);

  return { containerRef, message };
}

/**
 * Hook per la gestione di tasti shortcuts
 */
export function useKeyboardShortcut(key: string, callback: () => void, deps: React.DependencyList = []) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ...deps]);
}
