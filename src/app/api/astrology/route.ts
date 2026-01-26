// src/app/api/astrology/route.ts
import { NextResponse } from "next/server";
import { apiClient } from "@/lib/api/ApiClient";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/authOptions";
import { prisma } from "@/lib/db/prisma";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import { enforceBodySize } from "@/lib/http";
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
  type ChartMeta,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from "@/lib/astrology";
import { logger } from '@/lib/logger';
import { validateRequestBody, astrologyRequestSchema } from '@/lib/api/zodValidation';
import { validationError } from '@/lib/api/errorResponse';

dayjs.extend(utc);
dayjs.extend(timezone);

// Type definitions for natal chart data
interface _NatalPlanet {
  name: string;
  key?: string;
  formatted?: string;
  sign?: string;
  degree?: number;
  minute?: number;
  house?: number;
  speed?: number;
  rx?: boolean;
  longitude?: number;
}

const BODY_LIMIT = 64 * 1024;

const LABELS = {
  en: {
    title: "Natal Chart Summary",
    asc: "Ascendant",
    mc: "MC",
    planetPositions: "Planet Positions",
    notice: "Note: This interpretation is automatically generated.",
  },
  ko: null,
  zh: null,
  ar: null,
  es: null,
} as const;

const EN_SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"] as const;
const SIGNS = {
  en: EN_SIGNS,
  ko: EN_SIGNS,
  zh: EN_SIGNS,
  ar: EN_SIGNS,
  es: EN_SIGNS,
} as const;
type LocaleKey = keyof typeof SIGNS;

const PLANET_LABELS = {
  en: { Sun:"Sun", Moon:"Moon", Mercury:"Mercury", Venus:"Venus", Mars:"Mars", Jupiter:"Jupiter", Saturn:"Saturn", Uranus:"Uranus", Neptune:"Neptune", Pluto:"Pluto", "True Node":"True Node" },
  ko: null,
  zh: null,
  ar: null,
  es: null,
} as const;

function pickLabels(locale?: string) {
  const key = (locale || "en").split("-")[0] as keyof typeof LABELS;
  return LABELS[key] ?? LABELS.en;
}

function normalizeLocale(l?: string): LocaleKey {
  const k = (l || "en").split("-")[0] as LocaleKey;
  return k in SIGNS ? k : "en";
}

function splitSignAndDegree(text: string) {
  const s = String(text || "").trim();
  const m = s.match(/^(\S+)\s+(.*)$/);
  if (!m) {return { signPart: s, degreePart: "" };}
  return { signPart: m[1], degreePart: m[2] };
}

function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) {return idx;}
  }
  const cleaned = name.replace(/[^\p{L}]/gu, "").toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(
      s => s.replace(/[^\p{L}]/gu, "").toLowerCase() === cleaned
    );
    if (idx >= 0) {return idx;}
  }
  return -1;
}

function localizeSignLabel(inputSign: string, target: LocaleKey): string {
  const idx = findSignIndex(inputSign);
  if (idx >= 0) {return SIGNS[target][idx] || SIGNS.en[idx];}
  const { signPart } = splitSignAndDegree(inputSign);
  const idx2 = findSignIndex(signPart);
  if (idx2 >= 0) {return SIGNS[target][idx2] || SIGNS.en[idx2];}
  return inputSign;
}

function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  type PlanetKey = keyof typeof PLANET_LABELS.en;
  const enKeys = Object.keys(PLANET_LABELS.en) as PlanetKey[];
  if (enKeys.includes(inputName as PlanetKey)) {
    const labels = PLANET_LABELS[target];
    if (labels) {return labels[inputName as PlanetKey] || String(inputName);}
    return String(inputName);
  }
  const allLabels = Object.values(PLANET_LABELS).filter((l): l is NonNullable<typeof l> => l !== null);
  for (const labels of allLabels) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        const targetLabels = PLANET_LABELS[target];
        if (targetLabels) {return targetLabels[enKey];}
        return PLANET_LABELS.en[enKey];
      }
    }
  }
  return inputName;
}

function parseHM(input: string) {
  const s = String(input).trim().toUpperCase();
  const ampm = (s.match(/\s?(AM|PM)$/) || [])[1];
  const core = s.replace(/\s?(AM|PM)$/, "");
  const [hhRaw, mmRaw = "0"] = core.split(":");
  let h = Number(hhRaw);
  const m = Number(mmRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {throw new Error("Enter a valid time (HH:mm or HH:mm AM/PM).");}
  if (ampm === "PM" && h < 12) {h += 12;}
  if (ampm === "AM" && h === 12) {h = 0;}
  if (h < 0 || h > 23 || m < 0 || m > 59) {throw new Error("Time must be within 00:00-23:59.");}
  return { h, m };
}


export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    const tokenCheck = requirePublicToken(request); if (!tokenCheck.valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const oversized = enforceBodySize(request as Request & { body?: ReadableStream }, BODY_LIMIT, limit.headers);
    if (oversized) {return oversized;}

    // ========  Zod Validation ========
    const validation = await validateRequestBody(request, astrologyRequestSchema);
    if (!validation.success) {
      const errorMessage = validation.errors.map((e) => `${e.path}: ${e.message}`).join(', ');
      const res = validationError(errorMessage, { errors: validation.errors });
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    const { date, time, latitude, longitude, timeZone, locale, options } = validation.data;
    const L = pickLabels(locale);
    const locKey = normalizeLocale(locale);

    const [year, month, day] = String(date).split("-").map(Number);
    if (!year || !month || !day) {
      const res = validationError("Invalid date components", { date });
      limit.headers.forEach((value, key) => res.headers.set(key, value));
      return res;
    }

    const { h, m } = parseHM(String(time));
    const local = dayjs.tz(
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
      "YYYY-MM-DD HH:mm",
      String(timeZone)
    );
    if (!local.isValid()) {
      return NextResponse.json({ error: "Invalid date/time/timeZone combination." }, { status: 400, headers: limit.headers });
    }

    const opts = resolveOptions(options);

    const natal = await calculateNatalChart({
      year, month, date: day,
      hour: h, minute: m,
      latitude, longitude,
      timeZone: String(timeZone),
    });

    const ascSplit = splitSignAndDegree(natal.ascendant.formatted);
    const mcSplit  = splitSignAndDegree(natal.mc.formatted);
    const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim();
    const mcStr  = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim();

    const planetLines = natal.planets.map((p) => {
      const name = localizePlanetLabel(p.name, locKey);
      const { signPart, degreePart } = splitSignAndDegree(p.formatted);
      const sign = localizeSignLabel(signPart, locKey);
      return `${name}: ${sign} ${degreePart}`.trim();
    }).join("\n");

    const basics = `${L?.asc ?? "Ascendant"}: ${ascStr}\n${L?.mc ?? "MC"}: ${mcStr}`;
    const interpretation = `${L?.title ?? "Natal Chart Summary"}\n${basics}\n\n${L?.planetPositions ?? "Planet Positions"}\n${planetLines}\n\n${L?.notice ?? ""}`;

    const chart = toChart(natal);
    const aspectRules: AspectRules = {
      includeMinor: opts.includeMinorAspects,
      maxResults: 120,
      scoring: { weights: { orb: 0.55, aspect: 0.4, speed: 0.05 } },
    };
    const aspectsPlus = findNatalAspectsPlus(chart, aspectRules, opts);
    const defaultMeta: ChartMeta = { jdUT: 0, isoUTC: "", timeZone: "", latitude: 0, longitude: 0, houseSystem: "Placidus" as const };
    const natalMeta = natal.meta as ChartMeta | undefined;
    const chartMeta = buildEngineMeta(natalMeta ?? defaultMeta, opts);

    const houses = chart.houses || [];
    const pointsRaw = chart.planets;
    const points = pointsRaw.map((p) => ({
      key: p.name,
      name: p.name,
      formatted: p.formatted,
      sign: p.sign,
      degree: p.degree,
      minute: p.minute,
      house: p.house,
      speed: p.speed,
      rx: typeof p.speed === "number" ? p.speed < 0 : !!p.retrograde,
    }));

    const advanced = {
      options: opts,
      meta: chartMeta,
      houses,
      points,
      aspectsPlus,
    };

    // ======== AI 백엔드 호출 (GPT) ========
    let aiInterpretation = '';
    let aiModelUsed = '';

    try {
      // Build prompt for astrology interpretation
      const astroPrompt = `Analyze this natal chart as an expert astrologer:\n\nAscendant: ${ascStr}\nMC: ${mcStr}\n\nPlanet Positions:\n${planetLines}\n\nProvide insights on personality, life path, strengths, and challenges.`;

      const response = await apiClient.post('/ask', {
        theme: 'astrology',
        prompt: astroPrompt,
        astro: {
          ascendant: natal.ascendant,
          mc: natal.mc,
          planets: natal.planets,
          houses,
          aspects: aspectsPlus,
        },
        locale: locKey,
      }, { timeout: 60000 });

      if (response.ok) {
        const resData = response.data as { data?: { fusion_layer?: string; report?: string; model?: string } };
        aiInterpretation = resData?.data?.fusion_layer || resData?.data?.report || '';
        aiModelUsed = resData?.data?.model || 'gpt-4o';
      }
    } catch (aiErr) {
      logger.warn('[Astrology API] AI backend call failed:', aiErr);
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
    }

    // ======== 기록 저장 (로그인 사용자만) ========
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      try {
        await prisma.reading.create({
          data: {
            userId: session.user.id,
            type: 'astrology',
            title: `${ascStr} 상승궁 출생차트`,
            content: JSON.stringify({
              date,
              time,
              latitude,
              longitude,
              timeZone,
              ascendant: ascStr,
              mc: mcStr,
              planets: points.slice(0, 10).map((p) => ({
                name: p.name,
                sign: p.sign,
              })),
            }),
          },
        });
      } catch (saveErr) {
        logger.warn('[Astrology API] Failed to save reading:', saveErr);
      }
    }

    const res = NextResponse.json(
      {
        chartData: natal,
        chartMeta,
        aspects: aspectsPlus,
        interpretation: aiInterpretation || interpretation,
        aiInterpretation,
        aiModelUsed,
        advanced,
        debug: { locale: locKey, opts },
      },
      { status: 200 }
    );
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (error: unknown) {
    captureServerError(error as Error, { route: "/api/astrology" });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error." },
      { status: 500 }
    );
  }
}
