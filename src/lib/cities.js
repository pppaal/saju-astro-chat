// src/lib/cities.js
let apiOrigin = null;

function norm(s) { return String(s || '').trim().toLowerCase(); }

export function parseCountryHint(q) {
  const m = String(q || '').match(/,\s*([A-Za-z]{2})$/);
  return m ? m[1].toUpperCase() : null;
}

function getApiOrigin() {
  if (apiOrigin) return apiOrigin;
  if (typeof window === 'undefined') return '';
  apiOrigin = window.location.origin;
  return apiOrigin;
}

export async function searchCities(q, opts) {
  if (typeof window === 'undefined') return [];
  const query = norm(q);
  if (query.length < 1) return [];

  const limit = (opts && opts.limit) || 200;
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
