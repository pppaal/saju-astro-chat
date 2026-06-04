/**
 * @file useMonth.ts
 * Hook: Month tier (월 — 월운 단면).
 *
 * The calendar engine doesn't expose a /api/month endpoint — month
 * detail is a slice of the yearly payload. So this hook calls
 * /api/calendar with `scope=month` which short-circuits the engine to
 * return just the requested month's allDates (faster cold path), then
 * pairs it with the month number for the adapter.
 *
 * If the parent route has already fetched the year (useYear), that
 * cache line is *different* from this one because scope=month produces
 * a smaller payload — the caches stay independent on purpose, since
 * scope=month should return faster on cold engines and we don't want
 * to wait for the full-year build just to render this month's tab.
 */

'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import type {
  BirthInfoInput,
  HookResult,
  MockOption,
  RawCalendarResponse,
  RawMonthPayload,
} from './types'
import {
  buildBirthParams,
  fetchJson,
  isUsableBirth,
  shouldUseMock,
  useAsyncResource,
} from './internal'
import { monthKey } from './cache'
import { mockMonth } from './mock'

export interface UseMonthOptions extends MockOption {
  year: number
  /** 1-12 */
  month: number
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

function isValidMonth(m: number): boolean {
  return Number.isFinite(m) && m >= 1 && m <= 12
}

export function useMonth(options: UseMonthOptions): HookResult<RawMonthPayload> {
  const { year, month, birthInfo, locale = 'ko', enabled = true, mock } = options
  const { data: session } = useSession()
  const useMock = shouldUseMock(mock)
  const birth = useMemo(() => pickBirth(birthInfo, session), [birthInfo, session])

  const key = useMemo(() => {
    if (useMock) return `dp:mock:month:${year}-${month}`
    if (!birth) return null
    return monthKey(
      {
        birthDate: birth.birthDate,
        birthTime: birth.birthTime,
        birthPlace: birth.birthPlace,
        gender: birth.gender,
        locale,
      },
      year,
      month
    )
  }, [useMock, birth, year, month, locale])

  const fetcher = useMemo(
    () =>
      async (signal: AbortSignal): Promise<RawMonthPayload> => {
        if (!birth) throw new Error('birthInfo not resolved')
        const params = buildBirthParams(birth, locale)
        params.set('year', String(year))
        // scope=month — calendar engine returns only requested month
        // (DestinyMatrixPlannerClient uses this for the first-paint
        // path; we reuse for symmetry + cache locality).
        params.set('scope', 'month')
        params.set('month', String(month))
        const calendar = await fetchJson<RawCalendarResponse>(
          `/api/calendar?${params.toString()}`,
          { signal }
        )
        return { calendar, month }
      },
    [birth, year, month, locale]
  )

  const live = useAsyncResource<RawMonthPayload>({
    key,
    fetcher,
    enabled:
      enabled && !useMock && !!birth && Number.isFinite(year) && isValidMonth(month),
  })

  if (useMock) {
    return {
      data: mockMonth(year, month),
      isLoading: false,
      error: null,
      status: 'ready',
      refetch: () => {},
    }
  }
  return live
}
