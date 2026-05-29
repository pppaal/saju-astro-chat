import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { getCachedTransitChart } from '../ephe-cache'
import { shortestAngle, normalize360 } from '@/lib/astrology/foundation/utils'

/**
 * Vertex / Anti-Vertex 컨택트 추출기.
 *
 * 본명 차트의 Vertex(서쪽 prime vertical × 황도 교점)는 ASC/DSC 외 또 다른
 * 운명적 인연 축. Anti-Vertex 는 정반대 점(Vertex + 180°).
 *
 * 매일 정오의 트랜짓 행성(Sun/Moon/Mercury/Venus/Mars/Jupiter/Saturn) longitude 가
 * 본명 vertex 또는 antiVertex 와 conjunction (orb ≤ 2°) 일 때 신호 생성.
 *
 * 활성 윈도우: orb 안 머무는 구간 (보통 inner planets 는 1~3일, Jupiter/Saturn 은 더 길게).
 * polarity: vertex 는 "운명적 + 강도" 라 기본 +2, malefic(Mars/Saturn) 이나
 *           외행성 컨택트는 신중함이 필요해 +1 로 낮춤.
 *
 * 본명 vertex 가 없는 차트(옛 입력·계산 실패)에는 빈 배열 리턴 — graceful.
 */

const ORB_DEG = 2.0
const TRANSIT_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
const CAUTIOUS_PLANETS = new Set(['Mars', 'Saturn'])

type ContactPoint = 'vertex' | 'antiVertex'

type Hit = {
  iso: string
  orb: number
  transitPlanet: string
  point: ContactPoint
  vertexLon: number
  transitLon: number
}

const astroVertexContactExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'vertex-contact',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const vertex = natal.astro.vertex
    // 본명 vertex 가 없으면 (옛 차트, 계산 실패) 조용히 빈 배열 — throw 금지.
    if (!vertex) return []

    const vertexLon = vertex.longitude
    const antiVertexLon = normalize360(vertexLon + 180)

    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 1) 매일 트랜짓 행성 vs vertex / antiVertex 검사 — 캐시된 정오 차트 활용
    const hitsByKey = new Map<string, Hit[]>()
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
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

      for (const planet of transitChart.planets) {
        if (!TRANSIT_PLANETS.includes(planet.name)) continue
        const checks: Array<[ContactPoint, number]> = [
          ['vertex', vertexLon],
          ['antiVertex', antiVertexLon],
        ]
        for (const [point, pointLon] of checks) {
          const orb = shortestAngle(planet.longitude, pointLon)
          if (orb > ORB_DEG) continue
          const key = `${planet.name}|${point}`
          const arr = hitsByKey.get(key) ?? []
          arr.push({
            iso: noonIso,
            orb,
            transitPlanet: planet.name,
            point,
            vertexLon: pointLon,
            transitLon: planet.longitude,
          })
          hitsByKey.set(key, arr)
        }
      }
    }

    // 2) 그룹별 연속 hit 을 한 신호로 묶음 (트랜짓이 빠져나갔다 역행으로 돌아오면 별개)
    for (const [, hits] of hitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const segments = splitConsecutive(hits)
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i]
        const tightest = seg.reduce((best, h) => (h.orb < best.orb ? h : best), seg[0])
        const sample = seg[0]
        const dayIso = seg[0].iso.slice(0, 10)
        const polarity: Polarity = CAUTIOUS_PLANETS.has(sample.transitPlanet) ? 1 : 2
        const pointLabel = sample.point === 'vertex' ? 'Vertex' : 'Anti-Vertex'
        const pointKorean = sample.point === 'vertex' ? '버텍스' : '안티버텍스'

        signals.push({
          id: `astro.vertex-contact.${sample.transitPlanet}-${sample.point}.${dayIso}`,
          source: 'astro',
          kind: 'vertex-contact',
          name: `${sample.transitPlanet} ☌ ${pointLabel}`,
          korean: `${sample.transitPlanet} 컨정션 본명 ${pointKorean}`,
          themes: [],
          polarity,
          layer: 'daily',
          active: {
            start: seg[0].iso,
            peak: tightest.iso,
            end: seg[seg.length - 1].iso,
          },
          weight: 0.6 * Math.max(0.4, 1 - tightest.orb / ORB_DEG),
          evidence: {
            module: 'astro-vertex-contact',
            aspectType: 'conjunction',
            orbDegrees: tightest.orb,
            planets: [sample.transitPlanet],
            detail: {
              transitPlanet: sample.transitPlanet,
              point: sample.point,
              vertexLon: tightest.vertexLon,
              transitLon: tightest.transitLon,
              kind: 'conjunction',
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

function splitConsecutive(hits: Hit[]): Hit[][] {
  const segments: Hit[][] = []
  let current: Hit[] = []
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

export default astroVertexContactExtractor
