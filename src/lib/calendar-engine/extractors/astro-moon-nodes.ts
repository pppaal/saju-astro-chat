import type { Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../aspect-polarity'
import { getCachedTransitChart } from '../ephe-cache'
import { shortestAngle } from '@/lib/astrology/foundation/utils'
import {
  dayDiff,
  extendRun,
  maxDailyAccel,
  maxDailyMotion,
  minOverRun,
  noonPlanetPosition,
  rangeDays,
  type RunSample,
} from './shared/noonRuns'

/**
 * 달의 노드 (North/South Node) 트랜짓 추출기.
 *
 * 트랜짓 North Node가 본명 행성/포인트에 컨정션 (±3°)할 때 신호.
 * 노드는 매우 느리게 움직임 (1.5년에 한 사인) → 활성 윈도우 길음 (수개월).
 *
 * North Node = 카르마 성장 방향 (+) / South Node = 과거 패턴 (-).
 *
 * 창: 오브 안에 든 *연속 정오* 한 구간이 한 신호다. True Node 는 보름 주기로 흔들려 오브
 * 가장자리를 들락날락하므로, 오브 밖으로 나간 날에서 구간을 끊는다(재감사 NODE-1 — 예전엔
 * 같은 (노드, 본명점)의 첫 날~마지막 날을 한 창으로 묶어 오브 밖 날에도 신호가 떴다).
 * 범위 가장자리에 닿은 구간은 천체력으로 범위 밖까지 이어 진짜 시작·끝과 그 구간의
 * 최소 orb 를 찾는다(shared/noonRuns, 트랜짓 추출기와 같은 규칙 — 범위 불변).
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

    type Hit = {
      day: string
      orb: number
      lon: number
      nodeKind: 'north' | 'south'
      natalPoint: string
      natalLon: number
      nodeName: string
    }
    const hits: Hit[] = []

    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // noonIso: 차트 계산용(location timeZone wall-clock). tz suffix 금지.
      const day = new Date(t).toISOString().slice(0, 10)
      const noonIso = day + 'T12:00:00'
      let chart: Chart
      try {
        chart = await getCachedTransitChart({
          iso: noonIso,
          latitude: natal.astro.location.latitude,
          longitude: natal.astro.location.longitude,
          timeZone: natal.astro.location.timeZone,
          inMemoryCache: cache,
        })
      } catch {
        continue
      }

      const transitNorth = chart.planets.find((p) => NODE_NAMES.has(p.name))
      if (!transitNorth) continue
      const transitSouth = (transitNorth.longitude + 180) % 360

      const natalPoints = [...natalChart.planets, natalChart.ascendant, natalChart.mc]
      for (const natalP of natalPoints) {
        const base = {
          day,
          lon: transitNorth.longitude,
          natalPoint: natalP.name,
          natalLon: natalP.longitude,
          nodeName: transitNorth.name,
        }
        // North Node ☌ natal
        const diffNorth = shortestAngle(transitNorth.longitude, natalP.longitude)
        if (diffNorth <= ORB_DEG) hits.push({ ...base, orb: diffNorth, nodeKind: 'north' })
        // South Node ☌ natal
        const diffSouth = shortestAngle(transitSouth, natalP.longitude)
        if (diffSouth <= ORB_DEG) hits.push({ ...base, orb: diffSouth, nodeKind: 'south' })
      }
    }

    // (nodeKind, natalPoint) 키로 묶은 뒤 연속 정오 구간으로 나눈다.
    const byKey = new Map<string, Hit[]>()
    for (const h of hits) {
      const key = `${h.nodeKind}|${h.natalPoint}`
      const arr = byKey.get(key) ?? []
      arr.push(h)
      byKey.set(key, arr)
    }

    const days = rangeDays(range)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const timeZone = natal.astro.location.timeZone
    const signals: ActiveSignal[] = []
    for (const [key, group] of byKey) {
      group.sort((a, b) => a.day.localeCompare(b.day))
      const sample = group[0]
      const nodeOffset = sample.nodeKind === 'north' ? 0 : 180
      const orbOfLon = (lon: number) => shortestAngle(lon + nodeOffset, sample.natalLon)
      const vmax = maxDailyMotion(sample.nodeName)
      // 범위 안 판정과 같은 값 — noonPlanetPosition 은 차트와 같은 JD·플래그.
      const orbOn = (dayIso: string): RunSample | null => {
        const pos = noonPlanetPosition(sample.nodeName, dayIso, timeZone)
        if (!pos) return null
        const orb = orbOfLon(pos.longitude)
        return orb <= ORB_DEG ? { day: dayIso, value: orb, lon: pos.longitude } : null
      }
      const polarity: Polarity =
        sample.nodeKind === 'north'
          ? inferAspectPolarity('conjunction', 'Jupiter', sample.natalPoint) >= 0
            ? 2
            : 1
          : -1

      for (const seg of splitConsecutiveDays(group)) {
        const known: RunSample[] = seg.map((h) => ({ day: h.day, value: h.orb, lon: h.lon }))
        const first = known[0]
        const last = known[known.length - 1]
        let startDay = first.day
        let endDay = last.day
        const marginOf = (x: RunSample) => ORB_DEG - x.value
        if (startDay === firstDay) {
          const edge = extendRun({ anchor: first, direction: -1, vmax, sampleOn: orbOn, marginOf })
          startDay = edge.edgeDay
          known.push(...edge.samples.slice(1))
        }
        if (endDay === lastDay) {
          const edge = extendRun({ anchor: last, direction: 1, vmax, sampleOn: orbOn, marginOf })
          endDay = edge.edgeDay
          known.push(...edge.samples.slice(1))
        }
        const tightest = minOverRun(
          known,
          { vmax, acc: maxDailyAccel(sample.nodeName), orbOfLon },
          orbOn
        )

        signals.push({
          id: `astro.moon-node.${key}.${startDay}`,
          source: 'astro',
          kind: 'transit',
          name: `${sample.nodeKind === 'north' ? 'North Node' : 'South Node'} ☌ ${sample.natalPoint}`,
          korean: `${sample.nodeKind === 'north' ? '북교점 (성장)' : '남교점 (과거)'} 컨정션 본명 ${sample.natalPoint}`,
          polarity,
          layer: 'yearly', // 노드는 천천히 움직임
          // 창 키: 현지 정오 벽시계 + 명시적 `Z` — 현지 날짜 버킷 유지, 서버 TZ 무관 파싱.
          active: {
            start: `${startDay}T12:00:00.000Z`,
            peak: `${tightest.day}T12:00:00.000Z`,
            end: `${endDay}T12:00:00.000Z`,
          },
          weight: 0.8,
          evidence: {
            module: 'astro-moon-nodes',
            planets: [sample.nodeKind === 'north' ? 'NorthNode' : 'SouthNode', sample.natalPoint],
            aspectType: 'conjunction',
            orbDegrees: tightest.value,
            detail: { nodeKind: sample.nodeKind, segmentDays: dayDiff(startDay, endDay) + 1 },
          },
        })
      }
    }

    return signals
  },
}

export default astroMoonNodesExtractor

/** 날짜순 hit 들을 하루 간격의 연속 구간으로 나눈다 — 하루라도 오브 밖이면 끊는다. */
function splitConsecutiveDays<T extends { day: string }>(hits: T[]): T[][] {
  const segments: T[][] = []
  let current: T[] = []
  for (const h of hits) {
    if (current.length > 0 && dayDiff(current[current.length - 1].day, h.day) > 1) {
      segments.push(current)
      current = []
    }
    current.push(h)
  }
  if (current.length) segments.push(current)
  return segments
}
