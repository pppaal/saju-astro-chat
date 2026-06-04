/**
 * @file internal.ts
 * Internal helpers shared by all destinypal hooks. Not exported from
 * the package barrel — these are implementation details.
 */

'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiFetch } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import type { BirthInfo } from '@/components/calendar/types'
import { normalizeGender, toLongGender } from '@/lib/utils/gender'
import type { BirthInfoInput, HookResult, HookStatus } from './types'
import { dedupe, invalidate, readCache, writeCache } from './cache'

// ─────────────────────────────────────────────────────────────────────
// Mock toggle — driven by env var so production builds always hit the
// real API. A per-hook override is also supported (see useNatalContext
// `mock` prop).
// ─────────────────────────────────────────────────────────────────────

const ENV_MOCK = process.env.NEXT_PUBLIC_DESTINYPAL_MOCK === '1'

export function shouldUseMock(perCallMock?: boolean): boolean {
  if (perCallMock === true) return true
  if (perCallMock === false) return false
  return ENV_MOCK
}

// ─────────────────────────────────────────────────────────────────────
// Birth info gating — every hook either uses the birth passed in OR
// falls back to the next-auth session profile. We *don't* import
// useSession here directly (keeps the hook tree-shakable for use cases
// like SSR-rendered preview pages); callers can pass `birthInfo` in
// directly. The session bridge lives in useNatalContext.
// ─────────────────────────────────────────────────────────────────────

export function isUsableBirth(b: BirthInfoInput | undefined | null): b is BirthInfoInput {
  return !!b && typeof b.birthDate === 'string' && b.birthDate.length > 0
}

/**
 * Build the URLSearchParams the calendar API expects, exactly the way
 * DestinyMatrixPlannerClient does (so cache lines up with the existing
 * matrix planner). Locale is passed through so server-rendered text
 * matches the user's chosen UI language.
 */
export function buildBirthParams(
  birth: BirthInfoInput,
  locale: 'ko' | 'en' = 'ko'
): URLSearchParams {
  const p = new URLSearchParams()
  p.set('birthDate', birth.birthDate)
  if (birth.birthTime) p.set('birthTime', birth.birthTime)
  if (birth.birthPlace) p.set('birthPlace', birth.birthPlace)
  if (birth.timezone) p.set('timezone', birth.timezone)
  const g = normalizeGender(birth.gender)
  if (g) p.set('gender', g)
  p.set('locale', locale)
  return p
}

/**
 * Build the JSON body the /api/saju and /api/astrology POST endpoints
 * expect. Centralized so the field names stay consistent and a future
 * schema change touches one place.
 */
export function buildNatalPostBody(
  birth: BirthInfoInput,
  locale: 'ko' | 'en' = 'ko'
): {
  saju: Record<string, unknown>
  astrology: Record<string, unknown>
} {
  const gender = (normalizeGender(birth.gender) ?? 'male') as 'male' | 'female'
  const timeZone = birth.timezone ?? 'Asia/Seoul'
  const latitude = birth.latitude ?? 37.5665
  const longitude = birth.longitude ?? 126.978
  const birthTime = birth.birthTime || '00:00'

  return {
    saju: {
      birthDate: birth.birthDate,
      birthTime,
      gender,
      calendarType: 'solar' as const,
      timezone: timeZone,
      userTimezone: timeZone,
      longitude,
    },
    astrology: {
      date: birth.birthDate,
      time: birthTime,
      latitude,
      longitude,
      timeZone,
      locale,
    },
  }
}

// ─────────────────────────────────────────────────────────────────────
// useAsyncResource — the engine behind every destinypal hook.
//
// What it does:
//   - debounces fetch start until inputs stabilise (next-tick effect)
//   - serves cache hits synchronously (loading stays false)
//   - dedupes concurrent identical fetches via `dedupe(key, ...)`
//   - aborts in-flight fetches when key changes or component unmounts
//   - exposes refetch() that bypasses cache and abort+retries
//
// Why a custom hook and not SWR? See cache.ts header.
// ─────────────────────────────────────────────────────────────────────

export interface AsyncResourceOptions<T> {
  /** Stable cache key. When key flips, current fetch is cancelled. */
  key: string | null
  /** Fetcher receiving an AbortSignal — *required* to honor cancellation. */
  fetcher: (signal: AbortSignal) => Promise<T>
  /** Hook can opt-out (e.g. inputs not ready yet). Defaults to true. */
  enabled?: boolean
  /** Disable cache lookup (still writes). Used by refetch(). */
  skipCache?: boolean
}

export function useAsyncResource<T>(opts: AsyncResourceOptions<T>): HookResult<T> {
  const { key, fetcher, enabled = true, skipCache = false } = opts

  // Use a counter as a "refetch token" — bumping it forces the effect
  // to re-run with cache skipped.
  const [refetchToken, setRefetchToken] = useState(0)
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<HookStatus>('idle')
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Keep a stable reference to the latest fetcher without re-running the
  // effect every render. Each hook caller creates a new fetcher closure
  // per render; we only want effect to re-run when `key` (the inputs) or
  // `enabled` actually changes.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  useEffect(() => {
    // Always abort any prior fetch — cache-hit early-return shouldn't
    // leak in-flight ones (same fix as useDateDetail.ts 5th-audit).
    abortRef.current?.abort()

    if (!enabled || !key) {
      setData(null)
      setStatus('idle')
      setError(null)
      return
    }

    const forceFresh = refetchToken > 0 || skipCache

    // 1. Try cache (unless force-fresh)
    if (!forceFresh) {
      const cached = readCache<T>(key)
      if (cached !== undefined) {
        setData(cached)
        setStatus('ready')
        setError(null)
        return
      }
    } else {
      // refetch() — toss the existing entry so dedupe doesn't latch onto
      // a stale in-flight promise.
      invalidate(key)
    }

    // 2. Cache miss → fetch (deduped per key)
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('loading')
    setError(null)

    void (async () => {
      try {
        const value = await dedupe(key, () => fetcherRef.current(controller.signal))
        if (controller.signal.aborted) return
        writeCache(key, value)
        setData(value)
        setStatus('ready')
      } catch (err) {
        if (controller.signal.aborted) return
        if ((err as { name?: string })?.name === 'AbortError') return
        const e = err instanceof Error ? err : new Error(String(err))
        logger.warn('[destinypal/hook] fetch failed', { key, error: e.message })
        setError(e)
        setStatus('error')
      }
    })()

    return () => {
      controller.abort()
    }
  }, [key, enabled, skipCache, refetchToken])

  const refetch = useCallback(() => {
    setRefetchToken((n) => n + 1)
  }, [])

  return {
    data,
    isLoading: status === 'loading',
    error,
    status,
    refetch,
  }
}

// ─────────────────────────────────────────────────────────────────────
// fetchJson — internal shim around apiFetch that throws on !ok and
// asserts a JSON envelope. Each tier's fetcher uses this so error
// surface is uniform.
// ─────────────────────────────────────────────────────────────────────

/**
 * Init shape compatible with apiFetch (Record<string,string> headers, not
 * HeadersInit). signal is required so callers must wire abort properly.
 */
export interface FetchJsonInit {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  signal: AbortSignal
}

export async function fetchJson<T>(
  url: string,
  init: FetchJsonInit,
  validate?: (body: unknown) => body is T
): Promise<T> {
  const res = await apiFetch(url, init)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  let body: unknown
  try {
    body = await res.json()
  } catch {
    throw new Error('Invalid JSON response')
  }
  if (validate && !validate(body)) {
    throw new Error('Response failed validation')
  }
  return body as T
}

export async function postJson<T>(
  url: string,
  payload: unknown,
  signal: AbortSignal
): Promise<T> {
  return fetchJson<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
}

// ─────────────────────────────────────────────────────────────────────
// Re-export gender normalization for adapter convenience (used to
// translate session profile → BirthInfoInput downstream).
// ─────────────────────────────────────────────────────────────────────

export { normalizeGender, toLongGender }
export type { BirthInfo }
