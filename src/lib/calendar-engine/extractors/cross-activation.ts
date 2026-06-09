/**
 * Cross-activation extractor — 사주-점성 동시 활성 페어를 의미 신호로 합성.
 *
 * 표준 SignalExtractor 인터페이스 (ExtractorContext → signals) 와 다르게,
 * 이 추출기는 *다른 추출기들의 결과*를 입력으로 받아 페어 매칭을 한다.
 * 그래서 buildCalendar 의 메인 추출 패스 *이후*에 한 번 호출되는 post-pass
 * 형태로 동작 (index.ts 에 1줄 추가로 wiring).
 *
 * 입력:  range 동안 활성인 모든 ActiveSignal 배열.
 * 출력:  saju × astro 동시 활성이면서 A등급 매핑 사전에 매치되는 페어
 *        의미 신호 (kind: 'cross-activation').
 *
 * ── 활성 시점 매칭 ──
 * 두 부모 신호가 *날짜 단위* 로 겹치는 구간에서만 페어 신호를 emit.
 * 겹친 구간이 짧으면 (1~2일) 페어 신호도 짧음. 겹친 구간이 길면 (10일+)
 * 그만큼 길게 유지. 정점(peak)은 두 부모 peak 의 중간점.
 *
 * ── 페어 polarity ──
 * sign(saju.polarity × astro.polarity) × |mapping.polarity| 형태.
 *  - 둘 다 우호(++) 면 +|m.p|
 *  - 둘 다 흉(--) 면 +|m.p|  (둘 다 압력으로 흐름 같음 — 매핑 polarity 자체로 톤 결정)
 *  - 부호 다르면 (-+ 또는 +-) → 0
 *  - 한쪽이 polarity=0 이면 mapping polarity 그대로 사용 (부호 정보 부재 시 매핑이 결정).
 *
 * ── 페어 weight ──
 * saju.weight × astro.weight × 0.6 (cross 신호 noise 방지 목적의 보수 계수).
 *
 * ── id ──
 * `cross.{saju}-x-{astro}.{YYYY-MM-DD}` — 같은 날 같은 페어는 한 번만.
 */

import type { ActiveSignal, ActiveWindow, Polarity, SignalEvidence } from '../types'
import {
  SAJU_ASTRO_MAPPINGS,
  lookupCrossMapping,
  crossLayerAllowed,
  type CrossMapping,
} from '../data/saju-astro-mapping'
// 교차 신호 name 한글화 — 행성 영문 키 → 한글(정본 data/planetNames 재사용).
import { PLANET_KO } from '../data/planetNames'

/**
 * Saju 신호에서 매칭 키 (십신명 또는 신살명) 를 추출.
 * 매핑 사전 키와 동일해야 매치 — saju-pillar 는 evidence.sibsin, saju-shinsal 은
 * evidence.shinsalName 에 박는다.
 */
function extractSajuKey(s: ActiveSignal): string | undefined {
  if (s.source !== 'saju') return undefined
  const sibsin = s.evidence?.sibsin as string | undefined
  if (sibsin) return sibsin
  const shinsalName = s.evidence?.shinsalName as string | undefined
  if (shinsalName) return shinsalName
  return undefined
}

/**
 * Astro 신호에서 매칭 키 (단일 행성명) 를 추출.
 * 대부분의 astro extractor 가 evidence.planets[0] 에 트랜짓 행성을 박음
 * (transit, dignity, house-transit, return, fixed-star 등).
 */
function extractAstroKey(s: ActiveSignal): string | undefined {
  if (s.source !== 'astro') return undefined
  const planets = s.evidence?.planets ?? []
  return planets[0]
}

/** ISO day 키 (YYYY-MM-DD) — 동일 페어 동일 날 dedup. */
function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

/** 두 ISO 시각의 중간점 — peak 합성. */
function midpointIso(aIso: string, bIso: string): string {
  const a = Date.parse(aIso)
  const b = Date.parse(bIso)
  if (Number.isNaN(a) || Number.isNaN(b)) return aIso
  return new Date((a + b) / 2).toISOString()
}

/** 두 윈도우의 겹친 구간 — 없으면 null. */
function intersectWindow(a: ActiveWindow, b: ActiveWindow): ActiveWindow | null {
  const aStart = Date.parse(a.start)
  const aEnd = Date.parse(a.end)
  const bStart = Date.parse(b.start)
  const bEnd = Date.parse(b.end)
  if ([aStart, aEnd, bStart, bEnd].some((n) => Number.isNaN(n))) return null
  const start = Math.max(aStart, bStart)
  const end = Math.min(aEnd, bEnd)
  if (start > end) return null
  const peak = midpointIso(a.peak, b.peak)
  // peak 가 [start, end] 밖이면 윈도우 중심으로 폴백.
  const peakMs = Date.parse(peak)
  const safePeak =
    !Number.isNaN(peakMs) && peakMs >= start && peakMs <= end
      ? peak
      : new Date((start + end) / 2).toISOString()
  return {
    start: new Date(start).toISOString(),
    peak: safePeak,
    end: new Date(end).toISOString(),
  }
}

/**
 * 페어 polarity 합성.
 *  - 둘 다 부호가 같은 방향(++ 또는 --) → 매핑 polarity 의 부호·크기 그대로.
 *  - 부호가 반대(+− 또는 −+) → 0 (의미 충돌 — emit 톤 무력화).
 *  - 한 쪽 polarity = 0 → 매핑 polarity 그대로 (부호 정보 부재 시 매핑이 결정).
 */
function combinePolarity(
  sajuPolarity: number,
  astroPolarity: number,
  mappingPolarity: Polarity
): Polarity {
  if (sajuPolarity === 0 || astroPolarity === 0) return mappingPolarity
  const sameDir = Math.sign(sajuPolarity) === Math.sign(astroPolarity)
  if (!sameDir) return 0
  return mappingPolarity
}

/**
 * 한 페어를 ActiveSignal 로 합성.
 * 부모 두 신호 id 를 evidence.detail.parentIds 에 보존 — UI/디버그에서 인과 추적.
 */
function buildCrossSignal(
  sajuSig: ActiveSignal,
  astroSig: ActiveSignal,
  mapping: CrossMapping,
  window: ActiveWindow
): ActiveSignal {
  const polarity = combinePolarity(sajuSig.polarity, astroSig.polarity, mapping.polarity)
  const baseWeight = (sajuSig.weight ?? 0) * (astroSig.weight ?? 0) * 0.6
  // cross 신호는 부수적 — 단일 신호 weight 최대값(1.0) 이하로 cap.
  const weight = Math.max(0, Math.min(1, baseWeight))
  const day = isoDay(window.start)
  const name = `${mapping.saju} × ${PLANET_KO[mapping.astro] ?? mapping.astro}`
  const evidence: SignalEvidence = {
    module: 'cross-activation',
    sibsin: sajuSig.evidence?.sibsin,
    shinsalName: sajuSig.evidence?.shinsalName,
    planets: [mapping.astro],
    detail: {
      sajuKey: mapping.saju,
      astroKey: mapping.astro,
      grade: mapping.grade,
      mappingPolarity: mapping.polarity,
      parentIds: [sajuSig.id, astroSig.id],
      parentSajuKind: sajuSig.kind,
      parentAstroKind: astroSig.kind,
    },
  }
  return {
    id: `cross.${mapping.saju}-x-${mapping.astro}.${day}`,
    source: 'saju', // hybrid 표시 — tagger 가 source 별 라우팅에 안전. (cross-activation kind 로 식별)
    kind: 'cross-activation',
    name,
    korean: mapping.meaning.ko,
    english: mapping.meaning.en,
    polarity,
    layer:
      sajuSig.layer === 'decadal' || astroSig.layer === 'decadal'
        ? 'decadal'
        : sajuSig.layer === 'yearly' || astroSig.layer === 'yearly'
          ? 'yearly'
          : sajuSig.layer === 'monthly' || astroSig.layer === 'monthly'
            ? 'monthly'
            : 'daily',
    active: window,
    weight,
    evidence,
  }
}

/**
 * 입력 신호 배열에서 사주 × 점성 동시 활성 페어 → cross-activation 신호 emit.
 *
 * 동일 페어 (sajuKey × astroKey) 가 한 날에 한 번만 등장하도록 dedup.
 * 같은 페어가 여러 부모 조합에서 매칭되면 가장 강한 (weight desc) 한 쌍만 보존.
 */
export function extractCrossActivations(signals: readonly ActiveSignal[]): ActiveSignal[] {
  // 1) saju/astro 로 split + 매칭 키 추출.
  const sajuByKey = new Map<string, ActiveSignal[]>()
  const astroByKey = new Map<string, ActiveSignal[]>()

  for (const s of signals) {
    if (s.kind === 'cross-activation') continue // 자기 자신 입력 차단 (재호출 안전)
    if (s.source === 'saju') {
      const key = extractSajuKey(s)
      if (!key) continue
      const arr = sajuByKey.get(key) ?? []
      arr.push(s)
      sajuByKey.set(key, arr)
    } else if (s.source === 'astro') {
      const key = extractAstroKey(s)
      if (!key) continue
      const arr = astroByKey.get(key) ?? []
      arr.push(s)
      astroByKey.set(key, arr)
    }
  }

  // 2) 매핑 사전 순회 — 양쪽 모두 활성인 페어만 처리.
  // dedup: (mapping key + day) 가 동일하면 가장 강한 (weight desc) 한 쌍만.
  const bestByDay = new Map<string, { sig: ActiveSignal; strength: number }>()

  for (const mapping of SAJU_ASTRO_MAPPINGS) {
    const sajuSignals = sajuByKey.get(mapping.saju)
    const astroSignals = astroByKey.get(mapping.astro)
    if (!sajuSignals?.length || !astroSignals?.length) continue

    for (const sajuSig of sajuSignals) {
      for (const astroSig of astroSignals) {
        const window = intersectWindow(sajuSig.active, astroSig.active)
        if (!window) continue
        const crossSig = buildCrossSignal(sajuSig, astroSig, mapping, window)
        // 층별 교차 밴드 — 합성 신호의 layer 가 그 행성 밴드 밖이면 버린다.
        // (외행성은 대운에서만, 빠른 행성은 일/월에서만 — 스케일 불일치 교차 차단.)
        if (!crossLayerAllowed(mapping.astro, crossSig.layer)) continue
        const dayKey = `${mapping.saju}|${mapping.astro}|${isoDay(window.start)}`
        const strength = Math.abs(crossSig.weight * crossSig.polarity)
        const existing = bestByDay.get(dayKey)
        if (!existing || strength > existing.strength) {
          bestByDay.set(dayKey, { sig: crossSig, strength })
        }
      }
    }
  }

  return Array.from(bestByDay.values()).map((x) => x.sig)
}

/**
 * Cross-activation 의 부수 정보 — 디버그·테스트용.
 */
export function debugCrossActivations(signals: readonly ActiveSignal[]): {
  totalPairsConsidered: number
  emitted: number
  byMapping: Record<string, number>
} {
  const out = extractCrossActivations(signals)
  const byMapping: Record<string, number> = {}
  for (const s of out) {
    const k = s.name
    byMapping[k] = (byMapping[k] ?? 0) + 1
  }
  // "considered" = (saju 활성 페어 수) × (astro 활성 페어 수) coarse estimate.
  const sajuCount = signals.filter((s) => s.source === 'saju' && extractSajuKey(s)).length
  const astroCount = signals.filter((s) => s.source === 'astro' && extractAstroKey(s)).length
  return {
    totalPairsConsidered: sajuCount * astroCount,
    emitted: out.length,
    byMapping,
  }
}

export { lookupCrossMapping }
