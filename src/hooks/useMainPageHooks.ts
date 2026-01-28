/**
 * Main Page Custom Hooks
 * Reusable hooks for main page functionality
 */

import { useEffect, useState, type RefObject } from 'react';

/**
 * Hook for scroll visibility detection
 * Shows/hides elements based on scroll position
 *
 * @param threshold - Scroll position threshold in pixels
 * @returns boolean indicating if scroll position exceeds threshold
 */
export function useScrollVisibility(threshold: number): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return visible;
}

/**
 * Hook for detecting clicks outside a ref element
 * Useful for closing dropdowns/modals when clicking outside
 *
 * @param ref - React ref to the element
 * @param callback - Function to call when clicking outside
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  callback: () => void
): void {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        callback();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref, callback]);
}

/**
 * Hook for scroll-based animation using Intersection Observer
 * Adds 'visible' class to elements when they enter viewport
 *
 * @param selector - CSS selector for elements to observe
 * @param styles - CSS module styles object containing 'visible' class
 */
export function useScrollAnimation(
  selector: string,
  styles: Record<string, string>
): void {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    );

    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => observer.observe(el));

    return () => elements.forEach((el) => observer.unobserve(el));
  }, [selector, styles]);
}
