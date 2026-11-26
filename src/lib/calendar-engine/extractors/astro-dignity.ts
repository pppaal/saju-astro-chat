import {
  dignityOf,
  triplicityOf,
  termOf,
  faceOf,
  dignityTiers,
  dignityScore,
} from '@/lib/astrology/foundation/dignities'
import type { Chart, PlanetBase } from '@/lib/astrology/foundation/types'
import type {
  ActiveSignal,
  ExtractorContext,
  SignalExtractor,
  Polarity,
  SignalLayer,
} from '../types'
import { getCachedTransitChart } from '../ephe-cache'
import { PLANET_KO } from '../data/planetNames'
import { formatLongitude } from '@/lib/astrology/foundation/utils'
import {
  dayDiff,
  extendRun,
  maxDailyMotion,
  noonPlanetPosition,
  rangeDays,
  shiftDay,
  type RunSample,
} from './shared/noonRuns'
import { SIGN_KO } from '@/lib/astrology/signLabels'
import { civilYearWindows } from './shared/natalWindows'

/** 영문 행성/별자리 → 한글 (없으면 원문). ko 라벨에 영어가 새지 않게. */
const koPlanet = (p: string): string => PLANET_KO[p] ?? p
const koSign = (s: string): string => SIGN_KO[s] ?? s

/**
 * 행성 품위 (Essential Dignity) 추출기 — 5-tier (Hellenistic).
 *
 * 기존 4-tier (도미사일/엑잘트/디트리먼트/폴) 위에 헬레니즘 minor dignity
 * (Triplicity / Term / Face) 를 추가했다. 트랜짓 행성이 자기 dignity 사인/구간
 * 에 들어갈 때 신호를 만들고, 같은 행성·dignity·sign·tier 가 유지되는 동안
 * 한 개 신호로 묶는다.
 *
 * polarity 매핑:
 *   major:  domicile +2 / exaltation +3 / detriment -2 / fall -3
 *   minor:  triplicity / term / face 매칭 시 +1 (weight 로 강도 조절:
 *           triplicity 0.5 / term 0.3 / face 0.2)
 *
 * 본명 행성(natal planets)도 한 번 평가해 본명 5-tier Almuten 스냅샷 신호로
 * 같이 내보낸다 (kind 'natal-dignity', layer: 'yearly', 활성 윈도우 = 범위에 닿는 민용 연도
 * 각각 — 범위와 무관한 창·id). 출생 차트의 고정 사실이라 교차 부모가 아니고(재감사 CC-2)
 * 정적 본명(STATIC_NATAL_KINDS)이라 점수에도 들지 않는다.
 *
 * 창은 그 품위가 이어지는 *연속 정오 전체*다 — 범위 가장자리에 닿은 구간은 천체력으로
 * 범위 밖까지 이어 사인·텀·데칸 진입/이탈 정오를 찾는다(shared/noonRuns, 엔진 감사 X1).
 * 예전엔 범위에서 잘려 1일 빌드에서 한 달짜리 품위가 정오 한 순간이 돼, 그날 다른 시진과
 * 만드는 교차가 월 빌드와 갈렸다.
 */

type DignityTier = 'major' | 'triplicity' | 'term' | 'face'

/** 그 사인·도(정수)에서 이 행성의 tier 가 켜져 있나 — 인-범위 판정과 같은 함수. */
function tierActive(
  tier: DignityTier,
  planet: string,
  sign: string,
  degree: number,
  dayBirth: boolean | null,
  dignity?: string
): boolean {
  switch (tier) {
    case 'major':
      return dignityOf(planet, sign) === dignity
    case 'triplicity':
      return triplicityOf(planet, sign, dayBirth) !== null
    case 'term':
      return termOf(planet, sign, degree) !== null
    case 'face':
      return faceOf(planet, sign, degree) !== null
  }
}

/**
 * 범위 가장자리에 닿은 품위 구간을 범위 밖으로 잇는다 — (startDay, endDay).
 * 같은 사인 안에서 그 tier 가 켜진 정수 도 구간이 '영역'이고(경계는 모두 정수 도),
 * 행성이 영역 경계까지 남은 각도 / 하루 최대 이동 일수만큼 한 번에 건너뛴다.
 */
function dignityRunBounds(args: {
  tier: DignityTier
  planet: string
  sign: string
  dignity?: string
  segStartDay: string
  segEndDay: string
  firstDay: string
  lastDay: string
  dayBirth: boolean | null
  timeZone: string
}): { startDay: string; endDay: string } {
  const { tier, planet, sign, dignity, dayBirth, timeZone } = args
  let startDay = args.segStartDay
  let endDay = args.segEndDay
  if (startDay !== args.firstDay && endDay !== args.lastDay) return { startDay, endDay }

  const vmax = maxDailyMotion(planet)
  // 그 날 정오에 이 tier·사인이 켜져 있으면 황경, 아니면 null.
  const lonOn = (dayIso: string): RunSample | null => {
    const pos = noonPlanetPosition(planet, dayIso, timeZone)
    if (!pos) return null
    const f = formatLongitude(pos.longitude)
    if (f.sign !== sign) return null
    return tierActive(tier, planet, f.sign, f.degree, dayBirth, dignity)
      ? { day: dayIso, value: f.norm }
      : null
  }
  const regionOf = (anchorLon: number): { lo: number; hi: number } => {
    const signIdx = Math.floor(anchorLon / 30)
    const deg = Math.floor(anchorLon - signIdx * 30)
    let dLo = deg
    let dHi = deg
    while (dLo > 0 && tierActive(tier, planet, sign, dLo - 1, dayBirth, dignity)) dLo--
    while (dHi < 29 && tierActive(tier, planet, sign, dHi + 1, dayBirth, dignity)) dHi++
    return { lo: signIdx * 30 + dLo, hi: signIdx * 30 + dHi + 1 }
  }
  const extend = (anchorDay: string, direction: -1 | 1): string => {
    const anchor = lonOn(anchorDay)
    if (anchor === null) return anchorDay
    const { lo, hi } = regionOf(anchor.value)
    return extendRun({
      anchor,
      direction,
      vmax,
      sampleOn: lonOn,
      marginOf: (x) => Math.min(x.value - lo, hi - x.value),
    }).edgeDay
  }
  if (startDay === args.firstDay) startDay = extend(startDay, -1)
  if (endDay === args.lastDay) endDay = extend(endDay, 1)
  return { startDay, endDay }
}

/** 날짜순 hit 을 하루 간격(≤1.5일)으로 이어진 구간들로 나눈다. */
function splitDaily<T extends { iso: string }>(group: T[]): T[][] {
  group.sort((a, b) => a.iso.localeCompare(b.iso))
  const segments: T[][] = []
  let current: T[] = []
  for (const h of group) {
    if (current.length === 0) {
      current.push(h)
      continue
    }
    const gap =
      (new Date(h.iso).getTime() - new Date(current[current.length - 1].iso).getTime()) / 86_400_000
    if (gap <= 1.5) current.push(h)
    else {
      segments.push(current)
      current = [h]
    }
  }
  if (current.length) segments.push(current)
  return segments
}

const DIGNITY_POLARITY: Record<string, Polarity> = {
  domicile: 2,
  exaltation: 3,
  detriment: -2,
  fall: -3,
  peregrine: 0, // 무권 — skip
}

const DIGNITY_LABEL: Record<string, string> = {
  domicile: '도미사일 (자기 자리)',
  exaltation: '엑잘테이션 (고양)',
  detriment: '디트리먼트 (반대 자리)',
  fall: '폴 (추락)',
}

const DIGNITY_LABEL_EN: Record<string, string> = {
  domicile: 'Domicile (home sign)',
  exaltation: 'Exaltation',
  detriment: 'Detriment',
  fall: 'Fall',
}

const DIGNITY_FLOW_EN: Record<string, string> = {
  domicile: 'operates at full natural strength',
  exaltation: 'is honoured and elevated — at its best',
  detriment: 'works against its nature — strained',
  fall: 'is weakened and out of place',
}

const SLOW = new Set(['Saturn', 'Uranus', 'Neptune', 'Pluto'])
const MEDIUM = new Set(['Jupiter', 'Mars'])

// Hellenistic 정통: 외행성 + non-traditional points 는 essential dignity 보유 X.
// 이 추출기는 traditional 7행성에 한해서만 dignity 신호를 emit.
const TRADITIONAL_PLANETS = new Set([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
])
const DIGNITY_BLOCKED = new Set([
  'Uranus',
  'Neptune',
  'Pluto',
  'True Node',
  'Mean Node',
  'Chiron',
  'Lilith',
])

const astroDignityExtractor: SignalExtractor = {
  source: 'astro',
  // 트랜짓 품위는 transit 카테고리에 묶고, 본명 Almuten 스냅샷은 정적 본명 kind 'natal-dignity'
  // (STATIC_NATAL_KINDS — 점수·근거 사다리·수렴 제외, 서사에는 남음).
  kind: ['transit', 'natal-dignity'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const start = new Date(range.start)
    const end = new Date(range.end)
    // 섹트 미상(null, OD-5)이면 낮/밤 삼분성 지배성을 고를 수 없다 — 참여 지배성만 센다.
    const sect = natal.astro.sect
    const dayBirth: boolean | null = sect === null ? null : sect === 'day'

    // 매일 정오의 차트에서 각 행성의 dignity 추출 → 연속 구간 묶기
    type Hit = {
      iso: string
      planet: string
      sign: string
      degree: number
      dignity: string
      // minor tier matches (planet IS the ruler of that minor tier here)
      triplicity: boolean
      term: boolean
      face: boolean
    }
    const hits: Hit[] = []
    for (let t = start.getTime(); t <= end.getTime(); t += 86_400_000) {
      // noonIso: 차트 계산용(location timeZone wall-clock). tz suffix 금지.
      const noonIso = new Date(t).toISOString().slice(0, 10) + 'T12:00:00'
      // windowIso: hit/active window 저장용 — 동일 wall-clock + 명시적 `Z` 로
      // downstream new Date() 파싱을 서버 TZ 무관 UTC 정오로 고정 (현지 날짜 버킷 유지).
      const windowIso = noonIso + '.000Z'
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

      for (const p of chart.planets) {
        const sign = p.sign
        if (!sign) continue
        // Hellenistic 정통: 외행성·노드·Chiron·Lilith 는 dignity 미부여 → skip.
        // 단 transit/position 자체는 다른 모듈에서 활용 유지 (여기서만 emit 차단).
        if (DIGNITY_BLOCKED.has(p.name)) continue
        if (!TRADITIONAL_PLANETS.has(p.name)) continue
        const d = dignityOf(p.name, sign)
        const trip = triplicityOf(p.name, sign, dayBirth) !== null
        const term = termOf(p.name, sign, p.degree) !== null
        const face = faceOf(p.name, sign, p.degree) !== null
        // peregrine + no minor tier match → skip (truly no rulership)
        if (d === 'peregrine' && !trip && !term && !face) continue
        hits.push({
          iso: windowIso,
          planet: p.name,
          sign,
          degree: p.degree,
          dignity: d,
          triplicity: trip,
          term,
          face,
        })
      }
    }

    // (planet, dignity, sign) 키로 연속 구간 묶기 — major dignity 신호
    const byKey = new Map<string, Hit[]>()
    for (const h of hits) {
      if (h.dignity === 'peregrine') continue
      const key = `${h.planet}|${h.dignity}|${h.sign}`
      const arr = byKey.get(key) ?? []
      arr.push(h)
      byKey.set(key, arr)
    }

    const days = rangeDays(range)
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    const timeZone = natal.astro.location.timeZone
    const runOf = (
      seg: Hit[],
      tier: DignityTier,
      dignity?: string
    ): { startIso: string; endIso: string; peakIso: string; days: number } => {
      const { startDay, endDay } = dignityRunBounds({
        tier,
        planet: seg[0].planet,
        sign: seg[0].sign,
        dignity,
        segStartDay: seg[0].iso.slice(0, 10),
        segEndDay: seg[seg.length - 1].iso.slice(0, 10),
        firstDay,
        lastDay,
        dayBirth,
        timeZone,
      })
      const len = dayDiff(startDay, endDay) + 1
      return {
        startIso: `${startDay}T12:00:00.000Z`,
        endIso: `${endDay}T12:00:00.000Z`,
        peakIso: `${shiftDay(startDay, Math.floor(len / 2))}T12:00:00.000Z`,
        days: len,
      }
    }

    const signals: ActiveSignal[] = []
    for (const [key, group] of byKey) {
      for (const seg of splitDaily(group)) {
        const sample = seg[0]
        const polarity = DIGNITY_POLARITY[sample.dignity] ?? 0
        if (polarity === 0) continue
        const {
          startIso,
          endIso,
          peakIso,
          days: durationDays,
        } = runOf(seg, 'major', sample.dignity)

        signals.push({
          id: `astro.dignity.${key}.${startIso.slice(0, 10)}`,
          source: 'astro',
          kind: 'transit',
          name: `${sample.planet} ${DIGNITY_LABEL[sample.dignity]} in ${sample.sign}`,
          korean: `${koPlanet(sample.planet)} ${DIGNITY_LABEL[sample.dignity]} (${koSign(sample.sign)})`,
          english: `${sample.planet} in ${DIGNITY_LABEL_EN[sample.dignity] ?? sample.dignity} (${sample.sign}) — ${DIGNITY_FLOW_EN[sample.dignity] ?? ''}`,
          polarity,
          layer: planetLayer(sample.planet),
          active: { start: startIso, peak: peakIso, end: endIso },
          weight: 0.7,
          evidence: {
            module: 'astro-dignity',
            planets: [sample.planet],
            detail: {
              dignity: sample.dignity,
              sign: sample.sign,
              durationDays,
            },
          },
        })
      }
    }

    // ── Minor dignity signals (triplicity / term / face) ──
    // 같은 (planet, sign, tier) 가 연속되는 구간을 한 신호로 묶음.
    for (const tier of ['triplicity', 'term', 'face'] as const) {
      const tierKey = new Map<string, Hit[]>()
      for (const h of hits) {
        if (!h[tier]) continue
        const key = `${h.planet}|${tier}|${h.sign}`
        const arr = tierKey.get(key) ?? []
        arr.push(h)
        tierKey.set(key, arr)
      }
      for (const [key, group] of tierKey) {
        for (const seg of splitDaily(group)) {
          const sample = seg[0]
          const { startIso, endIso, peakIso, days: durationDays } = runOf(seg, tier)
          const polarity: Polarity = 1 // minor positive — +1 step (실 값은 weight 로 조절)
          const weight = tier === 'triplicity' ? 0.5 : tier === 'term' ? 0.3 : 0.2
          const label =
            tier === 'triplicity'
              ? '트리플리시티 (Triplicity)'
              : tier === 'term'
                ? '텀 (Term/Bound)'
                : '페이스 (Face/Decan)'
          const labelEn =
            tier === 'triplicity' ? 'Triplicity' : tier === 'term' ? 'Term/Bound' : 'Face/Decan'

          signals.push({
            id: `astro.dignity.${key}.${startIso.slice(0, 10)}`,
            source: 'astro',
            kind: 'transit',
            name: `${sample.planet} ${label} in ${sample.sign}`,
            korean: `${koPlanet(sample.planet)} ${label} (${koSign(sample.sign)})`,
            english: `${sample.planet} in minor dignity ${labelEn} (${sample.sign}) — a mild supportive placement`,
            polarity,
            layer: planetLayer(sample.planet),
            active: { start: startIso, peak: peakIso, end: endIso },
            weight,
            evidence: {
              module: 'astro-dignity',
              planets: [sample.planet],
              detail: {
                dignity: tier,
                sign: sample.sign,
                durationDays,
              },
            },
          })
        }
      }
    }

    // ── Natal Almuten snapshot — 본명 5-tier 합산. 범위에 닿는 *민용 연도* 마다 한 신호로
    //    깔리는 배경 신호(yearly). 본명 행성이 자기 사인의 minor dignity ruler 인 경우만 노출.
    //    창·id 는 (본명, 연도) 만의 함수 — 예전엔 창 = 빌드 범위라 1일 빌드와 월 빌드의 id·창이
    //    갈렸다(재감사 CC-7). 출생 차트의 고정 사실이라 교차 부모는 아니고(cross-activation,
    //    재감사 CC-2), kind 'natal-dignity'(STATIC_NATAL_KINDS)라 일 점수·근거 사다리·수렴에도
    //    들지 않는다 — docs/운흐름.md §0.5.8 '일부러 제외: dignity(본명) · Almuten'.
    const almutenYears = civilYearWindows(range)
    const natalPlanets = natal.astro.chart.planets ?? []
    for (const p of natalPlanets) {
      if (!p.sign) continue
      // Hellenistic 정통: 외행성·노드·키론·릴리스 — natal Almuten 도 emit 안 함.
      if (DIGNITY_BLOCKED.has(p.name)) continue
      if (!TRADITIONAL_PLANETS.has(p.name)) continue
      const tiers = dignityTiers(p.name, p.sign, p.degree, sect)
      const matchedMinor: string[] = []
      if (tiers.triplicity) matchedMinor.push('triplicity')
      if (tiers.term) matchedMinor.push('term')
      if (tiers.face) matchedMinor.push('face')
      if (matchedMinor.length === 0) continue

      const score = dignityScore(tiers)
      // polarity 매핑: 점수 부호 → ±1/±2 step
      const polarity: Polarity =
        score >= 1.5 ? 2 : score >= 0.5 ? 1 : score <= -1.5 ? -2 : score <= -0.5 ? -1 : 0
      if (polarity === 0) continue

      for (const w of almutenYears) {
        const y = w.year
        signals.push({
          id: `astro.dignity.natal-almuten.${p.name}.${p.sign}.${matchedMinor.join('-')}.${y}`,
          source: 'astro',
          kind: 'natal-dignity',
          name: `Natal ${p.name} ${matchedMinor.join('+')} in ${p.sign}`,
          korean: `본명 ${koPlanet(p.name)} 5-tier 디그니티 (${koSign(p.sign)})`,
          polarity,
          layer: 'yearly',
          active: { start: w.start, peak: w.peak, end: w.end },
          weight: 0.4,
          evidence: {
            module: 'astro-dignity',
            planets: [p.name],
            detail: {
              dignity: 'natal-almuten',
              sign: p.sign,
              degree: p.degree,
              tiers,
              score,
            },
          },
        })
      }
    }

    return signals
  },
}

function planetLayer(planet: string): SignalLayer {
  if (SLOW.has(planet)) return 'yearly'
  if (MEDIUM.has(planet)) return 'monthly'
  return 'monthly'
}

export default astroDignityExtractor

// Re-export type for callers that want to inspect natal planets list
export type { PlanetBase }
