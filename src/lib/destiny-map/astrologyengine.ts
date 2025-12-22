'use server';

import {
  calculateNatalChart,
  buildEngineMeta,
  findNatalAspectsPlus,
  resolveOptions,
  type Chart,
  type AstrologyChartFacts,
  type NatalChartData,
  type PlanetData,
  type AspectHit,
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
  // 🐉 Draconic (드라코닉 - 영혼 차트)
  calculateDraconicChart,
  compareDraconicToNatal,
  type DraconicChart,
  type DraconicComparison,
  // 🎵 Harmonics (하모닉)
  calculateHarmonicChart,
  analyzeHarmonic,
  generateHarmonicProfile,
  type HarmonicChart,
  type HarmonicAnalysis,
  type HarmonicProfile,
  // ☄️ Asteroids (소행성)
  calculateAllAsteroids,
  findAllAsteroidAspects,
  type Asteroid,
  // ⭐ Fixed Stars (항성)
  findFixedStarConjunctions,
  type FixedStarConjunction,
  // 🌑 Eclipses (일/월식)
  findEclipseImpact,
  getUpcomingEclipses,
  type Eclipse,
  type EclipseImpact,
  // 📅 Electional (택일)
  getMoonPhase,
  checkVoidOfCourse,
  calculatePlanetaryHour,
  getRetrogradePlanets,
  analyzeElection,
  findBestDates,
  type MoonPhase,
  type VoidOfCourseInfo,
  type PlanetaryHour,
  type ElectionalAnalysis,
  // ⚡ Midpoints (미드포인트)
  calculateMidpoints,
  findMidpointActivations,
  type Midpoint,
  type MidpointActivation,
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
  // 고급 분석 (신강/신약, 격국, 용신)
  analyzeExtendedSaju,
  type ExtendedAdvancedAnalysis,
  // 격국/용신 모듈
  determineGeokguk,
  determineYongsin,
  type GeokgukResult,
  type YongsinResult,
  // 통근/투출/회국
  calculateTonggeun,
  calculateTuechul,
  calculateHoeguk,
  calculateDeukryeong,
  type TonggeunResult,
  type TuechulResult,
  type HoegukResult,
  type DeukryeongResult,
  // 형충회합
  analyzeHyeongchung,
  type HyeongchungAnalysis,
  // 십신 심층 분석
  analyzeSibsinComprehensive,
  type SibsinComprehensiveAnalysis,
  // 건강/직업 분석
  analyzeHealthCareer,
  type HealthCareerComprehensive,
  // 종합 점수
  calculateComprehensiveScore,
  type ComprehensiveScore,
  // 🔥 1000% 급 고급 분석 (종격, 화격, 일주론 심화, 공망 심화, 삼기)
  performUltraAdvancedAnalysis,
  type UltraAdvancedAnalysis,
} from "../Saju";

import { annotateShinsal, toSajuPillarsLike, type SajuPillarsAdapterInput } from "../Saju/shinsal";
import fs from "fs";
import path from "path";
import tzLookup from "tz-lookup";

// Local type definitions for this module
interface HouseCusp {
  cusp: number;
  formatted: string;
}

// SajuPillar type compatible with SajuPillarsAdapterInput
type SajuPillar = SajuPillarsAdapterInput['yearPillar'];

interface SajuPillars {
  year?: SajuPillar;
  month?: SajuPillar;
  day?: SajuPillar;
  time?: SajuPillar;
}

interface TransitAspect {
  type: string;
  from: { name: string; longitude: number };
  to: { name: string; longitude: number };
  orb: string;
}

interface AstrologyData {
  facts: AstrologyChartFacts;
  planets: PlanetData[];
  houses: HouseCusp[];
  ascendant: PlanetData;
  mc: PlanetData;
  aspects: AspectHit[];
  meta: unknown;
  options: ReturnType<typeof resolveOptions>;
  transits: TransitAspect[];
}

interface SajuData {
  facts: SajuFacts | Record<string, unknown>;
  pillars: SajuPillars;
  dayMaster: Record<string, unknown>;
  unse: {
    daeun: unknown[];
    annual: unknown[];
    monthly: unknown[];
    iljin: unknown[];
  };
  sinsal: unknown;
  // 고급 분석 데이터
  advancedAnalysis?: {
    // 신강/신약, 격국, 용신, 통근, 조후용신
    extended?: ExtendedAdvancedAnalysis;
    // 격국 (새 모듈)
    geokguk?: GeokgukResult;
    // 용신 (새 모듈)
    yongsin?: YongsinResult;
    // 통근/투출/회국/득령
    tonggeun?: TonggeunResult;      // single
    tuechul?: TuechulResult[];      // array
    hoeguk?: HoegukResult[];        // array
    deukryeong?: DeukryeongResult;  // single
    // 형충회합
    hyeongchung?: HyeongchungAnalysis;
    // 십신 심층 분석
    sibsin?: SibsinComprehensiveAnalysis;
    // 건강/직업 분석
    healthCareer?: HealthCareerComprehensive;
    // 종합 점수
    score?: ComprehensiveScore;
    // 🔥 1000% 급 고급 분석 (종격, 화격, 일주론 심화, 공망 심화, 삼기)
    ultraAdvanced?: UltraAdvancedAnalysis;
  };
}

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
  astrology: AstrologyData | Record<string, unknown>;
  saju: SajuData;
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
  // 🐉 Draconic (드라코닉 - 영혼 차트)
  draconic?: {
    chart: DraconicChart;
    comparison: DraconicComparison;
  };
  // 🎵 Harmonics (하모닉)
  harmonics?: {
    h5: HarmonicChart;     // 5차 하모닉 (창조성)
    h7: HarmonicChart;     // 7차 하모닉 (영감)
    h9: HarmonicChart;     // 9차 하모닉 (완성)
    profile: HarmonicProfile;
  };
  // ☄️ Asteroids (소행성)
  asteroids?: {
    ceres?: Asteroid;
    pallas?: Asteroid;
    juno?: Asteroid;
    vesta?: Asteroid;
    aspects?: ReturnType<typeof findAllAsteroidAspects>;
  };
  // ⭐ Fixed Stars (항성)
  fixedStars?: FixedStarConjunction[];
  // 🌑 Eclipses (일/월식)
  eclipses?: {
    impact: EclipseImpact | null;
    upcoming: Eclipse[];
  };
  // 📅 Electional (택일)
  electional?: {
    moonPhase: MoonPhase;
    voidOfCourse: VoidOfCourseInfo | null;
    planetaryHour: PlanetaryHour;
    retrograde: string[];
    analysis?: ElectionalAnalysis;
  };
  // ⚡ Midpoints (미드포인트)
  midpoints?: {
    sunMoon?: Midpoint;
    ascMc?: Midpoint;
    all: Midpoint[];
    activations?: MidpointActivation[];
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

async function getSinsal(pillars: SajuPillars) {
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

function computePoF(planets: PlanetData[], houses: HouseCusp[], ascendant: PlanetData) {
  const norm = (deg: number) => ((deg % 360) + 360) % 360;
  const findPlanet = (name: string) => planets.find((p) => p?.name === name);
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
    const cusps = houses || [];
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

    // Add Part of Fortune to planets array (mutating)
    const pof: PlanetData = {
      name: "Part of Fortune",
      longitude: pofLon,
      sign: signName,
      degree,
      minute,
      formatted: `${signName} ${degree} deg ${minute.toString().padStart(2, "0")}'`,
      house: houseNum,
    };
    planets.push(pof);
  }
}

function calcTransitsToLights(transitPlanets: PlanetData[], lights: { name: string; longitude: number }[], orb = 4): TransitAspect[] {
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
  const transits: TransitAspect[] = [];
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
    const natalChart = natalRaw as unknown as Chart;
    const astroFacts = natalRaw as unknown as AstrologyChartFacts;
    const astroOptions = resolveOptions();
    const astroAspects = findNatalAspectsPlus(natalChart, {}, astroOptions);
    const astroMeta = natalChart.meta ? buildEngineMeta(natalChart.meta, astroOptions) : null;
    const { planets, houses, ascendant, mc } = natalRaw;

    // Part of Fortune - cast to mutable arrays
    const mutablePlanets = planets as PlanetData[];
    const mutableHouses = houses as HouseCusp[];
    computePoF(mutablePlanets, mutableHouses, ascendant);

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
    const transitPlanets = transitRaw.planets;
    const lights = [
      { name: "Sun", longitude: planets.find((p) => p.name === "Sun")?.longitude ?? 0 },
      { name: "Moon", longitude: planets.find((p) => p.name === "Moon")?.longitude ?? 0 },
      { name: "Ascendant", longitude: ascendant?.longitude ?? 0 },
      { name: "MC", longitude: mc?.longitude ?? 0 },
    ];
    const transits = calcTransitsToLights(transitPlanets, lights, 4);

    // ---------- Advanced Astrology Features ----------
    let extraPoints: CombinedResult['extraPoints'] = undefined;
    let solarReturn: CombinedResult['solarReturn'] = undefined;
    let lunarReturn: CombinedResult['lunarReturn'] = undefined;
    let progressions: CombinedResult['progressions'] = undefined;
    // 🐉 Draconic (드라코닉 - 영혼 차트)
    let draconic: CombinedResult['draconic'] = undefined;
    // 🎵 Harmonics (하모닉)
    let harmonics: CombinedResult['harmonics'] = undefined;
    // ☄️ Asteroids (소행성)
    let asteroids: CombinedResult['asteroids'] = undefined;
    // ⭐ Fixed Stars (항성)
    let fixedStars: CombinedResult['fixedStars'] = undefined;
    // 🌑 Eclipses (일/월식)
    let eclipses: CombinedResult['eclipses'] = undefined;
    // 📅 Electional (택일)
    let electional: CombinedResult['electional'] = undefined;
    // ⚡ Midpoints (미드포인트)
    let midpoints: CombinedResult['midpoints'] = undefined;

    try {
      const houseCusps = houses.map((h) => h.cusp);
      const natalInput = {
        year, month, date: day, hour, minute,
        latitude, longitude, timeZone: resolvedTz
      };

      // Get Sun/Moon/ASC for calculations
      const sunPlanet = planets.find((p) => p.name === "Sun");
      const moonPlanet = planets.find((p) => p.name === "Moon");
      const sunLon = sunPlanet?.longitude ?? 0;
      const moonLon = moonPlanet?.longitude ?? 0;
      const ascLon = ascendant?.longitude ?? 0;
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
            moonPhase: secMoonPhase as any,
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

      // ===== 🐉 Draconic Chart (드라코닉 - 영혼 차트) =====
      try {
        const draconicChart = calculateDraconicChart(natalChart);
        const draconicComparison = compareDraconicToNatal(natalChart);
        draconic = { chart: draconicChart, comparison: draconicComparison };
      } catch (draErr) {
        if (enableDebugLogs) console.warn("[Draconic calculation skipped]", draErr);
      }

      // ===== 🎵 Harmonics (하모닉 - 5차, 7차, 9차) =====
      try {
        const h5 = calculateHarmonicChart(natalChart, 5);
        const h7 = calculateHarmonicChart(natalChart, 7);
        const h9 = calculateHarmonicChart(natalChart, 9);
        // Calculate current age for harmonic profile
        const currentAge = userNow.year - year;
        const profile = generateHarmonicProfile(natalChart, currentAge);
        harmonics = { h5, h7, h9, profile };
      } catch (harmErr) {
        if (enableDebugLogs) console.warn("[Harmonics calculation skipped]", harmErr);
      }

      // ===== ☄️ Asteroids (소행성 - Ceres, Pallas, Juno, Vesta) =====
      try {
        const jdUT = natalChart.meta?.jdUT;
        if (jdUT) {
          const allAsteroids = calculateAllAsteroids(jdUT, houseCusps);
          const asteroidAspects = findAllAsteroidAspects(allAsteroids, natalChart.planets);
          asteroids = {
            ceres: allAsteroids.Ceres,
            pallas: allAsteroids.Pallas,
            juno: allAsteroids.Juno,
            vesta: allAsteroids.Vesta,
            aspects: asteroidAspects,
          };
        }
      } catch (astErr) {
        if (enableDebugLogs) console.warn("[Asteroids calculation skipped]", astErr);
      }

      // ===== ⭐ Fixed Stars (항성) =====
      try {
        fixedStars = findFixedStarConjunctions(natalChart);
      } catch (fsErr) {
        if (enableDebugLogs) console.warn("[Fixed Stars calculation skipped]", fsErr);
      }

      // ===== 🌑 Eclipses (일/월식 영향 분석) =====
      try {
        // findEclipseImpact takes chart and optionally eclipses array
        const eclipseImpacts = findEclipseImpact(natalChart);
        const upcomingEclipses = getUpcomingEclipses(5);
        // Take the first impact or null if none
        const firstImpact = eclipseImpacts.length > 0 ? eclipseImpacts[0] : null;
        eclipses = { impact: firstImpact, upcoming: upcomingEclipses };
      } catch (eclErr) {
        if (enableDebugLogs) console.warn("[Eclipses calculation skipped]", eclErr);
      }

      // ===== 📅 Electional (택일 분석 - 출생 차트 기반) =====
      try {
        // Get sun and moon longitudes from natal chart
        const sunPlanetEl = natalChart.planets.find(p => p.name === "Sun");
        const moonPlanetEl = natalChart.planets.find(p => p.name === "Moon");
        if (sunPlanetEl && moonPlanetEl) {
          const moonPhaseNow = getMoonPhase(sunPlanetEl.longitude, moonPlanetEl.longitude);
          const voidOfCourse = checkVoidOfCourse(natalChart);
          const retrograde = getRetrogradePlanets(natalChart);
          const nowDate = new Date();
          electional = {
            moonPhase: moonPhaseNow,
            voidOfCourse,
            planetaryHour: {
              planet: "Sun",
              startTime: nowDate,
              endTime: new Date(nowDate.getTime() + 3600000),
              isDay: true,
              goodFor: ["general"]
            },
            retrograde,
            analysis: undefined, // Skip complex election analysis for now
          };
        }
      } catch (elErr) {
        if (enableDebugLogs) console.warn("[Electional calculation skipped]", elErr);
      }

      // ===== ⚡ Midpoints (미드포인트) =====
      try {
        const allMidpoints = calculateMidpoints(natalChart);
        const sunMoonMidpoint = allMidpoints.find(m =>
          (m.planet1 === 'Sun' && m.planet2 === 'Moon') || (m.planet1 === 'Moon' && m.planet2 === 'Sun')
        );
        const ascMcMidpoint = allMidpoints.find(m =>
          (m.planet1 === 'Ascendant' && m.planet2 === 'MC') || (m.planet1 === 'MC' && m.planet2 === 'Ascendant')
        );
        // findMidpointActivations takes chart as first arg
        const midpointActivations = findMidpointActivations(natalChart);
        midpoints = {
          sunMoon: sunMoonMidpoint,
          ascMc: ascMcMidpoint,
          all: allMidpoints,
          activations: midpointActivations,
        };
      } catch (mpErr) {
        if (enableDebugLogs) console.warn("[Midpoints calculation skipped]", mpErr);
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
        draconic: draconic ? 'calculated' : 'none',
        harmonics: harmonics ? 'calculated' : 'none',
        asteroids: asteroids ? 'calculated' : 'none',
        fixedStars: fixedStars ? `${fixedStars.length} found` : 'none',
        eclipses: eclipses ? 'calculated' : 'none',
        electional: electional ? 'calculated' : 'none',
        midpoints: midpoints ? `${midpoints.all?.length ?? 0} midpoints` : 'none',
      });
    }

    // ---------- Saju ----------
    const timezone = resolvedTz;
    const [hh, mmRaw] = birthTime.split(":");
    const safeBirthTime = `${hh.padStart(2, "0")}:${(mmRaw ?? "00").padStart(2, "0")}`;

    // calculateSajuData returns: { yearPillar, monthPillar, dayPillar, timePillar, daeWoon, fiveElements, dayMaster }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sajuFacts: any = {};
    try {
      sajuFacts = await calculateSajuData(birthDate.trim(), safeBirthTime, gender, "solar", timezone);
      if (enableDebugLogs) { console.log("[SajuFacts keys]:", Object.keys(sajuFacts || {})); }
    } catch (err) {
      console.error("[calculateSajuData Error]", err);
    }

    const pillars: SajuPillars = {
      year: sajuFacts?.yearPillar,
      month: sajuFacts?.monthPillar,
      day: sajuFacts?.dayPillar,
      time: sajuFacts?.timePillar,
    };
    const dayMaster = sajuFacts?.dayMaster ?? {};
    if (enableDebugLogs) {
      console.log("[computeDestinyMap] dayMaster extracted:", JSON.stringify(dayMaster));
    }

    let daeun: unknown[] = [];
    let annual: unknown[] = [];
    let monthly: unknown[] = [];
    let iljin: unknown[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const hasValidPillars = Boolean(pillars.year && pillars.month && pillars.day);
    if (hasValidPillars) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = getDaeunCycles(birthDateObj, gender, pillars as any, dayMaster as any, timezone);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // 세운: 현재 연도부터 향후 10년 (과거가 아닌 미래/현재 운세)
        const a = getAnnualCycles(currentYear, 10, dayMaster as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // 월운: 현재 연도 기준
        const m = getMonthlyCycles(currentYear, dayMaster as any);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // 일진: 현재 연/월 기준
        const i = getIljinCalendar(currentYear, currentMonth, dayMaster as any);
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

    // ---------- Advanced Saju Analysis (고급 사주 분석) ----------
    let advancedAnalysis: SajuData['advancedAnalysis'] = undefined;

    if (hasValidPillars && pillars.year && pillars.month && pillars.day && pillars.time) {
      try {
        // dayMaster from calculateSajuData is { name, element, yin_yang }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const dm = sajuFacts?.dayMaster as any;

        // 사주 pillars를 분석 함수에 맞는 형태로 변환
        const pillarsForAnalysis = {
          yearPillar: {
            heavenlyStem: { name: pillars.year.heavenlyStem?.name || '', element: (pillars.year.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.year.earthlyBranch?.name || '', element: (pillars.year.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          monthPillar: {
            heavenlyStem: { name: pillars.month.heavenlyStem?.name || '', element: (pillars.month.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.month.earthlyBranch?.name || '', element: (pillars.month.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          dayPillar: {
            heavenlyStem: { name: pillars.day.heavenlyStem?.name || '', element: (pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.day.earthlyBranch?.name || '', element: (pillars.day.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          timePillar: {
            heavenlyStem: { name: pillars.time.heavenlyStem?.name || '', element: (pillars.time.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.time.earthlyBranch?.name || '', element: (pillars.time.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
        };

        // 일주 분석용 데이터
        const dayMasterForAnalysis = {
          name: dm?.name || pillars.day.heavenlyStem?.name || '',
          element: (dm?.element || pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수',
          yin_yang: (dm?.yinYang || '양') as '음' | '양',
        };

        // SajuPillarsLike for shinsal modules (heavenlyStem/earthlyBranch format)
        const pillarsLike = toSajuPillarsLike({
          yearPillar: {
            heavenlyStem: { name: pillars.year.heavenlyStem?.name || '', element: (pillars.year.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.year.earthlyBranch?.name || '', element: (pillars.year.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          monthPillar: {
            heavenlyStem: { name: pillars.month.heavenlyStem?.name || '', element: (pillars.month.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.month.earthlyBranch?.name || '', element: (pillars.month.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          dayPillar: {
            heavenlyStem: { name: pillars.day.heavenlyStem?.name || '', element: (pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.day.earthlyBranch?.name || '', element: (pillars.day.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
          timePillar: {
            heavenlyStem: { name: pillars.time.heavenlyStem?.name || '', element: (pillars.time.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수' },
            earthlyBranch: { name: pillars.time.earthlyBranch?.name || '', element: (pillars.time.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수' },
          },
        });

        // SajuPillarsInput for geokguk/yongsin/tonggeun modules (stem/branch)
        // Note: Some modules use 'hour', others use 'time' - include both for compatibility
        const timePillarSimple = { stem: pillars.time.heavenlyStem?.name || '', branch: pillars.time.earthlyBranch?.name || '' };
        const pillarsSimple = {
          year: { stem: pillars.year.heavenlyStem?.name || '', branch: pillars.year.earthlyBranch?.name || '' },
          month: { stem: pillars.month.heavenlyStem?.name || '', branch: pillars.month.earthlyBranch?.name || '' },
          day: { stem: pillars.day.heavenlyStem?.name || '', branch: pillars.day.earthlyBranch?.name || '' },
          hour: timePillarSimple,
          time: timePillarSimple,
        };

        advancedAnalysis = {};

        // 1. 신강/신약 + 격국 + 용신 + 통근 + 조후용신 (통합 분석)
        try {
          const extended = analyzeExtendedSaju(dayMasterForAnalysis, pillarsForAnalysis);
          advancedAnalysis.extended = extended;
          if (enableDebugLogs) console.log("[Extended analysis]:", extended.strength.level, extended.geokguk.type);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Extended analysis skipped]", e);
        }

        // 2. 격국 (새 모듈) - uses pillarsSimple format
        try {
          const geokguk = determineGeokguk(pillarsSimple);
          advancedAnalysis.geokguk = geokguk;
        } catch (e) {
          if (enableDebugLogs) console.warn("[Geokguk skipped]", e);
        }

        // 3. 용신 (새 모듈) - uses pillarsSimple format
        try {
          const yongsin = determineYongsin(pillarsSimple);
          advancedAnalysis.yongsin = yongsin;
        } catch (e) {
          if (enableDebugLogs) console.warn("[Yongsin skipped]", e);
        }

        // 4. 통근/투출/회국/득령 - uses pillarsSimple format
        try {
          advancedAnalysis.tonggeun = calculateTonggeun(dayMasterForAnalysis.name, pillarsSimple);
          advancedAnalysis.tuechul = calculateTuechul(pillarsSimple);
          advancedAnalysis.hoeguk = calculateHoeguk(pillarsSimple);
          const monthBranch = pillarsSimple.month.branch;
          advancedAnalysis.deukryeong = calculateDeukryeong(dayMasterForAnalysis.name, monthBranch);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Tonggeun/Tuechul/Hoeguk skipped]", e);
        }

        // 5. 형충회합 - eslint-disable for type mismatch
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advancedAnalysis.hyeongchung = analyzeHyeongchung(pillarsSimple as any);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Hyeongchung skipped]", e);
        }

        // 6. 십신 심층 분석 (takes 1 argument)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advancedAnalysis.sibsin = analyzeSibsinComprehensive(pillarsSimple as any);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Sibsin analysis skipped]", e);
        }

        // 7. 건강/직업 분석 (takes 1 argument)
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advancedAnalysis.healthCareer = analyzeHealthCareer(pillarsSimple as any);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Health/Career analysis skipped]", e);
        }

        // 8. 종합 점수 (takes pillars and dayMaster)
        // calculateComprehensiveScore expects SajuPillars format with heavenlyStem/earthlyBranch objects
        try {
          // Helper to derive yin_yang from stem/branch name (천간/지지 이름으로 음양 판정)
          const getYinYangFromName = (name: string): '음' | '양' => {
            // 양(陽) stems: 갑, 병, 무, 경, 임
            const yangStems = ['갑', '병', '무', '경', '임'];
            // 양(陽) branches: 자, 인, 진, 오, 신, 술
            const yangBranches = ['자', '인', '진', '오', '신', '술'];
            if (yangStems.includes(name) || yangBranches.includes(name)) return '양';
            return '음';
          };

          const pillarsForScore = {
            year: {
              heavenlyStem: { name: pillars.year.heavenlyStem?.name || '', element: (pillars.year.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.year.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.year.earthlyBranch?.name || '', element: (pillars.year.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.year.earthlyBranch?.name || '') },
              jijanggan: (pillars.year as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            month: {
              heavenlyStem: { name: pillars.month.heavenlyStem?.name || '', element: (pillars.month.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.month.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.month.earthlyBranch?.name || '', element: (pillars.month.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.month.earthlyBranch?.name || '') },
              jijanggan: (pillars.month as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            day: {
              heavenlyStem: { name: pillars.day.heavenlyStem?.name || '', element: (pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.day.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.day.earthlyBranch?.name || '', element: (pillars.day.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.day.earthlyBranch?.name || '') },
              jijanggan: (pillars.day as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            time: {
              heavenlyStem: { name: pillars.time.heavenlyStem?.name || '', element: (pillars.time.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.time.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.time.earthlyBranch?.name || '', element: (pillars.time.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromName(pillars.time.earthlyBranch?.name || '') },
              jijanggan: (pillars.time as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advancedAnalysis.score = calculateComprehensiveScore(pillarsForScore as any);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Score calculation skipped]", e);
        }

        // 9. 🔥 1000% 급 고급 분석 (종격, 화격, 일주론 심화, 공망 심화, 삼기)
        // performUltraAdvancedAnalysis expects SajuPillars format with heavenlyStem/earthlyBranch objects
        try {
          // Reuse the helper from above (defined in pillarsForScore block)
          const getYinYangFromNameUltra = (name: string): '음' | '양' => {
            const yangStems = ['갑', '병', '무', '경', '임'];
            const yangBranches = ['자', '인', '진', '오', '신', '술'];
            if (yangStems.includes(name) || yangBranches.includes(name)) return '양';
            return '음';
          };

          const pillarsForUltra = {
            year: {
              heavenlyStem: { name: pillars.year.heavenlyStem?.name || '', element: (pillars.year.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.year.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.year.earthlyBranch?.name || '', element: (pillars.year.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.year.earthlyBranch?.name || '') },
              jijanggan: (pillars.year as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            month: {
              heavenlyStem: { name: pillars.month.heavenlyStem?.name || '', element: (pillars.month.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.month.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.month.earthlyBranch?.name || '', element: (pillars.month.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.month.earthlyBranch?.name || '') },
              jijanggan: (pillars.month as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            day: {
              heavenlyStem: { name: pillars.day.heavenlyStem?.name || '', element: (pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.day.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.day.earthlyBranch?.name || '', element: (pillars.day.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.day.earthlyBranch?.name || '') },
              jijanggan: (pillars.day as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
            time: {
              heavenlyStem: { name: pillars.time.heavenlyStem?.name || '', element: (pillars.time.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.time.heavenlyStem?.name || '') },
              earthlyBranch: { name: pillars.time.earthlyBranch?.name || '', element: (pillars.time.earthlyBranch?.element || '목') as '목' | '화' | '토' | '금' | '수', yin_yang: getYinYangFromNameUltra(pillars.time.earthlyBranch?.name || '') },
              jijanggan: (pillars.time as { jijanggan?: Record<string, unknown> }).jijanggan || {},
            },
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advancedAnalysis.ultraAdvanced = performUltraAdvancedAnalysis(pillarsForUltra as any);
        } catch (e) {
          if (enableDebugLogs) console.warn("[Ultra Advanced analysis skipped]", e);
        }

        if (enableDebugLogs) {
          console.log("[Advanced Saju Analysis completed]:", {
            hasExtended: !!advancedAnalysis.extended,
            hasGeokguk: !!advancedAnalysis.geokguk,
            hasYongsin: !!advancedAnalysis.yongsin,
            hasTonggeun: !!advancedAnalysis.tonggeun,
            hasHyeongchung: !!advancedAnalysis.hyeongchung,
            hasSibsin: !!advancedAnalysis.sibsin,
            hasHealthCareer: !!advancedAnalysis.healthCareer,
            hasScore: !!advancedAnalysis.score,
            hasUltraAdvanced: !!advancedAnalysis.ultraAdvanced,
          });
        }
      } catch (advErr) {
        console.warn("[Advanced Saju Analysis error]", advErr);
      }
    }

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
                saju: { facts: sajuFacts, pillars, dayMaster, unse: { daeun, annual, monthly, iljin }, sinsal, advancedAnalysis },
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
      saju: { facts: { ...sajuFacts, birthDate }, pillars, dayMaster, unse: { daeun, annual, monthly, iljin }, sinsal, advancedAnalysis },
      summary,
      // Advanced Astrology Data (all features)
      extraPoints,
      solarReturn,
      lunarReturn,
      progressions,
      // 🐉 Draconic (드라코닉 - 영혼 차트)
      draconic,
      // 🎵 Harmonics (하모닉)
      harmonics,
      // ☄️ Asteroids (소행성)
      asteroids,
      // ⭐ Fixed Stars (항성)
      fixedStars,
      // 🌑 Eclipses (일/월식)
      eclipses,
      // 📅 Electional (택일)
      electional,
      // ⚡ Midpoints (미드포인트)
      midpoints,
    };
  } catch (err) {
    console.error("[computeDestinyMap Error]", err);
    return {
      meta: { generator: "DestinyMap Core Engine (error)", generatedAt: new Date().toISOString() },
      astrology: {},
      saju: { facts: {}, pillars: {}, dayMaster: {}, unse: { daeun: [], annual: [], monthly: [], iljin: [] }, sinsal: null, advancedAnalysis: undefined },
      summary: "Calculation error occurred. Returning data-only result.",
    };
  }
}
