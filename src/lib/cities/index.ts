// src/lib/cities/index.ts
// Unified cities module - consolidates cities.js functionality

export * from './types';
export {
  formatCityName,
  formatCityForDropdown,
  getCityNameInKorean,
  getCountryNameInKorean,
  getCityNameFromKorean,
} from './formatter';
export { CITY_NAME_KR, COUNTRY_NAME_KR, COUNTRY_FULL_NAME } from './lookups';

// --- API Search functions (from cities.js) ---

let apiOrigin: string | null = null;

function norm(s: string | null | undefined): string {
  return String(s || '').trim().toLowerCase();
}

export function parseCountryHint(q: string | null | undefined): string | null {
  const m = String(q || '').match(/,\s*([A-Za-z]{2})$/);
  return m ? m[1].toUpperCase() : null;
}

function getApiOrigin(): string {
  if (apiOrigin) return apiOrigin;
  if (typeof window === 'undefined') return '';
  apiOrigin = window.location.origin;
  return apiOrigin;
}

export interface SearchCitiesOptions {
  limit?: number;
}

export async function searchCities(
  q: string | null | undefined,
  opts?: SearchCitiesOptions
): Promise<Array<{ name: string; country: string; lat: number; lon: number }>> {
  if (typeof window === 'undefined') return [];
  const query = norm(q);
  if (query.length < 1) return [];

  const limit = opts?.limit || 20;
  const url = new URL('/api/cities', getApiOrigin());
  url.searchParams.set('q', query);
  url.searchParams.set('limit', String(limit));

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to search cities: ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.results) ? data.results : [];
}
