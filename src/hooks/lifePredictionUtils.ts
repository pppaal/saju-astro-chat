/**
 * lifePredictionUtils
 *
 * Pure utility functions and types for life prediction API.
 * Extracted from useLifePredictionAPI to reduce duplication.
 */

import { TimingPeriod } from '@/components/life-prediction/ResultCards/TimingCard'
import { EventType } from '@/components/life-prediction/PredictionChat/hooks/useEventTypeDetector'
import { UserProfile, GuestBirthInfo } from './useLifePredictionProfile'

export type { TimingPeriod, EventType }

/**
 * Birth info for prediction API
 */
export interface BirthInfo {
  birthDate: string
  birthTime: string
  gender: 'M' | 'F'
}

/**
 * Prediction result from API
 */
export interface PredictionResult {
  periods: TimingPeriod[]
  generalAdvice: string
}

/**
 * Raw period shape from API responses
 */
interface RawPeriod {
  startDate: string
  endDate: string
  score: number
  grade: string
  reasons: string[]
  specificDays?: string[]
  rank?: number
}

/**
 * Result of extracting saju pillars
 */
export interface SajuPillarData {
  dayStem: string
  dayBranch: string
  monthBranch: string
  yearBranch: string
  allStems: string[]
  allBranches: string[]
}

/**
 * Parse a birth date string "YYYY-MM-DD" into numeric components
 */
export function parseBirthDate(dateStr: string): [number, number, number] {
  return dateStr.split('-').map(Number) as [number, number, number]
}

/**
 * Transform a single raw period into a TimingPeriod.
 */
export function transformPeriod(
  p: RawPeriod,
  overrideReasons?: string[]
): TimingPeriod {
  return {
    startDate: p.startDate,
    endDate: p.endDate,
    score: p.score,
    grade: p.grade as 'S' | 'A+' | 'A' | 'B' | 'C' | 'D',
    reasons: overrideReasons || p.reasons || ['✨ 좋은 시기입니다'],
    specificDays: p.specificDays?.map((dateStr: string) => ({
      date: dateStr,
      quality: (p.score >= 85 ? 'excellent' : p.score >= 70 ? 'good' : 'neutral') as
        | 'excellent'
        | 'good'
        | 'neutral',
    })),
  }
}

/**
 * Transform raw API periods into TimingPeriod[].
 * Handles optional AI-explained reasons overlay.
 */
export function transformPeriods(
  optimalPeriods: RawPeriod[],
  aiExplainedPeriods?: { reasons: string[] }[] | null
): TimingPeriod[] {
  return optimalPeriods.map(
    (p: RawPeriod, index: number) =>
      transformPeriod(p, aiExplainedPeriods?.[index]?.reasons)
  )
}

/**
 * Extract saju pillars (stems and branches) from a saju calculation result.
 * Returns null if required data is missing.
 */
export function extractSajuPillars(
  sajuData: Record<string, unknown>
): SajuPillarData | null {
  const pillars = (sajuData as Record<string, unknown>).pillars as
    | Record<string, unknown>
    | undefined
  if (!pillars) {
    return null
  }

  const yearPillar = pillars.year as Record<string, unknown>
  const monthPillar = pillars.month as Record<string, unknown>
  const dayPillar = pillars.day as Record<string, unknown>
  const timePillar = pillars.time as Record<string, unknown>

  // Helper to safely get name property
  const getName = (obj: unknown): string => {
    if (obj && typeof obj === 'object' && 'name' in obj) {
      return String(obj.name)
    }
    return ''
  }

  // Extract stem/branch names
  const dayStem = getName(dayPillar.heavenlyStem) || getName(dayPillar.stem) || ''
  const dayBranch = getName(dayPillar.earthlyBranch) || getName(dayPillar.branch) || ''
  const monthBranch = getName(monthPillar.earthlyBranch) || getName(monthPillar.branch) || ''
  const yearBranch = getName(yearPillar.earthlyBranch) || getName(yearPillar.branch) || ''

  // Collect all stems/branches
  const allStems = [
    getName(yearPillar.heavenlyStem) || getName(yearPillar.stem),
    getName(monthPillar.heavenlyStem) || getName(monthPillar.stem),
    getName(dayPillar.heavenlyStem) || getName(dayPillar.stem),
    getName(timePillar.heavenlyStem) || getName(timePillar.stem),
  ].filter(Boolean)

  const allBranches = [
    getName(yearPillar.earthlyBranch) || getName(yearPillar.branch),
    getName(monthPillar.earthlyBranch) || getName(monthPillar.branch),
    getName(dayPillar.earthlyBranch) || getName(dayPillar.branch),
    getName(timePillar.earthlyBranch) || getName(timePillar.branch),
  ].filter(Boolean)

  if (!dayStem || !dayBranch) {
    return null
  }

  return { dayStem, dayBranch, monthBranch, yearBranch, allStems, allBranches }
}

/**
 * Resolve birth info from either user profile or guest birth info.
 * Returns null if no birth date is available.
 */
export function resolveBirthInfo(
  userProfile: UserProfile | null,
  guestBirthInfo: GuestBirthInfo | null
): BirthInfo | null {
  const birthInfo = userProfile?.birthDate
    ? {
        birthDate: userProfile.birthDate,
        birthTime: userProfile.birthTime || '12:00',
        gender: (userProfile.gender || 'M') as 'M' | 'F',
      }
    : guestBirthInfo

  if (!birthInfo?.birthDate) {
    return null
  }

  return {
    birthDate: birthInfo.birthDate,
    birthTime: birthInfo.birthTime || '12:00',
    gender: (birthInfo.gender || 'M') as 'M' | 'F',
  }
}
