import { useEffect, useRef, useCallback } from 'react';

/**
 * WCAG 2.1 AA compliant focus trap hook for modal dialogs
 * Traps focus within a container and returns focus to trigger element on close
 *
 * `autoFocus` (default true): on open, move focus to the first focusable
 * element inside the container. Pass `false` for modals whose first
 * focusable element is a text input you do NOT want to auto-focus — on
 * mobile, focusing an <input> pops the soft keyboard the moment the modal
 * appears. With `false`, focus moves to the container itself instead (it
 * must be `tabIndex={-1}`) so Tab-trapping + screen-reader hand-off still
 * work, without summoning the keyboard.
 */
export function useFocusTrap(isOpen: boolean, options?: { autoFocus?: boolean }) {
  const autoFocus = options?.autoFocus ?? true
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Get all focusable elements within container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) {return [];}

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
      if (event.key !== 'Tab') {return;}

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) {return;}

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
    if (!isOpen) {return;}

    // Store current active element to restore focus on close
    previousActiveElement.current = document.activeElement as HTMLElement;

    if (autoFocus) {
      // Focus first focusable element in container
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        // Small delay to ensure DOM is ready. preventScroll: 모바일에서
        // .focus() 가 대상 요소로 페이지를 스크롤시켜(모달 열고 닫을 때 화면이
        // 튀던 회귀) UX 를 해치는 걸 막는다.
        requestAnimationFrame(() => {
          focusableElements[0].focus({ preventScroll: true });
        });
      }
    } else {
      // Move focus to the dialog container itself (must be tabIndex={-1}) so
      // the trap engages and SR users land in the dialog — without focusing
      // an input and popping the mobile keyboard.
      requestAnimationFrame(() => {
        containerRef.current?.focus({ preventScroll: true });
      });
    }

    // Add keyboard listener for tab trapping
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus to previous element. preventScroll: 닫을 때 트리거
      // 버튼으로 페이지가 스크롤되며 튀는 걸 막는다.
      if (previousActiveElement.current && previousActiveElement.current.focus) {
        previousActiveElement.current.focus({ preventScroll: true });
      }
    };
  }, [isOpen, handleKeyDown, getFocusableElements, autoFocus]);

  return containerRef;
}

