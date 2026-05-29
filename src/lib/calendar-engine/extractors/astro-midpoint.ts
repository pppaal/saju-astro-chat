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
} from '../types'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'
import { getCachedTransitChart } from '../ephe-cache'

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
 * 미드포인트 쌍별 테마 매핑.
 * 사용자가 묻는 5축 (love/money/career/health/growth) 기준.
 * 키: "Planet1/Planet2" — calculateMidpoints 의 id 와 동일.
 */
const MIDPOINT_THEMES: Record<string, AstroThemeKey[]> = {
  // Sun/Moon — 정체성·자아 통합 결
  'Sun/Moon': ['growth'],
  // Venus/Mars — 끌림·열정·로맨틱
  'Venus/Mars': ['love'],
  // Sun/Venus — 사랑·매력의 결
  'Sun/Venus': ['love'],
  // Mercury/Venus — 사랑 표현·예술적 소통
  'Mercury/Venus': ['love', 'career'],
  // Sun/Mars — 의지력·리더십
  'Sun/Mars': ['career', 'growth'],
  // Moon/Venus — 감정적 사랑·돌봄
  'Moon/Venus': ['love'],
  // Moon/Mars — 감정적 행동·보호
  'Moon/Mars': ['love', 'health'],
  // Jupiter/Saturn — 시간 결 (구조화된 성공)
  'Jupiter/Saturn': ['career', 'growth'],
  // Sun/Jupiter — 행운·명성
  'Sun/Jupiter': ['career', 'growth'],
  // Mars/Jupiter — 행동적 성공·기업가
  'Mars/Jupiter': ['career', 'money'],
  // Mercury/Jupiter — 학문·출판
  'Mercury/Jupiter': ['career', 'growth'],
  // Venus/Jupiter — 풍요·재정 행운
  'Venus/Jupiter': ['money', 'love'],
  // Mars/Saturn — 결단력·인내·훈련
  'Mars/Saturn': ['career'],
  // Sun/Saturn — 성숙·책임·권위
  'Sun/Saturn': ['career'],
  // Moon/Saturn — 감정적 성숙
  'Moon/Saturn': ['growth', 'health'],
  // Venus/Saturn — 사랑의 시험·헌신
  'Venus/Saturn': ['love'],
  // Sun/Pluto — 권력·변형
  'Sun/Pluto': ['growth', 'career'],
  // Moon/Pluto — 감정적 변형
  'Moon/Pluto': ['growth', 'health'],
  // Venus/Pluto — 강렬한 사랑·집착
  'Venus/Pluto': ['love'],
  // Mars/Pluto — 권력 의지
  'Mars/Pluto': ['career', 'growth'],
  // Sun/Uranus — 각성·독립
  'Sun/Uranus': ['growth', 'career'],
  // Moon/Uranus — 감정적 독립
  'Moon/Uranus': ['growth'],
  // Venus/Uranus — 자유로운 사랑
  'Venus/Uranus': ['love'],
  // Mars/Uranus — 혁명적 행동
  'Mars/Uranus': ['career', 'growth'],
  // Sun/Neptune — 영성·예술
  'Sun/Neptune': ['growth'],
  // Moon/Neptune — 직관·공감
  'Moon/Neptune': ['growth'],
  // Venus/Neptune — 이상적 사랑·예술
  'Venus/Neptune': ['love', 'growth'],
  // Jupiter/Neptune — 확장된 영성
  'Jupiter/Neptune': ['growth'],
}

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
  'Jupiter/Saturn': 0,    // 시간 결 — 구조·시험 양면
  'Sun/Jupiter': 2,
  'Mars/Jupiter': 1,
  'Mercury/Jupiter': 1,
  'Venus/Jupiter': 2,     // 풍요의 점
  'Mars/Saturn': -1,      // 좌절·인내 결
  'Sun/Saturn': 0,        // 성숙 — 양면
  'Moon/Saturn': -1,      // 감정 억제
  'Venus/Saturn': -1,     // 사랑의 시험
  'Sun/Pluto': 0,         // 변형 — 양면
  'Moon/Pluto': 0,
  'Venus/Pluto': 0,
  'Mars/Pluto': 0,
  'Sun/Uranus': 1,
  'Moon/Uranus': 0,
  'Venus/Uranus': 0,
  'Mars/Uranus': -1,      // 갑작스러운 행동
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
        const themes = MIDPOINT_THEMES[pairId] ?? ['growth']
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
          themes,
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
