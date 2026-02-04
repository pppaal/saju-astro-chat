export type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string }

export interface FormState {
  name: string
  birthDate: string
  birthTime: string
  city: string
  gender: 'Male' | 'Female'
  genderOpen: boolean
  suggestions: CityHit[]
  selectedCity: CityHit | null
  openSug: boolean
  cityErr: string | null
  loadingProfile: boolean
  profileLoaded: boolean
  userTimezone: string
  isUserTyping: boolean
}

export const initialFormState: FormState = {
  name: '',
  birthDate: '',
  birthTime: '',
  city: '',
  gender: 'Male',
  genderOpen: false,
  suggestions: [],
  selectedCity: null,
  openSug: false,
  cityErr: null,
  loadingProfile: false,
  profileLoaded: false,
  userTimezone: 'Asia/Seoul',
  isUserTyping: false,
}

export type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: FormState[keyof FormState] }
  | { type: 'SET_FIELDS'; fields: Partial<FormState> }
  | { type: 'PICK_CITY'; city: string; selectedCity: CityHit }
  | { type: 'UPDATE_SELECTED_CITY_TZ'; name: string; country: string; timezone: string }

export function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'SET_FIELDS':
      return { ...state, ...action.fields }
    case 'PICK_CITY':
      return {
        ...state,
        isUserTyping: false,
        city: action.city,
        selectedCity: action.selectedCity,
        openSug: false,
      }
    case 'UPDATE_SELECTED_CITY_TZ': {
      const prev = state.selectedCity
      if (!prev || prev.name !== action.name || prev.country !== action.country) return state
      return { ...state, selectedCity: { ...prev, timezone: action.timezone } }
    }
    default:
      return state
  }
}

export const loadCitiesModule = (() => {
  let promise: Promise<typeof import('@/lib/cities')> | null = null
  return () => {
    if (!promise) {
      promise = import('@/lib/cities')
    }
    return promise
  }
})()

export const loadTimezoneModule = (() => {
  let promise: Promise<typeof import('@/lib/Saju/timezone')> | null = null
  return () => {
    if (!promise) {
      promise = import('@/lib/Saju/timezone')
    }
    return promise
  }
})()

export const loadTzLookup = (() => {
  let promise: Promise<typeof import('tz-lookup')> | null = null
  return () => {
    if (!promise) {
      promise = import('tz-lookup')
    }
    return promise
  }
})()

export function extractCityPart(input: string) {
  const s = String(input || '').trim()
  const idx = s.indexOf(',')
  return (idx >= 0 ? s.slice(0, idx) : s).trim()
}

export async function resolveCityTimezone(hit: CityHit, fallback?: string): Promise<string> {
  if (hit.timezone) {
    return hit.timezone
  }
  if (fallback) {
    return fallback
  }
  const { default: tzLookup } = await loadTzLookup()
  return tzLookup(hit.lat, hit.lon)
}
