import { calculateTransitChart } from '@/lib/astrology/foundation/transit'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'

/**
 * 달의 노드 (North/South Node) 트랜짓 추출기.
 *
 * 트랜짓 North Node가 본명 행성/포인트에 컨정션 (±3°)할 때 신호.
 * 노드는 매우 느리게 움직임 (1.5년에 한 사인) → 활성 윈도우 길음 (수개월).
 *
 * North Node = 카르마 성장 방향 (+) / South Node = 과거 패턴 (-).
 */

const ORB_DEG = 3.0
const NODE_NAMES = new Set(['True Node', 'Mean Node', 'North Node'])

const astroMoonNodesExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'transit',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const natalChart = natal.astro.chart
    const start = new Date(range.start)
    const end = new Date(range.end)

    type Hit = { iso: string; orb: number; nodeKind: 'north' | 'south'; natalPoint: string }
    const hits: Hit[] = []

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      const cacheKey = `transit-chart:${noonIso}:${natal.astro.location.latitude}:${natal.astro.location.longitude}`
      let chart = cache.get<Chart>(cacheKey)
      if (!chart) {
        try {
          chart = await calculateTransitChart({
            iso: noonIso,
            latitude: natal.astro.location.latitude,
            longitude: natal.astro.location.longitude,
            timeZone: natal.astro.location.timeZone,
          })
          cache.set(cacheKey, chart)
        } catch {
          continue
        }
      }

      const transitNorth = chart.planets.find((p) => NODE_NAMES.has(p.name))
      if (!transitNorth) continue
      const transitSouth = (transitNorth.longitude + 180) % 360

      const natalPoints = [...natalChart.planets, natalChart.ascendant, natalChart.mc]
      for (const natalP of natalPoints) {
        // North Node ☌ natal
        const diffNorth = shortestAngle(transitNorth.longitude, natalP.longitude)
        if (diffNorth <= ORB_DEG) {
          hits.push({ iso: noonIso, orb: diffNorth, nodeKind: 'north', natalPoint: natalP.name })
        }
        // South Node ☌ natal
        const diffSouth = shortestAngle(transitSouth, natalP.longitude)
        if (diffSouth <= ORB_DEG) {
          hits.push({ iso: noonIso, orb: diffSouth, nodeKind: 'south', natalPoint: natalP.name })
        }
      }
    }

    // (nodeKind, natalPoint) 키로 연속 구간 묶기
    const byKey = new Map<string, Hit[]>()
    for (const h of hits) {
      const key = `${h.nodeKind}|${h.natalPoint}`
      const arr = byKey.get(key) ?? []
      arr.push(h)
      byKey.set(key, arr)
    }

    const signals: ActiveSignal[] = []
    for (const [key, group] of byKey) {
      group.sort((a, b) => a.iso.localeCompare(b.iso))
      const tightest = group.reduce((b, h) => (h.orb < b.orb ? h : b), group[0])
      const startIso = group[0].iso
      const endIso = group[group.length - 1].iso

      const sample = group[0]
      const polarity: Polarity = sample.nodeKind === 'north'
        ? (inferAspectPolarity('conjunction', 'Jupiter', sample.natalPoint) >= 0 ? 2 : 1)
        : -1

      signals.push({
        id: `astro.moon-node.${key}.${startIso.slice(0, 10)}`,
        source: 'astro',
        kind: 'transit',
        name: `${sample.nodeKind === 'north' ? 'North Node' : 'South Node'} ☌ ${sample.natalPoint}`,
        korean: `${sample.nodeKind === 'north' ? '북노드 (성장)' : '남노드 (과거)'} 컨정션 본명 ${sample.natalPoint}`,
        themes: ['karma'],
        polarity,
        layer: 'yearly',   // 노드는 천천히 움직임
        active: { start: startIso, peak: tightest.iso, end: endIso },
        weight: 0.8,
        evidence: {
          module: 'astro-moon-nodes',
          planets: [sample.nodeKind === 'north' ? 'NorthNode' : 'SouthNode', sample.natalPoint],
          aspectType: 'conjunction',
          orbDegrees: tightest.orb,
          detail: { nodeKind: sample.nodeKind },
        },
      })
    }

    return signals
  },
}

function shortestAngle(a: number, b: number): number {
  const diff = Math.abs(((a - b) % 360 + 540) % 360 - 180)
  return Math.min(diff, 360 - diff)
}

export default astroMoonNodesExtractor
