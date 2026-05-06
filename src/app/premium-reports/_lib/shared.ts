import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { UserProfile } from '@/lib/userProfile'
import type { ReportProfileInput } from './types'

export type PremiumSajuData = {
  dayMasterElement: string
}

export type ReportTier = 'free' | 'premium'
export type ThemeType = 'love' | 'career' | 'wealth' | 'health' | 'family' | 'move'
export type PeriodType = 'daily' | 'monthly' | 'yearly'

export const REPORT_PROFILE_STORAGE_KEY = 'premiumReports:profileInput'

export function toReportTier(value: string | null): ReportTier {
  return value === 'free' ? 'free' : 'premium'
}

export function toThemeType(value: string | null): ThemeType | null {
  if (
    value === 'love' ||
    value === 'career' ||
    value === 'wealth' ||
    value === 'health' ||
    value === 'family' ||
    value === 'move'
  ) {
    return value
  }
  return null
}

export function toPeriodType(value: string | null): PeriodType {
  if (value === 'monthly' || value === 'yearly') {
    return value
  }
  return 'daily'
}

export function buildReportProfileInputFromUserProfile(
  profile: Pick<
    UserProfile,
    | 'name'
    | 'birthDate'
    | 'birthTime'
    | 'birthCity'
    | 'gender'
    | 'timezone'
    | 'latitude'
    | 'longitude'
  >
): ReportProfileInput | null {
  if (!profile.birthDate) {
    return null
  }

  return {
    name: profile.name || '사용자',
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || '12:00',
    birthCity: profile.birthCity,
    gender: profile.gender === 'Female' ? 'F' : profile.gender === 'Male' ? 'M' : undefined,
    timezone: profile.timezone,
    latitude: profile.latitude,
    longitude: profile.longitude,
  }
}

export function buildQueryReportProfileInput(
  searchParams: ReadonlyURLSearchParams | null,
  profile: Pick<
    UserProfile,
    'name' | 'birthTime' | 'birthCity' | 'gender' | 'timezone' | 'latitude' | 'longitude'
  >
): ReportProfileInput | null {
  const birthDate = searchParams?.get('birthDate') || ''
  if (!birthDate) {
    return null
  }

  const latitudeParam = searchParams?.get('lat')
  const longitudeParam = searchParams?.get('lon')
  const genderParam = searchParams?.get('gender')
  const latitude = latitudeParam ? Number(latitudeParam) : profile.latitude
  const longitude = longitudeParam ? Number(longitudeParam) : profile.longitude

  return {
    name: searchParams?.get('name') || profile.name || '사용자',
    birthDate,
    birthTime: searchParams?.get('birthTime') || profile.birthTime || '12:00',
    birthCity: searchParams?.get('birthCity') || profile.birthCity || undefined,
    timezone: searchParams?.get('timezone') || profile.timezone || 'Asia/Seoul',
    gender:
      genderParam === 'F' || genderParam === 'Female'
        ? 'F'
        : genderParam === 'M' || genderParam === 'Male'
          ? 'M'
          : profile.gender === 'Female'
            ? 'F'
            : profile.gender === 'Male'
              ? 'M'
              : undefined,
    latitude: Number.isFinite(latitude as number) ? (latitude as number) : undefined,
    longitude: Number.isFinite(longitude as number) ? (longitude as number) : undefined,
  }
}

export async function fetchPremiumSajuData(): Promise<PremiumSajuData | null> {
  try {
    const response = await fetch('/api/me/saju')
    const data = await response.json()
    if (data.success && data.hasSaju && data.saju?.dayMasterElement) {
      return data.saju as PremiumSajuData
    }
  } catch {
    // ignore and use fallback
  }
  return null
}

export interface UltimateContextRequestProfile {
  birthDate: string
  birthTime?: string | null
  /**
   * Accepts both the API canonical form (`male` / `female`) and the legacy
   * short form used by the report profile form (`M` / `F`). Mapped to the
   * canonical form before the request is sent.
   */
  gender?: 'male' | 'female' | 'M' | 'F' | null
  calendarType?: 'solar' | 'lunar' | null
  lunarLeap?: boolean | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
}

function normaliseGender(
  gender: UltimateContextRequestProfile['gender']
): 'male' | 'female' {
  if (gender === 'female' || gender === 'F') return 'female'
  return 'male'
}

/**
 * Flattens a legacy AIPremiumReport / TimingAIPremiumReport sections object
 * into a flat string map of [sectionKey] => narrativeText. The
 * ultimate-narrative endpoint feeds this into the LLM prompt as
 * "이전 단계 분석 텍스트" for grounding.
 */
export function flattenLegacySections(report: unknown): Record<string, string> {
  if (!report || typeof report !== 'object') return {}
  const root = report as Record<string, unknown>
  const sections = root.sections
  if (!sections || typeof sections !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(sections as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim().length > 0) {
      out[key] = value
      continue
    }
    if (key === 'domains' && value && typeof value === 'object') {
      for (const [domainKey, domainValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof domainValue === 'string' && domainValue.trim().length > 0) {
          out[domainKey] = domainValue
        }
      }
    }
  }
  return out
}

export function extractMatrixHints(
  report: unknown
): UltimateNarrativeRequest['matrixHints'] {
  if (!report || typeof report !== 'object') return undefined
  const root = report as Record<string, unknown>
  const ms = root.matrixSummary
  if (!ms || typeof ms !== 'object') return undefined
  const obj = ms as Record<string, unknown>
  return {
    overallScore:
      typeof obj.overallScore === 'number' ? obj.overallScore : undefined,
    grade: typeof obj.grade === 'string' ? obj.grade : undefined,
    topInsights: Array.isArray(obj.topInsights)
      ? (obj.topInsights as unknown[]).filter((s): s is string => typeof s === 'string')
      : undefined,
    keyStrengths: Array.isArray(obj.keyStrengths)
      ? (obj.keyStrengths as unknown[]).filter((s): s is string => typeof s === 'string')
      : undefined,
    keyChallenges: Array.isArray(obj.keyChallenges)
      ? (obj.keyChallenges as unknown[]).filter((s): s is string => typeof s === 'string')
      : undefined,
  }
}

export interface UltimateNarrativeRequest {
  period: 'monthly' | 'yearly' | 'comprehensive'
  periodLabel?: string
  targetDate?: string
  computed: unknown
  legacySections?: Record<string, string>
  matrixHints?: {
    overallScore?: number
    grade?: string
    topInsights?: string[]
    keyStrengths?: string[]
    keyChallenges?: string[]
  }
}

/**
 * Calls /api/premium-reports/ultimate-narrative to get the LLM-authored
 * UltimateCore. Returns null on failure so the result page falls back to
 * the heuristic adapter built from the legacy sections.
 */
export async function fetchUltimateCore(
  request: UltimateNarrativeRequest
): Promise<unknown> {
  try {
    const response = await fetch('/api/premium-reports/ultimate-narrative', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
    const data = await response.json()
    if (data?.success && data?.data?.core) {
      return data.data.core
    }
    if (data?.core) {
      return data.core
    }
  } catch {
    // ignore — fallback adapter will run on the result page
  }
  return null
}

/**
 * Calls /api/premium-reports/ultimate-context to compute the deterministic
 * saju + astrology slice that the UltimateReport visual needs. Returns the
 * raw `computed` payload, or null if any required input is missing or the
 * request fails. The result page will fall back to the legacy layout when
 * this returns null.
 */
export async function fetchUltimateComputed(
  profile: UltimateContextRequestProfile
): Promise<unknown> {
  if (!profile.birthDate || !profile.timezone) return null
  if (typeof profile.latitude !== 'number' || typeof profile.longitude !== 'number') {
    return null
  }
  try {
    const response = await fetch('/api/premium-reports/ultimate-context', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        birthDate: profile.birthDate,
        birthTime: profile.birthTime || '00:00',
        gender: normaliseGender(profile.gender),
        calendarType: profile.calendarType || 'solar',
        lunarLeap: !!profile.lunarLeap,
        timezone: profile.timezone,
        latitude: profile.latitude,
        longitude: profile.longitude,
      }),
    })
    const data = await response.json()
    if (data?.success && data?.data?.computed) {
      return data.data.computed
    }
    if (data?.computed) {
      return data.computed
    }
  } catch {
    // ignore — result page will fall back to legacy layout
  }
  return null
}

export function saveStoredReportProfile(profile: ReportProfileInput): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(REPORT_PROFILE_STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // ignore storage failures
  }
}

export function loadStoredReportProfile(): ReportProfileInput | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(REPORT_PROFILE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ReportProfileInput
    return parsed?.birthDate ? parsed : null
  } catch {
    return null
  }
}
