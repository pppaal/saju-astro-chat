/**
 * 운흐름 v3 step 2 — 스케일(층)별 × 체계(사주/점성)별 *지배 신호* 추출.
 *
 * surprise.ts(step 1) 이 base-rate −logP 무게(signalImportance)를 준다. 여기서는
 * 그 무게로 각 (layer, source) 버킷의 top-k 지배 신호를 뽑는다 = docs/운흐름.md
 * §0.5.5 산출물계약의 `dominant[scale]`(사주/점성 각각). 단일 평균점수 대신
 * "그 스케일에서 무엇이 끌고 있나".
 *
 * 또 §0.5.2 ③ 의 체계별 방향 valence V = Σ(polarity × −logP) 와 무게 mass = Σ기여
 * 를 같이 산출 — 이게 step 3(양방향 교차 → 합의/긴장/단독 crossState)의 입력이다.
 *
 * cross-activation 신호(파생 교차)는 raw 동사가 아니라 step 3 소관 → 여기선 제외.
 *
 * 순수 함수 — ActiveSignal[] + base-rate 만. extractor·기존 score/cross 불변.
 */

import type { ActiveSignal, CalendarCell, SignalLayer, SignalSource } from '../types'
import { type BaseRateTable, signalImportance, signalRarity } from './surprise'

export interface DominantSignal {
  name: string
  source: SignalSource
  layer: SignalLayer
  polarity: number
  /** 희소도 −log P. */
  rarity: number
  /** 기여 = 희소도 × |polarity| × weight. */
  importance: number
}

export interface SystemDominance {
  /** importance 내림차순 top-k 지배 신호. */
  dominant: DominantSignal[]
  /** 방향 valence = Σ(polarity × rarity). 부호 = 길흉 방향, 크기 = 확신. */
  valence: number
  /** 무게 mass = Σ importance. 그 (스케일,체계) 버킷이 얼마나 무거운가. */
  mass: number
}

export interface ScaleDominance {
  saju: SystemDominance
  astro: SystemDominance
}

/** 스케일(층) → {사주, 점성} 지배. 신호 없는 층은 키 자체가 없음. */
export type DominanceByScale = Partial<Record<SignalLayer, ScaleDominance>>

function emptySystem(): SystemDominance {
  return { dominant: [], valence: 0, mass: 0 }
}

/** raw 동사 신호만 — 파생 교차(cross-activation)는 step 3 소관이라 제외. */
function isRawVerb(s: ActiveSignal): boolean {
  return s.kind !== 'cross-activation'
}

/**
 * 신호 묶음을 (layer, source) 버킷으로 나눠 각 버킷의 지배 신호 top-k + 방향·무게.
 *
 * @param topK 버킷당 노출할 지배 신호 수 (기본 3 — §0.5.5 "1~3개").
 */
export function deriveDominance(
  signals: ActiveSignal[],
  rates: BaseRateTable,
  topK = 3
): DominanceByScale {
  const buckets = new Map<SignalLayer, ScaleDominance>()

  for (const s of signals) {
    if (!isRawVerb(s)) continue
    const importance = signalImportance(s, rates)
    if (importance <= 0) continue // 늘 켜짐(P≈1)·polarity 0 → 제외

    let scale = buckets.get(s.layer)
    if (!scale) {
      scale = { saju: emptySystem(), astro: emptySystem() }
      buckets.set(s.layer, scale)
    }
    const sys = scale[s.source]
    const rarity = signalRarity(s, rates)
    sys.dominant.push({
      name: (s.korean ?? s.name ?? '').trim(),
      source: s.source,
      layer: s.layer,
      polarity: s.polarity,
      rarity: Math.round(rarity * 1000) / 1000,
      importance: Math.round(importance * 1000) / 1000,
    })
    sys.valence += s.polarity * rarity
    sys.mass += importance
  }

  const out: DominanceByScale = {}
  for (const [layer, scale] of buckets) {
    for (const key of ['saju', 'astro'] as const) {
      const sys = scale[key]
      sys.dominant.sort((a, b) => b.importance - a.importance)
      sys.dominant = sys.dominant.slice(0, topK)
      sys.valence = Math.round(sys.valence * 1000) / 1000
      sys.mass = Math.round(sys.mass * 1000) / 1000
    }
    out[layer] = scale
  }
  return out
}

/** CalendarCell 편의 래퍼. */
export function cellDominance(
  cell: CalendarCell,
  rates: BaseRateTable,
  topK = 3
): DominanceByScale {
  return deriveDominance(cell.signals, rates, topK)
}
