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
  DOMICILE,
  EXALTATION,
  dignityOf,
  type DignityStatus,
} from '@/lib/astrology/foundation/dignities'
import {
  calculateTransitChart,
  findTransitAspects,
  type TransitAspect,
} from '@/lib/astrology/foundation/transit'
import { calculateSolarReturn, calculateLunarReturn } from '@/lib/astrology/foundation/returns'
import {
  calculateSecondaryProgressions,
  findProgressedToNatalAspects,
} from '@/lib/astrology/foundation/progressions'
import {
  findFixedStarConjunctions,
  type FixedStarConjunction,
} from '@/lib/astrology/foundation/fixedStars'
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
  return {
    from: t.from,
    to: t.to,
    type: t.type,
    orb: t.orb,
    applying: t.isApplying,
    score: t.score,
  }
}

function profectionHouseFor(
  birth: { year: number; month: number; date: number },
  queryDate: Date
): number {
  const birthDate = new Date(birth.year, birth.month - 1, birth.date)
  const ageYears = Math.floor(
    (queryDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 3600 * 1000)
  )
  return (Math.max(0, ageYears) % 12) + 1
}

// Essential dignities live in `@/lib/astrology/foundation/dignities`.
// Re-exported here for backwards-compatible imports of `DignityStatus` /
// `dignityOf` from `@/lib/fusion/adapters/astro`.
export { dignityOf } from '@/lib/astrology/foundation/dignities'
export type { DignityStatus } from '@/lib/astrology/foundation/dignities'

// ── Mode (cardinal/fixed/mutable) per sign ─────────────────
const SIGN_MODE: Record<string, 'cardinal' | 'fixed' | 'mutable'> = {
  Aries: 'cardinal',
  Cancer: 'cardinal',
  Libra: 'cardinal',
  Capricorn: 'cardinal',
  Taurus: 'fixed',
  Leo: 'fixed',
  Scorpio: 'fixed',
  Aquarius: 'fixed',
  Gemini: 'mutable',
  Virgo: 'mutable',
  Sagittarius: 'mutable',
  Pisces: 'mutable',
  양자리: 'cardinal',
  게자리: 'cardinal',
  천칭자리: 'cardinal',
  염소자리: 'cardinal',
  황소자리: 'fixed',
  사자자리: 'fixed',
  전갈자리: 'fixed',
  물병자리: 'fixed',
  쌍둥이자리: 'mutable',
  처녀자리: 'mutable',
  사수자리: 'mutable',
  물고기자리: 'mutable',
}

export interface AstroExtrasInput {
  dignities: Array<{ planet: string; sign: string; status: DignityStatus }>
  // Accidental dignity per planet (Lilly-style aggregate score).
  // tier: very_strong (>=8) / strong (>=4) / neutral (>=-2) / weak (>=-6) / very_weak (<-6)
  accidentals: Array<{
    planet: string
    score: number
    tier: 'very_strong' | 'strong' | 'neutral' | 'weak' | 'very_weak'
    reasons: string[]
  }>
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
  triplicityRulers: Array<{
    element: 'fire' | 'earth' | 'air' | 'water'
    primary: string
    secondary: string
    participating: string
  }>
  profectionRuler?: { house: number; sign: string; ruler: string; rulerHouse: number }
  // Planetary Joys (each planet's "happy" house).
  planetaryJoys: Array<{ planet: string; joyHouse: number; inJoy: boolean }>
  // Hellenistic 7-condition bonification/maltreatment per planet.
  // Each condition tracked separately so rules can target specific patterns.
  bonifications: Array<{
    planet: string
    condition: 'bonified' | 'maltreated' | 'mixed' | 'neutral'
    benefics: string[]
    malefics: string[]
    // Detailed conditions (true if pattern detected):
    conditions: {
      adherence?: { by: string; orb: number } // applying conjunction within 3°
      strikingRay?: { by: string; orb: number } // applying square within 3°
      overcoming?: { by: string } // sign-based superior square (10th from)
      opposition?: { by: string } // sign-based opposition
      enclosure?: { left: string; right: string } // besieged between two planets
      reception?: { by: string; method: 'domicile' | 'exaltation' }
    }
  }>
  // Combust / Cazimi / Under-Beams per planet (Sun proximity).
  combustState: Array<{
    planet: string
    state: 'cazimi' | 'combust' | 'under_beams' | 'free'
    orb: number
  }> // Zodiacal Releasing Level 1 from Lot of Spirit (default starting Lot).
  zodiacalReleasing?: {
    startingSign: string
    currentL1Sign: string
    currentL1Ruler: string
    currentL1StartAge: number
    currentL1EndAge: number
    isPeakPeriod: boolean // current sign angular (1/4/7/10) to starting sign
    isLoosingOfTheBond: boolean // current is 7th sign from starting (opposition transition)
    // L2 sub-period (months within L1).
    currentL2Sign?: string
    currentL2Ruler?: string
    currentL2StartAgeYears?: number
    currentL2EndAgeYears?: number
    isL2Peak?: boolean // L2 angular to L1 sign
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
      score += 5
      reasons.push(`angular house ${p.house} +5`)
    } else if (SUCCEDENT.has(p.house)) {
      score += 4
      reasons.push(`succedent house ${p.house} +4`)
    } else {
      // cadent
      if (CADENT_FRIENDLY.has(p.name)) {
        score += 2
        reasons.push(`cadent house ${p.house} (Mercury/Saturn favor) +2`)
      } else {
        score -= 2
        reasons.push(`cadent house ${p.house} -2`)
      }
    }
    if (p.retrograde) {
      score -= 5
      reasons.push('retrograde -5')
    } else if (typeof p.speed === 'number' && p.speed > 0) {
      // direct & moving
      score += 1
      reasons.push('direct +1')
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
  const SIGNS = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ]
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
    const fortuneRaw =
      sect === 'day'
        ? ascLon + moon.longitude - sun.longitude
        : ascLon + sun.longitude - moon.longitude
    const spiritRaw =
      sect === 'day'
        ? ascLon + sun.longitude - moon.longitude
        : ascLon + moon.longitude - sun.longitude
    lotOfFortune = lonToSignHouse(fortuneRaw)
    lotOfSpirit = lonToSignHouse(spiritRaw)
  }

  // ─── Planetary Joys (Hellenistic) ────────────────────────
  const JOY_HOUSES: Record<string, number> = {
    Mercury: 1,
    Moon: 3,
    Venus: 5,
    Mars: 6,
    Sun: 9,
    Jupiter: 11,
    Saturn: 12,
  }
  const planetaryJoys: AstroExtrasInput['planetaryJoys'] = planets
    .filter((p) => p.name in JOY_HOUSES)
    .map((p) => ({
      planet: p.name,
      joyHouse: JOY_HOUSES[p.name],
      inJoy: p.house === JOY_HOUSES[p.name],
    }))

  // ─── Bonification / Maltreatment (Hellenistic 7 conditions) ──
  // Per Demetra George (Ancient Astrology) + Robert Schmidt:
  //   1. Adherence — applying conjunction within 3°
  //   2. Striking with a ray — applying square within 3°
  //   3. Overcoming — sign-based superior square (10th sign from target)
  //   4. Opposition — sign-based 7th from target
  //   5. Enclosure — besieged between two planets within 7° on each side
  //   6. Bodily-aspect proximity (general 5° aspects, fallback)
  //   7. Reception — target in by-domicile-or-exaltation house of approaching planet (mitigation)
  const NAT_BENEFICS = new Set(['Jupiter', 'Venus'])
  const NAT_MALEFICS = new Set(['Mars', 'Saturn'])
  const SIGNS_LIST = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ]
  const signIdx = (s: string) => SIGNS_LIST.indexOf(s)

  const bonifications: AstroExtrasInput['bonifications'] = []
  for (const target of planets) {
    if (NAT_BENEFICS.has(target.name) || NAT_MALEFICS.has(target.name)) continue

    const conditions: AstroExtrasInput['bonifications'][number]['conditions'] = {}
    const benefics: string[] = []
    const malefics: string[] = []

    for (const ap of natal.planets) {
      if (ap === target) continue
      const isBenefic = NAT_BENEFICS.has(ap.name)
      const isMalefic = NAT_MALEFICS.has(ap.name)
      if (!isBenefic && !isMalefic) continue

      // Closest aspect angle 0-180
      const angle = (ap.longitude - target.longitude + 360) % 360
      const folded = angle > 180 ? 360 - angle : angle
      // applying = ap.speed - target.speed; if positive, ap moves toward target
      const isApplying = (ap.speed ?? 0) > (target.speed ?? 0) ? false : true

      // 1. Adherence (conjunction within 3°)
      if (folded <= 3) {
        if (isBenefic) {
          conditions.adherence = { by: ap.name, orb: folded }
          benefics.push(ap.name)
        }
        if (isMalefic) {
          conditions.adherence = { by: ap.name, orb: folded }
          malefics.push(ap.name)
        }
      }
      // 2. Striking with a ray (applying square within 3°)
      if (isApplying && Math.abs(folded - 90) <= 3) {
        conditions.strikingRay = { by: ap.name, orb: Math.abs(folded - 90) }
        if (isBenefic) benefics.push(ap.name)
        if (isMalefic) malefics.push(ap.name)
      }
      // 3. Overcoming (sign-based: ap is in 10th sign from target)
      const tIdx = signIdx(target.sign)
      const aIdx = signIdx(ap.sign)
      if (tIdx >= 0 && aIdx >= 0) {
        const dist = (aIdx - tIdx + 12) % 12
        if (dist === 9) {
          // 10th sign (0-indexed: target's sign + 9)
          conditions.overcoming = { by: ap.name }
          if (isBenefic && !benefics.includes(ap.name)) benefics.push(ap.name)
          if (isMalefic && !malefics.includes(ap.name)) malefics.push(ap.name)
        }
        // 4. Opposition (sign-based 7th)
        if (dist === 6) {
          conditions.opposition = { by: ap.name }
          if (isBenefic && !benefics.includes(ap.name)) benefics.push(ap.name)
          if (isMalefic && !malefics.includes(ap.name)) malefics.push(ap.name)
        }
      }
    }

    // 5. Enclosure: target's longitude has malefic on one side and another malefic on the other
    //    within 7° (or both benefics → bonification by enclosure).
    const others = planets.filter(
      (p) => p !== target && (NAT_BENEFICS.has(p.name) || NAT_MALEFICS.has(p.name))
    )
    const maleficsAround = others
      .map((p) => ({ p, signed: ((p.longitude - target.longitude + 540) % 360) - 180 }))
      .filter((o) => Math.abs(o.signed) <= 7)
    const leftMal = maleficsAround.find((o) => o.signed < 0 && NAT_MALEFICS.has(o.p.name))
    const rightMal = maleficsAround.find((o) => o.signed > 0 && NAT_MALEFICS.has(o.p.name))
    if (leftMal && rightMal) {
      conditions.enclosure = { left: leftMal.p.name, right: rightMal.p.name }
      if (!malefics.includes(leftMal.p.name)) malefics.push(leftMal.p.name)
      if (!malefics.includes(rightMal.p.name)) malefics.push(rightMal.p.name)
    }

    // 7. Reception (by domicile or exaltation): an aspecting benefic that rules target's sign
    //    counts as reception → mitigates maltreatment.
    for (const apName of benefics.slice()) {
      if (DOMICILE[apName]?.includes(target.sign)) {
        conditions.reception = { by: apName, method: 'domicile' }
        break
      }
      if (EXALTATION[apName]?.includes(target.sign)) {
        conditions.reception = { by: apName, method: 'exaltation' }
        break
      }
    }

    let condition: 'bonified' | 'maltreated' | 'mixed' | 'neutral' = 'neutral'
    if (benefics.length && malefics.length) condition = 'mixed'
    else if (benefics.length) condition = 'bonified'
    else if (malefics.length) condition = 'maltreated'
    bonifications.push({ planet: target.name, condition, benefics, malefics, conditions })
  }

  // ─── Combust / Under-the-Beams / Cazimi (Sun proximity) ──
  // - Cazimi: within 17 arc-minutes (≈0.283°) of Sun → planet strengthened
  // - Combust: within 8.5° of Sun → planet weakened
  // - Under the Beams: within 17° but not 8.5° → mildly weakened
  const combustState: Array<{
    planet: string
    state: 'cazimi' | 'combust' | 'under_beams' | 'free'
    orb: number
  }> = []
  if (sun) {
    for (const p of planets) {
      if (p.name === 'Sun') continue
      const angle = (p.longitude - sun.longitude + 360) % 360
      const folded = angle > 180 ? 360 - angle : angle
      let state: 'cazimi' | 'combust' | 'under_beams' | 'free' = 'free'
      if (folded < 0.283) state = 'cazimi'
      else if (folded < 8.5) state = 'combust'
      else if (folded < 17) state = 'under_beams'
      combustState.push({ planet: p.name, state, orb: folded })
    }
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
    combustState,
    // profectionRuler is filled in build step (needs profectionHouse + house signs).
  }
}

export async function buildAstroNormalizerInput(
  input: AstroAdapterInput
): Promise<AstroNormalizerInput> {
  const natalInput: NatalChartInput = {
    year: input.year,
    month: input.month,
    date: input.date,
    hour: input.hour,
    minute: input.minute,
    latitude: input.latitude,
    longitude: input.longitude,
    timeZone: input.timeZone,
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
      const lr = await calculateLunarReturn({
        natal: natalInput,
        year: q.getFullYear(),
        month: q.getMonth() + 1,
      })
      lunarReturn = { chart: lr }
    } catch {}
  }

  const extras = computeExtras(natal)

  if (input.includeProgression !== false) {
    try {
      const prog = await calculateSecondaryProgressions({
        natal: natalInput,
        targetDate: transitIso,
      })
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
    Aries: 'Mars',
    Taurus: 'Venus',
    Gemini: 'Mercury',
    Cancer: 'Moon',
    Leo: 'Sun',
    Virgo: 'Mercury',
    Libra: 'Venus',
    Scorpio: 'Mars',
    Sagittarius: 'Jupiter',
    Capricorn: 'Saturn',
    Aquarius: 'Saturn',
    Pisces: 'Jupiter',
    양자리: 'Mars',
    황소자리: 'Venus',
    쌍둥이자리: 'Mercury',
    게자리: 'Moon',
    사자자리: 'Sun',
    처녀자리: 'Mercury',
    천칭자리: 'Venus',
    전갈자리: 'Mars',
    사수자리: 'Jupiter',
    염소자리: 'Saturn',
    물병자리: 'Saturn',
    물고기자리: 'Jupiter',
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
  const SIGN_ORDER = [
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
    'Capricorn',
    'Aquarius',
    'Pisces',
  ]

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

    // ── L2 sub-periods (months within L1) ───────────────────
    // L2 starts from same L1 sign, with each sub-sign active for its
    // ruler's planetary years measured in MONTHS instead of years.
    const yearsIntoL1 = ageYears - l1StartAge
    const monthsIntoL1 = yearsIntoL1 * 12
    let l2Cursor = 0
    let l2Idx = SIGN_ORDER.indexOf(l1Sign)
    let l2Sign = l1Sign
    let l2Ruler = SIGN_PERIODS[l1Sign].ruler
    let l2StartMonths = 0
    let l2EndMonths = 0
    let l2Safety = 200
    while (l2Safety-- > 0) {
      const sign = SIGN_ORDER[l2Idx]
      const monthPeriod = SIGN_PERIODS[sign].years // years → months conversion: same numeric value
      l2StartMonths = l2Cursor
      l2EndMonths = l2Cursor + monthPeriod
      l2Sign = sign
      l2Ruler = SIGN_PERIODS[sign].ruler
      if (monthsIntoL1 < l2EndMonths) break
      l2Cursor = l2EndMonths
      l2Idx = (l2Idx + 1) % 12
    }
    const l2OffsetFromL1 = ((SIGN_ORDER.indexOf(l2Sign) - SIGN_ORDER.indexOf(l1Sign) + 12) % 12) + 1
    const isL2Peak = [1, 4, 7, 10].includes(l2OffsetFromL1)

    extras.zodiacalReleasing = {
      startingSign: startSign,
      currentL1Sign: l1Sign,
      currentL1Ruler: l1Ruler,
      currentL1StartAge: l1StartAge,
      currentL1EndAge: l1EndAge,
      isPeakPeriod,
      isLoosingOfTheBond,
      currentL2Sign: l2Sign,
      currentL2Ruler: l2Ruler,
      currentL2StartAgeYears: l1StartAge + l2StartMonths / 12,
      currentL2EndAgeYears: l1StartAge + l2EndMonths / 12,
      isL2Peak,
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
