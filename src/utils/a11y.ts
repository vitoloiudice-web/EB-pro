/**
 * ACCESSIBILITY UTILITIES
 * Helper functions per WCAG 2.1 Level AA compliance
 */

/**
 * Genera ID univoco per ARIA relationships
 */
export function generateId(prefix: string = 'elem'): string {
  return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Combina classe base con classi accessibili
 */
export const accessibleButtonClasses = `
  px-4 py-2 rounded-lg font-medium
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
  disabled:opacity-50 disabled:cursor-not-allowed
  transition-all duration-200
`;

export const accessibleInputClasses = `
  w-full px-3 py-2 border border-gray-300 rounded-lg
  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
  disabled:bg-gray-100 disabled:text-gray-500
  transition-all duration-200
`;

/**
 * Gestisce la navigazione da tastiera (Tab, Escape)
 */
export function useKeyboardNavigation(
  onEscape?: () => void,
  onEnter?: () => void
) {
  return (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onEscape) {
      e.preventDefault();
      onEscape();
    }
    if (e.key === 'Enter' && onEnter) {
      e.preventDefault();
      onEnter();
    }
  };
}

/**
 * Utility per screen reader announcements
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  setTimeout(() => announcement.remove(), 1000);
}

/**
 * Classe tailwind per nascondere visivamente mantenendo accessibilità
 */
export const srOnly = 'sr-only absolute w-1 h-1 p-0 -m-1 overflow-hidden clip border-0';

/**
 * Valida contrasto colore (AA standard: 4.5:1)
 */
export function getContrastRatio(rgb1: [number, number, number], rgb2: [number, number, number]): number {
  const getLuminance = (r: number, g: number, b: number) => {
    const [rs, gs, bs] = [r, g, b].map(x => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Hook per focus management in modali
 */
export function useFocusTrap(ref: React.RefObject<HTMLDivElement>) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return;

      const focusableElements = ref.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ref]);
}
