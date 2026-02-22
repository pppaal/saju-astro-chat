'use client'

import { useEffect } from 'react'

/**
 * Prevent stale service-worker loops during local development.
 * In production we keep normal PWA behavior.
 */
export default function ServiceWorkerStabilityGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const cleanup = async () => {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registrations.map((registration) => registration.unregister()))
      } catch {
        // Ignore unregister failures in development safeguard.
      }
    }

    void cleanup()
  }, [])

  return null
}
