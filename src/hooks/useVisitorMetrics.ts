import { useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'

function isAbortLikeError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const withName = err as { name?: string; message?: string }
  if (withName.name === 'AbortError') return true
  if (typeof withName.message === 'string' && withName.message.includes('aborted')) return true
  return false
}

export function useVisitorMetrics(metricsToken?: string) {
  const [todayVisitors, setTodayVisitors] = useState<number | null>(null)
  const [totalVisitors, setTotalVisitors] = useState<number | null>(null)
  const [totalMembers, setTotalMembers] = useState<number | null>(null)
  const [visitorError, setVisitorError] = useState<string | null>(null)
  const trackedOnce = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    const token = metricsToken?.trim()

    const fetchMetrics = async () => {
      if (!token) {
        setVisitorError(null)
        return
      }

      try {
        const res = await fetch('/api/metrics/public', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
          signal: controller.signal,
        })

        // Auth mismatch should fail silently in client to avoid noisy console logs.
        if (res.status === 401 || res.status === 403) {
          setVisitorError(null)
          return
        }

        if (!res.ok) {
          if (process.env.NODE_ENV !== 'production') {
            logger.warn('Metrics fetch failed with non-ok status', { status: res.status })
          }
          setVisitorError(null)
          return
        }

        const data = await res.json()
        setTodayVisitors(data.todayVisitors ?? null)
        setTotalVisitors(data.totalVisitors ?? null)
        setTotalMembers(data.totalMembers ?? null)
        setVisitorError(null)
      } catch (err) {
        if (controller.signal.aborted || isAbortLikeError(err)) return
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('Metrics fetch skipped due network/client issue', err)
        }
        setVisitorError(null)
      }
    }

    void fetchMetrics()

    // Track visit once (fire-and-forget).
    if (!trackedOnce.current) {
      trackedOnce.current = true
      void fetch('/api/metrics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
      }).catch(() => {})
    }

    return () => controller.abort()
  }, [metricsToken])

  return {
    todayVisitors,
    totalVisitors,
    totalMembers,
    visitorError,
  }
}
