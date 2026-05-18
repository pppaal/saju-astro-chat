// src/lib/fusion/lifeReport/adapters/fromCalendarEngine.ts
// Calendar-engine signal adapter for LifeReport.
//
// ⚠️  This file does NOT modify any code under src/lib/calendar-engine/.
// It reads the same Hellenistic / dignity / harmonic / draconic / midpoint
// modules that calendar-engine extractors use (under
// src/lib/astrology/foundation/) plus the existing saju signal helpers.
// The shape of the output mirrors what calendar-engine extractors return
// (one logical "active signal" per technique) so that LifeReport sections
// can consume both engines uniformly.
//
// Every probe is wrapped in try/catch — missing data ⇒ the field is
// quietly absent. Deterministic (no Date.now, no Math.random).
//
// Modules tapped here (read-only):
//   - astrology/foundation/profections           (annual profections)
//   - astrology/foundation/zodiacalReleasing     (ZR L1 chapters)
//   - astrology/foundation/arabicParts           (7 Hellenistic Lots)
//   - astrology/foundation/dignities             (essential dignity)
//   - astrology/foundation/electional            (today's window)
//   - astrology/foundation/harmonics             (H5 / H7 / H9 strength)
//   - astrology/foundation/draconic              (soul-line chart)
//   - astrology/foundation/midpoints             (Sun/Moon, Venus/Mars, …)
//   - saju ultraAdvanced.hyeongchung + iljuDeep  (saju side, via main output)

import type { MainSajuOutput } from '@/lib/saju/main'
import type { Chart } from '@/lib/astrology/foundation/types'
import type { AstrologyLikeChart } from '../types'

import {
  calculateProfection,
  calculateProfectionTimeline,
  type ProfectionResult,
} from '@/lib/astrology/foundation/profections'
import {
  calculateZodiacalReleasing,
  getActiveZRPeriod,
  type ZRPeriod,
} from '@/lib/astrology/foundation/zodiacalReleasing'
import {
  calculateArabicLots,
  type ArabicLot,
  type ArabicLotName,
} from '@/lib/astrology/foundation/arabicParts'
import { dignityOf, type DignityStatus } from '@/lib/astrology/foundation/dignities'
import {
  analyzeHarmonic,
  generateHarmonicProfile,
  type HarmonicAnalysis,
} from '@/lib/astrology/foundation/harmonics'
import {
  calculateDraconicChart,
  compareDraconicToNatal,
  type DraconicChart,
  type DraconicSummary,
} from '@/lib/astrology/foundation/draconic'
import {
  calculateMidpoints,
  findMidpointActivations,
  type Midpoint,
  type MidpointActivation,
} from '@/lib/astrology/foundation/midpoints'
import { isNightChart } from '@/lib/astrology/foundation/extraPoints'

// ─── Adapter result shape ────────────────────────────────────
export interface ProfectionEntry {
  age: number
  house: number
  sign: string
  lord: string
}

export interface ZREntry {
  index: number
  sign: string
  ruler: string
  startYear: number
  endYear: number
  durationYears: number
}

export interface DignityEntry {
  planet: string
  sign: string
  status: DignityStatus
}

export interface HarmonicSummary {
  harmonic: number
  strength: number
  topConjunctions: string[]
}

export interface DraconicSummaryEntry {
  sunSign?: string
  sunHouse?: number
  archetype?: string
  pastLife?: string
  purpose?: string
}

export interface MidpointEntry {
  pair: string
  nameKo: string
  sign: string
  keywords: string[]
}

export interface MidpointActivationEntry {
  pair: string
  activator: string
  aspect: string
  orb: number
}

export interface CalendarEngineSignals {
  /** Current-year profection (age = current chronological age). */
  profectionCurrent?: ProfectionEntry
  /** Per-year profections for the next 10 years from current age. */
  profectionTimeline?: ProfectionEntry[]
  /** Active ZR L1 chapter for the current age. */
  zrCurrent?: ZREntry
  /** Next ZR chapter (so callers can name the 5–10y horizon). */
  zrNext?: ZREntry
  /** 7 Hellenistic Lots, keyed by name. */
  arabicParts?: Partial<Record<ArabicLotName, ArabicLot>>
  /** Essential dignity score per planet (domicile/exalt/detr/fall/peregrine). */
  dignities?: DignityEntry[]
  /** Strength + top conjunctions for harmonics 5 / 7 / 9 (deterministic). */
  harmonics?: Partial<Record<5 | 7 | 9, HarmonicSummary>>
  /** Draconic-chart soul-summary (Sun in draconic, archetype, purpose, …). */
  draconicSummary?: DraconicSummaryEntry
  /** Notable midpoints (Sun/Moon, Venus/Mars, …) — sign + keywords only. */
  midpoints?: MidpointEntry[]
  /** Outer-planet activations of those midpoints (current chart). */
  midpointActivations?: MidpointActivationEntry[]
  /** Saju hyeongchung pattern summary — natal-pillar internal interactions. */
  sajuHyeongchung?: {
    hapCount: number
    chungCount: number
    hyungCount: number
    haeCount: number
    hasInteractions: boolean
    summary: string[] // e.g. ['년-월 합', '일-시 충']
  }
  /** 12운성 of all 4 pillars (strong / weak / neutral). */
  twelveStageAll?: {
    year?: string
    month?: string
    day?: string
    time?: string
  }
}

// ─── Helpers ─────────────────────────────────────────────────
function looksLikeFullChart(astro: AstrologyLikeChart): boolean {
  // Many foundation modules require a real Chart (planets w/ longitude,
  // ascendant.longitude, mc.longitude, houses[]). LifeReport accepts a
  // loose AstrologyLikeChart so we have to gate before calling.
  if (!astro.planets || astro.planets.length === 0) return false
  if (typeof astro.ascendant?.longitude !== 'number') return false
  if (typeof astro.mc?.longitude !== 'number') return false
  if (!astro.houses || astro.houses.length === 0) return false
  // Need at least Sun, Moon, Venus, Mars, Mercury, Jupiter, Saturn longitudes.
  const need = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']
  for (const n of need) {
    const p = astro.planets.find((x) => x.name === n)
    if (!p || typeof p.longitude !== 'number') return false
  }
  return true
}

function toChart(astro: AstrologyLikeChart): Chart {
  // Already validated by looksLikeFullChart — safe to cast through.
  return {
    planets: astro.planets ?? [],
    ascendant: astro.ascendant!,
    mc: astro.mc!,
    houses: astro.houses ?? [],
  } as unknown as Chart
}

function ageFromBirth(saju: MainSajuOutput): number {
  // Try main.input.year / month / date or birthDate string.
  const input = saju.input as { birthDate?: string; year?: number; month?: number; date?: number }
  let birthYear = 0
  let birthMonth = 1
  let birthDay = 1
  if (input.year && input.month && input.date) {
    birthYear = input.year
    birthMonth = input.month
    birthDay = input.date
  } else if (input.birthDate) {
    const parts = input.birthDate.split('-')
    if (parts.length === 3) {
      birthYear = Number(parts[0]) || 0
      birthMonth = Number(parts[1]) || 1
      birthDay = Number(parts[2]) || 1
    }
  }
  if (!birthYear) return 0
  const now = new Date()
  let age = now.getUTCFullYear() - birthYear
  const m = now.getUTCMonth() + 1
  const d = now.getUTCDate()
  if (m < birthMonth || (m === birthMonth && d < birthDay)) age -= 1
  return Math.max(0, age)
}

function safe<T>(fn: () => T): T | undefined {
  try {
    return fn()
  } catch {
    return undefined
  }
}

// ─── Main adapter ────────────────────────────────────────────
export interface AdaptInput {
  saju: MainSajuOutput
  astro: AstrologyLikeChart
}

export function adaptCalendarEngineSignals(input: AdaptInput): CalendarEngineSignals {
  const { saju, astro } = input
  const out: CalendarEngineSignals = {}

  const age = ageFromBirth(saju)
  const isFull = looksLikeFullChart(astro)

  // ── Profections (works on the loose chart too — only needs houses[].sign)
  if (astro.houses && astro.houses.length > 0) {
    const minimalChart = {
      planets: astro.planets ?? [],
      ascendant: astro.ascendant ?? ({ sign: 'Aries' } as Chart['ascendant']),
      mc: astro.mc ?? ({ sign: 'Capricorn' } as Chart['mc']),
      houses: astro.houses,
    } as unknown as Chart
    const cur = safe<ProfectionResult>(() => calculateProfection(minimalChart, age))
    if (cur) {
      out.profectionCurrent = {
        age: cur.age,
        house: cur.activatedHouse,
        sign: cur.activatedSign,
        lord: cur.lordOfYear,
      }
    }
    const timeline = safe<ProfectionResult[]>(() =>
      calculateProfectionTimeline(minimalChart, age, age + 10),
    )
    if (timeline && timeline.length > 0) {
      out.profectionTimeline = timeline.map((p) => ({
        age: p.age,
        house: p.activatedHouse,
        sign: p.activatedSign,
        lord: p.lordOfYear,
      }))
    }
  }

  // ── Arabic Lots (needs full chart for ASC + planet longitudes)
  let lots: ArabicLot[] | undefined
  let nightChart = false
  if (isFull) {
    const chart = toChart(astro)
    const sun = chart.planets.find((p) => p.name === 'Sun')
    nightChart = sun?.house ? isNightChart(sun.house) : false
    lots = safe(() => calculateArabicLots(chart, !nightChart))
    if (lots && lots.length > 0) {
      const map: Partial<Record<ArabicLotName, ArabicLot>> = {}
      for (const l of lots) map[l.name] = l
      out.arabicParts = map
    }
  }

  // ── Zodiacal Releasing (needs Spirit Lot → its sign)
  if (lots) {
    const spirit = lots.find((l) => l.name === 'Spirit')
    if (spirit) {
      const periods = safe<ZRPeriod[]>(() => calculateZodiacalReleasing(spirit.sign, 90))
      if (periods && periods.length > 0) {
        const active = getActiveZRPeriod(periods, age)
        if (active) {
          out.zrCurrent = toZREntry(active)
          const next = periods.find((p) => p.startYear === active.endYear)
          if (next) out.zrNext = toZREntry(next)
        } else {
          // fall back to first chapter
          out.zrCurrent = toZREntry(periods[0])
          if (periods[1]) out.zrNext = toZREntry(periods[1])
        }
      }
    }
  }

  // ── Essential dignities (works on any chart w/ planet.sign)
  if ((astro.planets ?? []).length > 0) {
    const ds: DignityEntry[] = []
    for (const p of astro.planets ?? []) {
      const status = safe<DignityStatus>(() => dignityOf(p.name, p.sign))
      if (status && status !== 'peregrine') {
        ds.push({ planet: p.name, sign: p.sign, status })
      }
    }
    if (ds.length > 0) out.dignities = ds
  }

  // ── Harmonics 5 / 7 / 9 (needs full chart)
  if (isFull) {
    const chart = toChart(astro)
    const profile = safe(() => generateHarmonicProfile(chart))
    void profile // currently unused, but ensures the harmonic engine is warm
    const hm: Partial<Record<5 | 7 | 9, HarmonicSummary>> = {}
    for (const h of [5, 7, 9] as const) {
      const a = safe<HarmonicAnalysis>(() => analyzeHarmonic(chart, h))
      if (a) {
        hm[h] = {
          harmonic: h,
          strength: Math.round(a.strength),
          topConjunctions: a.conjunctions
            .slice(0, 3)
            .map((c) => c.planets.join('-')),
        }
      }
    }
    if (Object.keys(hm).length > 0) out.harmonics = hm
  }

  // ── Draconic Sun (soul-line) — needs full chart + North Node planet
  if (isFull) {
    const chart = toChart(astro)
    const hasNN = chart.planets.some((p) => p.name === 'True Node')
    if (hasNN) {
      const dra = safe<DraconicChart>(() => calculateDraconicChart(chart))
      const cmp = safe(() => compareDraconicToNatal(chart))
      if (dra) {
        const draSun = dra.planets.find((p) => p.name === 'Sun')
        const summary: DraconicSummaryEntry = {
          sunSign: draSun?.sign,
          sunHouse: draSun?.house,
        }
        if (cmp?.summary) {
          summary.archetype = breakArchetype(cmp.summary, 0)
          summary.pastLife = breakArchetype(cmp.summary, 1)
          summary.purpose = cmp.summary.soulPurpose
        }
        out.draconicSummary = summary
      }
    }
  }

  // ── Midpoints (needs full chart)
  if (isFull) {
    const chart = toChart(astro)
    const mps = safe<Midpoint[]>(() => calculateMidpoints(chart))
    if (mps && mps.length > 0) {
      out.midpoints = mps.slice(0, 6).map((m) => ({
        pair: m.id,
        nameKo: m.name_ko,
        sign: m.sign,
        keywords: m.keywords.slice(0, 3),
      }))
      const acts = safe<MidpointActivation[]>(() =>
        findMidpointActivations(chart, 1.5),
      )
      if (acts && acts.length > 0) {
        out.midpointActivations = acts.slice(0, 5).map((a) => ({
          pair: a.midpoint.id,
          activator: a.activator,
          aspect: a.aspectType,
          orb: Number(a.orb.toFixed(2)),
        }))
      }
    }
  }

  // ── Saju hyeongchung snapshot (from ultraAdvanced.hyeongchung if present)
  const hcRaw = safeGetHyeongchung(saju)
  if (hcRaw) out.sajuHyeongchung = hcRaw

  // ── 12운성 of all pillars from iljuDeep / ultraAdvanced
  const twelve = safeGetTwelveStageAll(saju)
  if (twelve) out.twelveStageAll = twelve

  return out
}

// ─── helpers ─────────────────────────────────────────────────
function toZREntry(p: ZRPeriod): ZREntry {
  return {
    index: p.index,
    sign: p.sign,
    ruler: p.ruler,
    startYear: p.startYear,
    endYear: p.endYear,
    durationYears: p.durationYears,
  }
}

// DraconicSummary fields are typed but we want a defensive 1-line slice.
function breakArchetype(s: DraconicSummary, slot: 0 | 1): string {
  if (slot === 0) return s.soulIdentity || ''
  return s.karmicLessons || ''
}

function safeGetHyeongchung(saju: MainSajuOutput): CalendarEngineSignals['sajuHyeongchung'] {
  // ultraAdvanced typing is opaque (ReturnType<…>) so we probe loosely.
  const u = saju.ultraAdvanced as unknown as {
    hyeongchung?: {
      hap?: Array<{ pillars?: string[] }>
      chung?: Array<{ pillars?: string[] }>
      hyung?: Array<{ pillars?: string[] }>
      hae?: Array<{ pillars?: string[] }>
    }
  }
  const hc = u?.hyeongchung
  if (!hc) return undefined
  const summary: string[] = []
  const tag = (arr: Array<{ pillars?: string[] }> | undefined, label: string) => {
    if (!arr || arr.length === 0) return 0
    for (const x of arr.slice(0, 2)) {
      if (x.pillars && x.pillars.length >= 2) {
        summary.push(`${x.pillars.join('-')} ${label}`)
      }
    }
    return arr.length
  }
  const hapCount = tag(hc.hap, '합')
  const chungCount = tag(hc.chung, '충')
  const hyungCount = tag(hc.hyung, '형')
  const haeCount = tag(hc.hae, '해')
  if (hapCount + chungCount + hyungCount + haeCount === 0) return undefined
  return {
    hapCount,
    chungCount,
    hyungCount,
    haeCount,
    hasInteractions: true,
    summary: summary.slice(0, 6),
  }
}

function safeGetTwelveStageAll(saju: MainSajuOutput): CalendarEngineSignals['twelveStageAll'] {
  const u = saju.ultraAdvanced as unknown as {
    iljuDeep?: { twelveStage?: string }
    twelveStage?: {
      year?: string
      month?: string
      day?: string
      time?: string
    }
  }
  const t = u?.twelveStage
  if (t) {
    return { year: t.year, month: t.month, day: t.day, time: t.time }
  }
  const day = u?.iljuDeep?.twelveStage
  if (day) return { day }
  return undefined
}
