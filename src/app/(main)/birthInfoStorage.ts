'use client'

/**
 * BirthInfo — small helpers for storing the user's birth info in
 * localStorage so they don't have to retype it across services.
 *
 * Used by:
 *   - The home page chat input ("@사주 추가" button)
 *   - The home recommendation chips (deeplinks pre-fill from this)
 *
 * IMPORTANT: this module mirrors every write/clear into the canonical
 * `destinypal_user_profile` storage (see `src/lib/userProfile.ts`) so
 * downstream services (report / saju / astrology / calendar / counselor)
 * pick up the same birth info on first paint without re-prompting.
 * Reads also fall back to `userProfile` when the home key is empty.
 */

import {
  getUserProfile,
  saveUserProfile,
  clearUserProfile,
  type UserProfile,
} from '@/lib/userProfile'

export interface StoredBirthInfo {
  name?: string // 표시 이름 — 운명상담사/타로/궁합에 매핑
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:MM (a real value — '00:00' means midnight, NOT unknown)
  birthTimeUnknown?: boolean // explicit flag; set only when the user checked "I don't know my time"
  gender: 'male' | 'female'
  city?: string
  // Birth-place coordinates and timezone resolved from the city picker.
  // Downstream services (counselor, calendar, fortune) need these to compute
  // the hour pillar / houses correctly — without them the chain silently
  // falls back to Seoul. Optional because guest users may skip the city.
  latitude?: number
  longitude?: number
  timeZone?: string // IANA tz, e.g. "America/New_York"
  savedAt: string // ISO
}

const KEY = 'destinypal:birthInfo:v1'

function userProfileToBirthInfo(profile: UserProfile): StoredBirthInfo | null {
  if (!profile?.birthDate || !profile?.birthTime) return null
  const gender = profile.gender === 'Male' ? 'male' : profile.gender === 'Female' ? 'female' : null
  if (!gender) return null
  // birthTimeUnknown is intentionally not derived from `birthTime === '00:00'`
  // anymore: midnight is a real birth time, and people born at 자정 were
  // being silently flagged as "time unknown" everywhere downstream. The
  // unknown flag should only flip true when the user explicitly checked
  // the "I don't know my time" toggle (which travels via URL/profile as an
  // explicit boolean, not as a magic sentinel value).
  return {
    name: profile.name || undefined,
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    gender,
    city: profile.birthCity || undefined,
    latitude: profile.latitude,
    longitude: profile.longitude,
    timeZone: profile.timezone || undefined,
    savedAt: profile.updatedAt || new Date().toISOString(),
  }
}

function birthInfoToUserProfile(info: StoredBirthInfo): Partial<UserProfile> {
  return {
    name: info.name,
    birthDate: info.birthDate,
    birthTime: info.birthTime,
    gender: info.gender === 'male' ? 'Male' : 'Female',
    birthCity: info.city,
    latitude: info.latitude,
    longitude: info.longitude,
    timezone: info.timeZone,
  }
}

export function getStoredBirthInfo(): StoredBirthInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as StoredBirthInfo
      if (parsed?.birthDate && parsed?.birthTime && parsed?.gender) return parsed
    }
  } catch {
    // fall through to userProfile fallback
  }
  // Fallback: a downstream service or login sync may have populated
  // userProfile but not the home key — reuse that data so the home
  // shows pre-filled instead of asking again.
  try {
    return userProfileToBirthInfo(getUserProfile())
  } catch {
    return null
  }
}

export function saveBirthInfo(info: Omit<StoredBirthInfo, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  const payload: StoredBirthInfo = { ...info, savedAt: new Date().toISOString() }
  try {
    window.localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
  // Mirror to the canonical user profile so all other services see it.
  try {
    saveUserProfile(birthInfoToUserProfile(payload))
  } catch {
    // ignore — userProfile module already swallows storage errors,
    // but we wrap defensively in case it changes shape later.
  }
}

export function clearBirthInfo(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  try {
    clearUserProfile()
  } catch {
    // ignore
  }
}

/** Build a query string with birth info to deep-link a service prefilled. */
export function buildBirthQuery(info: StoredBirthInfo | null): string {
  if (!info) return ''
  const params = new URLSearchParams()
  if (info.name) params.set('name', info.name)
  params.set('birthDate', info.birthDate)
  params.set('birthTime', info.birthTime)
  params.set('gender', info.gender === 'male' ? 'M' : 'F')
  if (info.city) params.set('birthCity', info.city)
  if (info.birthTimeUnknown) params.set('birthTimeUnknown', '1')
  // useCounselorData reads sp.lat/sp.lon/sp.timeZone — without these it
  // falls back to Seoul coords + the browser's current tz, so the hour
  // pillar and houses come out wrong for anyone not in Asia/Seoul.
  if (typeof info.latitude === 'number') params.set('lat', String(info.latitude))
  if (typeof info.longitude === 'number') params.set('lon', String(info.longitude))
  if (info.timeZone) params.set('timeZone', info.timeZone)
  return params.toString()
}
