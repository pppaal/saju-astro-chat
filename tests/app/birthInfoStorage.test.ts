import { describe, it, expect, beforeEach } from 'vitest'
import {
  getStoredBirthInfo,
  saveBirthInfo,
  clearBirthInfo,
  buildBirthQuery,
  buildCounselorHref,
  normGender,
  timeToState,
  type StoredBirthInfo,
} from '@/app/(main)/birthInfoStorage'

const HOME_KEY = 'destinypal:birthInfo:v1'
const PROFILE_KEY = 'destinypal_user_profile'

function base(
  overrides: Partial<Omit<StoredBirthInfo, 'savedAt'>> = {}
): Omit<StoredBirthInfo, 'savedAt'> {
  return {
    name: 'Alice',
    birthDate: '1990-05-21',
    birthTime: '14:30',
    gender: 'female',
    city: 'Seoul, KR',
    latitude: 37.5665,
    longitude: 126.978,
    timeZone: 'Asia/Seoul',
    ...overrides,
  }
}

describe('birthInfoStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  describe('saveBirthInfo / getStoredBirthInfo', () => {
    it('round-trips a full birth info through the home key', () => {
      saveBirthInfo(base())
      const got = getStoredBirthInfo()
      expect(got).not.toBeNull()
      expect(got!.name).toBe('Alice')
      expect(got!.birthDate).toBe('1990-05-21')
      expect(got!.birthTime).toBe('14:30')
      expect(got!.gender).toBe('female')
      expect(got!.city).toBe('Seoul, KR')
      expect(got!.latitude).toBe(37.5665)
      expect(got!.longitude).toBe(126.978)
      expect(got!.timeZone).toBe('Asia/Seoul')
      // savedAt stamped on write.
      expect(typeof got!.savedAt).toBe('string')
      expect(got!.savedAt.length).toBeGreaterThan(0)
    })

    it('persists raw JSON under the home key', () => {
      saveBirthInfo(base())
      const raw = window.localStorage.getItem(HOME_KEY)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw!)
      expect(parsed.birthDate).toBe('1990-05-21')
    })

    it('mirrors the write into the canonical user profile', () => {
      saveBirthInfo(base())
      const raw = window.localStorage.getItem(PROFILE_KEY)
      expect(raw).toBeTruthy()
      const profile = JSON.parse(raw!)
      expect(profile.birthDate).toBe('1990-05-21')
      expect(profile.birthTime).toBe('14:30')
      expect(profile.gender).toBe('Female') // mapped to long form
      expect(profile.birthCity).toBe('Seoul, KR')
      expect(profile.latitude).toBe(37.5665)
      expect(profile.timezone).toBe('Asia/Seoul')
    })

    it('maps male gender to Male in the mirrored profile', () => {
      saveBirthInfo(base({ gender: 'male' }))
      const profile = JSON.parse(window.localStorage.getItem(PROFILE_KEY)!)
      expect(profile.gender).toBe('Male')
    })

    it('returns null when nothing is stored', () => {
      expect(getStoredBirthInfo()).toBeNull()
    })
  })

  describe('getStoredBirthInfo edge / fallback paths', () => {
    it('returns null when home value is missing required fields', () => {
      window.localStorage.setItem(HOME_KEY, JSON.stringify({ birthDate: '1990-05-21' }))
      // no birthTime / gender → invalid → falls through to profile (also empty) → null
      expect(getStoredBirthInfo()).toBeNull()
    })

    it('returns null on corrupt JSON in the home key with no profile fallback', () => {
      window.localStorage.setItem(HOME_KEY, '{not valid json')
      expect(getStoredBirthInfo()).toBeNull()
    })

    it('falls back to userProfile when home key is empty', () => {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          name: 'Bob',
          birthDate: '1985-12-01',
          birthTime: '00:00',
          gender: 'Male',
          birthCity: 'Busan',
          latitude: 35.1,
          longitude: 129.0,
          timezone: 'Asia/Seoul',
          updatedAt: '2020-01-01T00:00:00.000Z',
        })
      )
      const got = getStoredBirthInfo()
      expect(got).not.toBeNull()
      expect(got!.name).toBe('Bob')
      expect(got!.birthDate).toBe('1985-12-01')
      // midnight is a REAL time, must NOT be flagged unknown.
      expect(got!.birthTime).toBe('00:00')
      expect(got!.birthTimeUnknown).toBeUndefined()
      expect(got!.gender).toBe('male')
      expect(got!.city).toBe('Busan')
      expect(got!.savedAt).toBe('2020-01-01T00:00:00.000Z')
    })

    it('profile fallback returns null when gender is not Male/Female', () => {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          birthDate: '1985-12-01',
          birthTime: '08:00',
          gender: 'Other',
        })
      )
      expect(getStoredBirthInfo()).toBeNull()
    })

    it('profile fallback returns null when birthDate/birthTime missing', () => {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ name: 'NoDates', gender: 'Female' })
      )
      expect(getStoredBirthInfo()).toBeNull()
    })

    it('prefers the home key over the profile when both are present', () => {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ birthDate: '1985-12-01', birthTime: '08:00', gender: 'Male' })
      )
      saveBirthInfo(base({ name: 'HomeWins', birthDate: '1990-05-21' }))
      const got = getStoredBirthInfo()
      expect(got!.name).toBe('HomeWins')
      expect(got!.birthDate).toBe('1990-05-21')
    })

    it('profile fallback omits city/savedAt defaults sensibly', () => {
      window.localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({ birthDate: '2000-01-01', birthTime: '12:00', gender: 'Female' })
      )
      const got = getStoredBirthInfo()
      expect(got).not.toBeNull()
      expect(got!.city).toBeUndefined()
      // savedAt defaults to a fresh ISO string when profile has no updatedAt
      expect(typeof got!.savedAt).toBe('string')
    })
  })

  describe('clearBirthInfo', () => {
    it('removes both the home key and the canonical profile', () => {
      saveBirthInfo(base())
      expect(window.localStorage.getItem(HOME_KEY)).toBeTruthy()
      expect(window.localStorage.getItem(PROFILE_KEY)).toBeTruthy()
      clearBirthInfo()
      expect(window.localStorage.getItem(HOME_KEY)).toBeNull()
      expect(window.localStorage.getItem(PROFILE_KEY)).toBeNull()
      expect(getStoredBirthInfo()).toBeNull()
    })

    it('is safe to call when nothing is stored', () => {
      expect(() => clearBirthInfo()).not.toThrow()
      expect(getStoredBirthInfo()).toBeNull()
    })
  })

  describe('buildBirthQuery', () => {
    it('returns empty string for null', () => {
      expect(buildBirthQuery(null)).toBe('')
    })

    it('builds a full query with all fields', () => {
      const info: StoredBirthInfo = { ...base(), savedAt: '2020-01-01T00:00:00.000Z' }
      const qs = buildBirthQuery(info)
      const p = new URLSearchParams(qs)
      expect(p.get('name')).toBe('Alice')
      expect(p.get('birthDate')).toBe('1990-05-21')
      expect(p.get('birthTime')).toBe('14:30')
      expect(p.get('gender')).toBe('F')
      expect(p.get('birthCity')).toBe('Seoul, KR')
      expect(p.get('lat')).toBe('37.5665')
      expect(p.get('lon')).toBe('126.978')
      expect(p.get('timeZone')).toBe('Asia/Seoul')
      // birthTimeUnknown not set → absent
      expect(p.get('birthTimeUnknown')).toBeNull()
    })

    it('maps male gender to M', () => {
      const info: StoredBirthInfo = {
        ...base({ gender: 'male' }),
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildBirthQuery(info))
      expect(p.get('gender')).toBe('M')
    })

    it('sets birthTimeUnknown=1 only when flag is true', () => {
      const info: StoredBirthInfo = {
        ...base({ birthTimeUnknown: true }),
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildBirthQuery(info))
      expect(p.get('birthTimeUnknown')).toBe('1')
    })

    it('omits optional fields when absent', () => {
      const info: StoredBirthInfo = {
        birthDate: '1990-05-21',
        birthTime: '14:30',
        gender: 'female',
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildBirthQuery(info))
      expect(p.get('name')).toBeNull()
      expect(p.get('birthCity')).toBeNull()
      expect(p.get('lat')).toBeNull()
      expect(p.get('lon')).toBeNull()
      expect(p.get('timeZone')).toBeNull()
      // required fields still present
      expect(p.get('birthDate')).toBe('1990-05-21')
    })

    it('emits lat/lon when coordinates are 0 (typeof number, not falsy)', () => {
      const info: StoredBirthInfo = {
        ...base({ latitude: 0, longitude: 0 }),
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildBirthQuery(info))
      expect(p.get('lat')).toBe('0')
      expect(p.get('lon')).toBe('0')
    })
  })

  describe('buildCounselorHref', () => {
    it('targets /destiny-counselor with all params + question', () => {
      const info: StoredBirthInfo = { ...base(), savedAt: '2020-01-01T00:00:00.000Z' }
      const href = buildCounselorHref(info, '  내 직업운은?  ', 'ko')
      expect(href.startsWith('/destiny-counselor?')).toBe(true)
      const p = new URLSearchParams(href.split('?')[1])
      expect(p.get('name')).toBe('Alice')
      expect(p.get('birthDate')).toBe('1990-05-21')
      expect(p.get('gender')).toBe('F')
      // uses `city` (not birthCity) for counselor.
      expect(p.get('city')).toBe('Seoul, KR')
      expect(p.get('birthCity')).toBeNull()
      expect(p.get('lat')).toBe('37.5665')
      expect(p.get('lon')).toBe('126.978')
      expect(p.get('timeZone')).toBe('Asia/Seoul')
      expect(p.get('lang')).toBe('ko')
      // question is trimmed.
      expect(p.get('q')).toBe('내 직업운은?')
    })

    it('omits q when the question is blank/whitespace', () => {
      const info: StoredBirthInfo = { ...base(), savedAt: '2020-01-01T00:00:00.000Z' }
      const p = new URLSearchParams(buildCounselorHref(info, '   ', 'en').split('?')[1])
      expect(p.get('q')).toBeNull()
      expect(p.get('lang')).toBe('en')
    })

    it('sets birthTimeUnknown=1 when flagged and maps male→M', () => {
      const info: StoredBirthInfo = {
        ...base({ gender: 'male', birthTimeUnknown: true }),
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildCounselorHref(info, 'hi', 'en').split('?')[1])
      expect(p.get('gender')).toBe('M')
      expect(p.get('birthTimeUnknown')).toBe('1')
    })

    it('omits optional coordinates/city when absent', () => {
      const info: StoredBirthInfo = {
        birthDate: '1990-05-21',
        birthTime: '14:30',
        gender: 'female',
        savedAt: '2020-01-01T00:00:00.000Z',
      }
      const p = new URLSearchParams(buildCounselorHref(info, 'q', 'ko').split('?')[1])
      expect(p.get('city')).toBeNull()
      expect(p.get('lat')).toBeNull()
      expect(p.get('lon')).toBeNull()
      expect(p.get('timeZone')).toBeNull()
    })
  })

  describe('normGender', () => {
    it('normalizes female variants', () => {
      expect(normGender('female')).toBe('female')
      expect(normGender('Female')).toBe('female')
      expect(normGender('F')).toBe('female')
      expect(normGender('f')).toBe('female')
    })

    it('normalizes male variants', () => {
      expect(normGender('male')).toBe('male')
      expect(normGender('Male')).toBe('male')
      expect(normGender('M')).toBe('male')
      expect(normGender('m')).toBe('male')
    })

    it('returns empty string for unknown / nullish', () => {
      expect(normGender('')).toBe('')
      expect(normGender(null)).toBe('')
      expect(normGender(undefined)).toBe('')
      expect(normGender('other')).toBe('')
      expect(normGender(123)).toBe('')
      expect(normGender('남')).toBe('')
    })
  })

  describe('timeToState', () => {
    it('treats a populated HH:MM as known', () => {
      expect(timeToState('09:05')).toEqual({ birthTime: '09:05', timeUnknown: false })
    })

    it('treats empty string as unknown', () => {
      expect(timeToState('')).toEqual({ birthTime: '', timeUnknown: true })
    })

    it("treats '00:00' as unknown (legacy sentinel in this helper)", () => {
      expect(timeToState('00:00')).toEqual({ birthTime: '', timeUnknown: true })
    })

    it('treats non-string input as unknown', () => {
      expect(timeToState(undefined)).toEqual({ birthTime: '', timeUnknown: true })
      expect(timeToState(null)).toEqual({ birthTime: '', timeUnknown: true })
      expect(timeToState(1430)).toEqual({ birthTime: '', timeUnknown: true })
    })
  })
})
