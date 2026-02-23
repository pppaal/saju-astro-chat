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

const CRITICAL_ROUTES = ['/destiny-map', '/pricing']

export default function PrefetchLinks() {
  const router = useRouter()

  useEffect(() => {
    // Keep prefetch lightweight on slow-data environments.
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
    ).connection
    const prefersReducedPrefetch =
      Boolean(connection?.saveData) ||
      connection?.effectiveType === 'slow-2g' ||
      connection?.effectiveType === '2g'

    if (prefersReducedPrefetch) {
      return
    }

    let cancelled = false
    let idleHandle: number | null = null
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null

    const prefetchRoutes = () => {
      // Sequence prefetch to avoid network bursts and aborted _rsc churn.
      CRITICAL_ROUTES.forEach((route, index) => {
        setTimeout(() => {
          if (!cancelled && document.visibilityState === 'visible') {
            router.prefetch(route)
          }
        }, index * 200)
      })
    }

    if ('requestIdleCallback' in window) {
      idleHandle = window.requestIdleCallback(prefetchRoutes, { timeout: 5000 })
    } else {
      timeoutHandle = setTimeout(prefetchRoutes, 4500)
    }

    return () => {
      cancelled = true
      if (idleHandle !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleHandle)
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
      }
    }
  }, [router])

  return null // This component doesn't render anything
}
