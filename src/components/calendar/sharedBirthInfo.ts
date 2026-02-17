import type { BirthInfo } from './types'

const SHARED_BIRTH_INFO_KEY = 'calendar.sharedBirthInfo.v1'

const DEFAULT_BIRTH_INFO: BirthInfo = {
  birthDate: '',
  birthTime: '',
  birthPlace: '',
  gender: 'Male',
}

function normalizeGender(value: unknown): BirthInfo['gender'] {
  return value === 'Female' ? 'Female' : 'Male'
}

export function loadSharedBirthInfo(): BirthInfo | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SHARED_BIRTH_INFO_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<BirthInfo>
    return {
      ...DEFAULT_BIRTH_INFO,
      birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate : '',
      birthTime: typeof parsed.birthTime === 'string' ? parsed.birthTime : '',
      birthPlace: typeof parsed.birthPlace === 'string' ? parsed.birthPlace : '',
      gender: normalizeGender(parsed.gender),
      latitude: typeof parsed.latitude === 'number' ? parsed.latitude : undefined,
      longitude: typeof parsed.longitude === 'number' ? parsed.longitude : undefined,
      timezone: typeof parsed.timezone === 'string' ? parsed.timezone : undefined,
    }
  } catch {
    return null
  }
}

export function saveSharedBirthInfo(value: BirthInfo): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SHARED_BIRTH_INFO_KEY, JSON.stringify(value))
  } catch {
    // no-op: localStorage can fail in private mode/quota exceeded
  }
}
