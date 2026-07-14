// src/lib/astrology/foundation/types.ts

export type ZodiacKo =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces'

export type HouseSystem = 'Placidus' | 'WholeSign'

export type AspectType =
  | 'conjunction'
  | 'sextile'
  | 'square'
  | 'trine'
  | 'opposition'
  | 'semisextile'
  | 'quincunx'
  | 'quintile'
  | 'biquintile'
  | 'sesquiquadrate'

/**
 * 어스펙트별 기하학적 각도(°) — 수학 상수(SSOT). natal/transit 엔진이 동일한
 * 표를 각자 복제하던 것을 여기로 통합. orb/weight 표는 엔진별 의도적 튜닝이라
 * 여기 두지 않는다.
 */
export const ASPECT_ANGLES: Record<AspectType, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
  semisextile: 30,
  quincunx: 150,
  quintile: 72,
  biquintile: 144,
  sesquiquadrate: 135,
}

export type AspectRules = {
  aspects?: AspectType[]
  maxResults?: number // default 50
  orbs?: {
    Sun?: number
    Moon?: number
    inner?: number // Mercury/Venus/Mars
    outer?: number // Jupiter..Pluto
    angles?: number // ASC/MC
    default?: number // fallback
  }
  perAspectOrbs?: Partial<Record<AspectType, number>>
  perPairOrbs?: Record<string, number>
  scoring?: {
    weights?: { orb?: number; aspect?: number; speed?: number }
  }
  /**
   * Hellenistic whole-sign aspect (정통). true 이면 두 점이 같은 표지 구조에 있으면
   * regard (=aspect) 로 간주 — degree-based orb 무관. 사인-사인 간 각 (0/60/90/120/180)
   * 이 만족되면 accept.
   *
   * 기본은 false → 기존 degree-based + moiety orb 정책 유지. true 로 켜면
   * 모든 sign-to-sign regard 가 전부 잡혀 신호 수가 크게 늘어남 (Hellenistic 본래
   * 의도는 sign-based 만으로 충분, degree orb 는 modern 의 정밀화).
   */
  useWholeSign?: boolean
}

export type PlanetBase = {
  name: string // "Sun" etc.
  longitude: number // 0-360
  sign: ZodiacKo
  degree: number // 0-29
  minute: number // 0-59
  formatted: string // "Aries 12deg 34'"
  house: number // 1-12
  speed?: number // deg/day
  retrograde?: boolean
  graphId?: string
}

export type House = {
  index: number // 1-12
  cusp: number // 0-360
  sign: ZodiacKo
  formatted: string
  graphId?: string
}

export type ChartMeta = {
  jdUT: number
  isoUTC: string
  timeZone: string
  latitude: number
  longitude: number
  houseSystem: HouseSystem
}

export type Chart = {
  planets: PlanetBase[]
  ascendant: PlanetBase // name: "Ascendant"
  mc: PlanetBase // name: "MC"
  houses: House[]
  meta?: ChartMeta
}

export type NatalInput = {
  year: number
  month: number
  date: number
  hour: number
  minute: number
  latitude: number
  longitude: number // East +, West -
  timeZone: string // IANA
}

export type TransitInput = {
  iso: string // "YYYY-MM-DDTHH:mm:ss"
  latitude: number
  longitude: number
  timeZone: string // IANA
}

export type AspectEnd = {
  name: string
  kind: 'natal' | 'transit' | 'progressed' | 'angle'
  house?: number
  sign?: ZodiacKo
  longitude: number
}

export type AspectHit = {
  from: AspectEnd
  to: AspectEnd
  type: AspectType
  orb: number // degrees
  applying?: boolean
  score?: number
}

// ===========================
// Extended Points & Returns
// ===========================

export type ProgressionInput = {
  natal: NatalInput
  targetDate: string // ISO date for which to calculate progressions
}

export type SolarReturnInput = {
  natal: NatalInput
  year: number // Year for which to calculate solar return
}

export type LunarReturnInput = {
  natal: NatalInput
  month: number // 1-12
  year: number
}

export type ProgressedChart = Chart & {
  progressionType: 'secondary' | 'solarArc'
  yearsProgressed: number
  progressedDate: string
  /**
   * true 면 입력이 불량(natal/targetDate 누락·불완전)이라 실제 계산 없이 반환된
   * 중립 폴백 차트(ASC/행성 0)다. 호출자는 이 값으로 '진짜 차트'와 구분할 수
   * 있다 — 예전엔 표시 필드가 없어 폴백을 실제 결과로 오인할 수 있었다.
   */
  isFallback?: boolean
}

export type ReturnChart = Chart & {
  returnType: 'solar' | 'lunar'
  returnYear: number
  returnMonth?: number
  exactReturnTime: string // ISO string of exact return moment
}

export type ExtraPoint = {
  name: string
  longitude: number
  sign: ZodiacKo
  degree: number
  minute: number
  formatted: string
  house: number
  description?: string
}

export type ExtendedChart = Chart & {
  chiron?: ExtraPoint
  lilith?: ExtraPoint // Mean Black Moon Lilith
  trueNode?: ExtraPoint // already in planets as "True Node"
  partOfFortune?: ExtraPoint
  vertex?: ExtraPoint
}

// Narrative facts carrier
export interface AstrologyChartFacts {
  sun: PlanetBase
  moon: PlanetBase
  mercury?: PlanetBase
  venus?: PlanetBase
  mars?: PlanetBase
  jupiter?: PlanetBase
  saturn?: PlanetBase
  uranus?: PlanetBase
  neptune?: PlanetBase
  pluto?: PlanetBase
  asc?: PlanetBase
  chiron?: ExtraPoint
  lilith?: ExtraPoint
  partOfFortune?: ExtraPoint
  vertex?: ExtraPoint
  aspects?: Record<string, unknown>
  elementRatios?: Record<string, number>
}
