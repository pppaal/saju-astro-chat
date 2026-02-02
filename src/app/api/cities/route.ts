import { NextRequest, NextResponse } from "next/server";
import { withApiMiddleware, createSimpleGuard, type ApiContext } from "@/lib/api/middleware";
import fs from "fs/promises";
import path from "path";
import { logger } from '@/lib/logger';
import { getCityNameInKorean, getCountryNameInKorean } from '@/lib/cities/formatter';
import { HTTP_STATUS } from '@/lib/constants/http';

export const runtime = "nodejs";

type City = {
  name: string;
  country: string;
  lat: number;
  lon: number;
};

type CityResult = City & {
  nameKr?: string;
  countryKr?: string;
  displayKr?: string;
  displayEn?: string;
};

let cachedCities: City[] | null = null;
let loading: Promise<City[]> | null = null;

const norm = (value: unknown) => String(value ?? "").trim().toLowerCase();

async function loadCities(): Promise<City[]> {
  if (cachedCities) {return cachedCities;}
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

export const GET = withApiMiddleware(
  async (request: NextRequest, _context: ApiContext) => {
    const { searchParams } = new URL(request.url);
  const query = norm(searchParams.get("q"));
  const limitParam = Number(searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 200) : 200;

  logger.info("[cities API] Query:", { query, limit });

  if (query.length < 1) {
    return NextResponse.json({ results: [] });
  }

    const data = await loadCities();
    logger.info("[cities API] Loaded cities count:", { count: data.length });
    const scored: { c: City; score: number }[] = [];

    for (const c of data) {
      const name = norm(c.name);
      const cc = norm(c.country);
      const pair = `${name}, ${cc}`;

      // Get Korean translations
      const cityKr = getCityNameInKorean(c.name);
      const countryKr = getCountryNameInKorean(c.country);
      const cityKrNorm = cityKr ? norm(cityKr) : null;
      const countryKrNorm = countryKr ? norm(countryKr) : null;
      const pairKr = cityKrNorm && countryKrNorm ? `${cityKrNorm}, ${countryKrNorm}` : null;

      // Check English matches
      const engMatch = name.startsWith(query) || name.includes(query) ||
                       pair.startsWith(query) || pair.includes(query);

      // Check Korean matches
      const korMatch = (cityKrNorm && (cityKrNorm.startsWith(query) || cityKrNorm.includes(query))) ||
                       (countryKrNorm && (countryKrNorm.startsWith(query) || countryKrNorm.includes(query))) ||
                       (pairKr && (pairKr.startsWith(query) || pairKr.includes(query)));

      if (engMatch || korMatch) {
        // Calculate score (lower is better)
        let score = 100;

        // Best match: starts with query
        if (name.startsWith(query) || cityKrNorm?.startsWith(query)) {
          score = 0;
        } else if (pair.startsWith(query) || pairKr?.startsWith(query)) {
          score = 5;
        } else if (name.includes(query) || cityKrNorm?.includes(query)) {
          score = 10;
        } else {
          score = 15;
        }

        scored.push({ c, score });
      }
    }

    scored.sort((a, b) => a.score - b.score || a.c.name.localeCompare(b.c.name));
    const results: CityResult[] = scored.slice(0, limit).map(({ c }) => {
      const nameKr = getCityNameInKorean(c.name);
      const countryKr = getCountryNameInKorean(c.country);
      return {
        ...c,
        nameKr: nameKr || undefined,
        countryKr: countryKr || undefined,
        displayKr: nameKr && countryKr ? `${nameKr}, ${countryKr}` : nameKr ? `${nameKr}, ${c.country}` : undefined,
        displayEn: `${c.name}, ${c.country}`,
      };
    });

    logger.info("[cities API] Found results:", { count: results.length });
    const response = NextResponse.json({ results });
    response.headers.set("Cache-Control", "public, max-age=86400");
    return response;
  },
  createSimpleGuard({
    route: '/api/cities',
    limit: 60,
    windowSeconds: 60,
  })
)
