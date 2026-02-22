'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const STORAGE_KEY = 'auth:refresh'
const REFRESH_DEBOUNCE_MS = 800
const AUTH_REFRESH_PARAM = 'authRefresh'
const MAX_EVENT_AGE_MS = 10_000
const TERMINAL_STATUSES = new Set(['authenticated', 'unauthenticated'])

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated'

function isTerminalStatus(status: string | null): status is Exclude<SessionStatus, 'loading'> {
  return status === 'authenticated' || status === 'unauthenticated'
}

function getTabId() {
  if (typeof window === 'undefined') {
    return 'server'
  }
  const key = '__dp_tab_id__'
  const existing = window.sessionStorage.getItem(key)
  if (existing) {
    return existing
  }
  const created = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.sessionStorage.setItem(key, created)
  return created
}

export default function SessionSync() {
  const { status, update } = useSession()
  const lastStatusRef = useRef<SessionStatus | null>(null)
  const debounceRef = useRef<number | null>(null)
  const refreshHandledRef = useRef(false)
  const tabIdRef = useRef<string>('server')
  const isUpdatingRef = useRef(false)
  const lastUpdateAtRef = useRef(0)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    tabIdRef.current = getTabId()

    const runUpdate = () => {
      if (isUpdatingRef.current) {
        return
      }
      isUpdatingRef.current = true
      update()
        .catch(() => undefined)
        .finally(() => {
          isUpdatingRef.current = false
          lastUpdateAtRef.current = Date.now()
        })
    }

    if (!refreshHandledRef.current) {
      const url = new URL(window.location.href)
      if (url.searchParams.get(AUTH_REFRESH_PARAM) === '1') {
        refreshHandledRef.current = true
        url.searchParams.delete(AUTH_REFRESH_PARAM)
        runUpdate()
        window.history.replaceState({}, '', url.toString())
      }
    }

    const scheduleRefresh = () => {
      if (debounceRef.current !== null) {
        return
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null
        runUpdate()
      }, REFRESH_DEBOUNCE_MS)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return
      }
      try {
        const parsed = JSON.parse(event.newValue) as {
          tabId?: string
          ts?: number
          status?: string
        }
        if (!parsed.tabId || parsed.tabId === tabIdRef.current) {
          return
        }
        if (!parsed.ts || Date.now() - parsed.ts > MAX_EVENT_AGE_MS) {
          return
        }
        if (!parsed.status || !TERMINAL_STATUSES.has(parsed.status)) {
          return
        }
        // Ignore bursts of repeated events to prevent refresh ping-pong across tabs.
        if (Date.now() - lastUpdateAtRef.current < REFRESH_DEBOUNCE_MS) {
          return
        }
        scheduleRefresh()
      } catch {
        // Ignore malformed storage payloads
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
    }
  }, [update])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const prevStatus = lastStatusRef.current
    lastStatusRef.current = status as SessionStatus

    if (!prevStatus || prevStatus === status) {
      return
    }
    // Only broadcast actual auth state changes. Ignore loading transitions,
    // which can otherwise trigger cross-tab update loops.
    if (!isTerminalStatus(prevStatus) || !isTerminalStatus(status)) {
      return
    }
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          tabId: tabIdRef.current || getTabId(),
          ts: Date.now(),
          status,
        })
      )
    } catch {
      // ignore storage failures
    }
  }, [status])

  return null
}
