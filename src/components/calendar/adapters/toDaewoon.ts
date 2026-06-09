/**
 * saju.daeun → destinypal `daewoon[]` adapter.
 *
 * NatalContext.saju.daeun:
 *   Array<{ startAge: number; startYear: number; stem: string; branch: string }>
 *
 * destinypal daewoon:
 *   Array<{ gz: { hanja, kr, en }, start, end, sibsin, known }>
 */

import type { NatalContext } from '@/lib/calendar-engine/context/types'
import { toGanji, type Ganji } from './shared'
import { getSibsinKo } from '@/lib/saju/cycleRelations'

export interface DestinypalDaewoonEntry {
  gz: Ganji
  start: number // 시작 연도
  end: number // 끝 연도 (exclusive — destinypal 도 2026-2036 식)
  sibsin: string // 일간 vs 대운 천간 십신 ("편재"). 모르면 "—"
  known: boolean // 이미 라이프 구간 매핑된 대운인지 (destinypal 데모는 3개만 true)
  /** 시작 만 나이 (Phase 3 보강) */
  startAge: number
}

export interface ToDaewoonOptions {
  /** known 으로 표시할 대운 개수 — 기본 전부 true. destinypal demo 는 3개만. */
  knownCount?: number
}

/**
 * NatalContext.saju.daeun → destinypal daewoon[].
 *
 * 일간 (dayMaster.name) 기준으로 각 대운 천간의 십신 산출.
 */
export function toDaewoon(
  natal: NatalContext,
  opts: ToDaewoonOptions = {}
): DestinypalDaewoonEntry[] {
  const dm = natal.saju?.dayMaster?.name
  const list = natal.saju?.daeun ?? []
  const knownCount = opts.knownCount ?? list.length

  return list.map((d, idx) => {
    const sibsin = dm ? safeSibsin(dm, d.stem) : '—'
    return {
      gz: toGanji(d.stem, d.branch),
      start: d.startYear,
      end: d.startYear + 10,
      sibsin: sibsin || '—',
      known: idx < knownCount,
      startAge: d.startAge,
    }
  })
}

function safeSibsin(dm: string, stem: string): string {
  try {
    return getSibsinKo(dm, stem)
  } catch {
    return '—'
  }
}
