// src/lib/cities.js

// src/lib/cities.js
let ALL = null;
let loading = null;

function norm(s) { return String(s || '').trim().toLowerCase(); }

export function parseCountryHint(q) {
  const m = String(q || '').match(/,\s*([A-Za-z]{2})$/);
  return m ? m[1].toUpperCase() : null;
}

async function loadAll() {
  if (ALL) return ALL;
  if (!loading) {
    loading = (async () => {
      const res = await fetch('/data/cities.min.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`Failed to load cities: ${res.status}`);
      const data = await res.json(); // [{ name, country, lat, lon }, ...]
      ALL = Array.isArray(data) ? data : [];
      return ALL;
    })();
  }
  return loading;
}

/** 1글자부터 부분일치, 접두어 우선, 최대 200개 표시 */
export async function searchCities(q, opts) {
  const query = norm(q);
  if (query.length < 1) return [];
  const data = await loadAll();

  const isPrefix = (name) => name.startsWith(query);
  const includes = (name) => name.includes(query);

  const scored = [];
  for (const c of data) {
    const n = norm(c.name);
    const cc = norm(c.country);
    const pair = `${n}, ${cc}`;
    if (isPrefix(n) || includes(n) || isPrefix(pair) || includes(pair)) {
      const score = (isPrefix(n) ? 0 : 10) + (isPrefix(pair) ? 0 : 5);
      scored.push({ c, score });
    }
  }

  scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
  const limit = (opts && opts.limit) || 200;
  return scored.slice(0, limit).map((s) => s.c);
}