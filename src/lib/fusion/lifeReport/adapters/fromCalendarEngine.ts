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
//   - saju ultraAdvanced.hyeongchung + iljuDeep  (saju side, via main output)

import type { MainSajuOutput } from '@/lib/saju/main'
import type { Chart, ZodiacKo } from '@/lib/astrology/foundation/types'
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
import { analyzeRelations, toAnalyzeInputFromSaju } from '@/lib/saju/relations'
import type { RelationHit } from '@/lib/saju/types'
import { getTwelveStage } from '@/lib/saju/shinsal'
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
import { isNightChart } from '@/lib/astrology/foundation/extraPoints'
import { calculateMidpoints } from '@/lib/astrology/foundation/midpoints'

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

/** Extra Arabic Parts computed inside the adapter (Hellenistic Bonatti
 *  formulas) — not part of the 7-Lot standard set. */
export interface ExtraArabicPartEntry {
  name: 'Basis' | 'Captivity' | 'Daimon'
  longitude: number
  sign: ZodiacKo
  degreeInSign: number
  formula: string
}

/** A single ZR level-2 sub-period inside the active L1 chapter. */
export interface ZRSubEntry {
  index: number
  sign: ZodiacKo
  ruler: string
  startYear: number // absolute age (years from birth)
  endYear: number
  durationYears: number
}

/** A single saju 합/충/형/해/회 relation — natural-language friendly. */
export interface SajuRelationEntry {
  kind: '합' | '충' | '형' | '해' | '회' // 자연화된 종류
  rawKind: RelationHit['kind'] // 원래 종류 (디버그용)
  pillars: string[] // 관여한 기둥 (year/month/day/time)
  detail?: string
}

export interface SajuRelationsSummary {
  hap: SajuRelationEntry[]
  chung: SajuRelationEntry[]
  hyung: SajuRelationEntry[]
  hae: SajuRelationEntry[]
  hoe: SajuRelationEntry[]
  heavenly: SajuRelationEntry[] // 천간합·천간충
  earthly: SajuRelationEntry[] // 지지 합·충·형·파·해·원진
  total: number
  /** Pillar pair → narrative phrase. e.g. 'day-time' → '일간이 시지와 충돌해서'. */
  primaryAxisKo?: string
  primaryAxisEn?: string
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
  /** ZR L2 sub-periods inside the active L1 chapter. */
  zrSubPeriods?: ZRSubEntry[]
  /** Active ZR L2 sub-period for the current age. */
  zrSubCurrent?: ZRSubEntry
  /** 7 Hellenistic Lots, keyed by name. */
  arabicParts?: Partial<Record<ArabicLotName, ArabicLot>>
  /** Extra Hellenistic Lots (Basis, Captivity, Daimon). */
  arabicPartsExtra?: Partial<Record<'Basis' | 'Captivity' | 'Daimon', ExtraArabicPartEntry>>
  /** Essential dignity score per planet (domicile/exalt/detr/fall/peregrine). */
  dignities?: DignityEntry[]
  /** Strength + top conjunctions for harmonics 5 / 7 / 9 (deterministic). */
  harmonics?: Partial<Record<5 | 7 | 9, HarmonicSummary>>
  /** Draconic-chart soul-summary (Sun in draconic, archetype, purpose, …). */
  draconicSummary?: DraconicSummaryEntry
  /** Saju hyeongchung pattern summary — natal-pillar internal interactions. */
  sajuHyeongchung?: {
    hapCount: number
    chungCount: number
    hyungCount: number
    haeCount: number
    hasInteractions: boolean
    summary: string[] // e.g. ['년-월 합', '일-시 충']
  }
  /** Detailed saju 합·충·형·해·회 relations (천간/지지) — natural-language ready. */
  sajuRelations?: SajuRelationsSummary
  /** 12운성 of all 4 pillars (strong / weak / neutral). */
  twelveStageAll?: {
    year?: string
    month?: string
    day?: string
    time?: string
  }
  /**
   * Key composite midpoints surfaced across report sections:
   * Sun/Moon (영혼의 점·headline), Venus/Mars (열정의 점·love),
   * Venus/Jupiter (풍요의 점·money), Jupiter/Saturn (성공의 점·career),
   * Moon/Saturn (감정적 성숙의 점·family), Mars/Saturn (절제된 행동의 점·health).
   */
  midpoints?: Array<{ id: string; sign: string; name_ko: string; keywords: string[] }>
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
  const input = (saju.input ?? {}) as {
    birthDate?: string
    year?: number
    month?: number
    date?: number
  }
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
      calculateProfectionTimeline(minimalChart, age, age + 10)
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
    // Extra Hellenistic Lots — Basis / Captivity / Daimon
    const extras = safe(() => computeExtraArabicParts(chart, !nightChart, lots))
    if (extras && Object.keys(extras).length > 0) out.arabicPartsExtra = extras

    // Key composite midpoints surfaced per report section (see type doc above).
    const mids = safe(() => calculateMidpoints(chart))
    if (mids && mids.length > 0) {
      const wanted = new Set([
        'Sun/Moon',
        'Venus/Mars',
        'Venus/Jupiter',
        'Jupiter/Saturn',
        'Moon/Saturn',
        'Mars/Saturn',
      ])
      const picked = mids
        .filter((m) => wanted.has(m.id))
        .map((m) => ({ id: m.id, sign: m.sign, name_ko: m.name_ko, keywords: m.keywords }))
      if (picked.length > 0) out.midpoints = picked
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
          // Compute L2 sub-periods inside the active L1 chapter.
          const subs = safe(() => computeZRSubPeriods(active))
          if (subs && subs.length > 0) {
            out.zrSubPeriods = subs
            out.zrSubCurrent = subs.find((s) => age >= s.startYear && age < s.endYear)
          }
        } else {
          // fall back to first chapter
          out.zrCurrent = toZREntry(periods[0])
          if (periods[1]) out.zrNext = toZREntry(periods[1])
          const subs = safe(() => computeZRSubPeriods(periods[0]))
          if (subs && subs.length > 0) out.zrSubPeriods = subs
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
          topConjunctions: a.conjunctions.slice(0, 3).map((c) => c.planets.join('-')),
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

  // ── Saju hyeongchung snapshot (from ultraAdvanced.hyeongchung if present)
  const hcRaw = safeGetHyeongchung(saju)
  if (hcRaw) out.sajuHyeongchung = hcRaw

  // ── Detailed saju relations (천간합/지지합/충/형/해/회) via analyzeRelations.
  // Uses the read-only saju/relations engine — no calendar-engine modification.
  const rel = safeGetSajuRelations(saju)
  if (rel) out.sajuRelations = rel

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

// ─── Extra Arabic Parts (Bonatti formulas) — Basis / Captivity / Daimon ──
const ZODIAC_ORDER: ZodiacKo[] = [
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

function normDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function positionOf(longitude: number): {
  longitude: number
  sign: ZodiacKo
  degreeInSign: number
} {
  const lon = normDeg(longitude)
  return {
    longitude: lon,
    sign: ZODIAC_ORDER[Math.floor(lon / 30)],
    degreeInSign: lon % 30,
  }
}

function planetLongitude(chart: Chart, name: string): number | undefined {
  const p = chart.planets.find((x) => x.name === name)
  return p?.longitude
}

function computeExtraArabicParts(
  chart: Chart,
  isDayChart: boolean,
  lots: ArabicLot[] | undefined
): Partial<Record<'Basis' | 'Captivity' | 'Daimon', ExtraArabicPartEntry>> {
  const out: Partial<Record<'Basis' | 'Captivity' | 'Daimon', ExtraArabicPartEntry>> = {}
  const asc = chart.ascendant.longitude
  const fortune = lots?.find((l) => l.name === 'Fortune')
  const spirit = lots?.find((l) => l.name === 'Spirit')
  const mars = planetLongitude(chart, 'Mars')
  const saturn = planetLongitude(chart, 'Saturn')

  // Lot of Basis — ASC + lesser(Fortune,Spirit) - greater (Bonatti)
  if (fortune && spirit) {
    const lower = Math.min(fortune.longitude, spirit.longitude)
    const upper = Math.max(fortune.longitude, spirit.longitude)
    const basisLon = normDeg(asc + lower - upper)
    out.Basis = {
      name: 'Basis',
      ...positionOf(basisLon),
      formula: 'ASC + min(Fortune,Spirit) - max(Fortune,Spirit)',
    }
  }

  // Lot of Captivity (Imprisonment / Bondage) — Bonatti:
  //   day  : ASC + Saturn - Mars
  //   night: ASC + Mars - Saturn
  if (typeof mars === 'number' && typeof saturn === 'number') {
    const captivityLon = isDayChart ? normDeg(asc + saturn - mars) : normDeg(asc + mars - saturn)
    out.Captivity = {
      name: 'Captivity',
      ...positionOf(captivityLon),
      formula: isDayChart ? 'ASC + Saturn - Mars' : 'ASC + Mars - Saturn',
    }
  }

  // Lot of Daimon — historically = Lot of Spirit. We expose it as a separate
  // alias so domain narratives can speak of "다이몬·천재" without re-using the
  // Spirit label which we've reserved for career/wisdom.
  if (spirit) {
    out.Daimon = {
      name: 'Daimon',
      longitude: spirit.longitude,
      sign: spirit.sign,
      degreeInSign: spirit.degreeInSign,
      formula: `alias of Spirit (${spirit.formula})`,
    }
  }

  return out
}

// ─── ZR L2 sub-period computation ─────────────────────────────
// L2 inside an L1 chapter subdivides the chapter in zodiac order, starting
// from the L1 sign, with each sub-sign's ruler holding its own planet-years
// — proportionally compressed to fit inside the L1 chapter's total duration.
const SIGN_RULERS: Record<ZodiacKo, string> = {
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
}
const PLANET_YEARS_L2: Record<string, number> = {
  Sun: 19,
  Moon: 25,
  Mercury: 20,
  Venus: 8,
  Mars: 15,
  Jupiter: 12,
  Saturn: 27,
}

function computeZRSubPeriods(l1: ZRPeriod): ZRSubEntry[] {
  // Sum of all 12 planet-years (one per sign in zodiac order from L1 sign).
  // For each sub-sign with non-zero years, scale its proportion to fit the
  // L1 duration. The result is deterministic.
  const startIdx = ZODIAC_ORDER.indexOf(l1.sign)
  if (startIdx < 0) return []
  let total = 0
  const candidates: Array<{ sign: ZodiacKo; ruler: string; years: number }> = []
  for (let i = 0; i < 12; i++) {
    const sign = ZODIAC_ORDER[(startIdx + i) % 12]
    const ruler = SIGN_RULERS[sign]
    const years = PLANET_YEARS_L2[ruler] ?? 0
    if (years <= 0) continue
    candidates.push({ sign, ruler, years })
    total += years
  }
  if (total <= 0 || candidates.length === 0) return []
  // Scale to L1.durationYears.
  const subs: ZRSubEntry[] = []
  let cursor = l1.startYear
  candidates.forEach((c, i) => {
    const scaled = (c.years / total) * l1.durationYears
    const start = cursor
    const end = i === candidates.length - 1 ? l1.endYear : start + scaled
    subs.push({
      index: i,
      sign: c.sign,
      ruler: c.ruler,
      startYear: Number(start.toFixed(2)),
      endYear: Number(end.toFixed(2)),
      durationYears: Number((end - start).toFixed(2)),
    })
    cursor = end
  })
  return subs
}

// ─── saju relation summary helper ─────────────────────────────
function safeGetSajuRelations(saju: MainSajuOutput): SajuRelationsSummary | undefined {
  // We need raw pillar names; the saju output exposes stem/branch only.
  // analyzeRelations expects heavenlyStem.name / earthlyBranch.name so we
  // build that small shape defensively.
  const p = saju.pillars
  if (!p?.year?.stem || !p.day?.stem) return undefined
  const input = toAnalyzeInputFromSaju(
    {
      year: { heavenlyStem: { name: p.year.stem }, earthlyBranch: { name: p.year.branch } },
      month: { heavenlyStem: { name: p.month.stem }, earthlyBranch: { name: p.month.branch } },
      day: { heavenlyStem: { name: p.day.stem }, earthlyBranch: { name: p.day.branch } },
      time: { heavenlyStem: { name: p.time.stem }, earthlyBranch: { name: p.time.branch } },
    },
    p.day.stem
  )
  let hits: RelationHit[] = []
  try {
    hits = analyzeRelations(input)
  } catch {
    return undefined
  }
  if (hits.length === 0) return undefined

  const summary: SajuRelationsSummary = {
    hap: [],
    chung: [],
    hyung: [],
    hae: [],
    hoe: [],
    heavenly: [],
    earthly: [],
    total: 0,
  }
  for (const h of hits) {
    const entry: SajuRelationEntry = {
      kind: classifyRelationKind(h.kind),
      rawKind: h.kind,
      pillars: h.pillars as string[],
      detail: h.detail,
    }
    summary.total += 1
    switch (entry.kind) {
      case '합':
        summary.hap.push(entry)
        break
      case '충':
        summary.chung.push(entry)
        break
      case '형':
        summary.hyung.push(entry)
        break
      case '해':
        summary.hae.push(entry)
        break
      case '회':
        summary.hoe.push(entry)
        break
    }
    if (h.kind === '천간합' || h.kind === '천간충') {
      summary.heavenly.push(entry)
    } else if (h.kind !== '공망') {
      summary.earthly.push(entry)
    }
  }
  // Primary axis = the most prominent pillar-pair amongst chung/hap.
  const primary = pickPrimaryAxis(summary)
  if (primary) {
    summary.primaryAxisKo = primary.ko
    summary.primaryAxisEn = primary.en
  }
  return summary
}

function classifyRelationKind(k: RelationHit['kind']): SajuRelationEntry['kind'] {
  // 합 includes 천간합 + 지지육합. 회 covers 지지삼합·지지방합 (조합되어 모이는 결).
  if (k === '천간합' || k === '지지육합') return '합'
  if (k === '지지삼합' || k === '지지방합') return '회'
  if (k === '천간충' || k === '지지충') return '충'
  if (k === '지지형') return '형'
  if (k === '지지해' || k === '원진' || k === '지지파') return '해'
  // 공망 → '해' bucket (어긋남) as a final defensive fallback.
  return '해'
}

function pickPrimaryAxis(s: SajuRelationsSummary): { ko: string; en: string } | undefined {
  // Prefer day-time chung (most personally felt), then day-month, then year-month.
  const order: Array<{ kind: SajuRelationEntry['kind']; pair: [string, string] }> = [
    { kind: '충', pair: ['day', 'time'] },
    { kind: '충', pair: ['day', 'month'] },
    { kind: '형', pair: ['day', 'time'] },
    { kind: '합', pair: ['day', 'time'] },
    { kind: '합', pair: ['year', 'month'] },
    { kind: '충', pair: ['year', 'month'] },
  ]
  const pillarsLabelKo: Record<string, string> = {
    year: '년주',
    month: '월주',
    day: '일간',
    time: '시지',
  }
  const pillarsLabelEn: Record<string, string> = {
    year: 'early-life pillar',
    month: 'young-adulthood pillar',
    day: 'core nature',
    time: 'late-life pillar',
  }
  const kindVerbKo: Record<SajuRelationEntry['kind'], string> = {
    합: '조화롭게 결합해서',
    충: '팽팽하게 마주서서',
    형: '변형을 일으키며 닿아서',
    해: '은근히 어긋나서',
    회: '한자리에 모여서',
  }
  const kindVerbEn: Record<SajuRelationEntry['kind'], string> = {
    합: 'harmoniously joins',
    충: 'stands in tense opposition to',
    형: 'reshapes against',
    해: 'subtly misaligns with',
    회: 'gathers together with',
  }
  for (const cand of order) {
    const bucket =
      cand.kind === '합'
        ? s.hap
        : cand.kind === '충'
          ? s.chung
          : cand.kind === '형'
            ? s.hyung
            : cand.kind === '해'
              ? s.hae
              : s.hoe
    const hit = bucket.find(
      (e) =>
        e.pillars.length >= 2 &&
        cand.pair.includes(e.pillars[0]) &&
        cand.pair.includes(e.pillars[1])
    )
    if (hit) {
      const a = hit.pillars[0]
      const b = hit.pillars[1]
      const aKo = pillarsLabelKo[a] ?? a
      const bKo = pillarsLabelKo[b] ?? b
      return {
        ko: `${aKo}${endsWithBatchimAdapter(aKo) ? '이' : '가'} ${bKo}${endsWithBatchimAdapter(bKo) ? '과' : '와'} ${kindVerbKo[hit.kind]}`,
        en: `the ${pillarsLabelEn[a] ?? a} ${kindVerbEn[hit.kind]} the ${pillarsLabelEn[b] ?? b}`,
      }
    }
  }
  // Fallback: first chung or hap.
  const fallback = s.chung[0] ?? s.hap[0] ?? s.hyung[0]
  if (fallback && fallback.pillars.length >= 2) {
    const a = fallback.pillars[0]
    const b = fallback.pillars[1]
    const aKo = pillarsLabelKo[a] ?? a
    const bKo = pillarsLabelKo[b] ?? b
    return {
      ko: `${aKo}${endsWithBatchimAdapter(aKo) ? '이' : '가'} ${bKo}${endsWithBatchimAdapter(bKo) ? '과' : '와'} ${kindVerbKo[fallback.kind]}`,
      en: `the ${pillarsLabelEn[a] ?? a} ${kindVerbEn[fallback.kind]} the ${pillarsLabelEn[b] ?? b}`,
    }
  }
  return undefined
}

// 한글 받침 유무를 판별. 자음으로 끝나면 true (이/가 → 이, 과/와 → 과 선택).
function endsWithBatchimAdapter(s: string): boolean {
  if (!s) return false
  const last = s[s.length - 1]
  const code = last.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return false
  return (code - 0xac00) % 28 !== 0
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
  if (t && (t.year || t.month || t.day || t.time)) {
    return { year: t.year, month: t.month, day: t.day, time: t.time }
  }
  // Compute all 4 from the saju.shinsal helper (read-only — no calendar-engine
  // touch). Falls back to iljuDeep day-stage when stems/branches are absent.
  const p = saju.pillars
  if (p?.day?.stem) {
    try {
      const dayStem = p.day.stem
      return {
        year: p.year?.branch ? getTwelveStage(dayStem, p.year.branch) : undefined,
        month: p.month?.branch ? getTwelveStage(dayStem, p.month.branch) : undefined,
        day: p.day?.branch ? getTwelveStage(dayStem, p.day.branch) : undefined,
        time: p.time?.branch ? getTwelveStage(dayStem, p.time.branch) : undefined,
      }
    } catch {
      // fall through to legacy day-only fallback
    }
  }
  const day = u?.iljuDeep?.twelveStage
  if (day) return { day }
  return undefined
}
