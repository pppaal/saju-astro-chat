import { calculateTransitChart, findTransitAspects } from '@/lib/astrology/foundation/transit'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity, SignalLayer } from '../types'
import { inferAspectPolarity } from '../themes/tagger'

/**
 * 트랜짓 어스펙트 추출기 — 가장 핵심.
 *
 * 매일 정오의 트랜짓 차트를 계산하고 본명 차트와 어스펙트 검사.
 * 같은 (transitPlanet, natalPoint, aspectType) 짝이 연속된 날에 잡히면 하나의 신호로 묶음
 * → 활성 윈도우 = 첫날~마지막날, peak = 가장 타이트한 날.
 *
 * Swiss Ephemeris 호출 비용이 크므로 매일 1회만 (정오 UTC) 호출하고 캐시.
 * 'hour' granularity로 가도 행성 위치 변화는 미미해 daily 캐시 재사용.
 */
const astroTransitExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'transit',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const natalChart = natal.astro.chart

    // 1) range 내 매일 정오의 트랜짓 차트 계산 (캐시)
    const dailyCharts: Array<{ iso: string; chart: Chart }> = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      const cacheKey = `transit-chart:${noonIso}:${natal.astro.location.latitude}:${natal.astro.location.longitude}`
      let chart = cache.get<Chart>(cacheKey)
      if (!chart) {
        chart = await calculateTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
        })
        cache.set(cacheKey, chart)
      }
      dailyCharts.push({ iso: noonIso, chart })
    }

    // 2) 매일 어스펙트 hits 수집 → (transit, natal, aspect) 키로 그룹핑
    type Hit = { iso: string; orb: number; transitPlanet: string; natalPoint: string; aspectType: string }
    const hitsByKey = new Map<string, Hit[]>()
    for (const { iso, chart } of dailyCharts) {
      const aspects = findTransitAspects(chart, natalChart)
      for (const a of aspects) {
        const key = `${a.transitPlanet}|${a.natalPoint}|${a.aspectType}`
        const arr = hitsByKey.get(key) ?? []
        arr.push({
          iso,
          orb: a.orb,
          transitPlanet: a.transitPlanet,
          natalPoint: a.natalPoint,
          aspectType: a.aspectType,
        })
        hitsByKey.set(key, arr)
      }
    }

    // 3) 각 그룹을 하나의 ActiveSignal로 변환
    const signals: ActiveSignal[] = []
    for (const [key, hits] of hitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      // 연속 구간 분리 (트랜짓이 빠져나갔다가 역행으로 다시 오면 별개 신호)
      const segments = splitConsecutive(hits)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const startIso = seg[0].iso
        const endIso = seg[seg.length - 1].iso
        const sample = seg[0]
        const polarity: Polarity = inferAspectPolarity(sample.aspectType, sample.transitPlanet, sample.natalPoint)
        const layer: SignalLayer = transitLayer(sample.transitPlanet)

        signals.push({
          id: `astro.transit.${key}.${startIso.slice(0, 10)}`,
          source: 'astro',
          kind: 'transit',
          name: `${sample.transitPlanet} ${aspectSymbol(sample.aspectType)} ${sample.natalPoint}`,
          korean: `${sample.transitPlanet} ${aspectKorean(sample.aspectType)} 본명 ${sample.natalPoint}`,
          themes: [],
          polarity,
          layer,
          active: { start: startIso, peak: tightest.iso, end: endIso },
          weight: weightForTransit(sample.transitPlanet, sample.aspectType, tightest.orb),
          evidence: {
            module: 'astro-transit',
            aspectType: sample.aspectType,
            orbDegrees: tightest.orb,
            planets: [sample.transitPlanet, sample.natalPoint],
            detail: { segmentDays: seg.length, segmentIndex: i, totalSegments: segments.length },
          },
        })
      }
    }

    return signals
  },
}

function splitConsecutive(hits: Array<{ iso: string; orb: number; transitPlanet: string; natalPoint: string; aspectType: string }>) {
  const segments: typeof hits[] = []
  let current: typeof hits = []
  for (const h of hits) {
    if (current.length === 0) {
      current.push(h)
      continue
    }
    const prev = current[current.length - 1]
    const gap = (new Date(h.iso).getTime() - new Date(prev.iso).getTime()) / 86_400_000
    if (gap <= 1.5) {
      current.push(h)
    } else {
      segments.push(current)
      current = [h]
    }
  }
  if (current.length) segments.push(current)
  return segments
}

const SLOW_PLANETS = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
const MEDIUM_PLANETS = new Set(['Jupiter', 'Mars'])
function transitLayer(planet: string): SignalLayer {
  if (SLOW_PLANETS.has(planet)) return 'yearly'
  if (MEDIUM_PLANETS.has(planet)) return 'monthly'
  return 'daily'
}

const ASPECT_BASE_WEIGHT: Record<string, number> = {
  conjunction: 1.0,
  opposition:  0.95,
  trine:       0.85,
  square:      0.9,
  sextile:     0.7,
  quincunx:    0.6,
  semisextile: 0.4,
}
const PLANET_WEIGHT: Record<string, number> = {
  Sun: 0.85, Moon: 0.7, Mercury: 0.6, Venus: 0.7, Mars: 0.85,
  Jupiter: 0.95, Saturn: 1.0, Uranus: 1.0, Neptune: 1.0, Pluto: 1.0,
}
function weightForTransit(planet: string, aspect: string, orb: number): number {
  const aspectW = ASPECT_BASE_WEIGHT[aspect] ?? 0.5
  const planetW = PLANET_WEIGHT[planet] ?? 0.5
  const tightnessW = Math.max(0.4, 1 - orb / 6)
  return Math.min(1, aspectW * planetW * tightnessW)
}

function aspectSymbol(a: string): string {
  return ({ conjunction: '☌', opposition: '☍', trine: '△', square: '□', sextile: '✶',
    quincunx: '⚻', semisextile: '⚺', quintile: 'Q', biquintile: 'bQ' } as Record<string, string>)[a] ?? a
}
function aspectKorean(a: string): string {
  return ({ conjunction: '컨정션', opposition: '어포지션', trine: '트라인', square: '스퀘어',
    sextile: '섹스타일', quincunx: '퀸컹스', semisextile: '세미섹스타일',
    quintile: '퀸타일', biquintile: '바이퀸타일' } as Record<string, string>)[a] ?? a
}

export default astroTransitExtractor
