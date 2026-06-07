import { calculateSecondaryProgressions } from '@/lib/astrology/foundation/progressions'
import { shortestAngle } from '@/lib/astrology/foundation/utils'
import type { AspectType, Chart } from '@/lib/astrology/foundation/types'
import type { ActiveSignal, ExtractorContext, SignalExtractor, Polarity } from '../types'
import { inferAspectPolarity } from '../themes/tagger'
import { aspectFlowLine, pointKo } from '../data/astroFlow'

/**
 * 2차 진행법 (Secondary Progressions) 추출기.
 *
 * "1日 = 1年" 룰. 현대 점성술의 핵심 timing 기법.
 * 매월 진행 차트를 계산하고 진행 행성들이 본명 행성과 어떤 어스펙트를 만드는지 추적.
 *
 * 신호 종류:
 *  - 진행 달  (orb 1.5°, weight 0.65/0.45) — 본명 행성에 닿을 때 감정·내면 결.
 *    메이저 5종 + 마이너 5종 (semisextile/quincunx/quintile/biquintile/sesquiquadrate).
 *  - 진행 태양 (orb 0.5°, weight 0.80) — 가장 천천히, 정체성·성장 결.
 *  - 진행 수성 (orb 1.0°, weight 0.65) — 소통·결정 결.
 *  - 진행 금성 (orb 1.0°, weight 0.65) — 관계·가치 결.
 *  - 진행 화성 (orb 1.0°, weight 0.55) — 행동·욕구 결.
 *
 * 활성 윈도우: 진행 달은 1달에 약 1° 움직이므로 한 어스펙트가 ±2~3개월 활성.
 * 진행 태양/수성/금성/화성은 1년에 약 1° → 한 어스펙트가 수개월~1년 이상 활성.
 *
 * 주: foundation 의 `findProgressedMoonAspects` 는 angle ≤ 3° 으로만 필터해
 * conjunction 만 정상 동작 → 마이너 어스펙트는 절대 노출되지 않는다. 따라서
 * 진행 달은 다른 호출자 영향 없이 이 추출기에서 inline 으로 진행달 → 본명 행성
 * 각도를 직접 계산해 메이저+마이너로 분류한다.
 */

// 진행 달은 기존 orb 유지 — 변별력 보존 (이전 동작 호환)
const MOON_ORB_DEG = 1.5

// 진행 행성별 orb 와 weight (느린 행성일수록 정확한 컨택을 요구)
const PROG_INNER_PLANETS: Record<string, { orb: number; weight: number }> = {
  Sun: { orb: 0.5, weight: 0.8 },
  Mercury: { orb: 1.0, weight: 0.65 },
  Venus: { orb: 1.0, weight: 0.65 },
  Mars: { orb: 1.0, weight: 0.55 },
}

type MajorAspect = 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition'

// 진행 달 전용: 메이저 5종 + 마이너 5종 후보. 가장 가까운 후보로 분류.
const MOON_ASPECT_CANDIDATES: ReadonlyArray<{ aspect: AspectType; exact: number }> = [
  { aspect: 'conjunction', exact: 0 },
  { aspect: 'semisextile', exact: 30 },
  { aspect: 'sextile', exact: 60 },
  { aspect: 'quintile', exact: 72 },
  { aspect: 'square', exact: 90 },
  { aspect: 'trine', exact: 120 },
  { aspect: 'sesquiquadrate', exact: 135 },
  { aspect: 'biquintile', exact: 144 },
  { aspect: 'quincunx', exact: 150 },
  { aspect: 'opposition', exact: 180 },
]

const MINOR_ASPECT_SET = new Set<AspectType>([
  'semisextile',
  'quincunx',
  'quintile',
  'biquintile',
  'sesquiquadrate',
])

// task spec 의 마이너 polarity 값. Polarity 가 정수(−3..3) 라 round-half-away-from-zero.
// semisextile 0 → 0, quincunx -0.5 → -1, quintile/biquintile +0.5 → +1,
// sesquiquadrate -0.3 → -1 (작은 긴장 신호를 0 으로 묻기보다 -1 로 노출).
const MINOR_POLARITY_OVERRIDE: Record<string, Polarity> = {
  semisextile: 0,
  quincunx: -1,
  quintile: 1,
  biquintile: 1,
  sesquiquadrate: -1,
}

const astroProgressionExtractor: SignalExtractor = {
  source: 'astro',
  kind: ['progression', 'progressed-moon'],
  async extract(ctx: ExtractorContext): Promise<ActiveSignal[]> {
    const { natal, range, cache } = ctx
    const signals: ActiveSignal[] = []
    const start = new Date(range.start)
    const end = new Date(range.end)

    // 매월 1일 진행 차트 계산
    let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1))
    while (cursor <= end) {
      const targetIso = cursor.toISOString()
      const cacheKey = `progression:${targetIso}:${natal.input.year}-${natal.input.month}-${natal.input.date}`
      let progressed =
        cache.get<Awaited<ReturnType<typeof calculateSecondaryProgressions>>>(cacheKey)
      if (!progressed) {
        try {
          progressed = await calculateSecondaryProgressions({
            natal: natal.input,
            targetDate: targetIso,
          })
          cache.set(cacheKey, progressed)
        } catch {
          // silent
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
          continue
        }
      }

      const monthEnd = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0, 23, 59, 59)
      )
      const startIso = cursor.toISOString()
      const endIso = monthEnd.toISOString()
      const peakIso = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), 15)
      ).toISOString()
      const monthKey = cursor.toISOString().slice(0, 7)

      // 1) 진행 달 → 본명 어스펙트 (메이저 5종 + 마이너 5종)
      // foundation 의 findProgressedMoonAspects 는 angle ≤ 3° 만 필터해 conjunction
      // 만 노출 → 마이너가 절대 surface 되지 않으므로 여기서 inline 으로 계산한다.
      const progressedMoon = progressed.planets.find((p) => p.name === 'Moon')
      const natalPlanets = natal.astro.chart.planets ?? []
      if (progressedMoon) {
        for (const target of natalPlanets) {
          const angle = shortestAngle(progressedMoon.longitude, target.longitude)
          const classified = classifyMoonAngle(angle, MOON_ORB_DEG)
          if (!classified) continue
          const isMinor = MINOR_ASPECT_SET.has(classified.aspect)
          const polarity: Polarity = isMinor
            ? (MINOR_POLARITY_OVERRIDE[classified.aspect] ?? 0)
            : inferAspectPolarity(classified.aspect, 'Moon', target.name)
          signals.push({
            id: `astro.progressed-moon.${monthKey}.${classified.aspect}.${target.name}`,
            source: 'astro',
            kind: 'progressed-moon',
            name: `Prog Moon ${classified.aspect} ${target.name}`,
            korean:
              aspectFlowLine('Moon', target.name, classified.aspect, 'ko', '진행달') ||
              `진행달 ${classified.aspect} 본명 ${target.name}`,
            english:
              aspectFlowLine('Moon', target.name, classified.aspect, 'en', 'Progressed Moon') ||
              `Prog Moon ${classified.aspect} natal ${target.name}`,
            themes: [],
            polarity,
            layer: 'monthly',
            active: { start: startIso, peak: peakIso, end: endIso },
            // 마이너 신호는 base weight 살짝 낮게 (메이저 신호 묻지 않도록).
            weight: (isMinor ? 0.45 : 0.65) * Math.max(0.4, 1 - classified.orb / MOON_ORB_DEG),
            evidence: {
              module: 'astro-progression',
              aspectType: classified.aspect,
              orbDegrees: classified.orb,
              planets: ['Moon', target.name],
              detail: { progressionType: 'secondary', progressedBody: 'Moon' },
            },
          })
        }
      }

      // 2) 진행 태양/수성/금성/화성 → 본명 행성·ASC·MC 어스펙트
      for (const [progName, cfg] of Object.entries(PROG_INNER_PLANETS)) {
        const hits = findProgressedPlanetAspects(progressed, natal.astro.chart, progName, cfg.orb)
        for (const hit of hits) {
          const polarity = computeProgPolarity(hit.aspect, progName, hit.target)
          // 태양은 위층(yearly), 나머지는 monthly 로 분류
          const layer = progName === 'Sun' ? 'yearly' : 'monthly'
          signals.push({
            id: `astro.progression.${progName}.${monthKey}.${hit.aspect}.${hit.target}`,
            source: 'astro',
            kind: 'progression',
            name: `Prog ${progName} ${hit.aspect} ${hit.target}`,
            korean:
              aspectFlowLine(progName, hit.target, hit.aspect, 'ko', `진행 ${pointKo(progName)}`) ||
              `진행 ${pointKo(progName)} ${hit.aspect} 본명 ${pointKo(hit.target)}`,
            english:
              aspectFlowLine(progName, hit.target, hit.aspect, 'en', `progressed ${progName}`) ||
              `Prog ${progName} ${hit.aspect} natal ${hit.target}`,
            themes: [],
            polarity,
            layer,
            active: { start: startIso, peak: peakIso, end: endIso },
            weight: cfg.weight * Math.max(0.4, 1 - hit.orb / cfg.orb),
            evidence: {
              module: 'astro-progression',
              aspectType: hit.aspect,
              orbDegrees: hit.orb,
              planets: [progName, hit.target],
              detail: { progressionType: 'secondary', progressedBody: progName },
            },
          })
        }
      }

      cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))
    }

    return signals
  },
}

/**
 * 진행 차트의 한 행성과 본명 차트(행성 + ASC + MC) 사이의 메이저 어스펙트 검사.
 *
 * `findProgressedMoonAspects` 가 raw 각도만 돌려주는 것과 달리, 여기서는 5개의
 * 메이저 어스펙트(conjunction/sextile/square/trine/opposition) 를 직접 분류하여
 * 행성별 orb 안의 어스펙트만 반환한다.
 */
function findProgressedPlanetAspects(
  progressed: Chart,
  natal: Chart,
  progPlanetName: string,
  orbDeg: number
): Array<{ target: string; aspect: MajorAspect; orb: number }> {
  const progPlanet = progressed.planets.find((p) => p.name === progPlanetName)
  if (!progPlanet) return []

  const natalPoints: Array<{ name: string; longitude: number }> = [
    ...natal.planets.map((p) => ({ name: p.name, longitude: p.longitude })),
    { name: 'Ascendant', longitude: natal.ascendant.longitude },
    { name: 'MC', longitude: natal.mc.longitude },
  ]

  const out: Array<{ target: string; aspect: MajorAspect; orb: number }> = []
  for (const point of natalPoints) {
    const diff = (((progPlanet.longitude - point.longitude) % 360) + 360) % 360
    const angle = Math.min(diff, 360 - diff)
    const classified = classifyAngle(angle, orbDeg)
    if (classified) {
      out.push({ target: point.name, aspect: classified.aspect, orb: classified.orb })
    }
  }
  return out
}

/**
 * 진행 행성 어스펙트의 polarity.
 *
 * 진행 행성은 본명 점에 도착하는 "주체" 결로, 본명 행성의 길흉이 톤을 좌우한다.
 * 작업 명세:
 *  - conjunction: 본명 길성(Sun/Jupiter/Venus) → +1, 흉성(Mars/Saturn) → -1, 그 외 0
 *  - trine/sextile: +0.5 → 1 (Polarity 정수형이라 1 로 라운드)
 *  - square: -0.5 → -1
 *  - opposition: -1 (대조 결)
 *
 * inferAspectPolarity 와 다른 룰(주체가 본명 점에 가져오는 톤 vs 두 점의 길흉 결합)
 * 이라 별도 함수.
 */
function computeProgPolarity(
  aspect: MajorAspect,
  _progPlanet: string,
  natalTarget: string
): Polarity {
  if (aspect === 'conjunction') {
    if (NATAL_BENEFICS.has(natalTarget)) return 1
    if (NATAL_MALEFICS.has(natalTarget)) return -1
    return 0
  }
  if (aspect === 'trine' || aspect === 'sextile') return 1
  if (aspect === 'square') return -1
  if (aspect === 'opposition') return -1
  return 0
}

const NATAL_BENEFICS = new Set(['Sun', 'Jupiter', 'Venus'])
const NATAL_MALEFICS = new Set(['Mars', 'Saturn'])

/**
 * 진행 달 전용: 0~180° 각도를 메이저+마이너 aspect 로 분류.
 * orbDeg 안쪽이면 가장 가까운 후보(가장 작은 orb)를 반환한다.
 */
function classifyMoonAngle(
  angle: number,
  orbDeg: number
): { aspect: AspectType; orb: number } | null {
  let best: { aspect: AspectType; orb: number } | null = null
  for (const c of MOON_ASPECT_CANDIDATES) {
    const orb = Math.abs(angle - c.exact)
    if (orb <= orbDeg && (best === null || orb < best.orb)) {
      best = { aspect: c.aspect, orb }
    }
  }
  return best
}

/**
 * 0~180° 각도를 메이저 aspect 종류로 분류. orb 는 정확한 각도와의 차이.
 */
function classifyAngle(angle: number, orbDeg: number): { aspect: MajorAspect; orb: number } | null {
  const candidates: Array<{ aspect: MajorAspect; exact: number }> = [
    { aspect: 'conjunction', exact: 0 },
    { aspect: 'sextile', exact: 60 },
    { aspect: 'square', exact: 90 },
    { aspect: 'trine', exact: 120 },
    { aspect: 'opposition', exact: 180 },
  ]
  for (const c of candidates) {
    const orb = Math.abs(angle - c.exact)
    if (orb <= orbDeg) return { aspect: c.aspect, orb }
  }
  return null
}

export default astroProgressionExtractor

// ── 테스트용 내부 헬퍼 export (외부 호출자는 default extractor 만 쓸 것) ──
export const __test = {
  findProgressedPlanetAspects,
  computeProgPolarity,
  classifyAngle,
  classifyMoonAngle,
  MINOR_ASPECT_SET,
  MINOR_POLARITY_OVERRIDE,
  PROG_INNER_PLANETS,
  NATAL_BENEFICS,
  NATAL_MALEFICS,
}
