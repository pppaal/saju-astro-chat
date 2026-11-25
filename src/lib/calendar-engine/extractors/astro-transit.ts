import { findTransitAspects, transitOrbLimit } from '@/lib/astrology/foundation/transit'
import { ASPECT_ANGLES, type AspectType, type Chart } from '@/lib/astrology/foundation/types'
import { angleDiff } from '@/lib/astrology/foundation/utils'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../types'
import { inferAspectPolarity } from '../aspect-polarity'
import { getCachedTransitChart } from '../ephe-cache'
import { aspectFlowLine } from '../data/astroFlow'
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

// Hellenistic 정통화 (Phase 2): minor aspect 5종 (semisextile/quincunx/
// quintile/biquintile/sesquiquadrate) 은 비정통 (Kepler 이후 modern). 추출기에서
// 차단 — TRANSIT_ASPECTS 에서 빼고, 혹시 모를 minor 누출에 대비해 MINOR_ASPECT_SET
// 가드를 유지 (defense-in-depth). foundation aspects.ts 의 resolveAspectList
// 도 minor 를 필터링하므로 이중 안전.
const TRANSIT_ASPECTS: AspectType[] = ['conjunction', 'sextile', 'square', 'trine', 'opposition']
const MINOR_ASPECT_SET = new Set<string>([
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
])

// (legacy) — minor aspect polarity 오버라이드. 이제 minor 자체가 차단되므로
// 사용되지 않지만 타입 호환과 추후 옵션 재활성 가능성 위해 보존.
const MINOR_POLARITY_OVERRIDE: Record<string, Polarity> = {
  semisextile: 0,
  quincunx: -1,
  quintile: 1,
  biquintile: 1,
  sesquiquadrate: -1,
}

/**
 * 트랜짓 어스펙트 추출기 — 가장 핵심.
 *
 * 매일 정오의 트랜짓 차트를 계산하고 본명 차트와 어스펙트 검사.
 * 같은 (transitPlanet, natalPoint, aspectType) 짝이 연속된 날에 잡히면 하나의 신호로 묶음
 * → 활성 윈도우 = 첫날~마지막날, peak = 가장 타이트한 날.
 *
 * 창은 *오브 안에 든 연속 정오 전체*다 — 범위 가장자리에 닿은 구간은 천체력으로 범위
 * 밖까지 이어 진짜 진입·이탈 정오를 찾고, weight·peak 는 그 전체 구간의 최소 orb 로
 * 정한다(shared/noonRuns). 그래야 1일 빌드와 월 빌드가 같은 날에 같은 신호·교차를
 * 낸다(엔진 감사 X1 — 예전엔 범위에서 잘려 1일 빌드에선 한 달짜리 트랜짓이 정오 한
 * 순간·약한 weight 가 됐다).
 *
 * Swiss Ephemeris 호출 비용이 크므로 매일 1회만 (정오 UTC) 호출하고 캐시.
 * 'hour' granularity로 가도 행성 위치 변화는 미미해 daily 캐시 재사용.
 */
const astroTransitExtractor: SignalExtractor = {
  source: 'astro',
  kind: 'transit',
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    // 본명 카이런·릴리스를 본명 점에 합쳐 "트랜짓 → 본명 카이런/릴리스" 어스펙트도
    // 잡는다 (extraPoints는 이 extractor에서만 사용 — 다른 extractor는 영향 없음).
    const extraPoints = natal.astro.extraPoints ?? []
    const natalChart =
      extraPoints.length > 0
        ? { ...natal.astro.chart, planets: [...natal.astro.chart.planets, ...extraPoints] }
        : natal.astro.chart

    // 1) range 내 매일 정오의 트랜짓 차트 계산 — 2단 캐시 (InMemory + Redis)
    const dailyCharts: Array<{ iso: string; chart: Chart }> = []
    const start = new Date(range.start)
    const end = new Date(range.end)
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // noonIso: 차트 계산용 — `isoToJD(iso, timeZone)` 가 이 문자열을 location
      // timeZone 의 wall-clock(현지 정오) 로 해석한다. tz suffix 를 절대 붙이지 말 것
      // (붙이면 JD/캐시 키 의미가 바뀜).
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      // windowIso: 신호 active window 저장/버킷팅용 — 동일 wall-clock 에 명시적 `Z`.
      // 이렇게 하면 (1) slice(0,10) 으로 얻는 현지 날짜 버킷은 그대로,
      // (2) downstream `new Date(window)` 파싱이 서버 TZ 에 흔들리지 않고 항상 UTC
      // 정오로 고정된다 (convergence exactnessFactor 등). 이전엔 tz-less 문자열이
      // 서버 로컬로 파싱돼 Seoul/LA 서버에서 점수가 달라졌다.
      const windowIso = noonIso + '.000Z'
      const chart = await getCachedTransitChart({
        iso: noonIso,
        latitude: natal.astro.location.latitude,
        longitude: natal.astro.location.longitude,
        timeZone: natal.astro.location.timeZone,
        inMemoryCache: cache,
      })
      dailyCharts.push({ iso: windowIso, chart })
    }

    // 2) 매일 어스펙트 hits 수집 → (transit, natal, aspect) 키로 그룹핑
    type Hit = {
      iso: string
      orb: number
      lon: number
      transitPlanet: string
      natalPoint: string
      aspectType: string
    }
    const hitsByKey = new Map<string, Hit[]>()
    for (const { iso, chart } of dailyCharts) {
      const aspects = findTransitAspects(chart, natalChart, TRANSIT_ASPECTS)
      for (const a of aspects) {
        // Hellenistic 정통화: minor aspect 는 emit 안 함. defense-in-depth.
        if (MINOR_ASPECT_SET.has(a.type)) continue
        const key = `${a.transitPlanet}|${a.natalPoint}|${a.type}`
        const arr = hitsByKey.get(key) ?? []
        arr.push({
          iso,
          orb: a.orb,
          lon: a.from.longitude,
          transitPlanet: a.transitPlanet,
          natalPoint: a.natalPoint,
          aspectType: a.type,
        })
        hitsByKey.set(key, arr)
      }
    }

    // 3) 각 그룹을 하나의 ActiveSignal로 변환 — 범위 가장자리에 닿은 구간은 범위 밖으로
    //    이어 진짜 run(첫 정오 ~ 마지막 정오)과 그 run 의 최소 orb 를 찾는다.
    const days = rangeDays(range)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const timeZone = natal.astro.location.timeZone
    const natalPoints = [...natalChart.planets, natalChart.ascendant, natalChart.mc]
    const signals: ActiveSignal[] = []
    for (const [key, hits] of hitsByKey) {
      hits.sort((a, b) => a.iso.localeCompare(b.iso))
      const sample = hits[0]
      const natalLon = natalPoints.find((p) => p?.name === sample.natalPoint)?.longitude
      const angle = ASPECT_ANGLES[sample.aspectType as AspectType]
      const limit = transitOrbLimit(sample.transitPlanet, sample.aspectType as AspectType)
      const vmax = maxDailyMotion(sample.transitPlanet)
      const bound = {
        vmax,
        acc: maxDailyAccel(sample.transitPlanet),
        orbOfLon: (lon: number) =>
          typeof natalLon === 'number' ? Math.abs(angleDiff(lon, natalLon) - angle) : 0,
      }
      // findTransitAspects 와 같은 판정 — orb = |angleDiff − 목표각|, orb ≤ 한도면 켜짐.
      const orbOn = (dayIso: string): RunSample | null => {
        if (typeof natalLon !== 'number') return null
        const pos = noonPlanetPosition(sample.transitPlanet, dayIso, timeZone)
        if (!pos) return null
        const orb = Math.abs(angleDiff(pos.longitude, natalLon) - angle)
        return orb <= limit ? { day: dayIso, value: orb, lon: pos.longitude } : null
      }
      // 연속 구간 분리 (트랜짓이 빠져나갔다가 역행으로 다시 오면 별개 신호)
      for (const seg of splitConsecutive(hits)) {
        const known: RunSample[] = seg.map((h) => ({
          day: h.iso.slice(0, 10),
          value: h.orb,
          lon: h.lon,
        }))
        const first = known[0]
        const last = known[known.length - 1]
        let startDay = first.day
        let endDay = last.day
        if (startDay === firstDay) {
          const edge = extendRun({
            anchor: first,
            direction: -1,
            vmax,
            sampleOn: orbOn,
            marginOf: (x) => limit - x.value,
          })
          startDay = edge.edgeDay
          known.push(...edge.samples.slice(1))
        }
        if (endDay === lastDay) {
          const edge = extendRun({
            anchor: last,
            direction: 1,
            vmax,
            sampleOn: orbOn,
            marginOf: (x) => limit - x.value,
          })
          endDay = edge.edgeDay
          known.push(...edge.samples.slice(1))
        }
        const tightest = minOverRun(known, bound, orbOn)
        const startIso = `${startDay}T12:00:00.000Z`
        const endIso = `${endDay}T12:00:00.000Z`
        const peakIso = `${tightest.day}T12:00:00.000Z`
        // 마이너 어스펙트는 task spec 의 fixed polarity 사용. 메이저는 행성
        // benefic/malefic 와 angle harmony 를 본 inferAspectPolarity.
        const polarity: Polarity = MINOR_ASPECT_SET.has(sample.aspectType)
          ? (MINOR_POLARITY_OVERRIDE[sample.aspectType] ?? 0)
          : inferAspectPolarity(sample.aspectType, sample.transitPlanet, sample.natalPoint)
        const layer: SignalLayer = transitLayer(sample.transitPlanet)

        signals.push({
          id: `astro.transit.${key}.${startDay}`,
          source: 'astro',
          kind: 'transit',
          name: `${sample.transitPlanet} ${aspectSymbol(sample.aspectType)} ${sample.natalPoint}`,
          korean:
            aspectFlowLine(sample.transitPlanet, sample.natalPoint, sample.aspectType, 'ko') ||
            `${sample.transitPlanet} ${aspectKorean(sample.aspectType)} 본명 ${sample.natalPoint}`,
          english:
            aspectFlowLine(sample.transitPlanet, sample.natalPoint, sample.aspectType, 'en') ||
            `${sample.transitPlanet} ${aspectSymbol(sample.aspectType)} natal ${sample.natalPoint}`,
          polarity,
          layer,
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: weightForTransit(sample.transitPlanet, sample.aspectType, tightest.value),
          evidence: {
            module: 'astro-transit',
            aspectType: sample.aspectType,
            orbDegrees: tightest.value,
            planets: [sample.transitPlanet, sample.natalPoint],
            detail: { segmentDays: dayDiff(startDay, endDay) + 1 },
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

const SLOW_PLANETS = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
const MEDIUM_PLANETS = new Set(['Jupiter', 'Mars'])
function transitLayer(planet: string): SignalLayer {
  if (SLOW_PLANETS.has(planet)) return 'yearly'
  if (MEDIUM_PLANETS.has(planet)) return 'monthly'
  return 'daily'
}

const ASPECT_BASE_WEIGHT: Record<string, number> = {
  conjunction: 1.0,
  opposition: 0.95,
  trine: 0.85,
  square: 0.9,
  sextile: 0.7,
  quincunx: 0.6,
  semisextile: 0.4,
  // 마이너 어스펙트는 base weight 작게 — orb 1.5° cap 까지 좁혀 둔 만큼
  // 메이저 트랜짓 신호를 묻지 않도록 (calendar 매트릭스의 score blend 기준).
  quintile: 0.45,
  biquintile: 0.4,
  sesquiquadrate: 0.45,
}
const PLANET_WEIGHT: Record<string, number> = {
  Sun: 0.85,
  Moon: 0.7,
  Mercury: 0.6,
  Venus: 0.7,
  Mars: 0.85,
  Jupiter: 0.95,
  Saturn: 1.0,
  Uranus: 1.0,
  Neptune: 1.0,
  Pluto: 1.0,
}
function weightForTransit(planet: string, aspect: string, orb: number): number {
  const aspectW = ASPECT_BASE_WEIGHT[aspect] ?? 0.5
  const planetW = PLANET_WEIGHT[planet] ?? 0.5
  const tightnessW = Math.max(0.4, 1 - orb / 6)
  return Math.min(1, aspectW * planetW * tightnessW)
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
        quincunx: '⚻',
        semisextile: '⚺',
        quintile: 'Q',
        biquintile: 'bQ',
        sesquiquadrate: '⚼',
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
        quincunx: '퀸컹스',
        semisextile: '세미섹스타일',
        quintile: '퀸타일',
        biquintile: '바이퀸타일',
        sesquiquadrate: '세스퀴쿼드러트',
      } as Record<string, string>
    )[a] ?? a
  )
}

export default astroTransitExtractor
