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
