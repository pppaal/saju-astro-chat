/**
 * @file useDecade.ts
 * Hook: Decade tier (10년 — 대운 sub-cycle around the requested year).
 *
 * Decade context is *derived* from the yearly calendar response —
 * /api/calendar already returns the active daewoon (sajuResult.daeWoon)
 * in matrixContract. So this hook reuses the year endpoint but exposes
 * it under a decade-shaped envelope, picking out which daewoon entry the
 * requested year sits in.
 *
 * Why not a dedicated endpoint? The backend has no /api/decade — the
 * calendar engine treats daewoon as a sidecar to the annual calc.
 * Hitting /api/calendar for the year keeps backend surface unchanged
 * (Agent A/B own that decision) while still letting the UI tier on
 * decade boundaries.
 */

'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type {
  BirthInfoInput,
  HookResult,
  MockOption,
  RawDecadePayload,
  RawCalendarResponse,
} from './types'
import {
  buildBirthParams,
  fetchJson,
  isUsableBirth,
  shouldUseMock,
  useAsyncResource,
} from './internal'
import { decadeKey } from './cache'
import { mockDecade } from './mock'

export interface UseDecadeOptions extends MockOption {
  /** Year that anchors the decade lookup. Required. */
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

/**
 * Walks the daewoon list (returned in calendar response) to find which
 * cycle the requested year sits in. Returns the index; the adapter can
 * use this to slice list[index] for display.
 */
function findDaeunIndex(calendar: RawCalendarResponse, year: number): number | undefined {
  const daeun = calendar.daeun
  if (!daeun || typeof daeun !== 'object') return undefined
  const list = (daeun as { list?: unknown }).list
  if (!Array.isArray(list)) return undefined
  for (let i = 0; i < list.length; i++) {
    const entry = list[i]
    if (!entry || typeof entry !== 'object') continue
    const { start, end } = entry as { start?: number; end?: number }
    if (typeof start !== 'number' || typeof end !== 'number') continue
    if (year >= start && year < end) return i
  }
  return undefined
}

export function useDecade(options: UseDecadeOptions): HookResult<RawDecadePayload> {
  const { year, birthInfo, locale = 'ko', enabled = true, mock } = options
  const { data: session } = useSession()
  const useMock = shouldUseMock(mock)

  const birth = useMemo(() => pickBirth(birthInfo, session), [birthInfo, session])

  const key = useMemo(() => {
    if (useMock) return `dp:mock:decade:${year}`
    if (!birth) return null
    return decadeKey(
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
      async (signal: AbortSignal): Promise<RawDecadePayload> => {
        if (!birth) throw new Error('birthInfo not resolved')
        const params = buildBirthParams(birth, locale)
        params.set('year', String(year))
        const calendar = await fetchJson<RawCalendarResponse>(
          `/api/calendar?${params.toString()}`,
          { signal }
        )
        return { calendar, daeunIndex: findDaeunIndex(calendar, year) }
      },
    [birth, year, locale]
  )

  const live = useAsyncResource<RawDecadePayload>({
    key,
    fetcher,
    enabled: enabled && !useMock && !!birth && Number.isFinite(year),
  })

  if (useMock) {
    return {
      data: mockDecade(year),
      isLoading: false,
      error: null,
      status: 'ready',
      refetch: () => {},
    }
  }
  return live
}
