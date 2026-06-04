/**
 * Almuten Figuris — the "victor" / overall ruler of the chart (classical &
 * medieval technique; Ibn Ezra · al-Biruni). For each hylegiacal point we tally
 * the planets ruling it at the five essential-dignity levels and sum across the
 * points; the planet with the highest total is the Almuten Figuris.
 *
 * Dignity weights (classical):
 *   domicile +5 · exaltation +4 · triplicity +3 · term(bound) +2 · face(decan) +1
 *
 * Here we use the 4-point set — Sun · Moon · Ascendant · Part of Fortune — and
 * omit the prenatal lunation (syzygy), which needs a separate ephemeris pass.
 * ALL dignity tables are reused from ./dignities (single source of truth) — this
 * module only orchestrates the tally, it does not redefine rulerships.
 */
import type { Chart } from './types'
import { DOMICILE, EXALTATION, triplicityOf, termRulerAt, faceRulerAt } from './dignities'

const SIGN_NAMES = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const

// 전통 7행성만 essential dignity 를 가진다 (외행성·노드 제외 — dignities.ts 와 동일 교리).
const TRAD_PLANETS = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const

const WEIGHT = { domicile: 5, exaltation: 4, triplicity: 3, term: 2, face: 1 } as const

export interface AlmutenFigurisInput {
  chart: Chart
  sect: 'day' | 'night'
  /** Part of Fortune longitude (0..360). 생략하면 Sun/Moon/ASC 3점만 채점. */
  fortune?: { longitude: number }
}

export interface AlmutenPointBreakdown {
  point: 'Sun' | 'Moon' | 'ASC' | 'Fortune'
  sign: string
  degree: number // within-sign 0..30
  rulers: {
    domicile: string | null
    exaltation: string | null
    triplicity: string | null
    term: string | null
    face: string | null
  }
}

export interface AlmutenFigurisResult {
  /** 최고 점수 행성 (동점이면 winners[0]). 점수 0 이면 null. */
  winner: string | null
  /** 최고 점수에서 동점인 행성 전부. */
  winners: string[]
  /** 행성 → 누적 dignity 점수. */
  scores: Record<string, number>
  /** 점별 위계 ruler 내역 (감사·해석용). */
  points: AlmutenPointBreakdown[]
}

function signAndDegree(longitude: number): { sign: string; degree: number } {
  const lon = ((longitude % 360) + 360) % 360
  const idx = Math.floor(lon / 30)
  return { sign: SIGN_NAMES[idx], degree: lon - idx * 30 }
}

function domicileRulerOf(sign: string): string | null {
  for (const p of TRAD_PLANETS) if (DOMICILE[p]?.includes(sign)) return p
  return null
}

function exaltationRulerOf(sign: string): string | null {
  for (const p of TRAD_PLANETS) if (EXALTATION[p]?.includes(sign)) return p
  return null
}

// in-sect 주(主) triplicity lord — 주간생은 day lord, 야간생은 night lord.
function triplicityRulerOf(sign: string, dayBirth: boolean): string | null {
  const want = dayBirth ? 'day' : 'night'
  for (const p of TRAD_PLANETS) if (triplicityOf(p, sign, dayBirth) === want) return p
  return null
}

export function calculateAlmutenFiguris(input: AlmutenFigurisInput): AlmutenFigurisResult {
  const { chart, sect, fortune } = input
  const dayBirth = sect === 'day'

  const candidates: Array<{ point: AlmutenPointBreakdown['point']; longitude?: number }> = [
    { point: 'Sun', longitude: chart?.planets?.find((p) => p.name === 'Sun')?.longitude },
    { point: 'Moon', longitude: chart?.planets?.find((p) => p.name === 'Moon')?.longitude },
    { point: 'ASC', longitude: chart?.ascendant?.longitude },
    { point: 'Fortune', longitude: fortune?.longitude },
  ]

  const scores: Record<string, number> = {}
  for (const p of TRAD_PLANETS) scores[p] = 0
  const add = (planet: string | null, weight: number) => {
    if (planet && planet in scores) scores[planet] += weight
  }

  const points: AlmutenPointBreakdown[] = []
  for (const c of candidates) {
    if (typeof c.longitude !== 'number' || !Number.isFinite(c.longitude)) continue
    const { sign, degree } = signAndDegree(c.longitude)
    const rulers = {
      domicile: domicileRulerOf(sign),
      exaltation: exaltationRulerOf(sign),
      triplicity: triplicityRulerOf(sign, dayBirth),
      term: termRulerAt(sign, degree),
      face: faceRulerAt(sign, degree),
    }
    add(rulers.domicile, WEIGHT.domicile)
    add(rulers.exaltation, WEIGHT.exaltation)
    add(rulers.triplicity, WEIGHT.triplicity)
    add(rulers.term, WEIGHT.term)
    add(rulers.face, WEIGHT.face)
    points.push({ point: c.point, sign, degree: Number(degree.toFixed(2)), rulers })
  }

  let top = -Infinity
  for (const p of TRAD_PLANETS) if (scores[p] > top) top = scores[p]
  const winners = top > 0 ? TRAD_PLANETS.filter((p) => scores[p] === top) : []

  return { winner: winners[0] ?? null, winners, scores, points }
}
