/**
 * 운흐름 v3 step 3 — 양방향 교차 상태(crossState).
 *
 * step 2(dominance)가 각 (층, 체계)의 방향 valence = Σ(polarity×−logP) 와 무게 mass
 * 를 준다. 여기서 사주·점성 두 방향을 비교해 docs/운흐름.md §0.5.5 의 `crossState` 를
 * 낸다:
 *   - 합의(agreement) : 둘 다 무겁고 *같은 방향* → 증폭. valence = 두 방향 합(부호 유효).
 *   - 긴장(tension)   : 둘 다 무겁고 *반대 방향* → 엇갈림. 크기는 크나 valence 중립(0).
 *   - 단독(saju/astro): 한쪽만 무거움 → 그 체계가 단독 주도. valence = 그쪽.
 *   - 없음(none)      : 양쪽 다 가벼움.
 *
 * §0.5.2 ④ 처럼 "둘 다 큰가"의 *임계*는 본래 null 모델(step 4)에서 와야 하지만,
 * step 3 단독 검증을 위해 massThreshold 를 파라미터로 둔다(기본 0 = 살아남은 신호가
 * 하나라도 있으면 present). 핵심 판정(같은 방향 vs 반대 vs 한쪽)은 임계와 무관하게 결정적.
 *
 * 순수 함수 — DominanceByScale 만 입력.
 */

import type { SignalLayer } from '../types'
import type { DominanceByScale } from './dominance'

export type CrossState = 'agreement' | 'tension' | 'saju-only' | 'astro-only' | 'none'

export interface ScaleCross {
  state: CrossState
  /** 부호 있는 방향. 합의=두 방향 합 / 단독=그쪽 / 긴장·없음=0. */
  valence: number
  sajuMass: number
  astroMass: number
}

export type CrossByScale = Partial<Record<SignalLayer, ScaleCross>>

export interface CellCross {
  byScale: CrossByScale
  /** 셀 대표 교차 = 양체계 무게 합이 가장 큰 스케일. */
  headline: { layer: SignalLayer; cross: ScaleCross } | null
}

export interface CrossStateOptions {
  /** 한 체계가 "present(무겁다)"로 인정되는 mass 하한. 기본 0. */
  massThreshold?: number
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

function classify(
  sajuV: number,
  astroV: number,
  sajuPresent: boolean,
  astroPresent: boolean
): {
  state: CrossState
  valence: number
} {
  if (sajuPresent && astroPresent) {
    const ss = Math.sign(sajuV)
    const sa = Math.sign(astroV)
    // 둘 다 방향이 있고 부호가 반대 → 긴장(valence 중립, 크기는 mass 가 보유).
    if (ss !== 0 && sa !== 0 && ss !== sa) {
      return { state: 'tension', valence: 0 }
    }
    // 같은 방향(또는 한쪽 방향 0 → 충돌 없음) → 합의.
    return { state: 'agreement', valence: round(sajuV + astroV) }
  }
  if (sajuPresent) return { state: 'saju-only', valence: round(sajuV) }
  if (astroPresent) return { state: 'astro-only', valence: round(astroV) }
  return { state: 'none', valence: 0 }
}

/** 스케일별 교차 상태. */
export function deriveCrossState(
  dominance: DominanceByScale,
  opts: CrossStateOptions = {}
): CrossByScale {
  const threshold = opts.massThreshold ?? 0
  const out: CrossByScale = {}
  for (const [layer, scale] of Object.entries(dominance) as Array<
    [SignalLayer, NonNullable<DominanceByScale[SignalLayer]>]
  >) {
    const sajuMass = scale.saju.mass
    const astroMass = scale.astro.mass
    const { state, valence } = classify(
      scale.saju.valence,
      scale.astro.valence,
      sajuMass > threshold,
      astroMass > threshold
    )
    out[layer] = { state, valence, sajuMass, astroMass }
  }
  return out
}

/** 스케일별 교차 + 셀 대표(headline) 교차. */
export function cellCrossState(
  dominance: DominanceByScale,
  opts: CrossStateOptions = {}
): CellCross {
  const byScale = deriveCrossState(dominance, opts)
  let headline: CellCross['headline'] = null
  let bestMass = -1
  for (const [layer, cross] of Object.entries(byScale) as Array<[SignalLayer, ScaleCross]>) {
    const combined = cross.sajuMass + cross.astroMass
    if (combined > bestMass) {
      bestMass = combined
      headline = { layer, cross }
    }
  }
  return { byScale, headline }
}
