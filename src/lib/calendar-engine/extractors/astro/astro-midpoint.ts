import {
  calculateMidpoints,
  findTransitsToMidpoints,
  type Midpoint,
} from '@/lib/astrology/foundation/midpoints'
import type { Chart } from '@/lib/astrology/foundation/types'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../../types'
import { getCachedTransitChart } from '../../ephe-cache'

/**
 * 본명 미드포인트 (Midpoint) 활성 추출기 — Hamburg / Uranian astrology 핵심.
 *
 * 미드포인트 = 본명 차트의 두 행성 사이 정확한 중간점. 트랜짓 행성이 이 점에
 * 좁은 orb (1°) 내에서 conjunction / square / opposition 으로 닿는 순간은
 * 일반 트랜짓 어스펙트보다 더 정밀한 트리거로 본다 — 두 행성의 결합 결이 한
 * 점에 응축돼 있기 때문.
 *
 * 비용 최적화:
 *  - 본명 미드포인트는 한 요청 내 1회만 계산해 ExtractorContext.cache 에 저장.
 *  - 트랜짓 차트는 ephe-cache 의 다단 캐시 (다른 점성 extractor 와 공유).
 *
 * Orb: 1° (Hamburg 기본).
 * Layer: 트랜짓 행성의 속도에 따라 daily (Sun/Moon/Mer/Ven/Mar) 또는
 *        monthly (Jup/Sat/Uranus/Neptune/Pluto).
 * Weight: 0.5 base × (1 - orb/1.0) — orb 가 좁을수록 강함.
 */

const ORB_DEG = 1.0
const NATAL_MIDPOINTS_CACHE_KEY = 'astro-midpoint:natal-midpoints'

/**
 * 미드포인트 쌍의 본질 polarity (트랜짓이 컨정션 닿을 때 기본).
 * 결단력/시험 결은 0 (양면), 풍요/사랑 결은 +1, 시험·억제 결은 -1.
 */
const MIDPOINT_BASE_POLARITY: Record<string, number> = {
  'Sun/Moon': 1,
  'Venus/Mars': 1,
  'Sun/Venus': 1,
  'Mercury/Venus': 1,
  'Sun/Mars': 1,
  'Moon/Venus': 1,
  'Moon/Mars': 0,
  'Jupiter/Saturn': 0, // 시간 결 — 구조·시험 양면
  'Sun/Jupiter': 2,
  'Mars/Jupiter': 1,
  'Mercury/Jupiter': 1,
  'Venus/Jupiter': 2, // 풍요의 점
  'Mars/Saturn': -1, // 좌절·인내 결
  'Sun/Saturn': 0, // 성숙 — 양면
  'Moon/Saturn': -1, // 감정 억제
  'Venus/Saturn': -1, // 사랑의 시험
  'Sun/Pluto': 0, // 변형 — 양면
  'Moon/Pluto': 0,
  'Venus/Pluto': 0,
  'Mars/Pluto': 0,
  'Sun/Uranus': 1,
  'Moon/Uranus': 0,
  'Venus/Uranus': 0,
  'Mars/Uranus': -1, // 갑작스러운 행동
  'Sun/Neptune': 0,
  'Moon/Neptune': 0,
  'Venus/Neptune': 1,
  'Jupiter/Neptune': 1,
}

const SLOW_PLANETS = new Set(['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'])

function transitLayer(planet: string): SignalLayer {
  if (SLOW_PLANETS.has(planet)) return 'monthly'
  return 'daily'
}

function clampPolarity(n: number): Polarity {
  if (n >= 3) return 3
  if (n <= -3) return -3
  return Math.round(n) as Polarity
}

/**
 * polarity 계산:
 *   conjunction → 미드포인트 본령 polarity 그대로 (구조 활성, base = +1 우호)
 *   square / opposition → polarity 절반 - 0.5 (긴장 결)
 */
function midpointPolarity(
  pairId: string,
  aspect: 'conjunction' | 'square' | 'opposition'
): Polarity {
  const base = MIDPOINT_BASE_POLARITY[pairId] ?? 1
  if (aspect === 'conjunction') return clampPolarity(base + 1)
  // square / opposition 은 구조에 마찰 → 본 polarity 절반 + 마찰 -0.5
  return clampPolarity(base * 0.5 - 0.5)
}

function aspectSymbol(a: 'conjunction' | 'square' | 'opposition'): string {
  return a === 'conjunction' ? '☌' : a === 'square' ? '□' : '☍'
}

function aspectKorean(a: 'conjunction' | 'square' | 'opposition'): string {
  return a === 'conjunction' ? '컨정션' : a === 'square' ? '스퀘어' : '어포지션'
}

const astroMidpointExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'midpoint',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx

    // 1) 본명 미드포인트 — 한 요청 내 1회만 계산하고 cache 에 저장
    let natalMidpoints = cache.get<Midpoint[]>(NATAL_MIDPOINTS_CACHE_KEY)
    if (!natalMidpoints) {
      natalMidpoints = calculateMidpoints(natal.astro.chart)
      cache.set(NATAL_MIDPOINTS_CACHE_KEY, natalMidpoints)
    }
    if (natalMidpoints.length === 0) return []

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const date = new Date(t)
      const noonIso = date.toISOString().slice(0, 10) + 'T12:00:00'
      let transitChart: Chart
      try {
        transitChart = await getCachedTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        continue
      }

      const hits = findTransitsToMidpoints(transitChart, natalMidpoints, ORB_DEG)
      const dayIso = date.toISOString().slice(0, 10)

      for (const hit of hits) {
        const pairId = hit.midpoint.id // "Sun/Moon"
        const polarity = midpointPolarity(pairId, hit.aspectType)
        const layer = transitLayer(hit.transitPlanet)
        const tightness = Math.max(0.4, 1 - hit.orb / ORB_DEG)
        const weight = Math.min(1, 0.5 * tightness + 0.15) // base 0.5, 좁은 orb 일수록 추가

        const pairSlug = `${hit.midpoint.planet1}-${hit.midpoint.planet2}`
        const id = `astro.midpoint.${pairSlug}.${hit.transitPlanet}.${hit.aspectType}.${dayIso}`

        signals.push({
          id,
          source: 'astro',
          kind: 'midpoint',
          name: `${hit.transitPlanet} ${aspectSymbol(hit.aspectType)} ${pairId} midpoint`,
          korean: `${hit.transitPlanet} ${aspectKorean(hit.aspectType)} 본명 ${hit.midpoint.name_ko}`,
          polarity,
          layer,
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${dayIso}T12:00:00.000Z`,
            end: `${dayIso}T23:59:59.999Z`,
          },
          weight,
          evidence: {
            module: 'astro-midpoint',
            orbDegrees: hit.orb,
            aspectType: hit.aspectType,
            planets: [hit.transitPlanet, hit.midpoint.planet1, hit.midpoint.planet2],
            detail: {
              midpointId: pairId,
              midpointNameKo: hit.midpoint.name_ko,
              midpointKeywords: hit.midpoint.keywords,
              midpointLongitude: hit.midpoint.longitude,
              midpointSign: hit.midpoint.sign,
              transitLongitude: hit.transitLongitude,
            },
          },
        })
      }
    }

    return signals
  },
}

export default astroMidpointExtractor
