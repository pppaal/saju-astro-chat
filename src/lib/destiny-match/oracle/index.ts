/**
 * Destiny Match Oracle
 *
 * Combines a deterministic tarot draw with auspicious date/time recommendations
 * for a matched pair, anchored on the moment of the request ("asOf").
 *
 * Activity defaults to "meeting" but the caller can override (proposal,
 * engagement, travel, …) to reframe the date search.
 */

import { calculateSajuData } from '@/lib/saju/saju'
import {
  findBestDates,
  type ActivityType,
  type DateRecommendation,
} from '@/lib/prediction/specificDateEngine'
import { logger } from '@/lib/logger'
import { buildOracleSeed, drawRelationshipSpread, type RelationshipSpread } from './tarotDraw'

const RELATIONSHIP_ACTIVITIES = new Set<ActivityType>([
  'meeting',
  'proposal',
  'engagement',
  'marriage',
  'travel',
])

export const DEFAULT_ORACLE_ACTIVITY: ActivityType = 'meeting'

export interface OracleBirthInfo {
  birthDate: string // YYYY-MM-DD
  birthTime?: string
  gender?: string
  timezone?: string
}

export interface AuspiciousHour {
  hourRange: string
  quality: 'excellent' | 'good' | 'neutral'
  reason: string
}

export interface AuspiciousDate {
  date: string // YYYY-MM-DD
  dayOfWeek: string
  score: number // averaged across both partners (0-100)
  grade: 'S' | 'A' | 'B' | 'C' | 'D'
  reasons: string[]
  warnings: string[]
  bestHour: AuspiciousHour | null
}

export interface OracleReading {
  connectionId: string
  asOf: string
  activity: ActivityType
  tarot: RelationshipSpread
  auspicious: {
    activity: ActivityType
    windowDays: number
    dates: AuspiciousDate[]
  }
}

export interface OracleInput {
  connectionId: string
  asOf?: Date
  activity?: ActivityType
  windowDays?: number // default 14
  topN?: number // default 5
  person1: OracleBirthInfo
  person2: OracleBirthInfo
}

export function isRelationshipActivity(activity: string): activity is ActivityType {
  return RELATIONSHIP_ACTIVITIES.has(activity as ActivityType)
}

export async function getOracleReading(input: OracleInput): Promise<OracleReading> {
  const asOf = input.asOf ?? new Date()
  const activity: ActivityType = input.activity ?? DEFAULT_ORACLE_ACTIVITY
  const windowDays = input.windowDays ?? 14
  const topN = input.topN ?? 5

  // Tarot seed intentionally omits `activity` so cards stay stable when
  // the user toggles between meeting / proposal / etc. — only the date
  // list should change.
  const seed = buildOracleSeed({ connectionId: input.connectionId, asOf })
  const tarot = drawRelationshipSpread(seed)

  let dates: AuspiciousDate[] = []
  try {
    dates = computeJointDates({
      person1: input.person1,
      person2: input.person2,
      activity,
      asOf,
      windowDays,
      topN,
    })
  } catch (err) {
    logger.warn('[oracle] Date search failed, returning tarot only:', { err })
    dates = []
  }

  return {
    connectionId: input.connectionId,
    asOf: asOf.toISOString(),
    activity,
    tarot,
    auspicious: { activity, windowDays, dates },
  }
}

// ────────────────────────── internals ──────────────────────────

interface JointDateInput {
  person1: OracleBirthInfo
  person2: OracleBirthInfo
  activity: ActivityType
  asOf: Date
  windowDays: number
  topN: number
}

function computeJointDates(input: JointDateInput): AuspiciousDate[] {
  const dates1 = runFindBestDates(input.person1, input.activity, input.asOf, input.windowDays)
  const dates2 = runFindBestDates(input.person2, input.activity, input.asOf, input.windowDays)

  // Merge by date key — average the two scores, union reasons/warnings.
  const byDate = new Map<string, MergeAccumulator>()
  for (const rec of dates1) {
    pushIntoAccumulator(byDate, rec, 'a')
  }
  for (const rec of dates2) {
    pushIntoAccumulator(byDate, rec, 'b')
  }

  const merged: AuspiciousDate[] = []
  for (const acc of byDate.values()) {
    // Require both partners to have non-trivial fit; if only one returned a
    // record for this day, give them a small penalty rather than dropping it.
    const aScore = acc.a?.totalScore ?? acc.b!.totalScore - 10
    const bScore = acc.b?.totalScore ?? acc.a!.totalScore - 10
    const avg = (aScore + bScore) / 2
    const grade = scoreToGrade(avg)
    const winner = pickRichestRecord(acc.a, acc.b)

    const reasons = uniqueShortList([...(acc.a?.reasons ?? []), ...(acc.b?.reasons ?? [])])
    const warnings = uniqueShortList([...(acc.a?.warnings ?? []), ...(acc.b?.warnings ?? [])])

    const bestHourRaw = winner.bestHours?.[0]
    merged.push({
      date: acc.dateKey,
      dayOfWeek: winner.dayOfWeek,
      score: Math.round(Math.max(0, Math.min(100, avg))),
      grade,
      reasons,
      warnings,
      bestHour: bestHourRaw
        ? {
            hourRange: bestHourRaw.hourRange,
            quality: bestHourRaw.quality,
            reason: bestHourRaw.reason,
          }
        : null,
    })
  }

  merged.sort((a, b) => b.score - a.score)
  return merged.slice(0, input.topN)
}

interface MergeAccumulator {
  dateKey: string
  a?: DateRecommendation
  b?: DateRecommendation
}

function pushIntoAccumulator(
  map: Map<string, MergeAccumulator>,
  rec: DateRecommendation,
  side: 'a' | 'b'
) {
  const key = isoDateKey(rec.date)
  const existing = map.get(key) ?? { dateKey: key }
  existing[side] = rec
  map.set(key, existing)
}

function pickRichestRecord(
  a: DateRecommendation | undefined,
  b: DateRecommendation | undefined
): DateRecommendation {
  if (a && b) {
    return a.totalScore >= b.totalScore ? a : b
  }
  return (a ?? b)!
}

function isoDateKey(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function scoreToGrade(score: number): AuspiciousDate['grade'] {
  if (score >= 85) {
    return 'S'
  }
  if (score >= 70) {
    return 'A'
  }
  if (score >= 55) {
    return 'B'
  }
  if (score >= 40) {
    return 'C'
  }
  return 'D'
}

function uniqueShortList(items: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of items) {
    if (!item) {
      continue
    }
    if (seen.has(item)) {
      continue
    }
    seen.add(item)
    out.push(item)
    if (out.length >= 5) {
      break
    }
  }
  return out
}

function runFindBestDates(
  person: OracleBirthInfo,
  activity: ActivityType,
  asOf: Date,
  windowDays: number
): DateRecommendation[] {
  const saju = calculateSajuData(
    person.birthDate,
    person.birthTime || '12:00',
    person.gender === 'F' ? 'female' : 'male',
    'solar',
    person.timezone || 'Asia/Seoul'
  )

  const stems = [
    saju.pillars.year.heavenlyStem.name,
    saju.pillars.month.heavenlyStem.name,
    saju.pillars.day.heavenlyStem.name,
    saju.pillars.time.heavenlyStem.name,
  ]
  const branches = [
    saju.pillars.year.earthlyBranch.name,
    saju.pillars.month.earthlyBranch.name,
    saju.pillars.day.earthlyBranch.name,
    saju.pillars.time.earthlyBranch.name,
  ]

  return findBestDates({
    activity,
    dayStem: saju.pillars.day.heavenlyStem.name,
    dayBranch: saju.pillars.day.earthlyBranch.name,
    monthBranch: saju.pillars.month.earthlyBranch.name,
    yearBranch: saju.pillars.year.earthlyBranch.name,
    allStems: stems,
    allBranches: branches,
    startDate: asOf,
    searchDays: windowDays,
    topN: windowDays, // full search; we cap after merging
  })
}
