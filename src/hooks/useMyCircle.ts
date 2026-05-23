import { useState, useEffect, useCallback } from 'react'
import type { SavedPerson } from '@/app/compatibility/lib'
import { logger } from '@/lib/logger'

export type CirclePerson = SavedPerson

export function useMyCircle(status: 'authenticated' | 'loading' | 'unauthenticated') {
  const [circlePeople, setCirclePeople] = useState<SavedPerson[]>([])
  const [showCircleDropdown, setShowCircleDropdown] = useState<number | null>(null)
  const [circleError, setCircleError] = useState<string | null>(null)
  // Bumped to manually trigger a refetch after a CircleAddModal save —
  // otherwise the new entry doesn't appear in the dropdown until the
  // user reloads the page.
  const [refreshKey, setRefreshKey] = useState(0)

  const refreshCircle = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  // Load circle people when logged in
  useEffect(() => {
    if (status !== 'authenticated') {
      return
    }

    const controller = new AbortController()

    const loadCircle = async () => {
      setCircleError(null)
      try {
        const res = await fetch('/api/me/circle', {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          // API는 createSuccessResponse 로 { success, data: { people } } 형태로
          // 감싸므로 data.data.people 이 실제 경로. (구형 unwrap 대비 fallback)
          setCirclePeople(data?.data?.people ?? data?.people ?? [])
        } else {
          setCirclePeople([])
          // Circle is optional; avoid surfacing noisy errors in UI.
          setCircleError(null)
          logger.warn('Failed to load circle: HTTP', res.status)
        }
      } catch (e) {
        // Ignore abort errors - they're expected when component unmounts
        if (e instanceof Error && e.name === 'AbortError') {
          return
        }
        logger.warn('Failed to load circle:', {
          error: e instanceof Error ? e.message : String(e),
        })
        setCirclePeople([])
        setCircleError(null)
      }
    }

    loadCircle()

    // Cleanup: abort fetch on unmount or status change
    return () => controller.abort()
  }, [status, refreshKey])

  // Close circle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-circle-dropdown]')) {
        setShowCircleDropdown(null)
      }
    }
    if (showCircleDropdown !== null) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [showCircleDropdown])

  return {
    circlePeople,
    circleError,
    showCircleDropdown,
    setShowCircleDropdown,
    refreshCircle,
  }
}
