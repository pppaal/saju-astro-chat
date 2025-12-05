'use server';

import {
  calculateNatalChart,
  buildEngineMeta,
  findAspectsPlus,
  resolveOptions,
  type AstrologyChartFacts,
} from "../astrology";

import {
  calculateSajuData,
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  type SajuFacts,
} from "../Saju";

import { annotateShinsal, toSajuPillarsLike } from "../Saju/shinsal";
import fs from "fs";
import path from "path";
import tzLookup from "tz-lookup";

const enableDebugLogs = process.env.ENABLE_DESTINY_LOGS === "true";

export interface CombinedInput {
  name?: string;
  gender?: "male" | "female";
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  theme?: string;
  tz?: string;
}

export interface CombinedResult {
  meta: { generator: string; generatedAt: string; name?: string; gender?: string };
  astrology: any;
  saju: any;
  summary: string;
}

// ---------- Helpers ----------
function maskInput(input: CombinedInput) {
  const maskName = (val?: string) => (val ? `${val[0] ?? ""}***` : undefined);
  return {
    ...input,
    name: maskName(input.name),
    birthDate: input.birthDate ? "****-**-**" : undefined,
    birthTime: input.birthTime ? "**:**" : undefined,
    latitude: typeof input.latitude === "number" ? Number(input.latitude.toFixed(3)) : input.latitude,
    longitude: typeof input.longitude === "number" ? Number(input.longitude.toFixed(3)) : input.longitude,
  };
}

function resolveTimezone(tz: string | undefined, latitude: number, longitude: number) {
  if (tz) return tz;
  try {
    return tzLookup(latitude, longitude);
  } catch {
    return "Asia/Seoul";
  }
}

async function getSinsal(pillars: any) {
  try {
    if (!pillars?.year || !pillars?.month || !pillars?.day || !pillars?.time) return null;
    const pillarsLike = toSajuPillarsLike({
      yearPillar: pillars.year,
      monthPillar: pillars.month,
      dayPillar: pillars.day,
      timePillar: pillars.time,
    });
    return annotateShinsal(pillarsLike, {
      includeTwelveAll: true,
      includeGeneralShinsal: true,
      includeLuckyDetails: true,
      includeLucky: true,
      includeUnlucky: true,
    });
  } catch (err) {
    console.error("[getSinsal_error]", err);
    return null;
  }
}

function computePoF(planets: any[], houses: any[], ascendant: any) {
  const norm = (deg: number) => ((deg % 360) + 360) % 360;
  const findPlanet = (name: string) => planets.find((p: any) => p?.name === name);
  const sunLon = findPlanet("Sun")?.longitude;
  const moonLon = findPlanet("Moon")?.longitude;
  const ascLon = ascendant?.longitude;
  if (typeof sunLon === "number" && typeof moonLon === "number" && typeof ascLon === "number") {
    const pofLon = norm(ascLon + moonLon - sunLon);
    const signNames = [
      "Aries",
      "Taurus",
      "Gemini",
      "Cancer",
      "Leo",
      "Virgo",
      "Libra",
      "Scorpio",
      "Sagittarius",
      "Capricorn",
      "Aquarius",
      "Pisces",
    ];
    const signIndex = Math.floor(pofLon / 30) % 12;
    const signName = signNames[signIndex];
    const degInSign = pofLon % 30;
    const degree = Math.floor(degInSign);
    const minute = Math.round((degInSign - degree) * 60);

    // house determination: simple cusp check
    const cusps = (houses as any[]) || [];
    let houseNum = 0;
    if (cusps.length === 12) {
      const cuspDegs = cusps.map((c) => Number(c.cusp) || 0);
      for (let i = 0; i < 12; i++) {
        const start = cuspDegs[i];
        const end = cuspDegs[(i + 1) % 12];
        const inRange = start < end ? pofLon >= start && pofLon < end : pofLon >= start || pofLon < end;
        if (inRange) {
          houseNum = i + 1;
          break;
        }
      }
    }

    (planets as any[]).push({
      name: "Part of Fortune",
      longitude: pofLon,
      sign: signName,
      degree,
      minute,
      formatted: `${signName} ${degree} deg ${minute.toString().padStart(2, "0")}'`,
      norm: pofLon,
      house: houseNum,
    });
  }
}

function calcTransitsToLights(transitPlanets: any[], lights: { name: string; longitude: number }[], orb = 4) {
  const normDiff = (a: number, b: number) => {
    const d = Math.abs(a - b) % 360;
    return Math.min(d, 360 - d);
  };
  const desired: Record<string, number> = {
    conjunction: 0,
    sextile: 60,
    square: 90,
    trine: 120,
    opposition: 180,
  };
  const transits: any[] = [];
  for (const tr of transitPlanets) {
    const lon = typeof tr?.longitude === "number" ? tr.longitude : null;
    const name = tr?.name;
    if (!name || lon === null) continue;
    for (const tgt of lights) {
      const d = normDiff(lon, tgt.longitude);
      for (const [atype, angle] of Object.entries(desired)) {
        if (Math.abs(d - angle) <= orb) {
          transits.push({
            type: atype,
            from: { name, longitude: lon },
            to: { name: tgt.name, longitude: tgt.longitude },
            orb: Number(d - angle).toFixed(2),
          });
          break;
        }
      }
    }
  }
  return transits;
}

/* Main Engine */
export async function computeDestinyMap(input: CombinedInput): Promise<CombinedResult> {
  try {
    const { birthDate, birthTime, latitude, longitude, gender: rawGender, tz, name } = input;
    if (enableDebugLogs) { console.log("[Engine] Input received"); }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new Error("Invalid coordinates range");
    }

    const resolvedTz = resolveTimezone(tz, latitude, longitude);
    if (!tz && enableDebugLogs) {
      console.warn("[Engine] Timezone inferred", resolvedTz);
    }
    const gender = (rawGender ?? "male").toLowerCase() as "male" | "female";
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = birthTime.split(":").map((v) => Number(v) || 0);

    const birthDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));
    if (isNaN(birthDateObj.getTime())) throw new Error("Invalid birth date/time format");

    // ---------- Astrology (natal) ----------
    const natalRaw = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: resolvedTz,
    });
    const astroFacts = natalRaw as unknown as AstrologyChartFacts;
    const astroOptions = resolveOptions();
    const astroAspects = (findAspectsPlus as any)(astroFacts, astroOptions);
    const astroMeta = (buildEngineMeta as any)(astroFacts, astroAspects);
    const { planets, houses, ascendant, mc } = natalRaw;

    // Part of Fortune
    computePoF(planets as any[], houses as any[], ascendant);

    // Transit aspects to lights (now, UTC)
    const now = new Date();
    const transitRaw = await calculateNatalChart({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      date: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
      latitude,
      longitude,
      timeZone: "UTC",
    });
    const transitPlanets = (transitRaw as any).planets || [];
    const lights = [
      { name: "Sun", longitude: planets.find((p: any) => p.name === "Sun")?.longitude ?? 0 },
      { name: "Moon", longitude: planets.find((p: any) => p.name === "Moon")?.longitude ?? 0 },
      { name: "Ascendant", longitude: (ascendant as any)?.longitude ?? 0 },
      { name: "MC", longitude: (mc as any)?.longitude ?? 0 },
    ];
    const transits = calcTransitsToLights(transitPlanets, lights, 4);

    if (enableDebugLogs) {
      console.log("[Astrology finished]:", {
        sun: planets.find((p) => p.name === "Sun")?.sign,
        moon: planets.find((p) => p.name === "Moon")?.sign,
      });
    }

    // ---------- Saju ----------
    const timezone = resolvedTz;
    const [hh, mmRaw] = birthTime.split(":");
    const safeBirthTime = `${hh.padStart(2, "0")}:${(mmRaw ?? "00").padStart(2, "0")}`;

    let sajuFacts: SajuFacts | any = {};
    try {
      sajuFacts = await calculateSajuData(birthDate.trim(), safeBirthTime, gender, "solar", timezone);
      if (enableDebugLogs) { console.log("[SajuFacts keys]:", Object.keys(sajuFacts || {})); }
    } catch (err) {
      console.error("[calculateSajuData Error]", err);
    }

    const pillars = {
      year: sajuFacts?.yearPillar,
      month: sajuFacts?.monthPillar,
      day: sajuFacts?.dayPillar,
      time: sajuFacts?.timePillar,
    };
    const dayMaster = sajuFacts?.dayMaster ?? {};

    let daeun: any[] = [];
    let annual: any[] = [];
    let monthly: any[] = [];
    let iljin: any[] = [];
    const startYear = birthDateObj.getFullYear();
    const startMonth = birthDateObj.getMonth() + 1;

    const hasValidPillars = Boolean(pillars.year && pillars.month && pillars.day);
    if (hasValidPillars) {
      try {
        const d = getDaeunCycles(birthDateObj, gender, pillars, dayMaster, timezone);
        const a = getAnnualCycles(startYear, 10, dayMaster);
        const m = getMonthlyCycles(startYear, dayMaster);
        const i = getIljinCalendar(startYear, startMonth, dayMaster);
        daeun = Array.isArray(d?.cycles) ? d.cycles : [];
        annual = Array.isArray(a) ? a : [];
        monthly = Array.isArray(m) ? m : [];
        iljin = Array.isArray(i) ? i : [];
        console.log("[Unse cycles]:", daeun.length);
      } catch (err) {
        console.warn("[Unse calculation warning]", err);
      }
    } else {
      console.warn("Invalid pillars, skip unse calculation");
    }

    const sinsal = hasValidPillars ? await getSinsal(pillars) : null;

    // ---------- Summary ----------
    const dayMasterText =
      typeof dayMaster === "string"
        ? dayMaster
        : dayMaster?.name
        ? `${dayMaster.name} (${dayMaster.element ?? ""})`
        : "Unknown";
    const sun = planets.find((p) => p.name === "Sun")?.sign ?? "-";
    const moon = planets.find((p) => p.name === "Moon")?.sign ?? "-";
    const element =
      astroFacts.elementRatios &&
      Object.entries(astroFacts.elementRatios).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

    const summary = [
      name ? `Name: ${name}` : "",
      `Sun: ${sun}`,
      `Moon: ${moon}`,
      `Asc: ${ascendant?.sign ?? "-"}`,
      `MC: ${mc?.sign ?? "-"}`,
      `Dominant Element: ${element}`,
      `Day Master: ${dayMasterText}`,
    ]
      .filter(Boolean)
      .join(" | ");

    // ---------- Log save ----------
    if (enableDebugLogs) {
      try {
        const dir = path.join(process.cwd(), "logs");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        const file = path.join(dir, `destinymap-${Date.now()}.json`);
        fs.writeFileSync(
          file,
          JSON.stringify(
            {
              input: maskInput(input),
              report: {
                astrology: {
                  facts: astroFacts,
                  planets,
                  houses,
                  ascendant,
                  mc,
                  aspects: astroAspects,
                  meta: astroMeta,
                  options: astroOptions,
                  transits,
                },
                saju: { facts: sajuFacts, pillars, dayMaster, unse: { daeun, annual, monthly, iljin }, sinsal },
                summary,
              },
            },
            null,
            2
          ),
          "utf8"
        );
        console.log("[Engine] Full output saved:", file);
      } catch (err) {
        console.warn("Log save failed:", err);
      }
    }

    return {
      meta: {
        generator: "DestinyMap Core Engine (file save)",
        generatedAt: new Date().toISOString(),
        name,
        gender,
      },
      astrology: {
        facts: astroFacts,
        planets,
        houses,
        ascendant,
        mc,
        aspects: astroAspects,
        meta: astroMeta,
        options: astroOptions,
        transits,
      },
      saju: { facts: sajuFacts, pillars, dayMaster, unse: { daeun, annual, monthly, iljin }, sinsal },
      summary,
    };
  } catch (err: any) {
    console.error("[computeDestinyMap Error]", err);
    return {
      meta: { generator: "DestinyMap Core Engine (error)", generatedAt: new Date().toISOString() },
      astrology: {},
      saju: { facts: {}, pillars: {}, dayMaster: {}, unse: { daeun: [], annual: [], monthly: [], iljin: [] }, sinsal: null },
      summary: "Calculation error occurred. Returning data-only result.",
    };
  }
}
