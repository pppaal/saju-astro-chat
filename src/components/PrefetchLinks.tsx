'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * PrefetchLinks Component
 *
 * Proactively prefetches critical routes in the background
 * to improve navigation performance.
 *
 * This component should be placed in high-traffic pages like the homepage.
 */

const CRITICAL_ROUTES = [
  '/destiny-map',
  '/tarot',
  '/report',
  '/compatibility',
  '/calendar',
  '/myjourney',
  '/pricing',
]

export default function PrefetchLinks() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch critical routes after initial page load
    // Use requestIdleCallback if available, otherwise setTimeout
    const prefetchRoutes = () => {
      CRITICAL_ROUTES.forEach((route) => {
        router.prefetch(route)
      })
    }

    if ('requestIdleCallback' in window) {
      requestIdleCallback(prefetchRoutes)
    } else {
      setTimeout(prefetchRoutes, 1000)
    }
  }, [router])

  return null // This component doesn't render anything
}
