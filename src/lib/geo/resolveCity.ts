// src/lib/geo/resolveCity.ts
import path from "node:path";
import fs from "node:fs/promises";
import tzLookup from "tz-lookup";

type City = { name: string; country: string; lat: number; lon: number };
export type CityResolved = { name: string; lat: number; lon: number; tz: string };

let ALL: City[] | null = null;

async function loadAllOnServer(): Promise<City[]> {
  if (ALL) return ALL;
  // Next.js에서 public 디렉터리는 process.cwd()/public 로 접근 가능
  const filePath = path.join(process.cwd(), "public", "data", "cities.min.json");
  const buf = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(buf);
  ALL = Array.isArray(data) ? data : [];
  return ALL;
}

function norm(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function searchCitiesServer(q: string, limit = 200): Promise<City[]> {
  const query = norm(q);
  if (query.length < 1) return [];
  const data = await loadAllOnServer();

  const isPrefix = (name: string) => name.startsWith(query);
  const includes = (name: string) => name.includes(query);

  const scored: { c: City; score: number }[] = [];
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
  return scored.slice(0, limit).map((s) => s.c);
}

export async function resolveCityFromQuery(query: string): Promise<CityResolved> {
  const q = (query || "").trim();
  if (!q) throw new Error("City is required");

  const hits = await searchCitiesServer(q, 1);
  const top = hits[0];
  if (!top) throw new Error(`City not found: ${q}`);

  const tz = tzLookup(top.lat, top.lon);
  return { name: top.name, lat: top.lat, lon: top.lon, tz };
}