/**
 * User Profile Storage Utility
 *
 * Stores and retrieves user birth information across all services.
 * Uses localStorage for persistence and syncs with DB for authenticated users.
 */

import { logger } from '@/lib/logger'
import { toLongGender } from '@/lib/utils/gender'

const USER_PROFILE_KEY = 'destinypal_user_profile'

export interface UserProfile {
  birthDate?: string // YYYY-MM-DD format
  birthTime?: string // HH:MM format
  // 출생 시각 미상 명시 플래그 — '00:00'(실제 자정)과 "시간 모름" 구분.
  // undefined = 레거시 항목(소비처가 '00:00'=미상 휴리스틱으로 폴백).
  birthTimeUnknown?: boolean
  birthCity?: string // City name (e.g., "Seoul, KR")
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say'
  name?: string
  timezone?: string // IANA timezone (e.g., "Asia/Seoul")
  latitude?: number
  longitude?: number
  updatedAt?: string // ISO timestamp
}

/**
 * Get stored user profile from localStorage
 */
export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const stored = localStorage.getItem(USER_PROFILE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Fetch user profile from API (for authenticated users)
 * and sync to localStorage
 */
export async function fetchAndSyncUserProfile(): Promise<UserProfile> {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const res = await fetch('/api/me/profile', { cache: 'no-store' })
    if (!res.ok) {
      return getUserProfile()
    }

    const { user } = await res.json()
    if (!user) {
      return getUserProfile()
    }

    // Convert API response to UserProfile format
    const profile: UserProfile = {
      name: user.name || undefined,
      birthDate: user.birthDate || undefined,
      birthTime: user.birthTime || undefined,
      // DB 플래그(boolean)만 반영 — null(레거시 행)은 undefined 로 두어
      // 소비처의 '00:00'=미상 휴리스틱 폴백을 유지.
      birthTimeUnknown:
        typeof user.birthTimeUnknown === 'boolean' ? user.birthTimeUnknown : undefined,
      birthCity: user.birthCity || undefined,
      // The DB column has accumulated both legacy 'M'/'F' and current
      // 'male'/'female' (the zod schema normalizes inputs to the long
      // lowercase form before save). Without the helper, post-normalization
      // values land here as `undefined` and women see "Male" the next time
      // they open the profile.
      gender: toLongGender(user.gender),
      timezone: user.tzId || undefined,
      updatedAt: new Date().toISOString(),
    }

    // Sync to localStorage
    if (profile.birthDate || profile.birthTime || profile.name) {
      saveUserProfile(profile)
    }

    return profile
  } catch {
    return getUserProfile()
  }
}

/**
 * Save user profile to localStorage (merges with existing)
 */
export function saveUserProfile(profile: Partial<UserProfile>): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const existing = getUserProfile()
    const updated: UserProfile = {
      ...existing,
      ...profile,
      updatedAt: new Date().toISOString(),
    }
    localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(updated))
  } catch (error) {
    logger.warn('Failed to save user profile:', error)
  }
}

/**
 * Get only the birthdate from stored profile
 */
export function getStoredBirthDate(): string | undefined {
  return getUserProfile().birthDate
}

/**
 * Check if user has a complete profile for fortune services
 */
export function hasCompleteProfile(): boolean {
  const profile = getUserProfile()
  return !!(profile.birthDate && profile.birthTime)
}

/**
 * Clear stored user profile
 */
export function clearUserProfile(): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    localStorage.removeItem(USER_PROFILE_KEY)
  } catch {
    // Ignore errors
  }
}
