import {
  calculateAllAsteroids,
  findAsteroidAspects,
  type AsteroidName,
  type Asteroid,
} from '@/lib/astrology/foundation/asteroids'
import { isoToJD, natalToJD } from '@/lib/astrology/foundation/shared'
import type { Chart, AspectHit } from '@/lib/astrology/foundation/types'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../types'
import { getCachedTransitChart } from '../ephe-cache'
import type { AstroThemeKey } from '@/lib/astrology/themes/types'

/**
 * 4대 소행성 (Ceres/Pallas/Juno/Vesta) 추출기.
 *
 * 1) 본명 차트에 4 소행성 위치를 계산하고,
 * 2) 매일 트랜짓 행성이 본명 소행성에 어스펙트(±3°)할 때,
 * 3) 트랜짓 4 소행성이 본명 행성에 어스펙트할 때까지 잡는다.
 *
 * 소행성은 천천히 움직이지만 (Ceres ≈ 4.6년/궤도) 정확한 컨택 윈도우는
 * 짧음(수일~수주). 활성 윈도우 = 연속 hit 구간. layer = monthly.
 *
 * polarity:
 *   - Ceres  (양육/돌봄) : conjunction +1, trine/sextile +1, hard -1
 *   - Pallas (지혜/전략) : conjunction +1, trine +1, hard -1
 *   - Juno   (관계/약속) : conjunction +1, trine +1, hard -1
 *   - Vesta  (헌신/집중) : conjunction +1, trine +1, hard -1
 *
 * Swiss Ephemeris 호출 비용이 있어 매일 1회(정오)만 계산, 캐시 사용.
 */

const ORB_DEG = 3.0
const ASTEROID_NAMES: AsteroidName[] = ['Ceres', 'Pallas', 'Juno', 'Vesta']

const ASTEROID_THEMES: Record<AsteroidName, AstroThemeKey[]> = {
  Ceres: ['love', 'health'], // 양육·돌봄·음식 → 사랑·건강 결
  Pallas: ['career', 'growth'], // 지혜·전략·창의 → 일·성장 결
  Juno: ['love', 'career'], // 관계·약속·파트너십 → 사랑·일(계약) 결
  Vesta: ['career', 'growth'], // 헌신·집중·일 → 일·성장 결
}

const ASTEROID_KOREAN: Record<AsteroidName, string> = {
  Ceres: '세레스',
  Pallas: '팔라스',
  Juno: '주노',
  Vesta: '베스타',
}

const astroAsteroidExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'asteroid',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx

    // ─── 본명 소행성 계산 (캐시) ───
    // 본명 차트는 평생 불변이라 캐시 키는 latitude/longitude/birthDate만으로 충분.
    const natalCacheKey = `asteroids:natal:${natal.input.year}-${natal.input.month}-${natal.input.date}:${natal.astro.location.latitude}:${natal.astro.location.longitude}`
    let natalAsteroids = cache.get<Record<AsteroidName, Asteroid>>(natalCacheKey)
    if (!natalAsteroids) {
      try {
        const natalJD = natalToJD(natal.input)
        const houseCusps = natal.astro.chart.houses.map((h) => h.cusp)
        const collection = calculateAllAsteroids(natalJD, houseCusps)
        natalAsteroids = {
          Ceres: collection.Ceres,
          Pallas: collection.Pallas,
          Juno: collection.Juno,
          Vesta: collection.Vesta,
        }
        cache.set(natalCacheKey, natalAsteroids)
      } catch {
        return [] // Swiss Ephemeris 실패시 조용히 스킵
      }
    }

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // ─── 트랜짓 → 본명 소행성 hits 수집 ───
    type Hit = {
      iso: string
      orb: number
      transitPlanet: string
      natalAsteroid: AsteroidName
      aspectType: string
    }
    const transitHitsByKey = new Map<string, Hit[]>()

    // ─── 트랜짓 소행성 → 본명 행성 hits 수집 ───
    type AsteroidHit = {
      iso: string
      orb: number
      transitAsteroid: AsteroidName
      natalPlanet: string
      aspectType: string
    }
    const asteroidHitsByKey = new Map<string, AsteroidHit[]>()

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // noonIso: 차트/JD 계산용 — isoToJD 가 location timeZone wall-clock 로 해석.
      // tz suffix 금지 (JD/캐시 키 의미 변경됨).
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      // windowIso: 신호 active window 저장/버킷팅용 — 동일 wall-clock 에 명시적 `Z`.
      // slice(0,10) 현지 날짜 버킷은 유지하되 downstream new Date() 파싱을 서버 TZ
      // 무관 UTC 정오로 고정 (astro-transit 와 동일 규칙).
      const windowIso = noonIso + '.000Z'

      // 트랜짓 차트 (행성)
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

      // 1) 트랜짓 행성 → 본명 소행성
      for (const aName of ASTEROID_NAMES) {
        const natalAst = natalAsteroids[aName]
        const aspects: AspectHit[] = findAsteroidAspects(natalAst, transitChart.planets)
        for (const a of aspects) {
          const key = `transit-to-natal-asteroid|${a.to.name}|${aName}|${a.type}`
          const arr = transitHitsByKey.get(key) ?? []
          arr.push({
            iso: windowIso,
            orb: a.orb,
            transitPlanet: a.to.name,
            natalAsteroid: aName,
            aspectType: a.type,
          })
          transitHitsByKey.set(key, arr)
        }
      }

      // 2) 트랜짓 소행성 → 본명 행성
      // 매일 트랜짓 소행성 위치 계산. orb 작아 hit이 드물어 비용 OK.
      try {
        const transitJD = isoToJD(noonIso, natal.astro.location.timeZone)
        const houseCusps = transitChart.houses.map((h) => h.cusp)
        const transitAsteroids = calculateAllAsteroids(transitJD, houseCusps)
        for (const aName of ASTEROID_NAMES) {
          const transitAst = transitAsteroids[aName]
          const aspects: AspectHit[] = findAsteroidAspects(
            transitAst,
            natal.astro.chart.planets,
            { conjunction: ORB_DEG, trine: ORB_DEG, square: ORB_DEG, opposition: ORB_DEG, sextile: ORB_DEG }
          )
          for (const a of aspects) {
            const key = `transit-asteroid-to-natal|${aName}|${a.to.name}|${a.type}`
            const arr = asteroidHitsByKey.get(key) ?? []
            arr.push({
              iso: windowIso,
              orb: a.orb,
              transitAsteroid: aName,
              natalPlanet: a.to.name,
              aspectType: a.type,
            })
            asteroidHitsByKey.set(key, arr)
          }
        }
      } catch {
        // 트랜짓 소행성 계산 실패는 무시 (행성 어스펙트는 이미 1번에서 잡음)
      }
    }

    // ─── 트랜짓 행성 → 본명 소행성 신호 변환 ───
    for (const [key, hits] of transitHitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments = splitConsecutive(hits)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const sample = seg[0]
        signals.push({
          id: `astro.asteroid.${key}.${seg[0].iso.slice(0, 10)}`,
          source: 'astro',
          kind: 'asteroid',
          name: `${sample.transitPlanet} ${aspectSymbol(sample.aspectType)} ${sample.natalAsteroid}`,
          korean: `${sample.transitPlanet} ${aspectKorean(sample.aspectType)} 본명 ${ASTEROID_KOREAN[sample.natalAsteroid]}`,
          themes: ASTEROID_THEMES[sample.natalAsteroid],
          polarity: polarityForAsteroid(sample.natalAsteroid, sample.aspectType),
          layer: 'monthly' as SignalLayer,
          active: {
            start: seg[0].iso,
            peak: tightest.iso,
            end: seg[seg.length - 1].iso,
          },
          weight: weightForAsteroid(sample.aspectType, tightest.orb),
          evidence: {
            module: 'astro-asteroid',
            aspectType: sample.aspectType,
            orbDegrees: tightest.orb,
            planets: [sample.transitPlanet, sample.natalAsteroid],
            detail: {
              flavor: 'transit-planet-to-natal-asteroid',
              asteroid: sample.natalAsteroid,
              segmentDays: seg.length,
              segmentIndex: i,
              totalSegments: segments.length,
            },
          },
        })
      }
    }

    // ─── 트랜짓 소행성 → 본명 행성 신호 변환 ───
    for (const [key, hits] of asteroidHitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments = splitConsecutive(hits)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const sample = seg[0]
        signals.push({
          id: `astro.asteroid.${key}.${seg[0].iso.slice(0, 10)}`,
          source: 'astro',
          kind: 'asteroid',
          name: `${sample.transitAsteroid} ${aspectSymbol(sample.aspectType)} ${sample.natalPlanet}`,
          korean: `${ASTEROID_KOREAN[sample.transitAsteroid]} ${aspectKorean(sample.aspectType)} 본명 ${sample.natalPlanet}`,
          themes: ASTEROID_THEMES[sample.transitAsteroid],
          polarity: polarityForAsteroid(sample.transitAsteroid, sample.aspectType),
          layer: 'monthly' as SignalLayer,
          active: {
            start: seg[0].iso,
            peak: tightest.iso,
            end: seg[seg.length - 1].iso,
          },
          weight: weightForAsteroid(sample.aspectType, tightest.orb),
          evidence: {
            module: 'astro-asteroid',
            aspectType: sample.aspectType,
            orbDegrees: tightest.orb,
            planets: [sample.transitAsteroid, sample.natalPlanet],
            detail: {
              flavor: 'transit-asteroid-to-natal-planet',
              asteroid: sample.transitAsteroid,
              segmentDays: seg.length,
              segmentIndex: i,
              totalSegments: segments.length,
            },
          },
        })
      }
    }

    return signals
  },
}

function splitConsecutive<T extends { iso: string }>(hits: T[]): T[][] {
  const segments: T[][] = []
  let current: T[] = []
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

/**
 * 소행성별 polarity — 스펙 그대로:
 *   Ceres conjunction +1, Pallas trine +1, Juno conjunction +1, Vesta trine +1.
 * harmonic(섹스타일·트라인)은 +1, hard(스퀘어·어포지션)는 -1, 컨정션은 소행성 본질에 따라.
 */
function polarityForAsteroid(asteroid: AsteroidName, aspectType: string): Polarity {
  const harmonic = aspectType === 'trine' || aspectType === 'sextile'
  const hard = aspectType === 'square' || aspectType === 'opposition'
  const conj = aspectType === 'conjunction'

  if (conj) {
    // 컨정션은 소행성 결과 그대로 차오름 — 약한 + 톤
    return 1
  }
  if (harmonic) {
    // 트라인(특히)은 자연스럽게 흐르는 결 — +1
    return 1
  }
  if (hard) {
    // 스퀘어/어포지션은 어긋남 — -1
    return -1
  }
  return 0
}

function weightForAsteroid(aspectType: string, orb: number): number {
  const aspectBase: Record<string, number> = {
    conjunction: 0.7,
    opposition: 0.6,
    trine: 0.65,
    square: 0.6,
    sextile: 0.55,
  }
  const base = aspectBase[aspectType] ?? 0.4
  const tightness = Math.max(0.4, 1 - orb / ORB_DEG)
  return Math.min(1, base * tightness)
}

function aspectSymbol(a: string): string {
  return (
    (
      {
        conjunction: '☌',
        opposition: '☍',
        trine: '△',
        square: '□',
        sextile: '✶',
      } as Record<string, string>
    )[a] ?? a
  )
}

function aspectKorean(a: string): string {
  return (
    (
      {
        conjunction: '컨정션',
        opposition: '어포지션',
        trine: '트라인',
        square: '스퀘어',
        sextile: '섹스타일',
      } as Record<string, string>
    )[a] ?? a
  )
}

export default astroAsteroidExtractor
