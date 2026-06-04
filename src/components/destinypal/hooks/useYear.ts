/**
 * @file useYear.ts
 * Hook: Year tier (연 — 연운 + 큰 날 convergence).
 *
 * Fetches /api/calendar (main payload) + /api/calendar/convergence
 * (yearly highlights). Convergence is heavy on the server — it's a
 * 1-year fullbuild — so we let it resolve *after* the main payload
 * lands. Listeners see partial data first (calendar non-null,
 * convergence null), then a second render with convergence filled in.
 *
 * This mirrors DestinyMatrixPlannerClient's two-stage pattern: main
 * year payload renders the grid immediately, convergence card fills
 * in once it arrives. Sharing the pattern means we share the same
 * Redis/edge cache lines on the server.
 */

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { apiFetch } from '@/lib/api/ApiClient'
import { logger } from '@/lib/logger'
import type {
  BirthInfoInput,
  HookResult,
  MockOption,
  RawCalendarResponse,
  RawConvergenceResponse,
  RawYearPayload,
} from './types'
import {
  buildBirthParams,
  fetchJson,
  isUsableBirth,
  shouldUseMock,
  useAsyncResource,
} from './internal'
import { yearKey } from './cache'
import { mockYear } from './mock'

export interface UseYearOptions extends MockOption {
  year: number
  birthInfo?: BirthInfoInput
  locale?: 'ko' | 'en'
  enabled?: boolean
}

interface SessionLite {
  user?: { profile?: { birthDate?: string }; birthDate?: string }
}

function pickBirth(prop: BirthInfoInput | undefined, session: unknown): BirthInfoInput | null {
  if (isUsableBirth(prop)) return prop
  if (!session || typeof session !== 'object') return null
  const s = session as SessionLite
  const p = s.user?.profile ?? s.user
  if (!p?.birthDate) return null
  return p as BirthInfoInput
}

export function useYear(options: UseYearOptions): HookResult<RawYearPayload> {
  const { year, birthInfo, locale = 'ko', enabled = true, mock } = options
  const { data: session } = useSession()
  const useMock = shouldUseMock(mock)
  const birth = useMemo(() => pickBirth(birthInfo, session), [birthInfo, session])

  // ─────────────────────────────────────────────────────────────────
  // Stage 1: main calendar payload via the shared async resource.
  // ─────────────────────────────────────────────────────────────────
  const key = useMemo(() => {
    if (useMock) return `dp:mock:year:${year}`
    if (!birth) return null
    return yearKey(
      {
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        birthPlace: birth.birthPlace,
        gender: birth.gender,
        locale,
      },
      year
    )
  }, [useMock, birth, year, locale])

  const fetcher = useMemo(
    () =>
      async (signal: AbortSignal): Promise<RawCalendarResponse> => {
        if (!birth) throw new Error('birthInfo not resolved')
        const params = buildBirthParams(birth, locale)
        params.set('year', String(year))
        return fetchJson<RawCalendarResponse>(`/api/calendar?${params.toString()}`, {
          signal,
        })
      },
    [birth, year, locale]
  )

  const main = useAsyncResource<RawCalendarResponse>({
    key,
    fetcher,
    enabled: enabled && !useMock && !!birth && Number.isFinite(year),
  })

  // ─────────────────────────────────────────────────────────────────
  // Stage 2: lazy-fetch convergence after main payload arrives.
  // We don't gate the hook's overall isLoading on this — convergence
  // is non-critical and slow. Same pattern as
  // DestinyMatrixPlannerClient's `void (async () => {...})()` chain.
  // ─────────────────────────────────────────────────────────────────
  const [convergence, setConvergence] = useState<RawConvergenceResponse | null>(null)
  const convAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    convAbortRef.current?.abort()
    if (useMock || !main.data || !birth) {
      // Mock branch handles convergence below; otherwise reset.
      if (!useMock) setConvergence(null)
      return
    }
    const controller = new AbortController()
    convAbortRef.current = controller
    const params = buildBirthParams(birth, locale)
    params.set('year', String(year))

    void (async () => {
      try {
        const res = await apiFetch(`/api/calendar/convergence?${params.toString()}`, {
          signal: controller.signal,
        })
        if (controller.signal.aborted) return
        if (!res.ok) return
        const json = (await res.json()) as RawConvergenceResponse
        if (controller.signal.aborted) return
        setConvergence(json)
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return
        logger.debug('[destinypal/useYear] convergence skipped', err)
      }
    })()

    return () => {
      controller.abort()
    }
  }, [useMock, main.data, birth, year, locale])

  // ─────────────────────────────────────────────────────────────────
  // Combine stage 1 + 2 into a single payload. UI gets calendar as
  // soon as it's ready; convergence joins on next render.
  // ─────────────────────────────────────────────────────────────────
  if (useMock) {
    return {
      data: mockYear(year),
      isLoading: false,
      error: null,
      status: 'ready',
      refetch: () => {},
    }
  }

  const data: RawYearPayload | null = main.data
    ? { calendar: main.data, convergence }
    : null

  return {
    data,
    isLoading: main.isLoading,
    error: main.error,
    status: main.status,
    refetch: main.refetch,
  }
}
