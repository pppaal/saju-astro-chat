import type { ReadonlyURLSearchParams } from 'next/navigation'
import type { UserProfile } from '@/lib/userProfile'
import type { ReportProfileInput } from './types'

export type PremiumSajuData = {
  dayMasterElement: string
}

export type ReportTier = 'free' | 'premium'
export type ThemeType = 'love' | 'career' | 'wealth' | 'health' | 'family'
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
    value === 'family'
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
