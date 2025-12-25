// src/app/api/astrology/details/route.ts
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
  type PlanetData,
  type ChartMeta,
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
  return k in SIGNS ? k : "en";
}

function splitSignAndDegree(text: string) {
  const trimmed = String(text || "").trim();
  const m = trimmed.match(/^(\S+)\s+(.*)$/);
  if (!m) return { signPart: trimmed, degreePart: "" };
  return { signPart: m[1], degreePart: m[2] };
}

function findSignIndex(name: string): number {
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).indexOf(name);
    if (idx >= 0) return idx;
  }
  const cleaned = name.replace(/[^\p{L}]/gu, "").toLowerCase();
  for (const list of Object.values(SIGNS)) {
    const idx = (list as readonly string[]).findIndex(s => s.replace(/[^\p{L}]/gu, "").toLowerCase() === cleaned);
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

type PlanetLabelKey = keyof typeof PLANET_LABELS.en;
type PlanetLabelsMap = Record<string, string> | null;

function localizePlanetLabel(inputName: string, target: LocaleKey): string {
  const enKeys = Object.keys(PLANET_LABELS.en) as PlanetLabelKey[];
  if (enKeys.includes(inputName as PlanetLabelKey)) {
    const targetLabels = PLANET_LABELS[target] as PlanetLabelsMap;
    return targetLabels?.[inputName] || String(inputName);
  }
  const labelEntries = Object.values(PLANET_LABELS).filter((v) => v !== null) as Record<string, string>[];
  for (const labels of labelEntries) {
    for (const enKey of enKeys) {
      if (labels[enKey] === inputName) {
        const targetLabels = PLANET_LABELS[target] as PlanetLabelsMap;
        return targetLabels?.[enKey] || PLANET_LABELS.en[enKey];
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
  if (!Number.isFinite(h) || !Number.isFinite(m)) throw new Error("Enter a valid time (HH:mm or HH:mm AM/PM).");
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m > 59) throw new Error("Time must be within 00:00-23:59.");
  return { h, m };
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request.headers);
    const limit = await rateLimit(`astro-details:${ip}`, { limit: 30, windowSeconds: 60 });
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
      return NextResponse.json(
        { error: "date, time, latitude, longitude, and timeZone are required." },
        { status: 400, headers: limit.headers }
      );
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

    const ascFmt = String(natal.ascendant?.formatted || "");
    const mcFmt  = String(natal.mc?.formatted || "");

    const ascSplit = splitSignAndDegree(ascFmt);
    const mcSplit  = splitSignAndDegree(mcFmt);

    const ascStr = `${localizeSignLabel(ascSplit.signPart, locKey)} ${ascSplit.degreePart}`.trim();
    const mcStr  = `${localizeSignLabel(mcSplit.signPart, locKey)} ${mcSplit.degreePart}`.trim();

    const planetLines = (natal.planets || []).map((p: PlanetData) => {
      const name = localizePlanetLabel(String(p.name || ""), locKey);
      const { signPart, degreePart } = splitSignAndDegree(String(p.formatted || ""));
      const sign = localizeSignLabel(signPart, locKey);
      return `${name}: ${sign} ${degreePart}`.trim();
    }).join("\n");

    const basics = `${L?.asc ?? "Ascendant"}: ${ascStr}\n${L?.mc ?? "MC"}: ${mcStr}`;
    const interpretation =
      `${L?.title ?? "Natal Chart Summary"}\n${basics}\n\n${L?.planetPositions ?? "Planet Positions"}\n${planetLines}\n\n${L?.notice ?? ""}`;

    const chart = toChart(natal);
    const aspectRules: AspectRules = {
      includeMinor: opts.includeMinorAspects,
      maxResults: 120,
      scoring: { weights: { orb: 0.55, aspect: 0.4, speed: 0.05 } },
    };
    const aspectsPlus = findNatalAspectsPlus(chart, aspectRules, opts);

    const defaultMeta: ChartMeta = {
      jdUT: 0,
      isoUTC: "",
      timeZone: String(timeZone),
      latitude,
      longitude,
      houseSystem: "Placidus",
    };
    const chartMeta = buildEngineMeta(chart.meta ?? defaultMeta, opts);

    const houses = chart.houses || natal.houses || [];
    const pointsRaw = chart.planets || natal.planets || [];
    const points = pointsRaw.map((p) => ({
      key: p.name,
      name: p.name,
      formatted: p.formatted,
      sign: p.sign,
      degree: p.degree,
      minute: p.minute,
      house: p.house,
      speed: p.speed,
      rx: typeof p.speed === "number" ? p.speed < 0 : false,
    }));

    const advanced = {
      options: opts,
      meta: chartMeta,
      houses,
      points,
      aspectsPlus,
    };

    const res = NextResponse.json(
      {
        chartData: natal,
        chartMeta,
        aspects: aspectsPlus,
        interpretation,
        advanced,
      },
      { status: 200 }
    );
    limit.headers.forEach((value, key) => res.headers.set(key, value));
    return res;
  } catch (error) {
    captureServerError(error, { route: "/api/astrology/details" });
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
