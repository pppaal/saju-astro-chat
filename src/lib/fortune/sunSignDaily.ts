/**
 * Daily sun-sign horoscope — deterministic engine.
 *
 * Content source for /horoscope and /horoscope/[sign]. The judgment is
 * computed here from real planetary positions; the text is picked from the
 * bank in ./sunSignCopy.ts by the same factors. No LLM, no randomness: the
 * same (date, sign) always yields the same object (determinism convention,
 * CLAUDE.md). `now` is injectable so tests can pin a date.
 *
 * Reference moment: the UTC calendar date of `now`, with every position cast
 * at 12:00 UTC of that date (one sky per date, cached in a module Map). The
 * reading for a sign is read against the sign's midpoint (15°), the
 * conventional reference point for a sun-sign (whole-sign) horoscope.
 *
 * Factors and weights (all deterministic, summed into `score`):
 *   (a) Moon sign vs the target sign by sign distance
 *         same +2 · semi-sextile 0 · sextile +1 · square −2 · trine +2 ·
 *         quincunx −1 · opposition −1
 *       plus Moon-element harmony: same element +1 · compatible +0.5 ·
 *       clashing −0.5
 *   (b) Moon phase: new 0 · waxing crescent +0.5 · first quarter 0 ·
 *       waxing gibbous +1 · full +0.5 · waning gibbous +0.5 ·
 *       last quarter −0.5 · waning crescent −0.5
 *   (c) Aspects from each transiting planet (Sun…Pluto, Moon included) to the
 *       sign's midpoint; orbs conjunction/opposition 8°, square/trine 6°,
 *       sextile 4°, Moon 4° for every aspect. Weight per planet × aspect in
 *       ASPECT_WEIGHT below (benefics lift; Jupiter outward is kept to ±1 at
 *       most so a months-long transit flavors the days instead of fixing
 *       the grade — calibrated so no sign is locked out of a 5 or a 1).
 *   (d) Planets currently in the sign (Moon excluded — covered by (a)):
 *       Venus +1 · Sun +0.5 · Jupiter +0.5 · Mercury +0.5 · Mars +0.5 ·
 *       Saturn −0.5 · Uranus/Neptune/Pluto 0 (listed, not scored)
 *   (e) Retrograde planets (speed < 0): Mercury −0.5 · Venus −0.5 ·
 *       Mars −0.5 · outer planets 0 (listed for context)
 *   (f) Ruler's condition (traditional ruler): sign it is in and element
 *       harmony with the target sign (same +1 · compatible +0.5 ·
 *       clashing −0.5), −0.5 more if the ruler is retrograde
 *
 * Grade from score: ≥ 4.5 → 5 · ≥ 2 → 4 · > −1.5 → 3 · > −4 → 2 · else 1.
 */

import { getMoonPhase, type MoonPhase } from '@/lib/astrology/foundation/electional'
import { getSwisseph } from '@/lib/astrology/foundation/ephe'
import {
  extractLongitudeSpeed,
  extractSwissLongitude,
  getPlanetList,
  isoToJD,
  throwIfSwissEphError,
} from '@/lib/astrology/foundation/shared'
import { angleDiff } from '@/lib/astrology/foundation/utils'
import {
  SUN_SIGNS,
  signMidpointLongitude,
  sunSignForLongitude,
  type Element,
  type SunSign,
} from '@/lib/astrology/sunSigns'
import {
  ASPECT_COPY,
  AVOID_COPY,
  DO_COPY,
  fillTemplate,
  GRADE_LABEL,
  HEADLINES,
  LOVE_ASPECT_COPY,
  LOVE_TONE_COPY,
  MONEY_ASPECT_COPY,
  MOON_PHASE_EN,
  MOON_RELATION_COPY,
  PHASE_COPY,
  PHASE_GROUP,
  PHASE_MONEY_COPY,
  RELATION_LABEL,
  RETROGRADE_COPY,
  RULER_WORK_COPY,
  WORK_ASPECT_COPY,
  type AspectName,
  type DailyGrade,
  type ElementHarmony,
  type MoonRelation,
  type PlanetName,
  type Tone,
} from './sunSignCopy'

export type {
  AspectName,
  DailyGrade,
  ElementHarmony,
  MoonRelation,
  PlanetName,
  Tone,
} from './sunSignCopy'
export type { MoonPhase }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ReceiptItem {
  factor: string
  detail: string
  weight: number
}

export interface PlanetPosition {
  name: PlanetName
  /** Ecliptic longitude 0 ≤ lon < 360 (tropical) */
  longitude: number
  /** Daily motion in degrees; negative = retrograde */
  speed: number
  retrograde: boolean
  sign: SunSign
}

export interface DailySky {
  /** YYYY-MM-DD (UTC) */
  date: string
  /** Julian Day (UT) of 12:00 UTC on `date` */
  jd: number
  planets: readonly PlanetPosition[]
  moonPhase: MoonPhase
}

export interface TransitAspect {
  planet: PlanetName
  aspect: AspectName
  /** Distance from the exact aspect angle, degrees */
  orb: number
  /** Sign the planet is in */
  planetSign: string
  retrograde: boolean
  weight: number
  /** 0 when the planet is ahead of (or on) the sign midpoint in zodiacal order, 1 when behind — used to vary copy */
  side: 0 | 1
}

export interface RulerCondition {
  planet: PlanetName
  sign: string
  element: Element
  harmony: ElementHarmony
  retrograde: boolean
}

export interface SunSignDaily {
  sign: SunSign
  /** YYYY-MM-DD, UTC calendar date */
  date: string
  /** e.g. "November 16, 2026" */
  dateLabel: string
  /** e.g. "Monday" */
  weekday: string
  grade: DailyGrade
  gradeLabel: string
  /** Raw factor sum behind the grade */
  score: number
  /** ≤ 9 words */
  headline: string
  /** Two sentences */
  summary: string
  /** 40–70 words that answer "how is today for <sign>?" — the page's lead paragraph */
  directAnswer: string
  areas: { love: string; work: string; money: string }
  doToday: string
  avoidToday: string
  /** 3-hour window, e.g. "15:00–18:00 UTC" */
  luckyWindow: string
  receipt: ReceiptItem[]
  moonSign: string
  moonRelation: MoonRelation
  moonPhase: MoonPhase
  moonPhaseName: string
  retrogrades: string[]
  planetsInSign: string[]
  aspects: TransitAspect[]
  ruler: RulerCondition
}

export interface SunSignWeekDay {
  date: string
  dateLabel: string
  /** "Mon" */
  weekdayShort: string
  grade: DailyGrade
  gradeLabel: string
  headline: string
  isToday: boolean
}

// ---------------------------------------------------------------------------
// Weights (see header comment)
// ---------------------------------------------------------------------------

export const MOON_RELATION_WEIGHT: Record<MoonRelation, number> = {
  same: 2,
  'semi-sextile': 0,
  sextile: 1,
  square: -2,
  trine: 2,
  quincunx: -1,
  opposition: -1,
}

export const ELEMENT_HARMONY_WEIGHT: Record<ElementHarmony, number> = {
  same: 1,
  compatible: 0.5,
  clashing: -0.5,
}

export const MOON_PHASE_WEIGHT: Record<MoonPhase, number> = {
  new_moon: 0,
  waxing_crescent: 0.5,
  first_quarter: 0,
  waxing_gibbous: 1,
  full_moon: 0.5,
  waning_gibbous: 0.5,
  last_quarter: -0.5,
  waning_crescent: -0.5,
}

export const ASPECT_WEIGHT: Record<PlanetName, Record<AspectName, number>> = {
  Sun: { conjunction: 1, sextile: 0.5, trine: 1, square: -1, opposition: -0.5 },
  Moon: { conjunction: 0.5, sextile: 0.5, trine: 0.5, square: -0.5, opposition: -0.5 },
  Mercury: { conjunction: 1, sextile: 0.5, trine: 1, square: -1, opposition: -0.5 },
  Venus: { conjunction: 2, sextile: 1, trine: 2, square: -0.5, opposition: 0.5 },
  Mars: { conjunction: 0.5, sextile: 0.5, trine: 1, square: -1, opposition: -1 },
  Jupiter: { conjunction: 1, sextile: 0.5, trine: 0.5, square: -0.5, opposition: 0 },
  Saturn: { conjunction: -0.5, sextile: 0.5, trine: 0.5, square: -0.5, opposition: -0.5 },
  Uranus: { conjunction: 0, sextile: 0.5, trine: 0.5, square: -0.5, opposition: -0.5 },
  Neptune: { conjunction: -0.5, sextile: 0.5, trine: 0.5, square: -0.5, opposition: -0.5 },
  Pluto: { conjunction: 0, sextile: 0.5, trine: 0.5, square: -0.5, opposition: -0.5 },
}

export const IN_SIGN_WEIGHT: Record<PlanetName, number> = {
  Sun: 0.5,
  Moon: 0,
  Mercury: 0.5,
  Venus: 1,
  Mars: 0.5,
  Jupiter: 0.5,
  Saturn: -0.5,
  Uranus: 0,
  Neptune: 0,
  Pluto: 0,
}

export const RETROGRADE_WEIGHT: Record<PlanetName, number> = {
  Sun: 0,
  Moon: 0,
  Mercury: -0.5,
  Venus: -0.5,
  Mars: -0.5,
  Jupiter: 0,
  Saturn: 0,
  Uranus: 0,
  Neptune: 0,
  Pluto: 0,
}

export const RULER_RETROGRADE_WEIGHT = -0.5

/** Score boundaries, highest first: score ≥ 4.5 → 5, ≥ 2 → 4, > −1.5 → 3, > −4 → 2, else 1. */
export const GRADE_THRESHOLDS = { excellent: 4.5, good: 2, steady: -1.5, mixed: -4 } as const

const ASPECT_ANGLE: Record<AspectName, number> = {
  conjunction: 0,
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
}

const ASPECT_ORB: Record<AspectName, number> = {
  conjunction: 8,
  opposition: 8,
  square: 6,
  trine: 6,
  sextile: 4,
}

const MOON_ORB = 4

/** How an aspect reads in the receipt: "Venus at 17° Scorpio, trine your sign's midpoint". */
const ASPECT_PHRASE: Record<AspectName, string> = {
  conjunction: 'conjunct',
  sextile: 'sextile',
  square: 'square',
  trine: 'trine',
  opposition: 'opposite',
}

/** Zodiacal order; also the order of the receipt and of `planetsInSign`. */
export const PLANET_ORDER: readonly PlanetName[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
]

const LOVE_DRIVERS: readonly PlanetName[] = ['Venus', 'Mars']
const WORK_DRIVERS: readonly PlanetName[] = ['Mercury', 'Mars', 'Saturn', 'Sun']
const MONEY_DRIVERS: readonly PlanetName[] = ['Jupiter', 'Venus', 'Saturn']

// ---------------------------------------------------------------------------
// Pure helpers (exported for tests)
// ---------------------------------------------------------------------------

/** Sign distance folded to 0..6 (0 same … 6 opposition). */
export function signDistance(a: SunSign, b: SunSign): number {
  const d = (a.index - b.index + 12) % 12
  return d > 6 ? 12 - d : d
}

export function moonRelationForDistance(distance: number): MoonRelation {
  switch (distance) {
    case 0:
      return 'same'
    case 1:
      return 'semi-sextile'
    case 2:
      return 'sextile'
    case 3:
      return 'square'
    case 4:
      return 'trine'
    case 5:
      return 'quincunx'
    default:
      return 'opposition'
  }
}

/** Fire–Air and Earth–Water are the classical compatible pairs. */
export function elementHarmony(a: Element, b: Element): ElementHarmony {
  if (a === b) return 'same'
  const pair = `${a}-${b}`
  if (
    pair === 'Fire-Air' ||
    pair === 'Air-Fire' ||
    pair === 'Earth-Water' ||
    pair === 'Water-Earth'
  ) {
    return 'compatible'
  }
  return 'clashing'
}

/** Which aspect (if any) `planetLon` makes to `targetLon` within the orbs for `planet`. */
export function aspectBetween(
  planet: PlanetName,
  planetLon: number,
  targetLon: number
): { aspect: AspectName; orb: number } | null {
  const sep = angleDiff(planetLon, targetLon)
  let best: { aspect: AspectName; orb: number } | null = null
  for (const aspect of Object.keys(ASPECT_ANGLE) as AspectName[]) {
    const orb = Math.abs(sep - ASPECT_ANGLE[aspect])
    const maxOrb = planet === 'Moon' ? MOON_ORB : ASPECT_ORB[aspect]
    if (orb <= maxOrb && (!best || orb < best.orb)) {
      best = { aspect, orb }
    }
  }
  return best
}

/** Signed separation in (−180, 180]: positive when `lon` is ahead of `ref` in zodiacal order. */
function signedSeparation(lon: number, ref: number): number {
  const s = ((((lon - ref) % 360) + 540) % 360) - 180
  return s <= -180 ? 180 : s
}

/** Days since 1970-01-01 (UTC) — the rotation counter for copy variants. */
export function utcDayIndex(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000)
}

/**
 * Deterministic variant pick. `dayIndex` rotates variants on consecutive days
 * (so the same factor never shows the same sentence two days running), and
 * `shift` separates signs that share a factor on the same day: the geometric
 * side (0/1) for a pair of signs that share an aspect, or the sign index for
 * banks every sign draws from. `salt` keeps the different fields of one page
 * from moving in lockstep.
 */
export function pickVariant<T>(
  variants: readonly T[],
  dayIndex: number,
  shift: number,
  salt: number
): T {
  const n = variants.length
  if (n === 0) throw new Error('pickVariant: empty variant list')
  const i = (((dayIndex + shift + salt) % n) + n) % n
  return variants[i]
}

export function utcDateString(now: Date): string {
  return now.toISOString().slice(0, 10)
}

const MONTH_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const WEEKDAY_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function formatDateLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${MONTH_EN[m - 1]} ${d}, ${y}`
}

function weekdayOf(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return WEEKDAY_EN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
}

export function addUtcDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86400000)
}

function formatWeight(w: number): string {
  if (w === 0) return '0'
  const s = Number.isInteger(w) ? String(Math.abs(w)) : Math.abs(w).toFixed(1)
  return w > 0 ? `+${s}` : `-${s}`
}

function degInSign(lon: number): number {
  return Math.floor(((lon % 360) + 360) % 360) % 30
}

// ---------------------------------------------------------------------------
// Sky (Swiss Ephemeris) — one computation per UTC date, cached
// ---------------------------------------------------------------------------

const SKY_CACHE = new Map<string, DailySky>()
const SKY_CACHE_MAX = 120

/** Planetary positions at 12:00 UTC on `date` (YYYY-MM-DD). Cached per date. */
export function getDailySky(date: string): DailySky {
  const cached = SKY_CACHE.get(date)
  if (cached) return cached

  const sw = getSwisseph()
  const ids = getPlanetList()
  const jd = isoToJD(`${date}T12:00:00`, 'UTC')

  const planets: PlanetPosition[] = PLANET_ORDER.map((name) => {
    const id = ids[name]
    if (typeof id !== 'number') {
      throw new Error(`sunSignDaily: no Swiss Ephemeris id for ${name}`)
    }
    const res = sw.swe_calc_ut(jd, id, sw.SEFLG_SPEED)
    throwIfSwissEphError(res, `swe_calc_ut(${name})`)
    const longitude = ((extractSwissLongitude(res) % 360) + 360) % 360
    const speed = extractLongitudeSpeed(res) ?? 0
    return {
      name,
      longitude,
      speed,
      retrograde: speed < 0,
      sign: sunSignForLongitude(longitude),
    }
  })

  const sun = planets[0]
  const moon = planets[1]
  const sky: DailySky = {
    date,
    jd,
    planets,
    moonPhase: getMoonPhase(sun.longitude, moon.longitude),
  }

  if (SKY_CACHE.size >= SKY_CACHE_MAX) {
    const oldest = SKY_CACHE.keys().next().value
    if (oldest !== undefined) SKY_CACHE.delete(oldest)
  }
  SKY_CACHE.set(date, sky)
  return sky
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function gradeForScore(score: number): DailyGrade {
  if (score >= GRADE_THRESHOLDS.excellent) return 5
  if (score >= GRADE_THRESHOLDS.good) return 4
  if (score > GRADE_THRESHOLDS.steady) return 3
  if (score > GRADE_THRESHOLDS.mixed) return 2
  return 1
}

function toneForScore(score: number): Tone {
  if (score >= 1.5) return 'bright'
  if (score <= -1) return 'tense'
  return 'steady'
}

function strongest(
  aspects: readonly TransitAspect[],
  among: readonly PlanetName[]
): TransitAspect | null {
  let best: TransitAspect | null = null
  for (const a of aspects) {
    if (!among.includes(a.planet)) continue
    if (
      !best ||
      Math.abs(a.weight) > Math.abs(best.weight) ||
      (Math.abs(a.weight) === Math.abs(best.weight) && a.orb < best.orb)
    ) {
      best = a
    }
  }
  return best
}

export function computeSunSignDaily(sign: SunSign, now: Date = new Date()): SunSignDaily {
  const date = utcDateString(now)
  const sky = getDailySky(date)
  const dayIndex = utcDayIndex(date)
  const midpoint = signMidpointLongitude(sign)

  const byName = new Map<PlanetName, PlanetPosition>()
  for (const p of sky.planets) byName.set(p.name, p)
  const moon = byName.get('Moon')
  if (!moon) throw new Error('sunSignDaily: Moon position missing')

  const receipt: ReceiptItem[] = []
  let score = 0

  // (a) Moon sign — relation by sign distance + element harmony
  const moonSigned = (moon.sign.index - sign.index + 12) % 12 // 0..11, zodiacal direction
  const distance = moonSigned > 6 ? 12 - moonSigned : moonSigned
  const moonRelation = moonRelationForDistance(distance)
  const moonSide: 0 | 1 = moonSigned === 0 || moonSigned <= 6 ? 0 : 1
  const moonWeight = MOON_RELATION_WEIGHT[moonRelation]
  score += moonWeight
  receipt.push({
    factor: 'Moon sign',
    detail:
      moonRelation === 'same'
        ? `Moon at ${degInSign(moon.longitude)}° ${moon.sign.name}, in your sign`
        : `Moon at ${degInSign(moon.longitude)}° ${moon.sign.name}, ${RELATION_LABEL[moonRelation]} (${distance} sign${distance === 1 ? '' : 's'} away)`,
    weight: moonWeight,
  })

  const moonHarmony = elementHarmony(moon.sign.element, sign.element)
  const moonElementWeight = ELEMENT_HARMONY_WEIGHT[moonHarmony]
  score += moonElementWeight
  receipt.push({
    factor: 'Moon element',
    detail:
      moonHarmony === 'same'
        ? `${moon.sign.element} Moon with your ${sign.element} sign, same element`
        : `${moon.sign.element} Moon with your ${sign.element} sign, ${moonHarmony} elements`,
    weight: moonElementWeight,
  })

  // (b) Moon phase
  const phaseWeight = MOON_PHASE_WEIGHT[sky.moonPhase]
  score += phaseWeight
  const sun = byName.get('Sun')
  const phaseAngle = sun ? Math.round((((moon.longitude - sun.longitude) % 360) + 360) % 360) : 0
  receipt.push({
    factor: 'Moon phase',
    detail: `${MOON_PHASE_EN[sky.moonPhase]} (Moon ${phaseAngle}° ahead of the Sun)`,
    weight: phaseWeight,
  })

  // (c) Aspects to the sign midpoint
  const aspects: TransitAspect[] = []
  for (const p of sky.planets) {
    const hit = aspectBetween(p.name, p.longitude, midpoint)
    if (!hit) continue
    const weight = ASPECT_WEIGHT[p.name][hit.aspect]
    const side: 0 | 1 = signedSeparation(p.longitude, midpoint) >= 0 ? 0 : 1
    aspects.push({
      planet: p.name,
      aspect: hit.aspect,
      orb: Math.round(hit.orb * 10) / 10,
      planetSign: p.sign.name,
      retrograde: p.retrograde,
      weight,
      side,
    })
  }
  aspects.sort((x, y) => Math.abs(y.weight) - Math.abs(x.weight) || x.orb - y.orb)
  for (const a of aspects) {
    score += a.weight
    receipt.push({
      factor: `${a.planet} ${a.aspect}`,
      detail: `${a.planet}${a.retrograde ? ' (retrograde)' : ''} at ${degInSign(byName.get(a.planet)?.longitude ?? 0)}° ${a.planetSign}, ${ASPECT_PHRASE[a.aspect]} your sign's midpoint (orb ${a.orb.toFixed(1)}°)`,
      weight: a.weight,
    })
  }

  // (d) Planets in the sign (Moon excluded: covered by (a))
  const planetsInSign: string[] = []
  for (const p of sky.planets) {
    if (p.sign.index !== sign.index) continue
    if (p.name === 'Moon') continue
    planetsInSign.push(p.name)
    const w = IN_SIGN_WEIGHT[p.name]
    score += w
    receipt.push({
      factor: `${p.name} in ${sign.name}`,
      detail: `${p.name} is traveling through your sign (${degInSign(p.longitude)}° ${sign.name})`,
      weight: w,
    })
  }

  // (e) Retrogrades
  const retrogrades = sky.planets.filter((p) => p.retrograde).map((p) => p.name)
  const slowRetro: string[] = []
  for (const name of retrogrades) {
    const w = RETROGRADE_WEIGHT[name]
    if (w !== 0) {
      score += w
      receipt.push({
        factor: `${name} retrograde`,
        detail: `${name} is retrograde in ${byName.get(name)?.sign.name ?? ''}; double-check what it rules`,
        weight: w,
      })
    } else {
      slowRetro.push(name)
    }
  }
  if (slowRetro.length > 0) {
    receipt.push({
      factor: 'Slow retrogrades',
      detail: `${slowRetro.join(', ')} retrograde — months-long, listed for context`,
      weight: 0,
    })
  }

  // (f) Ruler condition (traditional ruler)
  const rulerName = sign.ruler as PlanetName
  const rulerPos = byName.get(rulerName)
  if (!rulerPos) throw new Error(`sunSignDaily: ruler ${sign.ruler} missing from sky`)
  const rulerHarmony = elementHarmony(rulerPos.sign.element, sign.element)
  const rulerWeight = ELEMENT_HARMONY_WEIGHT[rulerHarmony]
  score += rulerWeight
  receipt.push({
    factor: 'Ruler condition',
    detail:
      rulerPos.sign.index === sign.index
        ? `Your ruler ${rulerName} is at home in ${sign.name}`
        : `Your ruler ${rulerName} is in ${rulerPos.sign.name} (${rulerPos.sign.element}), ${rulerHarmony === 'same' ? 'the same element as' : rulerHarmony === 'compatible' ? 'compatible with' : 'clashing with'} your ${sign.element} sign`,
    weight: rulerWeight,
  })
  if (rulerPos.retrograde) {
    score += RULER_RETROGRADE_WEIGHT
    receipt.push({
      factor: 'Ruler retrograde',
      detail: `${rulerName}, your ruler, is retrograde; its themes slow down for you in particular`,
      weight: RULER_RETROGRADE_WEIGHT,
    })
  }
  const ruler: RulerCondition = {
    planet: rulerName,
    sign: rulerPos.sign.name,
    element: rulerPos.sign.element,
    harmony: rulerHarmony,
    retrograde: rulerPos.retrograde,
  }

  score = Math.round(score * 10) / 10
  const grade = gradeForScore(score)

  // Lucky window: 3-hour UTC slot from the Moon's longitude, offset by sign
  const slot = (Math.floor(moon.longitude / 15) + sign.index * 3) % 8
  const start = slot * 3
  const luckyWindow = `${String(start).padStart(2, '0')}:00–${String(start + 3).padStart(2, '0')}:00 UTC`

  // ---- Text ----
  const vars = {
    sign: sign.name,
    moon: moon.sign.name,
    element: sign.element,
    ruler: rulerName,
    rulerSign: rulerPos.sign.name,
    rulerElement: rulerPos.sign.element,
  }

  const headline = pickVariant(HEADLINES[grade], dayIndex, sign.index, 1)

  const moonSentence = fillTemplate(
    pickVariant(MOON_RELATION_COPY[moonRelation], dayIndex, moonSide, 2),
    vars
  )
  const summaryAspect = strongest(
    aspects,
    PLANET_ORDER.filter((p) => p !== 'Moon')
  )
  const secondSentence = summaryAspect
    ? fillTemplate(
        pickVariant(
          ASPECT_COPY[summaryAspect.planet as Exclude<PlanetName, 'Moon'>][summaryAspect.aspect],
          dayIndex,
          summaryAspect.side,
          3
        ),
        vars
      )
    : fillTemplate(pickVariant(PHASE_COPY[sky.moonPhase], dayIndex, sign.index, 3), vars)
  const summary = `${moonSentence} ${secondSentence}`

  // love
  const loveDriver = strongest(aspects, LOVE_DRIVERS)
  const loveBank = loveDriver ? LOVE_ASPECT_COPY[loveDriver.planet]?.[loveDriver.aspect] : undefined
  let love =
    loveDriver && loveBank
      ? pickVariant(loveBank, dayIndex, loveDriver.side, 4)
      : pickVariant(
          LOVE_TONE_COPY[toneForScore(moonWeight + moonElementWeight + phaseWeight)],
          dayIndex,
          sign.index,
          4
        )
  if (byName.get('Venus')?.retrograde) {
    love += ` ${pickVariant(RETROGRADE_COPY.Venus, dayIndex, sign.index, 5)}`
  }

  // work — Mercury Rx caveat takes precedence; Mars Rx goes here only when Mercury is direct
  const mercuryRx = byName.get('Mercury')?.retrograde === true
  const marsRx = byName.get('Mars')?.retrograde === true
  const workDriver = strongest(aspects, WORK_DRIVERS)
  const workBank = workDriver ? WORK_ASPECT_COPY[workDriver.planet]?.[workDriver.aspect] : undefined
  let work =
    workDriver && workBank
      ? // salt 7, not 6: 6 ≡ 3 (mod 3) would echo the summary's aspect sentence when the
        // strongest aspect is also the work driver (WORK_ASPECT_COPY paraphrases ASPECT_COPY)
        pickVariant(workBank, dayIndex, workDriver.side, 7)
      : fillTemplate(pickVariant(RULER_WORK_COPY[rulerHarmony], dayIndex, sign.index, 7), vars)
  if (mercuryRx) {
    work += ` ${pickVariant(RETROGRADE_COPY.Mercury, dayIndex, sign.index, 8)}`
  } else if (marsRx) {
    work += ` ${pickVariant(RETROGRADE_COPY.Mars, dayIndex, sign.index, 8)}`
  }

  // money — each area carries at most one retrograde caveat, so Mars Rx lands here
  // only in the rare weeks when Mercury is retrograde as well
  const moneyDriver = strongest(aspects, MONEY_DRIVERS)
  const moneyBank = moneyDriver
    ? MONEY_ASPECT_COPY[moneyDriver.planet]?.[moneyDriver.aspect]
    : undefined
  let money =
    moneyDriver && moneyBank
      ? pickVariant(moneyBank, dayIndex, moneyDriver.side, 8)
      : pickVariant(PHASE_MONEY_COPY[PHASE_GROUP[sky.moonPhase]], dayIndex, sign.index, 8)
  if (mercuryRx && marsRx) {
    money += ` ${pickVariant(RETROGRADE_COPY.Mars, dayIndex, sign.index, 9)}`
  }

  const doToday = pickVariant(DO_COPY[moonRelation], dayIndex, moonSide, 10)
  const avoidToday = pickVariant(AVOID_COPY[moonRelation], dayIndex, moonSide, 11)

  const dateLabel = formatDateLabel(date)
  const gradeLabel = GRADE_LABEL[grade]
  const gradeWord = gradeLabel.toLowerCase()
  const article = /^[aeiou]/.test(gradeWord) ? 'an' : 'a'
  const directAnswer = `Today, ${dateLabel}, is ${article} ${gradeWord} day for ${sign.name} (${grade} out of 5). ${summary}`

  return {
    sign,
    date,
    dateLabel,
    weekday: weekdayOf(date),
    grade,
    gradeLabel,
    score,
    headline,
    summary,
    directAnswer,
    areas: { love, work, money },
    doToday,
    avoidToday,
    luckyWindow,
    receipt,
    moonSign: moon.sign.name,
    moonRelation,
    moonPhase: sky.moonPhase,
    moonPhaseName: MOON_PHASE_EN[sky.moonPhase],
    retrogrades,
    planetsInSign,
    aspects,
    ruler,
  }
}

/** All 12 signs for the hub page. */
export function computeAllSunSignDaily(now: Date = new Date()): SunSignDaily[] {
  return SUN_SIGNS.map((s) => computeSunSignDaily(s, now))
}

/** Tomorrow's reading (UTC date + 1). */
export function computeSunSignTomorrow(sign: SunSign, now: Date = new Date()): SunSignDaily {
  return computeSunSignDaily(sign, addUtcDays(now, 1))
}

/** Seven daily grades starting today (UTC). */
export function computeSunSignWeek(sign: SunSign, now: Date = new Date()): SunSignWeekDay[] {
  const out: SunSignWeekDay[] = []
  for (let i = 0; i < 7; i++) {
    const d = computeSunSignDaily(sign, addUtcDays(now, i))
    out.push({
      date: d.date,
      dateLabel: d.dateLabel,
      weekdayShort: d.weekday.slice(0, 3),
      grade: d.grade,
      gradeLabel: d.gradeLabel,
      headline: d.headline,
      isToday: i === 0,
    })
  }
  return out
}
