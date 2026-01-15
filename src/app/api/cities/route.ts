import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { logger } from '@/lib/logger';

export const runtime = "nodejs";

type City = {
  name: string;
  country: string;
  lat: number;
  lon: number;
};

let cachedCities: City[] | null = null;
let loading: Promise<City[]> | null = null;

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();

async function loadCities(): Promise<City[]> {
  if (cachedCities) return cachedCities;
  if (!loading) {
    loading = (async () => {
      const filePath = path.join(process.cwd(), "public", "data", "cities.min.json");
      const raw = await fs.readFile(filePath, "utf-8");
      const sanitized = raw.replace(/^\uFEFF/, "");
      const data = JSON.parse(sanitized);
      cachedCities = Array.isArray(data) ? data : [];
      return cachedCities;
    })();
  }
  return loading;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = norm(searchParams.get("q"));
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 200;

  logger.info("[cities API] Query:", { query, limit });

  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    const data = await loadCities();
    logger.info("[cities API] Loaded cities count:", { count: data.length });
    const scored: { c: City; score: number }[] = [];

    for (const c of data) {
      const name = norm(c.name);
      const cc = norm(c.country);
      const pair = `${name}, ${cc}`;
      if (name.startsWith(query) || name.includes(query) || pair.startsWith(query) || pair.includes(query)) {
        const score = (name.startsWith(query) ? 0 : 10) + (pair.startsWith(query) ? 0 : 5);
        scored.push({ c, score });
      }
    }

    scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
    const results = scored.slice(0, limit).map(({ c }) => c);

    logger.info("[cities API] Found results:", { count: results.length });
    const response = NextResponse.json({ results });
    response.headers.set("Cache-Control", "public, max-age=86400");
    return response;
  } catch (error) {
    logger.error("[cities] Failed to load city data", error);
    return NextResponse.json({ error: "Failed to load cities" }, { status: 500 });
  }
}
