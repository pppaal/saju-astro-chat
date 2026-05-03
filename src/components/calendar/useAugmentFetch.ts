'use client'

import { useEffect, useState } from 'react'
import type { CalendarCrossAugment } from '@/lib/destiny-map/destinyCalendar'
import type { BirthInfo } from './types'

export type AugmentScope = 'monthly' | 'weekly' | 'daily'

interface FetchInput {
  birth: BirthInfo
  scope: AugmentScope
  year?: number
  month?: number // 1-12
  weekStart?: string // ISO
  queryDate?: string // ISO
}

export type AugmentState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'ready'; data: CalendarCrossAugment }
  | { phase: 'error'; message: string }

// 단순 Map 캐시 — 모든 augment 요청을 키로 dedup. 페이지 라이프타임 동안만.
const cache = new Map<string, CalendarCrossAugment>()

function makeKey(i: FetchInput): string {
  return [
    i.birth.birthDate, i.birth.birthTime, i.birth.gender,
    i.birth.latitude ?? '-', i.birth.longitude ?? '-',
    i.birth.timezone ?? '-',
    i.scope,
    i.year ?? '', i.month ?? '', i.weekStart ?? '', i.queryDate ?? '',
  ].join('|')
}

/**
 * Augment fetch hook with cache + loading + error states.
 * Returns AugmentState that consumers can switch on for skeleton/error UI.
 */
export function useAugmentFetch(input: FetchInput | null): AugmentState {
  const [state, setState] = useState<AugmentState>({ phase: 'idle' })

  useEffect(() => {
    if (!input) {
      setState({ phase: 'idle' })
      return
    }
    if (input.birth.latitude == null || input.birth.longitude == null) {
      setState({ phase: 'idle' })
      return
    }
    const key = makeKey(input)
    const cached = cache.get(key)
    if (cached) {
      setState({ phase: 'ready', data: cached })
      return
    }
    let cancelled = false
    setState({ phase: 'loading' })
    fetch('/api/calendar/cross-augment', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        birth: {
          birthDate: input.birth.birthDate,
          birthTime: input.birth.birthTime,
          gender: input.birth.gender.toLowerCase() as 'male' | 'female',
          timezone: input.birth.timezone ?? 'Asia/Seoul',
          latitude: input.birth.latitude,
          longitude: input.birth.longitude,
        },
        scope: input.scope,
        year: input.year,
        month: input.month,
        weekStart: input.weekStart,
        queryDate: input.queryDate,
      }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`API ${r.status}`)
        const j = await r.json()
        if (!j?.data) throw new Error('empty response')
        return j.data as CalendarCrossAugment
      })
      .then((data) => {
        cache.set(key, data)
        if (!cancelled) setState({ phase: 'ready', data })
      })
      .catch((e) => {
        if (cancelled) return
        const message = e instanceof Error ? e.message : 'fetch failed'
        setState({ phase: 'error', message })
      })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input ? makeKey(input) : null])

  return state
}

/** Test/dev escape hatch */
export function clearAugmentCache(): void { cache.clear() }
