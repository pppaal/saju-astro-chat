import { useEffect, useRef, useCallback } from 'react';

/**
 * WCAG 2.1 AA compliant focus trap hook for modal dialogs
 * Traps focus within a container and returns focus to trigger element on close
 */
export function useFocusTrap(isOpen: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'a[href]:not([disabled]):not([tabindex="-1"])',
      'button:not([disabled]):not([tabindex="-1"])',
      'textarea:not([disabled]):not([tabindex="-1"])',
      'input:not([disabled]):not([tabindex="-1"])',
      'select:not([disabled]):not([tabindex="-1"])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((el) => {
      // Filter out hidden elements
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, []);

  // Handle Tab key navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      // Shift+Tab on first element -> go to last
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      // Tab on last element -> go to first
      if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
        return;
      }
    },
    [getFocusableElements]
  );

  useEffect(() => {
    if (!isOpen) return;

    // Store current active element to restore focus on close
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus first focusable element in container
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        focusableElements[0].focus();
      });
    }

    // Add keyboard listener for tab trapping
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus();
      }
    };
  }, [isOpen, handleKeyDown, getFocusableElements]);

  return containerRef;
}

export default useFocusTrap;
