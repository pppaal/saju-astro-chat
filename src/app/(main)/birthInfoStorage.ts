'use client'

/**
 * BirthInfo — small helpers for storing the user's birth info in
 * localStorage so they don't have to retype it across services.
 *
 * Used by:
 *   - The home page chat input ("@사주 추가" button)
 *   - The home recommendation chips (deeplinks pre-fill from this)
 */

export interface StoredBirthInfo {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:MM
  gender: 'male' | 'female'
  city?: string
  savedAt: string // ISO
}

const KEY = 'destinypal:birthInfo:v1'

export function getStoredBirthInfo(): StoredBirthInfo | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredBirthInfo
    if (!parsed?.birthDate || !parsed?.birthTime || !parsed?.gender) return null
    return parsed
  } catch {
    return null
  }
}

export function saveBirthInfo(info: Omit<StoredBirthInfo, 'savedAt'>): void {
  if (typeof window === 'undefined') return
  try {
    const payload: StoredBirthInfo = { ...info, savedAt: new Date().toISOString() }
    window.localStorage.setItem(KEY, JSON.stringify(payload))
  } catch {
    // ignore quota errors
  }
}

export function clearBirthInfo(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

/** Build a query string with birth info to deep-link a service prefilled. */
export function buildBirthQuery(info: StoredBirthInfo | null): string {
  if (!info) return ''
  const params = new URLSearchParams()
  params.set('birthDate', info.birthDate)
  params.set('birthTime', info.birthTime)
  params.set('gender', info.gender === 'male' ? 'M' : 'F')
  if (info.city) params.set('birthCity', info.city)
  return params.toString()
}
