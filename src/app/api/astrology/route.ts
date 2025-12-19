// src/app/api/astrology/route.ts
import { NextResponse } from "next/server";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request-ip";
import { captureServerError } from "@/lib/telemetry";
import { requirePublicToken } from "@/lib/auth/publicToken";
import {
  calculateNatalChart,
  toChart,
  type AspectRules,
  resolveOptions,
  findNatalAspectsPlus,
  buildEngineMeta,
} from "@/lib/astrology";

dayjs.extend(utc);
dayjs.extend(timezone);

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
  return (SIGNS as any)[k] ? k : "en";
}

function splitSignAndDegree(text: string) {
  const s = String(text || "").trim();
  const m = s.match(/^(\S+)\s+(.*)$/);
  if (!m) return { signPart: s, degreePart: "" };
  return { signPart: m[1], degreePart: m[2] };
}

function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) return idx;
  }
  const cleaned = name.replace(/[^\p{L}]/gu, "").toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(
      s => s.replace(/[^\p{L}]/gu, "").toLowerCase() === cleaned
    );
    if (idx >= 0) return idx;
  }
  return -1;
}

function localizeSignLabel(inputSign: string, target: LocaleKey): string {
  const idx = findSignIndex(inputSign);
  if (idx >= 0) return SIGNS[target][idx] || SIGNS.en[idx];
  const { signPart } = splitSignAndDegree(inputSign);
  const idx2 = findSignIndex(signPart);
  if (idx2 >= 0) return SIGNS[target][idx2] || SIGNS.en[idx2];
  return inputSign;
}

function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  const enKeys = Object.keys(PLANET_LABELS.en) as (keyof typeof PLANET_LABELS.en)[];
  if (enKeys.includes(inputName as any)) {
    return PLANET_LABELS[target]?.[inputName as keyof typeof PLANET_LABELS.en] || String(inputName);
  }
  for (const labels of Object.values(PLANET_LABELS).filter(Boolean) as any[]) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        return (PLANET_LABELS as any)[target]?.[enKey] || (PLANET_LABELS as any).en[enKey];
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
  let h = Number(hhRaw), m = Number(mmRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error("Enter a valid time (HH:mm or HH:mm AM/PM).");
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("Time must be within 00:00-23:59.");
  return { h, m };
}

function pickBackendUrl() {
  const url =
    process.env.AI_BACKEND_URL ||
    process.env.NEXT_PUBLIC_AI_BACKEND ||
    "http://127.0.0.1:5000";
  if (!url.startsWith("https://") && process.env.NODE_ENV === "production") {
    console.warn("[Astrology API] Using non-HTTPS AI backend in production");
  }
  if (process.env.NEXT_PUBLIC_AI_BACKEND && !process.env.AI_BACKEND_URL) {
    console.warn("[Astrology API] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL");
  }
  return url;
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro:${ip}`, { limit: 30, windowSeconds: 60 });
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again soon." }, { status: 429, headers: limit.headers });
    }
    if (!requirePublicToken(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: limit.headers });
    }

    const body = await request.json();
    const { date, time, latitude, longitude, timeZone, locale, options } = body ?? {};
    const L = pickLabels(locale);
    const locKey = normalizeLocale(locale);

    if (!date || !time || latitude === undefined || longitude === undefined || !timeZone) {
      return NextResponse.json({ error: "date, time, latitude, longitude, and timeZone are required." }, { status: 400, headers: limit.headers });
    }
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json({ error: "latitude/longitude out of range." }, { status: 400, headers: limit.headers });
    }

    const [year, month, day] = String(date).split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD." }, { status: 400, headers: limit.headers });
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

    const ascSplit = splitSignAndDegree(String((natal as any).ascendant?.formatted || ""));
    const mcSplit  = splitSignAndDegree(String((natal as any).mc?.formatted || ""));
    const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim();
    const mcStr  = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim();

    const planetLines = ((natal as any).planets || []).map((p: any) => {
      const name = localizePlanetLabel(String(p.name || ""), locKey);
      const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ""));
      const sign = localizeSignLabel(signPart, locKey);
      return `${name}: ${sign} ${degreePart}`.trim();
    }).join("\n");

    const basics = `${L?.asc ?? "Ascendant"}: ${ascStr}\n${L?.mc ?? "MC"}: ${mcStr}`;
    const interpretation = `${L?.title ?? "Natal Chart Summary"}\n${basics}\n\n${L?.planetPositions ?? "Planet Positions"}\n${planetLines}\n\n${L?.notice ?? ""}`;

    const chart = toChart(natal as any);
    const aspectRules: AspectRules = {
      includeMinor: opts.includeMinorAspects,
      maxResults: 120,
      scoring: { weights: { orb: 0.55, aspect: 0.4, speed: 0.05 } },
    };
    const aspectsPlus = findNatalAspectsPlus(chart as any, aspectRules, opts);
    const chartMeta = buildEngineMeta(((natal as any).meta ?? {}) as any, opts);

    const houses = (chart as any).houses || (natal as any).houses || [];
    const pointsRaw = (chart as any).points || (natal as any).planets || [];
    const points = pointsRaw.map((p: any) => ({
      key: p.key || p.name,
      name: p.name,
      formatted: p.formatted,
      sign: p.sign,
      degree: p.degree,
      minute: p.minute,
      house: p.house,
      speed: p.speed,
      rx: typeof p.speed === "number" ? p.speed < 0 : !!p.rx,
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
    const backendUrl = pickBackendUrl();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const apiToken = process.env.ADMIN_API_TOKEN;
      if (apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      // Build prompt for astrology interpretation
      const astroPrompt = `Analyze this natal chart as an expert astrologer:\n\nAscendant: ${ascStr}\nMC: ${mcStr}\n\nPlanet Positions:\n${planetLines}\n\nProvide insights on personality, life path, strengths, and challenges.`;

      const aiResponse = await fetch(`${backendUrl}/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          theme: 'astrology',
          prompt: astroPrompt,
          astro: {
            ascendant: (natal as any).ascendant,
            mc: (natal as any).mc,
            planets: (natal as any).planets,
            houses,
            aspects: aspectsPlus,
          },
          locale: locKey,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        aiInterpretation = aiData?.data?.fusion_layer || aiData?.data?.report || '';
        aiModelUsed = aiData?.data?.model || 'gpt-4o';
      }
    } catch (aiErr) {
      console.warn('[Astrology API] AI backend call failed:', aiErr);
      aiInterpretation = '';
      aiModelUsed = 'error-fallback';
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
  } catch (error: any) {
    captureServerError(error, { route: "/api/astrology" });
    return NextResponse.json(
      { error: error?.message || "Unexpected server error." },
      { status: 500 }
    );
  }
}
