'use client'
import { useEffect } from 'react'

/**
 * Subscribes to VisualViewport API and exposes the keyboard height as a CSS
 * custom property `--kb-inset` on document.documentElement. Fixed/sticky
 * elements can consume it via `bottom: max(env(safe-area-inset-bottom), var(--kb-inset, 0px))`.
 *
 * iOS Safari + Android Chrome support VisualViewport. Older browsers fall
 * back to 0 (no inset adjustment).
 */
export function useKeyboardInset() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return
    const vv = window.visualViewport
    const update = () => {
      const inset = window.innerHeight - vv.height - vv.offsetTop
      document.documentElement.style.setProperty('--kb-inset', `${Math.max(0, inset)}px`)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      document.documentElement.style.setProperty('--kb-inset', '0px')
    }
  }, [])
}
