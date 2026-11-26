// src/lib/astrology/foundation/electional.ts
// 택일 점성학 - 최적의 시간 선택을 위한 규칙 엔진

import { Chart, PlanetBase, ZodiacKo, AspectType } from './types'
import { normalize360, shortestAngle } from './utils'
import { findNatalAspects } from './aspects'
import { getSwisseph } from './ephe'
import { getPlanetList, extractSwissLongitude } from './shared'
import { resolveBirthInstant } from '@/lib/datetime/resolveBirthInstant'

export type MoonPhase =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent'

export type ElectionalEventType =
  | 'business_start'
  | 'signing_contracts'
  | 'marriage'
  | 'engagement'
  | 'first_date'
  | 'surgery'
  | 'dental'
  | 'start_treatment'
  | 'long_journey'
  | 'moving_house'
  | 'investment'
  | 'buying_property'
  | 'major_purchase'
  | 'creative_start'
  | 'publishing'
  | 'starting_studies'
  | 'exam'
  | 'lawsuit'
  | 'court_appearance'

export interface VoidOfCourseInfo {
  isVoid: boolean
  moonSign: ZodiacKo
  lastAspect: { planet: string; type: AspectType; exactTime?: Date } | null
  voidStartTime?: Date
  voidEndTime?: Date
  hoursRemaining?: number
  description: string
}

export interface PlanetaryHour {
  planet: string
  dayRuler: string
  startTime: Date
  endTime: Date
  isDay: boolean
  goodFor: string[]
}

export interface ElectionalScore {
  total: number
  moonFactors: number
  planetaryAspects: number
  retrogradeIssues: number
  specialConsiderations: number
  breakdown: {
    moonPhaseAppropriate: number
    moonSignAppropriate: number
    moonNotVoid: number
    beneficAspectsPresent: number
    noMajorAfflictions: number
    mercuryDirect: number
    otherPlanetsDirect: number
    planetaryHourMatch: number
    noEclipse: number
  }
  interpretation: string
}

export interface ElectionalAnalysis {
  dateTime: Date
  eventType: ElectionalEventType
  score: ElectionalScore
  moonPhase: MoonPhase
  moonSign: ZodiacKo
  voidOfCourse: VoidOfCourseInfo
  currentHour: PlanetaryHour
  retrogradePlanets: string[]
  beneficAspects: string[]
  maleficAspects: string[]
  recommendations: string[]
  warnings: string[]
}

// 각 이벤트 유형에 대한 최적 조건
const EVENT_REQUIREMENTS: Record<
  ElectionalEventType,
  {
    bestMoonPhases: MoonPhase[]
    bestMoonSigns: ZodiacKo[]
    avoidMoonSigns?: ZodiacKo[]
    avoidRetrogrades: string[]
    beneficPlanets: string[]
    bestDays?: string[]
    bodyPartSigns?: ZodiacKo[]
  }
> = {
  business_start: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Taurus', 'Leo', 'Capricorn'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Jupiter', 'Sun'],
    bestDays: ['Thursday', 'Sunday'],
  },
  signing_contracts: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Gemini', 'Virgo', 'Libra', 'Capricorn'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Mercury', 'Saturn', 'Jupiter'],
    bestDays: ['Wednesday'],
  },
  marriage: {
    bestMoonPhases: ['first_quarter', 'waxing_gibbous', 'full_moon'],
    bestMoonSigns: ['Taurus', 'Cancer', 'Libra', 'Pisces'],
    avoidRetrogrades: ['Venus', 'Mercury'],
    beneficPlanets: ['Venus', 'Jupiter', 'Moon'],
    bestDays: ['Friday', 'Monday'],
  },
  engagement: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Libra', 'Taurus', 'Leo'],
    avoidRetrogrades: ['Venus', 'Mercury'],
    beneficPlanets: ['Venus', 'Jupiter'],
    bestDays: ['Friday'],
  },
  first_date: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Taurus', 'Libra', 'Leo', 'Pisces'],
    avoidRetrogrades: ['Venus'],
    beneficPlanets: ['Venus', 'Mars'],
    bestDays: ['Friday'],
  },
  surgery: {
    bestMoonPhases: ['waning_gibbous', 'last_quarter', 'waning_crescent'],
    bestMoonSigns: ['Virgo', 'Capricorn', 'Aquarius'],
    avoidMoonSigns: ['Aries', 'Taurus', 'Cancer', 'Leo', 'Scorpio'],
    avoidRetrogrades: ['Mars', 'Mercury'],
    beneficPlanets: ['Mars', 'Saturn'],
    bestDays: ['Tuesday', 'Saturday'],
  },
  dental: {
    bestMoonPhases: ['waning_gibbous', 'last_quarter', 'waning_crescent'],
    bestMoonSigns: ['Virgo', 'Capricorn', 'Sagittarius'],
    avoidMoonSigns: ['Taurus', 'Aries'],
    avoidRetrogrades: ['Mars'],
    beneficPlanets: ['Saturn'],
    bestDays: ['Saturday'],
  },
  start_treatment: {
    bestMoonPhases: ['new_moon', 'waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Virgo', 'Scorpio', 'Pisces'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Jupiter', 'Neptune'],
  },
  long_journey: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Sagittarius', 'Gemini', 'Aquarius'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Jupiter', 'Mercury'],
    bestDays: ['Thursday'],
  },
  moving_house: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Cancer', 'Taurus', 'Virgo'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Moon', 'Venus'],
    bestDays: ['Monday'],
  },
  investment: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Taurus', 'Capricorn', 'Scorpio'],
    avoidRetrogrades: ['Mercury', 'Jupiter'],
    beneficPlanets: ['Jupiter', 'Venus'],
    bestDays: ['Thursday'],
  },
  buying_property: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Taurus', 'Cancer', 'Capricorn'],
    avoidRetrogrades: ['Mercury', 'Venus'],
    beneficPlanets: ['Saturn', 'Jupiter', 'Moon'],
    bestDays: ['Saturday', 'Monday'],
  },
  major_purchase: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Taurus', 'Leo', 'Libra'],
    avoidRetrogrades: ['Venus', 'Mercury'],
    beneficPlanets: ['Venus', 'Jupiter'],
    bestDays: ['Friday'],
  },
  creative_start: {
    bestMoonPhases: ['new_moon', 'waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Pisces', 'Leo', 'Libra', 'Aquarius'],
    avoidRetrogrades: ['Mercury', 'Neptune'],
    beneficPlanets: ['Neptune', 'Venus'],
    bestDays: ['Friday', 'Monday'],
  },
  publishing: {
    bestMoonPhases: ['full_moon', 'waxing_gibbous'],
    bestMoonSigns: ['Sagittarius', 'Leo', 'Gemini'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Mercury', 'Jupiter'],
    bestDays: ['Wednesday', 'Thursday'],
  },
  starting_studies: {
    bestMoonPhases: ['new_moon', 'waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Aquarius'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Mercury', 'Jupiter'],
    bestDays: ['Wednesday'],
  },
  exam: {
    bestMoonPhases: ['first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Gemini', 'Virgo', 'Sagittarius', 'Capricorn'],
    avoidMoonSigns: ['Pisces', 'Scorpio'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Mercury', 'Jupiter'],
    bestDays: ['Wednesday'],
  },
  lawsuit: {
    bestMoonPhases: ['waxing_crescent', 'first_quarter'],
    bestMoonSigns: ['Aries', 'Libra', 'Capricorn'],
    avoidRetrogrades: ['Mercury', 'Jupiter'],
    beneficPlanets: ['Mars', 'Jupiter', 'Saturn'],
    bestDays: ['Tuesday', 'Thursday'],
  },
  court_appearance: {
    bestMoonPhases: ['first_quarter', 'waxing_gibbous'],
    bestMoonSigns: ['Libra', 'Capricorn', 'Sagittarius'],
    avoidRetrogrades: ['Mercury'],
    beneficPlanets: ['Mercury', 'Jupiter'],
  },
}

// 행성 시간 순서
const PLANETARY_HOUR_SEQUENCE = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']
const DAY_RULERS: Record<number, string> = {
  0: 'Sun', // Sunday
  1: 'Moon',
  2: 'Mars',
  3: 'Mercury',
  4: 'Jupiter',
  5: 'Venus',
  6: 'Saturn',
}

const PLANETARY_HOUR_USES: Record<string, string[]> = {
  Sun: ['리더십', '권위', '성공', '명예'],
  Moon: ['가정', '직관', '대중', '부동산'],
  Mercury: ['커뮤니케이션', '문서', '학습', '거래'],
  Venus: ['사랑', '예술', '아름다움', '재물'],
  Mars: ['경쟁', '운동', '수술', '용기'],
  Jupiter: ['확장', '교육', '법률', '해외'],
  Saturn: ['구조화', '장기 계획', '부동산', '제한'],
}

/**
 * 현재 문페이즈 계산
 */
export function getMoonPhase(sunLongitude: number, moonLongitude: number): MoonPhase {
  const angle = normalize360(moonLongitude - sunLongitude)

  if (angle < 45) {
    return 'new_moon'
  }
  if (angle < 90) {
    return 'waxing_crescent'
  }
  if (angle < 135) {
    return 'first_quarter'
  }
  if (angle < 180) {
    return 'waxing_gibbous'
  }
  if (angle < 225) {
    return 'full_moon'
  }
  if (angle < 270) {
    return 'waning_gibbous'
  }
  if (angle < 315) {
    return 'last_quarter'
  }
  return 'waning_crescent'
}

/**
 * 문페이즈 한글 이름
 */
export function getMoonPhaseName(phase: MoonPhase): string {
  const names: Record<MoonPhase, string> = {
    new_moon: '삭 (새달)',
    waxing_crescent: '초승달',
    first_quarter: '상현달',
    waxing_gibbous: '차오르는 달',
    full_moon: '보름달',
    waning_gibbous: '기우는 달',
    last_quarter: '하현달',
    waning_crescent: '그믐달',
  }
  return names[phase]
}

/**
 * VoC 애스펙트 대상 — 태양~명왕성 9행성. 노드(True/Mean Node)·ASC/MC·lot 같은 *점* 은 대상이
 * 아니다(전통·현대 정의 모두 행성만 — 재감사 AC-4: True Node 대립을 애스펙트로 세어 2026년
 * 보이드 정오의 약 1/5 을 놓쳤다).
 */
export const VOC_ASPECT_TARGETS = [
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const

/** 천체 황경 함수 — jdUT 순간의 황경(°). 모르면 null. */
export type BodyLongitudeAt = (planet: string, jdUT: number) => number | null

/** VoC 판정 애스펙트 — 프톨레마이오스 5각(0/60/90/120/180), 달 − 행성 분리각 기준 8개 지점. */
const VOC_ASPECT_POINTS: { angle: number; type: AspectType }[] = [
  { angle: 0, type: 'conjunction' },
  { angle: 60, type: 'sextile' },
  { angle: 90, type: 'square' },
  { angle: 120, type: 'trine' },
  { angle: 180, type: 'opposition' },
  { angle: 240, type: 'trine' },
  { angle: 270, type: 'square' },
  { angle: 300, type: 'sextile' },
]

/** 달의 최저 황경 속도(°/일) — 실측 최저 ~11.75 에 여유. 진입 탐색 상한을 정한다. */
const MOON_MIN_SPEED = 11.5
/** 진입 이분법 정밀도(일) — 1초. */
const INGRESS_TOLERANCE_DAYS = 1 / 86_400
/** 천체력 위치가 차트의 달과 이 각도(°) 넘게 다르면 차트가 그 순간의 것이 아니다 → 선형. */
const EPHEMERIS_AGREEMENT_DEG = 0.05
const JD_TO_MS = (jd: number) => (jd - 2440587.5) * 86_400_000

/** calculateTransitChart 와 같은 호출(swe_calc_ut, SEFLG_SPEED) — 값이 차트와 비트 단위로 같다. */
function ephemerisLongitudeAt(): BodyLongitudeAt | null {
  try {
    const sw = getSwisseph()
    if (typeof sw.swe_calc_ut !== 'function') return null
    const ids = getPlanetList()
    return (planet, jdUT) => {
      const id = ids[planet]
      if (typeof id !== 'number') return null
      const res = sw.swe_calc_ut(jdUT, id, sw.SEFLG_SPEED) as unknown
      if (!res || typeof res !== 'object') return null
      if (typeof (res as { error?: unknown }).error === 'string') return null
      try {
        return extractSwissLongitude(res)
      } catch {
        return null
      }
    }
  } catch {
    return null
  }
}

/**
 * Void of Course Moon 확인 (교리: docs/doctrine/astrology.md — 보이드 오브 코스).
 *
 * 차트 순간부터 달이 다음 사인에 *실제로* 들어갈 때까지, 달이 태양~명왕성(VOC_ASPECT_TARGETS)
 * 과 프톨레마이오스 애스펙트를 하나도 완성하지 않으면 보이드다.
 *  - 위치는 움직인다: 차트에 meta.jdUT 가 있고 천체력이 그 순간의 달을 재현하면 Swiss Ephemeris
 *    로 그 시각의 실제 위치를 읽는다(예전엔 행성을 정오 위치에 얼려 진입 직후 완성되는 애스펙트를
 *    진입 전으로 셌다). 천체력이 없거나 차트가 그 순간의 것이 아니면 차트 속도로 선형 이동.
 *  - 진입 = 달 황경이 다음 30° 배수에 닿는 순간, 이분법(1초). 예전엔 정오 속도로 선형 외삽해
 *    최대 44분 어긋났다(재감사 AC-4).
 *  - 애스펙트 완성 판정: 달은 어느 행성보다 빠르다(달 ≥ 11.7°/일, 행성 ≤ 2.8°/일) — 달 − 행성
 *    분리각이 차트 순간~진입 사이에서 단조 증가하므로, 두 끝의 실제 분리각 사이에 애스펙트 각이
 *    있으면 그 사이에 정확히 한 번 완성된다.
 *
 * @param longitudeAt 위치 함수 주입(테스트). 생략하면 Swiss Ephemeris.
 */
export function checkVoidOfCourse(chart: Chart, longitudeAt?: BodyLongitudeAt): VoidOfCourseInfo {
  const moon = chart.planets.find((p) => p.name === 'Moon')
  if (!moon) {
    return {
      isVoid: false,
      moonSign: 'Aries',
      lastAspect: null,
      hoursRemaining: 0,
      description: '달 정보 없음',
    }
  }

  const moonSign = moon.sign
  const signStart = Math.floor(moon.longitude / 30) * 30
  const t0 = chart.meta?.jdUT
  const base = t0 ?? 0

  // 차트 속도로 선형 이동 — 천체력을 못 쓸 때의 폴백(달 속도가 없으면 평균 13°/일).
  const moonSpeed = typeof moon.speed === 'number' && moon.speed > 0 ? moon.speed : 13
  const linear: BodyLongitudeAt = (planet, jd) => {
    const p = planet === 'Moon' ? moon : chart.planets.find((x) => x.name === planet)
    if (!p) return null
    const speed = planet === 'Moon' ? moonSpeed : (p.speed ?? 0)
    return normalize360(p.longitude + speed * (jd - base))
  }

  /** 달이 사인 시작에서 나아간 각도(°) — 진입 순간 30. */
  const progressOf = (at: BodyLongitudeAt, jd: number): number => {
    const lon = at('Moon', jd)
    return lon === null ? Number.NaN : normalize360(lon - signStart)
  }
  /** 다음 사인 진입 jd — 이분법. 달이 상한 안에 30° 를 못 채우면(위치 함수 이상) null. */
  const ingressOf = (at: BodyLongitudeAt, minSpeed: number): number | null => {
    const d0 = moon.longitude - signStart
    let lo = base
    let hi = base + (30 - d0) / minSpeed + 1 / 24
    const pHi = progressOf(at, hi)
    if (!(pHi >= 30 && pHi < 180)) return null
    while (hi - lo > INGRESS_TOLERANCE_DAYS) {
      const mid = (lo + hi) / 2
      if (progressOf(at, mid) >= 30) hi = mid
      else lo = mid
    }
    return hi
  }

  let at: BodyLongitudeAt = linear
  let ingressJd: number | null = null
  if (t0 !== undefined) {
    const eph = longitudeAt ?? ephemerisLongitudeAt()
    const moonNow = eph ? eph('Moon', t0) : null
    if (
      eph &&
      moonNow !== null &&
      shortestAngle(moonNow, moon.longitude) <= EPHEMERIS_AGREEMENT_DEG
    ) {
      ingressJd = ingressOf(eph, MOON_MIN_SPEED)
      if (ingressJd !== null) at = eph
    }
  }
  if (ingressJd === null) {
    at = linear
    ingressJd = base + (30 - (moon.longitude - signStart)) / moonSpeed
  }
  const hoursToSignChange = (ingressJd - base) * 24

  // 차트 순간~진입 사이에 완성되는 첫 애스펙트(달 − 행성 분리각이 애스펙트 각을 지나는 것).
  const moonEnd = at('Moon', ingressJd)
  let closestFutureAspect: { planet: string; fraction: number; type: AspectType } | null = null
  for (const name of VOC_ASPECT_TARGETS) {
    const planet = chart.planets.find((p) => p.name === name)
    if (!planet || moonEnd === null) continue
    const planetEnd = at(name, ingressJd)
    if (planetEnd === null) continue
    const rel0 = normalize360(moon.longitude - planet.longitude)
    // 진입까지 분리각이 늘어난 양 — 달이 더 빨라 늘 양수(< 180).
    const advance = normalize360(moonEnd - planetEnd - rel0 + 540) - 180
    if (!(advance > 0)) continue
    for (const { angle, type } of VOC_ASPECT_POINTS) {
      for (const x of [angle, angle + 360]) {
        if (x > rel0 && x < rel0 + advance) {
          const fraction = (x - rel0) / advance
          if (!closestFutureAspect || fraction < closestFutureAspect.fraction) {
            closestFutureAspect = { planet: name, fraction, type }
          }
        }
      }
    }
  }

  const isVoid = closestFutureAspect === null

  return {
    isVoid,
    moonSign,
    lastAspect: closestFutureAspect
      ? { planet: closestFutureAspect.planet, type: closestFutureAspect.type }
      : null,
    // 보이드의 끝 = 실제 사인 진입 순간(차트 순간을 알 때만).
    ...(isVoid && t0 !== undefined
      ? { voidEndTime: new Date(Math.round(JD_TO_MS(ingressJd))) }
      : {}),
    hoursRemaining: Number(hoursToSignChange.toFixed(2)),
    description: isVoid
      ? `달이 ${moonSign}에서 공전 중 (Void of Course) - ${Math.round(hoursToSignChange)}시간 후 사인 변경`
      : `달이 ${moonSign}에서 활성 - ${closestFutureAspect?.planet}과 애스펙트 예정`,
  }
}

// ── 일출·일몰과 행성일 ─────────────────────────────────────────────────────

const DAY_MS = 86_400_000
const JD_UNIX_EPOCH = 2440587.5
const msToJd = (ms: number) => ms / DAY_MS + JD_UNIX_EPOCH
const jdToMs = (jd: number) => (jd - JD_UNIX_EPOCH) * DAY_MS

/** 표준 대기(1013.25 hPa · 15 ℃) — 일출·일몰 = 태양 윗가장자리 + 대기차(swe_rise_trans 기본). */
const ATMOS_PRESSURE_HPA = 1013.25
const ATMOS_TEMP_C = 15

/**
 * jdUT 이후 첫 일출(rise)·일몰(set)의 UT JD — swe_rise_trans(태양 윗가장자리, 표준 대기차),
 * 실제 위도·경도에서. 태양이 뜨거나 지지 않는 날(극지)·천체력 오류면 null.
 * (예전 행성시는 남중을 12:00 으로 고정하고 적위만 근사해, 서울 실제 남중 12:18~12:46 과
 * 어긋난 시간 경계를 냈다 — 엔진 감사 ASTRO-5.)
 */
export function nextSunEventJD(
  jdUT: number,
  event: 'rise' | 'set',
  latitude: number,
  longitude: number
): number | null {
  let sw: ReturnType<typeof getSwisseph>
  try {
    sw = getSwisseph()
  } catch {
    return null
  }
  if (typeof sw.swe_rise_trans !== 'function') return null
  const res = sw.swe_rise_trans(
    jdUT,
    sw.SE_SUN,
    '',
    sw.SEFLG_SWIEPH,
    event === 'rise' ? sw.SE_CALC_RISE : sw.SE_CALC_SET,
    longitude,
    latitude,
    0,
    ATMOS_PRESSURE_HPA,
    ATMOS_TEMP_C
  )
  if (!res || 'error' in res) return null
  // -2 = 극지(뜨거나 지지 않음).
  return Number.isFinite(res.transitTime) && res.transitTime > 0 ? res.transitTime : null
}

/**
 * 한 민용일의 행성일 틀 — 모두 UT ms.
 * 행성일은 그 날 일출에 시작해 다음 날 일출에 끝난다. 일출 *전* 시각은 전날 행성일의 밤
 * (전날 일몰 ~ 오늘 일출)이고 지배성도 전날 요일의 것이다.
 */
export interface PlanetaryDayFrame {
  /** 전날 일몰 — 일출 전 시각이 속한 밤의 시작. */
  prevSunset: number
  /** 그 날 일출 — 이 행성일의 시작(첫 행성시 = 그 요일의 지배성). */
  sunrise: number
  sunset: number
  /** 다음 날 일출 — 이 행성일의 끝. */
  nextSunrise: number
  /** 그 민용일의 요일(일=0 … 토=6). */
  dayOfWeek: number
}

/** 'YYYY-MM-DD' (+n 일) 현지 자정의 UT ms — 출생 instant 와 같은 RFC 5545 resolver. */
function localMidnightMs(dayIso: string, timeZone: string, addDays = 0): number {
  const base = new Date(Date.parse(`${dayIso}T00:00:00.000Z`) + addDays * DAY_MS)
  return resolveBirthInstant(
    {
      year: base.getUTCFullYear(),
      month: base.getUTCMonth() + 1,
      day: base.getUTCDate(),
      hour: 0,
      minute: 0,
    },
    timeZone
  ).utc.getTime()
}

/**
 * 민용일(dayIso, timeZone 의 달력 날짜)의 행성일 틀 — swe_rise_trans 의 실제 일출·일몰.
 * 그 날 일출이 없거나(극야·백야) 밤·낮이 하루를 넘는 극지 날, 천체력 오류면 null —
 * 행성시가 정의되지 않는다.
 */
export function planetaryDayFrame(
  dayIso: string,
  latitude: number,
  longitude: number,
  timeZone: string
): PlanetaryDayFrame | null {
  let midnight: number
  let nextMidnight: number
  try {
    midnight = localMidnightMs(dayIso, timeZone)
    nextMidnight = localMidnightMs(dayIso, timeZone, 1)
  } catch {
    return null
  }
  const after = (ms: number, event: 'rise' | 'set') => {
    const jd = nextSunEventJD(msToJd(ms), event, latitude, longitude)
    return jd === null ? null : jdToMs(jd)
  }
  const sunrise = after(midnight, 'rise')
  if (sunrise === null || sunrise >= nextMidnight) return null
  const sunset = after(sunrise, 'set')
  if (sunset === null || sunset - sunrise >= DAY_MS) return null
  const nextSunrise = after(sunset, 'rise')
  if (nextSunrise === null || nextSunrise - sunset >= DAY_MS) return null
  // 전날 일몰 = 오늘 일출 24시간 전 이후 첫 일몰(그게 오늘 일출보다 늦으면 극지 날).
  const prevSunset = after(sunrise - DAY_MS, 'set')
  if (prevSunset === null || prevSunset >= sunrise || sunrise - prevSunset >= DAY_MS) return null
  return {
    prevSunset,
    sunrise,
    sunset,
    nextSunrise,
    dayOfWeek: new Date(`${dayIso}T00:00:00.000Z`).getUTCDay(),
  }
}

/** 행성시 한 칸 — planet·그 행성일의 지배성·칸 번호(0~11 낮, 12~23 밤)·경계(UT ms). */
export interface PlanetaryHourSlot {
  planet: string
  dayRuler: string
  hourIndex: number
  start: number
  end: number
  isDay: boolean
}

/**
 * 순간(UT ms)의 행성시 — 틀(일출·일몰) 기준, 칼데안 순서.
 *  - 일출 전: 전날 행성일의 밤(전날 일몰 ~ 오늘 일출 12등분), 지배성 = 전날 요일.
 *  - 일출~일몰: 오늘 낮 12등분, 첫 칸 = 오늘 요일의 지배성.
 *  - 일몰~다음 일출: 오늘 밤 12등분.
 * 틀 밖(전날 일몰 전·다음 일출 이후)이면 null.
 */
export function planetaryHourInFrame(
  ms: number,
  frame: PlanetaryDayFrame
): PlanetaryHourSlot | null {
  let dow: number
  let from: number
  let to: number
  let base: number
  if (ms < frame.sunrise) {
    if (ms < frame.prevSunset) return null
    dow = (frame.dayOfWeek + 6) % 7
    from = frame.prevSunset
    to = frame.sunrise
    base = 12
  } else if (ms < frame.sunset) {
    dow = frame.dayOfWeek
    from = frame.sunrise
    to = frame.sunset
    base = 0
  } else {
    if (ms >= frame.nextSunrise) return null
    dow = frame.dayOfWeek
    from = frame.sunset
    to = frame.nextSunrise
    base = 12
  }
  const len = (to - from) / 12
  const k = Math.min(11, Math.floor((ms - from) / len))
  const dayRuler = DAY_RULERS[dow]
  const hourIndex = base + k
  const planet =
    PLANETARY_HOUR_SEQUENCE[(PLANETARY_HOUR_SEQUENCE.indexOf(dayRuler) + hourIndex) % 7]
  return {
    planet,
    dayRuler,
    hourIndex,
    start: from + k * len,
    end: from + (k + 1) * len,
    isDay: base === 0,
  }
}

/**
 * 민용일 하루의 순간(UT ms)이 속한 행성시 — 그 날 틀로 보되, 틀의 *전날 일몰*보다 이른
 * 순간은 전날 행성일의 낮이라 전날 민용일의 틀로 다시 본다(재감사 AC-7). 64–66.5° 여름처럼
 * 일몰이 자정을 넘는 날(페어뱅크스 2026-06-21 00:30 AKDT → 토요일 낮 11번째 칸 = 금성)에
 * 자정 직후 시각이 행성시를 잃던 문제. prevFrame 은 필요할 때만 부른다(전날 틀 계산은 비싸다).
 * 그 날이나 전날이 극지 날(틀 없음)이면 null — 행성시 미정의.
 */
export function planetaryHourOnCivilDay(
  ms: number,
  frame: PlanetaryDayFrame,
  prevFrame: () => PlanetaryDayFrame | null
): PlanetaryHourSlot | null {
  if (ms < frame.prevSunset) {
    const prev = prevFrame()
    return prev ? planetaryHourInFrame(ms, prev) : null
  }
  return planetaryHourInFrame(ms, frame)
}

/** calculatePlanetaryHour 의 행성일 보충 정보 — 실제 틀을 아는 호출자가 넘긴다. */
export interface PlanetaryHourOptions {
  /** sunriseTime 이 속한 민용일의 요일(일=0). 기본 date.getUTCDay(). */
  dayOfWeek?: number
  /** 전날 일몰. 기본 sunsetTime − 24h. */
  prevSunset?: Date
  /** 다음 날 일출. 기본 sunriseTime + 24h. */
  nextSunrise?: Date
}

/**
 * 현재 행성 시간 계산
 *
 * sunriseTime·sunsetTime 은 그 날(행성일) 일출·일몰. 일출 전 시각은 *전날* 행성일의 밤이라
 * 지배성이 전날 요일의 것이다(예전엔 오늘 요일로 밤 칸을 세 칼데안 순서가 3칸 밀렸다 —
 * 엔진 감사 ASTRO-5). 요일은 UTC 요일이 기본이다 — getDay() 는 서버 로컬 타임존을 읽어 같은
 * 인스턴트라도 배포 리전에 따라 지배성이 달라져 택일 점수가 비결정적이 된다. 현지 요일을
 * 아는 호출자는 options.dayOfWeek 로 넘긴다.
 */
export function calculatePlanetaryHour(
  date: Date,
  latitude: number,
  sunriseTime: Date,
  sunsetTime: Date,
  options: PlanetaryHourOptions = {}
): PlanetaryHour {
  const frame: PlanetaryDayFrame = {
    prevSunset: options.prevSunset?.getTime() ?? sunsetTime.getTime() - DAY_MS,
    sunrise: sunriseTime.getTime(),
    sunset: sunsetTime.getTime(),
    nextSunrise: options.nextSunrise?.getTime() ?? sunriseTime.getTime() + DAY_MS,
    dayOfWeek: options.dayOfWeek ?? date.getUTCDay(),
  }
  // 틀 밖 시각은 가장 가까운 끝 칸으로 — 함수는 언제나 한 칸을 돌려준다.
  const ms = Math.min(Math.max(date.getTime(), frame.prevSunset), frame.nextSunrise - 1)
  const slot = planetaryHourInFrame(ms, frame)!

  return {
    planet: slot.planet,
    dayRuler: slot.dayRuler,
    startTime: new Date(slot.start),
    endTime: new Date(slot.end),
    isDay: slot.isDay,
    goodFor: PLANETARY_HOUR_USES[slot.planet] || [],
  }
}

/**
 * 역행 행성 확인
 */
export function getRetrogradePlanets(chart: Chart): string[] {
  return chart.planets.filter((p) => p.retrograde === true).map((p) => p.name)
}

/**
 * 길한/흉한 애스펙트 분류
 *
 * 한 차트 안 *서로 다른 두 행성의 순서 없는 쌍* 마다 한 번(findNatalAspects — i < j, 쌍마다
 * 가장 타이트한 각). 예전엔 findAspects(chart, chart) 라 모든 행성이 자기 자신과
 * 'Mars conjunction Mars' 로 합을 이루고 쌍마다 'A□B'·'B□A' 가 두 번 잡혀, 흉각이 늘
 * 5개 이상 → noMajorAfflictions 가 늘 0, 최고점 65 < 임계 70 이라 택일 추출기가 한 번도
 * 신호를 못 냈다(엔진 감사 ASTRO-8).
 */
export function classifyAspects(chart: Chart): { benefic: string[]; malefic: string[] } {
  const aspects = findNatalAspects(chart)
  const benefic: string[] = []
  const malefic: string[] = []

  const beneficPlanets = ['Venus', 'Jupiter']
  const maleficPlanets = ['Mars', 'Saturn', 'Uranus', 'Neptune', 'Pluto']
  const beneficAspects: AspectType[] = ['trine', 'sextile']
  const maleficAspects: AspectType[] = ['square', 'opposition']

  for (const aspect of aspects) {
    const description = `${aspect.from.name} ${aspect.type} ${aspect.to.name}`

    // 길성이 길한 애스펙트
    if (
      (beneficPlanets.includes(aspect.from.name) || beneficPlanets.includes(aspect.to.name)) &&
      beneficAspects.includes(aspect.type)
    ) {
      benefic.push(description)
    }

    // 흉성이 흉한 애스펙트
    if (
      (maleficPlanets.includes(aspect.from.name) || maleficPlanets.includes(aspect.to.name)) &&
      maleficAspects.includes(aspect.type)
    ) {
      malefic.push(description)
    }

    // 컨정션은 행성에 따라 분류
    if (aspect.type === 'conjunction') {
      if (beneficPlanets.includes(aspect.from.name) || beneficPlanets.includes(aspect.to.name)) {
        benefic.push(description)
      }
      if (maleficPlanets.includes(aspect.from.name) && maleficPlanets.includes(aspect.to.name)) {
        malefic.push(description)
      }
    }
  }

  return { benefic, malefic }
}

/**
 * 한 차트에서 파생되는 *이벤트-무관* 택일 사실들의 메모.
 *
 * analyzeElection 은 같은 날 6개 이벤트(KEY_EVENTS)에 대해 *동일한 chart* 로
 * 6번 호출되는데, moonPhase·voidOfCourse·retrograde·aspect 분류는 event 가
 * 아니라 chart 에만 의존한다(특히 classifyAspects 는 findAspects 의 O(n²) 페어
 * 탐색, checkVoidOfCourse 는 행성×5애스펙트 루프 — 한 호출당 가장 비싼 부분).
 * chart 객체 참조로 WeakMap 메모해 하루치 6회 호출 중 1회만 실제 계산한다.
 * 순수 함수의 결과 캐시라 출력은 비트 단위로 동일하다(택일 점수 불변).
 */
const electionalChartFactsCache = new WeakMap<
  Chart,
  {
    moonPhase: MoonPhase
    moonSign: ZodiacKo
    voidOfCourse: VoidOfCourseInfo
    retrogradePlanets: string[]
    benefic: string[]
    malefic: string[]
  }
>()

function getChartElectionalFacts(chart: Chart) {
  const cached = electionalChartFactsCache.get(chart)
  if (cached) return cached
  const sun = chart.planets.find((p) => p.name === 'Sun')!
  const moon = chart.planets.find((p) => p.name === 'Moon')!
  const { benefic, malefic } = classifyAspects(chart)
  const voidOfCourse = checkVoidOfCourse(chart)
  const retrogradePlanets = getRetrogradePlanets(chart)
  // 이 facts 는 같은 날 6개 이벤트의 analyzeElection 반환값에 *참조 공유* 된다.
  // 현재 어떤 caller 도 mutate 하지 않지만, 미래의 caller 가 analysis.beneficAspects
  // 등을 건드려 다른 이벤트 결과를 오염시키지 못하도록 방어적으로 freeze 한다.
  const facts = Object.freeze({
    moonPhase: getMoonPhase(sun.longitude, moon.longitude),
    moonSign: moon.sign,
    voidOfCourse: Object.freeze(voidOfCourse),
    retrogradePlanets: Object.freeze(retrogradePlanets) as string[],
    benefic: Object.freeze(benefic) as string[],
    malefic: Object.freeze(malefic) as string[],
  })
  electionalChartFactsCache.set(chart, facts)
  return facts
}

/**
 * 택일 분석 실행
 *
 * dateTime 은 평가하는 *실제 순간*(차트 instant)이고, sunriseTime·sunsetTime·hourOptions 는
 * 그 행성일의 실제 일출·일몰(planetaryDayFrame). 캘린더 추출기는 현지 정오 차트의 instant 와
 * 그 날 틀을 넘긴다 — 예전엔 UTC 00:00 과 기본 06/18 UTC 를 넘겨 행성시가 요일의 함수였다
 * (엔진 감사 ASTRO-8).
 */
export function analyzeElection(
  chart: Chart,
  eventType: ElectionalEventType,
  dateTime: Date,
  sunriseTime?: Date,
  sunsetTime?: Date,
  hourOptions?: PlanetaryHourOptions
): ElectionalAnalysis {
  const requirements = EVENT_REQUIREMENTS[eventType]

  const { moonPhase, moonSign, voidOfCourse, retrogradePlanets, benefic, malefic } =
    getChartElectionalFacts(chart)

  // 기본 일출/일몰 시간 (제공되지 않은 경우). UTC 기준 06:00/18:00 을 쓴다 —
  // setHours 는 서버 로컬 타임존을 읽어 같은 인스턴트라도 배포 리전에 따라
  // 기본 일출/일몰이 달라져 행성시·택일 점수가 비결정적이 된다(determinism 위반).
  // 또한 setHours 는 in-place mutation + timestamp 반환이라 원본 dateTime 을
  // 망가뜨리지 않도록 복제본에서 설정한다.
  const atHour = (hours: number): Date => {
    const d = new Date(dateTime)
    d.setUTCHours(hours, 0, 0, 0)
    return d
  }
  const sunrise = sunriseTime || atHour(6)
  const sunset = sunsetTime || atHour(18)
  const currentHour = calculatePlanetaryHour(dateTime, 0, sunrise, sunset, hourOptions)

  // 점수 계산
  const breakdown = {
    moonPhaseAppropriate: requirements.bestMoonPhases.includes(moonPhase) ? 10 : 3,
    moonSignAppropriate: requirements.bestMoonSigns.includes(moonSign)
      ? 10
      : requirements.avoidMoonSigns?.includes(moonSign)
        ? 0
        : 5,
    moonNotVoid: voidOfCourse.isVoid ? 0 : 5,
    beneficAspectsPresent: Math.min(benefic.length * 3, 15),
    noMajorAfflictions: Math.max(0, 10 - malefic.length * 2),
    mercuryDirect:
      retrogradePlanets.includes('Mercury') && requirements.avoidRetrogrades.includes('Mercury')
        ? 0
        : 7,
    otherPlanetsDirect:
      requirements.avoidRetrogrades.filter((p) => retrogradePlanets.includes(p) && p !== 'Mercury')
        .length === 0
        ? 8
        : 3,
    planetaryHourMatch: requirements.beneficPlanets.includes(currentHour.planet) ? 5 : 2,
    noEclipse: 5, // 이클립스 체크는 별도 로직 필요
  }

  const moonFactors =
    breakdown.moonPhaseAppropriate + breakdown.moonSignAppropriate + breakdown.moonNotVoid
  const planetaryAspects = breakdown.beneficAspectsPresent + breakdown.noMajorAfflictions
  const retrogradeIssues = breakdown.mercuryDirect + breakdown.otherPlanetsDirect
  const specialConsiderations = breakdown.planetaryHourMatch + breakdown.noEclipse

  const total = moonFactors + planetaryAspects + retrogradeIssues + specialConsiderations

  let interpretation: string
  if (total >= 90) {
    interpretation = '최적의 택일 - 적극 추천'
  } else if (total >= 75) {
    interpretation = '좋은 택일 - 추천'
  } else if (total >= 60) {
    interpretation = '무난한 택일 - 가능'
  } else if (total >= 45) {
    interpretation = '주의 필요 - 대안 검토 권장'
  } else {
    interpretation = '비추천 - 다른 날짜 선택 권장'
  }

  // 권장사항과 경고 생성
  const recommendations: string[] = []
  const warnings: string[] = []

  if (requirements.bestMoonPhases.includes(moonPhase)) {
    recommendations.push(`${getMoonPhaseName(moonPhase)}은 이 활동에 적합합니다.`)
  }
  if (requirements.bestMoonSigns.includes(moonSign)) {
    recommendations.push(`달이 ${moonSign}에 있어 이 활동에 유리합니다.`)
  }
  if (benefic.length > 0) {
    recommendations.push(`길한 애스펙트: ${benefic.slice(0, 3).join(', ')}`)
  }

  if (voidOfCourse.isVoid) {
    warnings.push('달이 공전 중 (Void of Course) - 시작한 일이 결과를 맺지 못할 수 있음')
  }
  if (retrogradePlanets.some((p) => requirements.avoidRetrogrades.includes(p))) {
    warnings.push(
      `역행 중인 행성 주의: ${retrogradePlanets.filter((p) => requirements.avoidRetrogrades.includes(p)).join(', ')}`
    )
  }
  if (requirements.avoidMoonSigns?.includes(moonSign)) {
    warnings.push(`달이 ${moonSign}에 있어 이 활동에 불리합니다.`)
  }
  if (malefic.length > 0) {
    warnings.push(`주의 애스펙트: ${malefic.slice(0, 3).join(', ')}`)
  }

  return {
    dateTime,
    eventType,
    score: {
      total,
      moonFactors,
      planetaryAspects,
      retrogradeIssues,
      specialConsiderations,
      breakdown,
      interpretation,
    },
    moonPhase,
    moonSign,
    voidOfCourse,
    currentHour,
    retrogradePlanets,
    beneficAspects: benefic,
    maleficAspects: malefic,
    recommendations,
    warnings,
  }
}

/**
 * 특정 기간 내 최적의 날짜 찾기 (간소화된 버전)
 */
export function findBestDates(
  eventType: ElectionalEventType,
  startDate: Date,
  endDate: Date,
  charts: { date: Date; chart: Chart }[]
): { date: Date; score: number; interpretation: string }[] {
  const results = charts.map(({ date, chart }) => {
    const analysis = analyzeElection(chart, eventType, date)
    return {
      date,
      score: analysis.score.total,
      interpretation: analysis.score.interpretation,
    }
  })

  return results.sort((a, b) => b.score - a.score)
}

/**
 * 이벤트 유형에 대한 일반 가이드라인
 */
export function getElectionalGuidelines(eventType: ElectionalEventType): {
  bestMoonPhases: string[]
  bestMoonSigns: string[]
  avoidMoonSigns?: string[]
  avoidRetrogrades: string[]
  bestDays?: string[]
  tips: string[]
} {
  const req = EVENT_REQUIREMENTS[eventType]

  const tips: string[] = []

  if (eventType === 'surgery') {
    tips.push('달이 수술 부위에 해당하는 사인에 있을 때 피하세요')
    tips.push('하현달 이후가 출혈과 부기 감소에 유리합니다')
  }
  if (eventType === 'marriage') {
    tips.push('금성 역행 기간은 반드시 피하세요')
    tips.push('달과 금성의 좋은 애스펙트를 확인하세요')
  }
  if (eventType === 'signing_contracts') {
    tips.push('수성 역행 기간은 계약 오류가 발생할 수 있습니다')
    tips.push('달이 공전 중(Void of Course)일 때 피하세요')
  }

  return {
    bestMoonPhases: req.bestMoonPhases.map(getMoonPhaseName),
    bestMoonSigns: req.bestMoonSigns,
    avoidMoonSigns: req.avoidMoonSigns,
    avoidRetrogrades: req.avoidRetrogrades,
    bestDays: req.bestDays,
    tips,
  }
}
