/**
 * Main Page Custom Hooks
 * Reusable hooks for main page functionality
 */

import { useEffect, useState } from 'react'

/**
 * Hook for scroll visibility detection
 * Shows/hides elements based on scroll position
 *
 * @param threshold - Scroll position threshold in pixels
 * @returns boolean indicating if scroll position exceeds threshold
 */
export function useScrollVisibility(threshold: number): boolean {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > threshold)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [threshold])

  return visible
}

/**
 * Hook for scroll-based animation using Intersection Observer
 * Adds 'visible' class to elements when they enter viewport
 *
 * @param selector - CSS selector for elements to observe
 * @param styles - CSS module styles object containing 'visible' class
 */
export function useScrollAnimation(selector: string, styles: Record<string, string>): void {
  useEffect(() => {
    const observedElements = new Set<Element>()

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.visible)
            observer.unobserve(entry.target)
            observedElements.delete(entry.target)
          }
        })
      },
      { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
    )

    const observeMatchingElements = () => {
      const elements = document.querySelectorAll(selector)
      elements.forEach((el) => {
        if (observedElements.has(el) || el.classList.contains(styles.visible)) {
          return
        }
        observer.observe(el)
        observedElements.add(el)
      })
    }

    observeMatchingElements()

    const mutationObserver = new MutationObserver(() => {
      observeMatchingElements()
    })

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    })

    return () => {
      mutationObserver.disconnect()
      observedElements.forEach((el) => observer.unobserve(el))
      observedElements.clear()
      observer.disconnect()
    }
  }, [selector, styles])
}
