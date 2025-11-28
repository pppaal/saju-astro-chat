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

/* 🐉 신살 계산 */
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
    console.error("[getSinsal error]", err);
    return null;
  }
}

/* 🚀 Main Engine */
export async function computeDestinyMap(input: CombinedInput): Promise<CombinedResult> {
  try {
    const { birthDate, birthTime, latitude, longitude, gender: rawGender, tz, name } = input;
    console.log("📥 [Engine] Input:", input);

    const gender = (rawGender ?? "male").toLowerCase() as "male" | "female";
    const [year, month, day] = birthDate.split("-").map(Number);
    const [hour, minute] = birthTime.split(":").map((v) => Number(v) || 0);

    const birthISO = `${birthDate}T${birthTime.length === 5 ? birthTime + ":00" : birthTime}`;
    const birthDateObj = new Date(birthISO);
    if (isNaN(birthDateObj.getTime())) throw new Error("Invalid birth date/time format");

    /* ---------- 점성 ---------- */
    console.log("🔭 [Engine] Start astrology calculation...");
    const natalRaw = await calculateNatalChart({
      year,
      month,
      date: day,
      hour,
      minute,
      latitude,
      longitude,
      timeZone: tz ?? "Asia/Seoul",
    });
    const astroFacts = natalRaw as unknown as AstrologyChartFacts;
    const astroOptions = resolveOptions();
    const astroAspects = (findAspectsPlus as any)(astroFacts, astroOptions);
    const astroMeta = (buildEngineMeta as any)(astroFacts, astroAspects);
    const { planets, houses, ascendant, mc } = natalRaw;

    console.log("✨ Astrology finished:", {
      sun: planets.find((p) => p.name === "Sun")?.sign,
      moon: planets.find((p) => p.name === "Moon")?.sign,
    });

    /* ---------- 사주 ---------- */
    const timezone = tz ?? "Asia/Seoul";
    const [hh, mmRaw] = birthTime.split(":");
    const safeBirthTime = `${hh.padStart(2, "0")}:${(mmRaw ?? "00").padStart(2, "0")}`;

    let sajuFacts: SajuFacts | any = {};
    try {
      sajuFacts = await calculateSajuData(birthDate.trim(), safeBirthTime, gender, "solar", timezone);
      console.log("🧭 SajuFacts keys:", Object.keys(sajuFacts || {}));
    } catch (err) {
      console.error("❌ [calculateSajuData Error]", err);
    }

    // ⛳ 루트 바로 참조
    const pillars = {
      year: sajuFacts?.yearPillar,
      month: sajuFacts?.monthPillar,
      day: sajuFacts?.dayPillar,
      time: sajuFacts?.timePillar,
    };
    const dayMaster = sajuFacts?.dayMaster ?? {};

    /* ---------- 운세 ---------- */
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
        console.log("✅ 운세 계산 완료:", daeun.length);
      } catch (err) {
        console.warn("[운세 계산 실패]", err);
      }
    } else {
      console.warn("⚠️ Invalid pillars → skip 운세 calculation");
    }

    const sinsal = hasValidPillars ? await getSinsal(pillars) : null;

    /* ---------- 요약 ---------- */
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
      .join(" · ");

    /* ---------- 파일 저장 ---------- */
    try {
      const dir = path.join(process.cwd(), "logs");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
      const file = path.join(dir, `destinymap-${Date.now()}.json`);
      fs.writeFileSync(
        file,
        JSON.stringify({ input, pillars, dayMaster, daeun, annual, monthly, iljin, summary }, null, 2),
        "utf8"
      );
      console.log("💾 [Engine] Full output saved:", file);
    } catch (err) {
      console.warn("⚠️ Log save failed:", err);
    }

    return {
      meta: {
        generator: "DestinyMap Core Engine (file save)",
        generatedAt: new Date().toISOString(),
        name,
        gender,
      },
      astrology: { facts: astroFacts, planets, houses, ascendant, mc, aspects: astroAspects, meta: astroMeta, options: astroOptions },
      saju: { facts: sajuFacts, pillars, dayMaster, unse: { daeun, annual, monthly, iljin }, sinsal },
      summary,
    };
  } catch (err: any) {
    console.error("🛑 [computeDestinyMap Error]", err);
    return {
      meta: { generator: "DestinyMap Core Engine (error)", generatedAt: new Date().toISOString() },
      astrology: {},
      saju: { facts: {}, pillars: {}, dayMaster: {}, unse: { daeun: [], annual: [], monthly: [], iljin: [] }, sinsal: null },
      summary: "⚠️ Calculation error occurred — returning data-only result.",
    };
  }
}