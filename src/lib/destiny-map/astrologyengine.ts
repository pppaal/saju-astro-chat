'use server';

import {
  calculateNatalChart,
  buildEngineMeta,
  findAspectsPlus,
  resolveOptions,
  type AstrologyChartFacts,
  // Extra Points (Chiron, Lilith, Part of Fortune, Vertex)
  calculateChiron,
  calculateLilith,
  calculatePartOfFortune,
  calculateVertex,
  extendChartWithExtraPoints,
  calculateExtraPoints,
  isNightChart,
  // Progressions (Secondary, Solar Arc)
  calculateSecondaryProgressions,
  calculateSolarArcDirections,
  getProgressedMoonPhase,
  getProgressionSummary,
  // Returns (Solar, Lunar)
  calculateSolarReturn,
  calculateLunarReturn,
  getSolarReturnSummary,
  getLunarReturnSummary,
  // Types
  type ExtraPoint,
  type ExtendedChart,
  type ReturnChart,
  type ProgressedChart,
  type ProgressionInput,
  type SolarReturnInput,
  type LunarReturnInput,
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
  userTimezone?: string; // 사용자 현재 위치 타임존 (트랜짓/운세 계산용)
}

export interface CombinedResult {
  meta: { generator: string; generatedAt: string; name?: string; gender?: string };
  astrology: any;
  saju: any;
  summary: string;
  // 사용자 현재 타임존 기준 날짜 (운세용)
  userTimezone?: string;
  analysisDate?: string; // YYYY-MM-DD 형식
  // Advanced Astrology Data
  extraPoints?: {
    chiron?: ExtraPoint;
    lilith?: ExtraPoint;
    partOfFortune?: ExtraPoint;
    vertex?: ExtraPoint;
  };
  solarReturn?: {
    chart: ReturnChart;
    summary: ReturnType<typeof getSolarReturnSummary>;
  };
  lunarReturn?: {
    chart: ReturnChart;
    summary: ReturnType<typeof getLunarReturnSummary>;
  };
  progressions?: {
    secondary: {
      chart: ProgressedChart;
      moonPhase: ReturnType<typeof getProgressedMoonPhase>;
      summary: ReturnType<typeof getProgressionSummary>;
    };
    solarArc?: {
      chart: ProgressedChart;
      summary: ReturnType<typeof getProgressionSummary>;
    };
  };
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

/**
 * 사용자 타임존 기준 현재 날짜/시간 반환
 */
function getNowInTimezone(tz?: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const now = new Date();
  if (!tz) {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
  }
  try {
    const fmt = (opt: Intl.DateTimeFormatOptions) =>
      Number(new Intl.DateTimeFormat('en-US', { timeZone: tz, ...opt }).format(now));
    return {
      year: fmt({ year: 'numeric' }),
      month: fmt({ month: '2-digit' }),
      day: fmt({ day: '2-digit' }),
      hour: fmt({ hour: '2-digit', hour12: false }),
      minute: fmt({ minute: '2-digit' }),
    };
  } catch {
    return {
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
      day: now.getUTCDate(),
      hour: now.getUTCHours(),
      minute: now.getUTCMinutes(),
    };
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
    const { birthDate, birthTime, latitude, longitude, gender: rawGender, tz, name, userTimezone } = input;
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

    // Transit aspects to lights (사용자 타임존 기준)
    const userNow = getNowInTimezone(userTimezone);
    const transitRaw = await calculateNatalChart({
      year: userNow.year,
      month: userNow.month,
      date: userNow.day,
      hour: userNow.hour,
      minute: userNow.minute,
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

    // ---------- Advanced Astrology Features ----------
    let extraPoints: CombinedResult['extraPoints'] = undefined;
    let solarReturn: CombinedResult['solarReturn'] = undefined;
    let lunarReturn: CombinedResult['lunarReturn'] = undefined;
    let progressions: CombinedResult['progressions'] = undefined;

    try {
      const houseCusps = houses.map((h: any) => h.cusp);
      const natalInput = {
        year, month, date: day, hour, minute,
        latitude, longitude, timeZone: resolvedTz
      };

      // Get Sun/Moon/ASC for calculations
      const sunPlanet = planets.find((p: any) => p.name === "Sun");
      const moonPlanet = planets.find((p: any) => p.name === "Moon");
      const sunLon = sunPlanet?.longitude ?? 0;
      const moonLon = moonPlanet?.longitude ?? 0;
      const ascLon = (ascendant as any)?.longitude ?? 0;
      const sunHouse = sunPlanet?.house ?? 1;
      const nightChart = isNightChart(sunHouse);

      // ===== Extra Points (Chiron, Lilith, Part of Fortune, Vertex) =====
      try {
        const chiron = calculateChiron(0, houseCusps);
        const lilith = calculateLilith(0, houseCusps);
        const partOfFortune = calculatePartOfFortune(ascLon, sunLon, moonLon, nightChart, houseCusps);
        const vertex = calculateVertex(0, latitude, longitude, houseCusps);
        extraPoints = { chiron, lilith, partOfFortune, vertex };
      } catch (epErr) {
        if (enableDebugLogs) console.warn("[Extra points calculation skipped]", epErr);
      }

      // ===== Solar Return (현재 연도 - 사용자 타임존 기준) =====
      try {
        const srChart = await calculateSolarReturn({ natal: natalInput, year: userNow.year });
        const srSummary = getSolarReturnSummary(srChart);
        solarReturn = { chart: srChart, summary: srSummary };
      } catch (srErr) {
        if (enableDebugLogs) console.warn("[Solar Return calculation skipped]", srErr);
      }

      // ===== Lunar Return (현재 월 - 사용자 타임존 기준) =====
      try {
        const lrChart = await calculateLunarReturn({
          natal: natalInput,
          month: userNow.month,
          year: userNow.year,
        });
        const lrSummary = getLunarReturnSummary(lrChart);
        lunarReturn = { chart: lrChart, summary: lrSummary };
      } catch (lrErr) {
        if (enableDebugLogs) console.warn("[Lunar Return calculation skipped]", lrErr);
      }

      // ===== Progressions (Secondary + Solar Arc - 사용자 타임존 기준) =====
      try {
        const today = `${userNow.year}-${String(userNow.month).padStart(2, '0')}-${String(userNow.day).padStart(2, '0')}`;

        // Secondary Progressions
        const secProgChart = await calculateSecondaryProgressions({ natal: natalInput, targetDate: today });
        const secProgSun = secProgChart.planets.find(p => p.name === "Sun");
        const secProgMoon = secProgChart.planets.find(p => p.name === "Moon");
        const secMoonPhase = secProgSun && secProgMoon
          ? getProgressedMoonPhase(secProgSun.longitude, secProgMoon.longitude)
          : { phase: "Unknown", angle: 0, description: "" };
        const secProgSummary = getProgressionSummary(secProgChart);

        // Solar Arc Directions
        const solarArcChart = await calculateSolarArcDirections({ natal: natalInput, targetDate: today });
        const solarArcSummary = getProgressionSummary(solarArcChart);

        progressions = {
          secondary: {
            chart: secProgChart,
            moonPhase: secMoonPhase,
            summary: secProgSummary,
          },
          solarArc: {
            chart: solarArcChart,
            summary: solarArcSummary,
          },
        };
      } catch (progErr) {
        if (enableDebugLogs) console.warn("[Progressions calculation skipped]", progErr);
      }

    } catch (advErr) {
      if (enableDebugLogs) console.warn("[Advanced astrology features skipped]", advErr);
    }

    if (enableDebugLogs) {
      console.log("[Astrology finished]:", {
        sun: planets.find((p) => p.name === "Sun")?.sign,
        moon: planets.find((p) => p.name === "Moon")?.sign,
        extraPoints: extraPoints ? Object.keys(extraPoints) : 'none',
        solarReturn: solarReturn ? 'calculated' : 'none',
        lunarReturn: lunarReturn ? 'calculated' : 'none',
        progressions: progressions ? 'calculated' : 'none',
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
      // Advanced Astrology Data (all features)
      extraPoints,
      solarReturn,
      lunarReturn,
      progressions,
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
