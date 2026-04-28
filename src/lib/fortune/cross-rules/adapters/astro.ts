// Astrology adapter: birth + queryDate + place → AstroNormalizerInput.
// Calls existing astro engine; bridges TransitAspect → AspectHit shape;
// computes essential dignity / mode dist / stellium / mutual reception
// directly from the natal chart.

import {
  calculateNatalChart,
  toChart,
  type NatalChartInput,
} from '@/lib/astrology/foundation/astrologyService'
import { findNatalAspects } from '@/lib/astrology/foundation/aspects'
import {
  calculateTransitChart,
  findTransitAspects,
  type TransitAspect,
} from '@/lib/astrology/foundation/transit'
import {
  calculateSolarReturn,
  calculateLunarReturn,
} from '@/lib/astrology/foundation/returns'
import {
  calculateSecondaryProgressions,
  findProgressedToNatalAspects,
} from '@/lib/astrology/foundation/progressions'
import { findFixedStarConjunctions, type FixedStarConjunction } from '@/lib/astrology/foundation/fixedStars'
import type { AspectHit, Chart } from '@/lib/astrology/foundation/types'
import type { AstroNormalizerInput } from '../normalizer/astro'

export interface AstroAdapterInput {
  year: number
  month: number
  date: number
  hour: number
  minute: number
  latitude: number
  longitude: number
  timeZone: string
  queryDate: Date
  includeSolarReturn?: boolean
  includeLunarReturn?: boolean
  includeProgression?: boolean
  includeFixedStars?: boolean
}

function toAspectHit(t: TransitAspect): AspectHit {
  return { from: t.from, to: t.to, type: t.type, orb: t.orb, applying: t.isApplying, score: t.score }
}

function profectionHouseFor(birth: { year: number; month: number; date: number }, queryDate: Date): number {
  const birthDate = new Date(birth.year, birth.month - 1, birth.date)
  const ageYears = Math.floor((queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000))
  return (Math.max(0, ageYears) % 12) + 1
}

// ── Essential dignities table (Lilly + modern rulers) ──────
const DOMICILE: Record<string, string[]> = {
  Sun: ['Leo', '사자자리'],
  Moon: ['Cancer', '게자리'],
  Mercury: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Venus: ['Taurus', '황소자리', 'Libra', '천칭자리'],
  Mars: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Jupiter: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Saturn: ['Capricorn', '염소자리', 'Aquarius', '물병자리'],
  Uranus: ['Aquarius', '물병자리'],
  Neptune: ['Pisces', '물고기자리'],
  Pluto: ['Scorpio', '전갈자리'],
}
const EXALTATION: Record<string, string[]> = {
  Sun: ['Aries', '양자리'],
  Moon: ['Taurus', '황소자리'],
  Mercury: ['Virgo', '처녀자리'],
  Venus: ['Pisces', '물고기자리'],
  Mars: ['Capricorn', '염소자리'],
  Jupiter: ['Cancer', '게자리'],
  Saturn: ['Libra', '천칭자리'],
}
const DETRIMENT: Record<string, string[]> = {
  Sun: ['Aquarius', '물병자리'],
  Moon: ['Capricorn', '염소자리'],
  Mercury: ['Sagittarius', '사수자리', 'Pisces', '물고기자리'],
  Venus: ['Aries', '양자리', 'Scorpio', '전갈자리'],
  Mars: ['Libra', '천칭자리', 'Taurus', '황소자리'],
  Jupiter: ['Gemini', '쌍둥이자리', 'Virgo', '처녀자리'],
  Saturn: ['Cancer', '게자리', 'Leo', '사자자리'],
}
const FALL: Record<string, string[]> = {
  Sun: ['Libra', '천칭자리'],
  Moon: ['Scorpio', '전갈자리'],
  Mercury: ['Pisces', '물고기자리'],
  Venus: ['Virgo', '처녀자리'],
  Mars: ['Cancer', '게자리'],
  Jupiter: ['Capricorn', '염소자리'],
  Saturn: ['Aries', '양자리'],
}

export type DignityStatus = 'domicile' | 'exaltation' | 'detriment' | 'fall' | 'peregrine'

export function dignityOf(planet: string, sign: string): DignityStatus {
  if (DOMICILE[planet]?.includes(sign)) return 'domicile'
  if (EXALTATION[planet]?.includes(sign)) return 'exaltation'
  if (DETRIMENT[planet]?.includes(sign)) return 'detriment'
  if (FALL[planet]?.includes(sign)) return 'fall'
  return 'peregrine'
}

// ── Mode (cardinal/fixed/mutable) per sign ─────────────────
const SIGN_MODE: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal', Cancer: 'cardinal', Libra: 'cardinal', Capricorn: 'cardinal',
  Taurus: 'fixed', Leo: 'fixed', Scorpio: 'fixed', Aquarius: 'fixed',
  Gemini: 'mutable', Virgo: 'mutable', Sagittarius: 'mutable', Pisces: 'mutable',
  양자리: 'cardinal', 게자리: 'cardinal', 천칭자리: 'cardinal', 염소자리: 'cardinal',
  황소자리: 'fixed', 사자자리: 'fixed', 전갈자리: 'fixed', 물병자리: 'fixed',
  쌍둥이자리: 'mutable', 처녀자리: 'mutable', 사수자리: 'mutable', 물고기자리: 'mutable',
}

export interface AstroExtrasInput {
  dignities: Array<{ planet: string; sign: string; status: DignityStatus }>
  // Accidental dignity per planet (Lilly-style aggregate score).
  // tier: very_strong (>=8) / strong (>=4) / neutral (>=-2) / weak (>=-6) / very_weak (<-6)
  accidentals: Array<{ planet: string; score: number; tier: 'very_strong' | 'strong' | 'neutral' | 'weak' | 'very_weak'; reasons: string[] }>
  modeCount: Record<'cardinal' | 'fixed' | 'mutable', number>
  modeDominant: 'cardinal' | 'fixed' | 'mutable' | null
  retrograde: string[] // planet names
  stelliumByHouse: Array<{ house: number; planets: string[] }>
  stelliumBySign: Array<{ sign: string; planets: string[] }>
  houseCusps: Array<{ index: number; sign: string }>
  mutualReceptions: Array<{ a: string; b: string; aIn: string; bIn: string }>
  progressedAspects?: Array<{ progressed: string; natal: string; angle: number }>
  fixedStarConjunctions?: FixedStarConjunction[]
  // Classical Hellenistic additions:
  sect: 'day' | 'night'
  sectLight: 'Sun' | 'Moon'
  lotOfFortune: { longitude: number; sign: string; house: number }
  lotOfSpirit: { longitude: number; sign: string; house: number }
  triplicityRulers: Array<{ element: 'fire' | 'earth' | 'air' | 'water'; primary: string; secondary: string; participating: string }>
  profectionRuler?: { house: number; sign: string; ruler: string; rulerHouse: number }
  // Planetary Joys (each planet's "happy" house).
  planetaryJoys: Array<{ planet: string; joyHouse: number; inJoy: boolean }>
  // Simplified bonification/maltreatment per planet from natal aspects.
  bonifications: Array<{ planet: string; condition: 'bonified' | 'maltreated' | 'mixed' | 'neutral'; benefics: string[]; malefics: string[] }>
  // Zodiacal Releasing Level 1 from Lot of Spirit (default starting Lot).
  zodiacalReleasing?: {
    startingSign: string
    currentL1Sign: string
    currentL1Ruler: string
    currentL1StartAge: number
    currentL1EndAge: number
    isPeakPeriod: boolean // current sign angular (1/4/7/10) to starting sign
    isLoosingOfTheBond: boolean // current is 7th sign from starting (opposition transition)
  }
}

function computeExtras(natal: Chart): AstroExtrasInput {
  const planets = natal.planets

  // dignities
  const dignities: AstroExtrasInput['dignities'] = []
  for (const p of planets) {
    const status = dignityOf(p.name, p.sign)
    dignities.push({ planet: p.name, sign: p.sign, status })
  }

  // mode dist
  const modeCount: AstroExtrasInput['modeCount'] = { cardinal: 0, fixed: 0, mutable: 0 }
  for (const p of planets) {
    const m = SIGN_MODE[p.sign]
    if (m) modeCount[m]++
  }
  const total = modeCount.cardinal + modeCount.fixed + modeCount.mutable || 1
  let modeDominant: AstroExtrasInput['modeDominant'] = null
  for (const m of ['cardinal', 'fixed', 'mutable'] as const) {
    if (modeCount[m] / total >= 0.5) modeDominant = m
  }

  // retrograde
  const retrograde = planets.filter((p) => p.retrograde).map((p) => p.name)

  // stellium by house
  const houseGroups = new Map<number, string[]>()
  for (const p of planets) {
    const arr = houseGroups.get(p.house) ?? []
    arr.push(p.name)
    houseGroups.set(p.house, arr)
  }
  const stelliumByHouse: AstroExtrasInput['stelliumByHouse'] = []
  for (const [house, list] of houseGroups) {
    if (list.length >= 3) stelliumByHouse.push({ house, planets: list })
  }

  // stellium by sign
  const signGroups = new Map<string, string[]>()
  for (const p of planets) {
    const arr = signGroups.get(p.sign) ?? []
    arr.push(p.name)
    signGroups.set(p.sign, arr)
  }
  const stelliumBySign: AstroExtrasInput['stelliumBySign'] = []
  for (const [sign, list] of signGroups) {
    if (list.length >= 3) stelliumBySign.push({ sign, planets: list })
  }

  // house cusp signs
  const houseCusps: AstroExtrasInput['houseCusps'] = (natal.houses ?? []).map((h) => ({
    index: h.index,
    sign: h.sign,
  }))

  // mutual receptions: planet A is in sign B's domicile sign, and B is in A's domicile sign.
  const mutualReceptions: AstroExtrasInput['mutualReceptions'] = []
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i]
      const b = planets[j]
      const aRulesBSign = DOMICILE[a.name]?.includes(b.sign)
      const bRulesASign = DOMICILE[b.name]?.includes(a.sign)
      if (aRulesBSign && bRulesASign) {
        mutualReceptions.push({ a: a.name, b: b.name, aIn: a.sign, bIn: b.sign })
      }
    }
  }

  // Accidental dignity (Lilly-style abridged):
  //   angular house (1/4/7/10) +5, succedent (2/5/8/11) +4, cadent (3/6/9/12) -2.
  //   Mercury / Saturn favor cadent → cadent +2 instead.
  //   Jupiter / Venus / Sun favor angular bonus.
  //   retrograde -5; combust (Sun within 8.5°) -5 not computed here.
  //   Direct + fast (speed > average) +2 — speed not always available; skip if missing.
  const ANGULAR = new Set([1, 4, 7, 10])
  const SUCCEDENT = new Set([2, 5, 8, 11])
  const CADENT_FRIENDLY = new Set(['Mercury', 'Saturn'])
  const accidentals: AstroExtrasInput['accidentals'] = []
  for (const p of planets) {
    let score = 0
    const reasons: string[] = []
    if (ANGULAR.has(p.house)) {
      score += 5; reasons.push(`angular house ${p.house} +5`)
    } else if (SUCCEDENT.has(p.house)) {
      score += 4; reasons.push(`succedent house ${p.house} +4`)
    } else {
      // cadent
      if (CADENT_FRIENDLY.has(p.name)) {
        score += 2; reasons.push(`cadent house ${p.house} (Mercury/Saturn favor) +2`)
      } else {
        score -= 2; reasons.push(`cadent house ${p.house} -2`)
      }
    }
    if (p.retrograde) {
      score -= 5; reasons.push('retrograde -5')
    } else if (typeof p.speed === 'number' && p.speed > 0) {
      // direct & moving
      score += 1; reasons.push('direct +1')
    }
    let tier: AstroExtrasInput['accidentals'][number]['tier']
    if (score >= 8) tier = 'very_strong'
    else if (score >= 4) tier = 'strong'
    else if (score >= -2) tier = 'neutral'
    else if (score >= -6) tier = 'weak'
    else tier = 'very_weak'
    accidentals.push({ planet: p.name, score, tier, reasons })
  }

  // ─── Sect (Hellenistic 낮/밤 차트 결정) ─────────────────
  // Day: Sun above horizon = houses 7-12. Night: houses 1-6.
  const sun = planets.find((p) => p.name === 'Sun')
  const moon = planets.find((p) => p.name === 'Moon')
  const sect: 'day' | 'night' = sun && sun.house >= 7 && sun.house <= 12 ? 'day' : 'night'
  const sectLight: 'Sun' | 'Moon' = sect === 'day' ? 'Sun' : 'Moon'

  // ─── Lot of Fortune & Lot of Spirit ─────────────────────
  // Fortune: 신체·재물 / Spirit: 정신·직업/소명. Spirit는 Fortune의 부호 반대.
  const SIGNS = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
  function findHouse(lon: number): number {
    if (!natal.houses || natal.houses.length !== 12) return 1
    for (let i = 0; i < 12; i++) {
      const cur = natal.houses[i].cusp
      const next = natal.houses[(i + 1) % 12].cusp
      const inBetween = cur < next ? lon >= cur && lon < next : lon >= cur || lon < next
      if (inBetween) return natal.houses[i].index
    }
    return 1
  }
  function lonToSignHouse(lonRaw: number) {
    const lon = ((lonRaw % 360) + 360) % 360
    return { longitude: lon, sign: SIGNS[Math.floor(lon / 30)] ?? '', house: findHouse(lon) }
  }
  let lotOfFortune: AstroExtrasInput['lotOfFortune'] = { longitude: 0, sign: '', house: 1 }
  let lotOfSpirit: AstroExtrasInput['lotOfSpirit'] = { longitude: 0, sign: '', house: 1 }
  if (sun && moon) {
    const ascLon = natal.ascendant.longitude
    const fortuneRaw = sect === 'day' ? ascLon + moon.longitude - sun.longitude : ascLon + sun.longitude - moon.longitude
    const spiritRaw = sect === 'day' ? ascLon + sun.longitude - moon.longitude : ascLon + moon.longitude - sun.longitude
    lotOfFortune = lonToSignHouse(fortuneRaw)
    lotOfSpirit = lonToSignHouse(spiritRaw)
  }

  // ─── Planetary Joys (Hellenistic) ────────────────────────
  const JOY_HOUSES: Record<string, number> = {
    Mercury: 1, Moon: 3, Venus: 5, Mars: 6, Sun: 9, Jupiter: 11, Saturn: 12,
  }
  const planetaryJoys: AstroExtrasInput['planetaryJoys'] = planets
    .filter((p) => p.name in JOY_HOUSES)
    .map((p) => ({ planet: p.name, joyHouse: JOY_HOUSES[p.name], inJoy: p.house === JOY_HOUSES[p.name] }))

  // ─── Bonification / Maltreatment (simplified) ───────────
  // Hellenistic 8-condition full system은 복잡. 간단판:
  // 각 행성에 대해 자연 길성(Jupiter/Venus)·흉성(Mars/Saturn)이 hard aspect(opp/sq)
  // 또는 conjunction을 5° 이내로 가하는지 체크. 한쪽만 → bonified/maltreated, 양쪽 → mixed.
  const NAT_BENEFICS = new Set(['Jupiter', 'Venus'])
  const NAT_MALEFICS = new Set(['Mars', 'Saturn'])
  const HARD_OR_CONJ = new Set(['conjunction', 'opposition', 'square'])
  const bonifications: AstroExtrasInput['bonifications'] = []
  for (const target of planets) {
    if (NAT_BENEFICS.has(target.name) || NAT_MALEFICS.has(target.name)) {
      // benefics·malefics 자체는 평가 대상에서 제외 (자기 자신 평가 의미 없음)
      continue
    }
    const benefics: string[] = []
    const malefics: string[] = []
    for (const ap of natal.planets) {
      if (ap === target) continue
      const diff = Math.abs(((ap.longitude - target.longitude + 540) % 360) - 180) // 0=opposition, 180=conj
      // simpler: any aspect within 5° at 0/60/90/120/180
      const angle = ((ap.longitude - target.longitude + 360) % 360)
      const closest = [0, 60, 90, 120, 180].reduce((best, a) => {
        const d = Math.min(Math.abs(angle - a), Math.abs(360 - angle - a))
        return d < best.d ? { a, d } : best
      }, { a: -1, d: 999 })
      void diff
      if (closest.d <= 5 && closest.a >= 0) {
        const aspectType = closest.a === 0 ? 'conjunction' : closest.a === 60 ? 'sextile' : closest.a === 90 ? 'square' : closest.a === 120 ? 'trine' : 'opposition'
        if (HARD_OR_CONJ.has(aspectType) || aspectType === 'trine') {
          if (NAT_BENEFICS.has(ap.name)) benefics.push(ap.name)
          if (NAT_MALEFICS.has(ap.name)) malefics.push(ap.name)
        }
      }
    }
    let condition: 'bonified' | 'maltreated' | 'mixed' | 'neutral' = 'neutral'
    if (benefics.length && malefics.length) condition = 'mixed'
    else if (benefics.length) condition = 'bonified'
    else if (malefics.length) condition = 'maltreated'
    bonifications.push({ planet: target.name, condition, benefics, malefics })
  }

  // ─── Triplicity rulers (Dorothean/Hellenistic) ──────────
  // primary = day ruler, secondary = night ruler, participating = third.
  const triplicityRulers: AstroExtrasInput['triplicityRulers'] = [
    { element: 'fire', primary: 'Sun', secondary: 'Jupiter', participating: 'Saturn' },
    { element: 'earth', primary: 'Venus', secondary: 'Moon', participating: 'Mars' },
    { element: 'air', primary: 'Saturn', secondary: 'Mercury', participating: 'Jupiter' },
    { element: 'water', primary: 'Venus', secondary: 'Mars', participating: 'Moon' },
  ]

  return {
    dignities,
    accidentals,
    modeCount,
    modeDominant,
    retrograde,
    stelliumByHouse,
    stelliumBySign,
    houseCusps,
    mutualReceptions,
    sect,
    sectLight,
    lotOfFortune,
    lotOfSpirit,
    triplicityRulers,
    planetaryJoys,
    bonifications,
    // profectionRuler is filled in build step (needs profectionHouse + house signs).
  }
}

export async function buildAstroNormalizerInput(input: AstroAdapterInput): Promise<AstroNormalizerInput> {
  const natalInput: NatalChartInput = {
    year: input.year, month: input.month, date: input.date,
    hour: input.hour, minute: input.minute,
    latitude: input.latitude, longitude: input.longitude, timeZone: input.timeZone,
  }

  const natalData = await calculateNatalChart(natalInput)
  const natal: Chart = toChart(natalData)
  const natalAspects = findNatalAspects(natal)

  const q = input.queryDate
  const pad = (n: number) => String(n).padStart(2, '0')
  const transitIso = `${q.getUTCFullYear()}-${pad(q.getUTCMonth() + 1)}-${pad(q.getUTCDate())}T${pad(q.getUTCHours())}:${pad(q.getUTCMinutes())}:00`
  const transits = await calculateTransitChart({
    iso: transitIso,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
  })
  const transitAspects = findTransitAspects(transits, natal).map(toAspectHit)

  let solarReturn: AstroNormalizerInput['solarReturn']
  let lunarReturn: AstroNormalizerInput['lunarReturn']
  if (input.includeSolarReturn !== false) {
    try {
      const sr = await calculateSolarReturn({ natal: natalInput, year: q.getFullYear() })
      solarReturn = { chart: sr }
    } catch {}
  }
  if (input.includeLunarReturn !== false) {
    try {
      const lr = await calculateLunarReturn({ natal: natalInput, year: q.getFullYear(), month: q.getMonth() + 1 })
      lunarReturn = { chart: lr }
    } catch {}
  }

  const extras = computeExtras(natal)

  if (input.includeProgression !== false) {
    try {
      const prog = await calculateSecondaryProgressions({ natal: natalInput, targetDate: transitIso })
      const aspects = findProgressedToNatalAspects(prog, natal)
      const flat: NonNullable<AstroExtrasInput['progressedAspects']> = []
      const ASPECT_ANGLES = [0, 60, 90, 120, 180]
      for (const row of aspects) {
        for (const a of row.aspects) {
          if (ASPECT_ANGLES.some((target) => Math.abs(a.angle - target) <= 1.5)) {
            flat.push({ progressed: row.planet, natal: a.target, angle: a.angle })
          }
        }
      }
      extras.progressedAspects = flat
    } catch {}
  }

  if (input.includeFixedStars !== false) {
    try {
      extras.fixedStarConjunctions = findFixedStarConjunctions(natal, input.year, 1.0)
    } catch {}
  }

  const profectionHouse = profectionHouseFor(input, q)

  // Profection ruler: traditional sign rulers used.
  // Profected sign = sign of natal house at profectionHouse cusp.
  const TRAD_RULER: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
    양자리: 'Mars', 황소자리: 'Venus', 쌍둥이자리: 'Mercury', 게자리: 'Moon',
    사자자리: 'Sun', 처녀자리: 'Mercury', 천칭자리: 'Venus', 전갈자리: 'Mars',
    사수자리: 'Jupiter', 염소자리: 'Saturn', 물병자리: 'Saturn', 물고기자리: 'Jupiter',
  }
  const profectedHouseObj = (natal.houses ?? []).find((h) => h.index === profectionHouse)
  if (profectedHouseObj) {
    const ruler = TRAD_RULER[profectedHouseObj.sign]
    if (ruler) {
      const rulerPlanet = natal.planets.find((p) => p.name === ruler)
      extras.profectionRuler = {
        house: profectionHouse,
        sign: profectedHouseObj.sign,
        ruler,
        rulerHouse: rulerPlanet?.house ?? profectionHouse,
      }
    }
  }

  // ─── Zodiacal Releasing Level 1 from Lot of Spirit ──────
  // Periods (Hellenistic minor years per planetary ruler):
  //   Sun=19, Moon=25, Mercury=20, Venus=8, Mars=15, Jupiter=12, Saturn=27
  // Sign rulers (traditional). Walk signs in zodiacal order from
  // Lot of Spirit's sign; each sign's period = ruler's planetary years.
  const SIGN_PERIODS: Record<string, { ruler: string; years: number }> = {
    Aries: { ruler: 'Mars', years: 15 },
    Taurus: { ruler: 'Venus', years: 8 },
    Gemini: { ruler: 'Mercury', years: 20 },
    Cancer: { ruler: 'Moon', years: 25 },
    Leo: { ruler: 'Sun', years: 19 },
    Virgo: { ruler: 'Mercury', years: 20 },
    Libra: { ruler: 'Venus', years: 8 },
    Scorpio: { ruler: 'Mars', years: 15 },
    Sagittarius: { ruler: 'Jupiter', years: 12 },
    Capricorn: { ruler: 'Saturn', years: 27 },
    Aquarius: { ruler: 'Saturn', years: 27 },
    Pisces: { ruler: 'Jupiter', years: 12 },
  }
  const SIGN_ORDER = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']

  const birthDate = new Date(input.year, input.month - 1, input.date)
  const ageDays = Math.max(0, (q.getTime() - birthDate.getTime()) / (24 * 3600 * 1000))
  const ageYears = ageDays / 365.25

  const startSign = extras.lotOfSpirit.sign
  if (startSign && SIGN_PERIODS[startSign]) {
    const startIdx = SIGN_ORDER.indexOf(startSign)
    let cursor = 0
    let curIdx = startIdx
    let l1StartAge = 0
    let l1EndAge = 0
    let l1Sign = ''
    let l1Ruler = ''
    let safety = 100
    while (safety-- > 0) {
      const sign = SIGN_ORDER[curIdx]
      const period = SIGN_PERIODS[sign].years
      l1StartAge = cursor
      l1EndAge = cursor + period
      l1Sign = sign
      l1Ruler = SIGN_PERIODS[sign].ruler
      if (ageYears < l1EndAge) break
      cursor = l1EndAge
      curIdx = (curIdx + 1) % 12
    }
    // Peak period: current sign angular to starting sign (positions 1, 4, 7, 10 from start in zodiacal order)
    const offsetFromStart = ((SIGN_ORDER.indexOf(l1Sign) - startIdx + 12) % 12) + 1
    const isPeakPeriod = [1, 4, 7, 10].includes(offsetFromStart)
    // Loosing of the bond: 7th sign from start (opposition transition; only signs >17.5y can produce it but the marker fires when releasing reaches the 7th)
    const isLoosingOfTheBond = offsetFromStart === 7
    extras.zodiacalReleasing = {
      startingSign: startSign,
      currentL1Sign: l1Sign,
      currentL1Ruler: l1Ruler,
      currentL1StartAge: l1StartAge,
      currentL1EndAge: l1EndAge,
      isPeakPeriod,
      isLoosingOfTheBond,
    }
  }

  return {
    natal,
    natalAspects,
    transits,
    transitAspects,
    solarReturn,
    lunarReturn,
    profectionHouse,
    extras,
  }
}
