// src/lib/cities/index.ts
// Unified cities module - consolidates cities.js functionality

export * from './types'
export {
  formatCityName,
  formatCityForDropdown,
  localizeStoredCity,
  getCityNameInKorean,
  getCountryNameInKorean,
  getCityNameFromKorean,
} from './formatter'
export { CITY_NAME_KR, COUNTRY_NAME_KR, COUNTRY_FULL_NAME } from './lookups'

// --- API Search functions (from cities.js) ---

let apiOrigin: string | null = null
const QUERY_CACHE_TTL_MS = 5 * 60 * 1000
const queryCache = new Map<
  string,
  {
    data: Array<{
      name: string
      country: string
      lat: number
      lon: number
      nameKr?: string
      countryKr?: string
      displayKr?: string
      displayEn?: string
    }>
    expiresAt: number
  }
>()

function norm(s: string | null | undefined): string {
  return String(s || '')
    .trim()
    .toLowerCase()
}

export function parseCountryHint(q: string | null | undefined): string | null {
  const m = String(q || '').match(/,\s*([A-Za-z]{2})$/)
  return m ? m[1].toUpperCase() : null
}

function getApiOrigin(): string {
  if (apiOrigin) return apiOrigin
  if (typeof window === 'undefined') return ''
  apiOrigin = window.location.origin
  return apiOrigin
}

export interface SearchCitiesOptions {
  limit?: number
}

export async function searchCities(
  q: string | null | undefined,
  opts?: SearchCitiesOptions
): Promise<
  Array<{
    name: string
    country: string
    lat: number
    lon: number
    nameKr?: string
    countryKr?: string
    displayKr?: string
    displayEn?: string
  }>
> {
  if (typeof window === 'undefined') return []
  const query = norm(q)
  if (query.length < 1) return []

  const limit = opts?.limit || 20
  const cacheKey = `${query}:${limit}`
  const now = Date.now()
  const cached = queryCache.get(cacheKey)
  if (cached && cached.expiresAt > now) {
    return cached.data
  }

  const url = new URL('/api/cities', getApiOrigin())
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Failed to search cities: ${res.status}`)
  }
  const data = await res.json()
  const results = Array.isArray(data?.results) ? data.results : []
  queryCache.set(cacheKey, { data: results, expiresAt: now + QUERY_CACHE_TTL_MS })
  return results
}
