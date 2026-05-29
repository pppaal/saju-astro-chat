import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import { angleDiff, normalize360 } from '@/lib/astrology/foundation/utils'
import type {
  ActiveSignal,
  ExtractorContext,
  Polarity,
  SignalExtractor,
  SignalLayer,
} from '../types'
import { getCachedTransitChart } from '../ephe-cache'

/**
 * 안티시아 / 콘트라-안티시아 (그림자 도) 컨택트 추출기.
 *
 * 전통 점성에서 "숨은 인연·사건" 결을 잡는 정밀 트리거.
 *
 * 정의:
 *   - Antiscia (해축, solstitial)  = (180° − L) mod 360°
 *       0°Cancer / 0°Capricorn 축 미러. 낮 길이 같은 도수끼리.
 *       예: 5°Gemini ↔ 25°Cancer.
 *   - Contra-Antiscia (분점축, equinoctial) = (360° − L) mod 360° = (−L) mod 360°
 *       0°Aries / 0°Libra 축 미러. 낮 길이 거울상.
 *       예: 5°Gemini ↔ 25°Capricorn.
 *
 * 컨택트: 빠른 트랜짓 점이 본명 점의 antiscia 좌표에 컨정션 (orb ≤ 1.5°).
 *
 * Polarity: antiscia → +1 (숨은 지원), contra-antiscia → −1 (숨은 도전).
 *
 * 본명 점: Sun · Moon · Mercury · Venus · Mars · Jupiter · Saturn · ASC · MC.
 * 트랜짓 점: Sun · Moon · Mercury · Venus · Mars (빠른 행성만 — 느린 행성은
 * antiscia 가 길게 걸려 daily 단발 트리거 의미가 흐려짐).
 *
 * Layer: 'daily' (단발성 컨택트). Weight: 0.5 × tightness (좁은 orb 일수록 강).
 *
 * 비용: 매일 정오 트랜짓 차트 1회 (ephe-cache 공유). Swiss Eph 직접 호출 없음.
 */

const ORB_DEG = 1.5

// 본명 점 — 핵심 7행성 + 두 앵글. ASC/MC 는 chart.ascendant / chart.mc.
const NATAL_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const
const NATAL_ANGLES = ['Ascendant', 'MC'] as const

// 트랜짓은 빠른 행성만 — Sun..Mars. 느린 행성 antiscia 는 별개 라인.
const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'] as const

type MirrorKind = 'solstitial' | 'equinoctial'

/** L 의 antiscia (하지 축 미러) = (180° − L) mod 360°. */
function antiscia(longitude: number): number {
  return normalize360(180 - longitude)
}

/** L 의 contra-antiscia (분점 축 미러) = (360° − L) mod 360° = (−L) mod 360°. */
function contraAntiscia(longitude: number): number {
  return normalize360(360 - longitude)
}

interface NatalPointRef {
  name: string
  longitude: number
}

/** 본명 차트에서 추적 대상 9점 추출 (없으면 스킵). */
function collectNatalPoints(chart: Chart): NatalPointRef[] {
  const points: NatalPointRef[] = []
  const byName = new Map<string, PlanetBase>()
  for (const p of chart.planets) byName.set(p.name, p)
  for (const name of NATAL_PLANETS) {
    const p = byName.get(name)
    if (p) points.push({ name, longitude: p.longitude })
  }
  if (chart.ascendant) points.push({ name: 'Ascendant', longitude: chart.ascendant.longitude })
  if (chart.mc) points.push({ name: 'MC', longitude: chart.mc.longitude })
  return points
}

interface AntisciaTarget {
  natalPoint: string
  mirror: MirrorKind
  /** 본명 점의 antiscia 좌표 (트랜짓이 컨정션 닿을 도수). */
  mirrorLongitude: number
}

/** 본명 9점 × 2 미러 = 최대 18개 타겟 좌표. */
function buildAntisciaTargets(natalPoints: NatalPointRef[]): AntisciaTarget[] {
  const targets: AntisciaTarget[] = []
  for (const np of natalPoints) {
    targets.push({
      natalPoint: np.name,
      mirror: 'solstitial',
      mirrorLongitude: antiscia(np.longitude),
    })
    targets.push({
      natalPoint: np.name,
      mirror: 'equinoctial',
      mirrorLongitude: contraAntiscia(np.longitude),
    })
  }
  return targets
}

const astroAntisciaExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'antiscia',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx

    const natalPoints = collectNatalPoints(natal.astro.chart)
    if (natalPoints.length === 0) return []
    const targets = buildAntisciaTargets(natalPoints)

    // 매일 정오 트랜짓 차트 → 빠른 트랜짓 행성 longitude 와 본명 antiscia 좌표 비교.
    interface Hit {
      iso: string
      orb: number
      transitPlanet: string
      transitLon: number
      natalPoint: string
      mirror: MirrorKind
      mirrorLon: number
    }
    // 동일 (transitPlanet, natalPoint, mirror) 짝이 연속된 날에 잡히면
    // 하나의 윈도우로 묶는다 — 빠른 행성도 정확 각도일 ± 1~2일은 유지.
    const hitsByKey = new Map<string, Hit[]>()

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

      // 빠른 트랜짓 행성만
      const transitByName = new Map<string, PlanetBase>()
      for (const p of transitChart.planets) transitByName.set(p.name, p)

      for (const planetName of TRANSIT_PLANETS) {
        const tp = transitByName.get(planetName)
        if (!tp) continue
        for (const tgt of targets) {
          const orb = angleDiff(tp.longitude, tgt.mirrorLongitude)
          if (orb > ORB_DEG) continue
          const key = `${planetName}|${tgt.natalPoint}|${tgt.mirror}`
          const arr = hitsByKey.get(key) ?? []
          arr.push({
            iso: noonIso,
            orb,
            transitPlanet: planetName,
            transitLon: tp.longitude,
            natalPoint: tgt.natalPoint,
            mirror: tgt.mirror,
            mirrorLon: tgt.mirrorLongitude,
          })
          hitsByKey.set(key, arr)
        }
      }
    }

    const signals: ActiveSignal[] = []
    for (const [, hits] of hitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments = splitConsecutive(hits)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const sample = seg[0]
        const dayIso = seg[0].iso.slice(0, 10)
        const peakDay = tightest.iso.slice(0, 10)
        const endDay = seg[seg.length - 1].iso.slice(0, 10)

        const polarity: Polarity = sample.mirror === 'solstitial' ? 1 : -1
        const kindSlug = sample.mirror === 'solstitial' ? 'antiscia' : 'contra'

        const mirrorKo =
          sample.mirror === 'solstitial' ? '안티시아 (하지 축 미러)' : '콘트라-안티시아 (분점 축 미러)'
        const mirrorSymbol = sample.mirror === 'solstitial' ? '⊙' : '⊝'

        const tightness = Math.max(0.4, 1 - tightest.orb / ORB_DEG)
        const weight = Math.min(1, 0.5 * tightness + 0.1)

        signals.push({
          id: `astro.antiscia.${sample.transitPlanet}-${sample.natalPoint}-${kindSlug}.${dayIso}`,
          source: 'astro',
          kind: 'antiscia',
          name: `${sample.transitPlanet} ${mirrorSymbol} ${sample.natalPoint} (${kindSlug === 'antiscia' ? 'antiscia' : 'contra-antiscia'})`,
          korean: `트랜짓 ${sample.transitPlanet} 가 본명 ${sample.natalPoint} 의 ${mirrorKo} 에 컨택`,
          themes: [],
          polarity,
          layer: 'daily' as SignalLayer,
          active: {
            start: `${dayIso}T00:00:00.000Z`,
            peak: `${peakDay}T12:00:00.000Z`,
            end: `${endDay}T23:59:59.999Z`,
          },
          weight,
          evidence: {
            module: 'astro-antiscia',
            aspectType: 'conjunction',
            orbDegrees: tightest.orb,
            planets: [sample.transitPlanet, sample.natalPoint],
            detail: {
              transitPlanet: sample.transitPlanet,
              natalPoint: sample.natalPoint,
              antisciaLon: sample.mirrorLon,
              transitLon: tightest.transitLon,
              orb: tightest.orb,
              mirror: sample.mirror,
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

export default astroAntisciaExtractor
