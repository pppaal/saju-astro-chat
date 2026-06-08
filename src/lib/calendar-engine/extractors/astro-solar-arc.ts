import {
  calculateSolarArcChart,
  findSolarArcAspects,
  type SolarArcAspect,
} from '@/lib/astrology/foundation/progressions'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, Polarity, SignalExtractor } from '../types'
import { aspectFlowLine, pointKo } from '../data/astroFlow'

/**
 * Solar Arc Directions 추출기.
 *
 * Solar Arc = 본명 행성을 전부 같은 각도 (= 진행 태양의 본명 태양 대비 이동량,
 * 1년 ≈ 1°) 으로 직접 이동시키는 헬레니즘+현대 점성 핵심 예측 기법.
 *
 * 본 추출기는 캐시된 본명 차트 + 매월 1일 ageInYears 로 Solar Arc 차트를
 * 한 번 계산하고, 그 차트가 본명 행성에 닿는 메이저 5 어스펙트
 * (conjunction / sextile / square / trine / opposition) 를 orb 0.5° 이내로
 * 잡아 신호로 발행한다.
 *
 * - layer: 'decadal' (느린 변화 — 한 번 닿으면 ±수개월 활성)
 * - weight: 0.7
 * - polarity: Solar Arc 가 conjunction (큰 전환 +1.5 → +2) /
 *             square (도전 -0.5 → -1) / trine (지원 +1) /
 *             opposition (전환점 -1) / sextile (소소한 지원 +1)
 *
 * Polarity 값은 spec 에 0.5 단위가 있으나 ActiveSignal.polarity 타입이 정수
 * (-3..3) 라 가까운 정수로 round (큰 전환 +2, 도전 -1, 트라인 +1, 오포 -1,
 * 섹스타일 +1) → 의도는 유지하면서 타입 안전 확보.
 */

const ORB_DEG = 0.5

const ASPECT_POLARITY: Record<SolarArcAspect['aspect'], Polarity> = {
  conjunction: 2, // 큰 전환 (~+1.5 의도, 정수로 라운드)
  square: -1, // 도전 (~-0.5 의도, 정수로 라운드)
  trine: 1, // 지원
  opposition: -1, // 전환점
  sextile: 1, // 소소한 지원
}

const astroSolarArcExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'solar-arc',
  extract(ctx: ExtractorContext): ActiveSignal[] {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return signals

    const natalChart = natal.astro.chart
    if (!natalChart?.planets?.length) return signals

    // 매월 1일을 cursor 로 잡아 그 달의 ageInYears 로 Solar Arc 차트 계산.
    // 같은 (chart, age) 키로 cache 해 동일 달 재요청 시 재계산 회피.
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    const endMs = end.getTime()

    while (cursor.getTime() <= endMs) {
      const monthIso = cursor.toISOString().slice(0, 7) // YYYY-MM
      const ageInYears = computeAgeInYears(natal.input, cursor)
      if (ageInYears >= 0) {
        const cacheKey = `solar-arc:${monthIso}:age=${ageInYears.toFixed(3)}`
        let arcChart = cache.get<Chart>(cacheKey)
        if (!arcChart) {
          arcChart = calculateSolarArcChart(natalChart, ageInYears)
          cache.set(cacheKey, arcChart)
        }
        const hits = findSolarArcAspects(natalChart, arcChart, ORB_DEG)

        // 활성 윈도우: 그 달 전체 — Solar Arc 는 느린 변화라 한 달 내내 활성.
        const monthStart = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 1))
        const monthEnd = new Date(
          Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59)
        )
        const peak = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15))

        for (const hit of hits) {
          const polarity = ASPECT_POLARITY[hit.aspect]
          // orb 가 가까울수록 강하게 — orb 0 일 때 weight = 0.7, 0.5 일 때 0.42
          const orbDecay = Math.max(0.4, 1 - hit.orb / ORB_DEG)
          signals.push({
            id: `astro.solar-arc.${hit.arcPlanet}.${hit.natalPlanet}.${hit.aspect}.${monthIso}`,
            source: 'astro',
            kind: 'solar-arc',
            name: `Solar Arc ${hit.arcPlanet} ${hit.aspect} natal ${hit.natalPlanet}`,
            korean:
              aspectFlowLine(
                hit.arcPlanet,
                hit.natalPlanet,
                hit.aspect,
                'ko',
                `솔라아크 ${pointKo(hit.arcPlanet)}`
              ) ||
              `솔라아크 ${pointKo(hit.arcPlanet)} ${hit.aspect} 본명 ${pointKo(hit.natalPlanet)}`,
            english:
              aspectFlowLine(
                hit.arcPlanet,
                hit.natalPlanet,
                hit.aspect,
                'en',
                `Solar Arc ${hit.arcPlanet}`
              ) || `Solar Arc ${hit.arcPlanet} ${hit.aspect} natal ${hit.natalPlanet}`,
            polarity,
            layer: 'decadal',
            active: {
              start: monthStart.toISOString(),
              peak: peak.toISOString(),
              end: monthEnd.toISOString(),
            },
            weight: 0.7 * orbDecay,
            evidence: {
              module: 'astro-solar-arc',
              aspectType: hit.aspect,
              orbDegrees: hit.orb,
              planets: [hit.arcPlanet, hit.natalPlanet],
              detail: {
                progressionType: 'solarArc',
                arcDegrees: Number((ageInYears * 1).toFixed(3)),
                ageInYears: Number(ageInYears.toFixed(3)),
                exactAngle: Number(hit.exactAngle.toFixed(3)),
              },
            },
          })
        }
      }

      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }

    return signals
  },
}

/**
 * 본명 input + 임의 시점 → years 단위 나이 (소수점 유지).
 * timezone 무관하게 일자 차로 근사 (Solar Arc 는 일 단위가 의미 없을 만큼 느림).
 */
function computeAgeInYears(natal: { year: number; month: number; date: number }, at: Date): number {
  const natalUTC = Date.UTC(natal.year, natal.month - 1, natal.date)
  const days = (at.getTime() - natalUTC) / 86_400_000
  return days / 365.2425
}

export default astroSolarArcExtractor
