/**
 * 운흐름 surprise 점수 — "이게 얼마나 *드물게·강하게* 겹치나" (deriveScore 대체 후보)
 *
 * 옛 deriveScore = 하루 ~180 신호의 가중평균 → 다 ≈50 (regression to mean).
 * 신 = 평균 대신 *지배 신호 top-k 의 기여 합*. 기여 = 희소도 × 중요도:
 *      기여 = (−log P) × |polarity| × weight
 *   - 늘 켜진 외행성·정적 본명: P≈1 → −logP≈0 → 0 (자동 제외)
 *   - polarity 0 (붙박이별·VoC 등 무의미 ambiance): |polarity|=0 → 0 (노이즈 제거)
 *   - 드문 + 강한 형충/트랜짓: −logP 큼 × |polarity| 큼 → 크게 기여 ("큰 날")
 *
 * 왜 −logP×|pol|: 순진한 −logP 단독은 "희소=중요" 오류로 붙박이별 노이즈(pol 0)가
 * 점수를 도배해 옛 평균보다 *덜* 변별했다(실측 변동계수 0.10 < 0.22). 중요도를 곱해야
 * "드문 게 *의미있게* 겹친 날"이 또렷해진다. 근거: docs/운흐름.md §0.5.2, PMI/lift.
 *
 * 순수 함수 — cell.signals 만 입력. extractor(감각)는 그대로 재사용.
 */

import type { ActiveSignal, CalendarCell, SignalLayer } from '../types'
import { STATIC_NATAL_KINDS } from '../signalTaxonomy'

/**
 * 신호 *타입* 키 — base-rate 묶음 단위. 이름의 (괄호 보조)·말미 메타를 떼어 같은
 * 이벤트를 한 버킷으로. 예: "지지충 申↔寅 (월주)" → "saju|hyeongchung|지지충 申↔寅".
 */
export function signalTypeKey(s: ActiveSignal): string {
  const raw = (s.korean ?? s.name ?? '').replace(/\s*\([^)]*\)\s*$/u, '').trim()
  return `${s.source}|${s.kind}|${raw}`
}

export interface BaseRateTable {
  /** typeKey → P(임의 셀에서 활성). */
  p: Map<string, number>
  /** 측정 셀 수. */
  totalCells: number
}

/**
 * 셀 묶음에서 신호 타입별 활성 확률 P 측정. P = 활성 셀 수 / 전체 셀 수
 * (한 셀당 같은 타입 1회). 창이 넓을수록 안정 — 느린 신호 P≈1, 일진 형충 P≈0.1.
 */
export function computeBaseRates(cells: CalendarCell[]): BaseRateTable {
  const total = cells.length || 1
  const count = new Map<string, number>()
  for (const c of cells) {
    const seen = new Set<string>()
    for (const s of c.signals) {
      const k = signalTypeKey(s)
      if (seen.has(k)) continue
      seen.add(k)
      count.set(k, (count.get(k) ?? 0) + 1)
    }
  }
  const p = new Map<string, number>()
  for (const [k, n] of count) p.set(k, n / total)
  return { p, totalCells: total }
}

/** 희소도 −log P. 정적 본명=0, P 미측정=극희소 하한, P≥1=0. */
function signalRarity(s: ActiveSignal, rates: BaseRateTable): number {
  if (STATIC_NATAL_KINDS.has(s.kind)) return 0
  const p = rates.p.get(signalTypeKey(s))
  if (p === undefined || p <= 0) return -Math.log(1 / (rates.totalCells + 1))
  if (p >= 1) return 0
  return -Math.log(p)
}

/** 기여 = 희소도 × 중요도(|polarity|·weight). pol 0 또는 늘켜짐 → 0. */
export function signalImportance(s: ActiveSignal, rates: BaseRateTable): number {
  const rarity = signalRarity(s, rates)
  if (rarity <= 0) return 0
  return rarity * Math.abs(s.polarity) * (s.weight ?? 1)
}

export interface CellSurprise {
  /** 그날 점수 = 지배 신호 top-k 기여 합. */
  total: number
  /** 기여 신호 (importance 내림차순, 최대 topK). */
  top: Array<{
    name: string
    source: string
    layer: SignalLayer
    importance: number
    rarity: number
    polarity: number
  }>
}

/**
 * 한 셀의 surprise 점수 — *평균이 아니라* 지배 신호 top-k 의 기여 합.
 * topK 로 꼬리(흔하거나 약한 잡신호)를 잘라 변별을 살린다.
 */
export function cellSurprise(cell: CalendarCell, rates: BaseRateTable, topK = 8): CellSurprise {
  const scored = cell.signals
    .map((s) => ({
      name: (s.korean ?? s.name ?? '').trim(),
      source: s.source,
      layer: s.layer,
      importance: signalImportance(s, rates),
      rarity: signalRarity(s, rates),
      polarity: s.polarity,
    }))
    .filter((x) => x.importance > 0)
    .sort((a, b) => b.importance - a.importance)
  const top = scored.slice(0, topK)
  const total = top.reduce((acc, x) => acc + x.importance, 0)
  return { total: Math.round(total * 100) / 100, top }
}
