// src/app/api/destiny-map/chat-stream/analysis/tier3-advanced-astro.ts
// TIER 3: 고급 점성술 분석 (달 위상, 역행, 사주 패턴)

import {
  getMoonPhase,
  getMoonPhaseName,
  checkVoidOfCourse,
  getRetrogradePlanets,
} from "@/lib/astrology/foundation/electional";
import {
  analyzePatterns,
  getPatternStatistics,
} from "@/lib/Saju/patternMatcher";
import type { Chart, PlanetBase } from "@/lib/astrology";
import type { SajuDataStructure, AstroDataStructure } from "../lib/types";
import { logger } from "@/lib/logger";

export interface Tier3AnalysisInput {
  saju?: SajuDataStructure;
  astro?: AstroDataStructure;
  lang: string;
}

export interface Tier3AnalysisResult {
  section: string;
  retrogrades: string[];
  moonPhase?: string;
}

/**
 * Generate TIER 3 analysis: Moon Phase, Retrogrades, Saju Patterns, Extra Points
 */
export function generateTier3Analysis(input: Tier3AnalysisInput): Tier3AnalysisResult {
  const { saju, astro, lang } = input;
  const retrogrades: string[] = [];

  const parts: string[] = [
    "",
    "═══════════════════════════════════════════════════════════════",
    lang === "ko" ? "[🌙 고급 점성술 분석 - 진행법/택일/역행]" : "[🌙 ADVANCED ASTROLOGY - Progressions/Electional/Retrograde]",
    "═══════════════════════════════════════════════════════════════",
    "",
  ];

  let moonPhaseName: string | undefined;

  try {
    // 1. Moon Phase & Void of Course
    if (astro && astro.planets) {
      const planets = astro.planets as PlanetBase[];
      const sun = planets.find((p) => p.name === "Sun");
      const moon = planets.find((p) => p.name === "Moon");

      if (sun && moon) {
        const moonPhase = getMoonPhase(sun.longitude, moon.longitude);
        moonPhaseName = getMoonPhaseName(moonPhase);
        parts.push(lang === "ko"
          ? `🌙 달 위상: ${moonPhaseName}`
          : `🌙 Moon Phase: ${moonPhaseName}`);

        // Void of Course 체크
        const chartForVoc = { planets, ascendant: planets[0], mc: planets[0], houses: [] } as Chart;
        const vocInfo = checkVoidOfCourse(chartForVoc);
        if (vocInfo.isVoid) {
          parts.push(lang === "ko"
            ? `⚠️ 공전 중 (Void of Course): ${vocInfo.description}`
            : `⚠️ Void of Course: ${vocInfo.description}`);
        } else {
          parts.push(lang === "ko"
            ? `✅ 달 활성 상태: ${vocInfo.description}`
            : `✅ Moon Active: ${vocInfo.description}`);
        }
      }

      // 2. 역행 행성 체크
      const chartForRetro = { planets, ascendant: planets[0], mc: planets[0], houses: [] } as Chart;
      const retrogradeList = getRetrogradePlanets(chartForRetro);
      retrogrades.push(...retrogradeList);

      if (retrogradeList.length > 0) {
        parts.push(lang === "ko"
          ? `🔄 역행 중: ${retrogradeList.join(', ')}`
          : `🔄 Retrograde: ${retrogradeList.join(', ')}`);

        if (retrogradeList.includes("Mercury")) {
          parts.push(lang === "ko"
            ? `  ⚠️ 수성 역행 - 계약/커뮤니케이션 신중히`
            : `  ⚠️ Mercury Rx - Be careful with contracts/communication`);
        }
        if (retrogradeList.includes("Venus")) {
          parts.push(lang === "ko"
            ? `  ⚠️ 금성 역행 - 연애/재정 결정 보류`
            : `  ⚠️ Venus Rx - Delay love/finance decisions`);
        }
      } else {
        parts.push(lang === "ko"
          ? `✅ 역행 없음 - 모든 행성 순행 중`
          : `✅ No Retrogrades - All planets direct`);
      }

      // 3. Extra Points (키론/릴리스/버텍스)
      const chiron = planets.find((p) => p.name === "Chiron") as PlanetBase | undefined;
      const lilith = planets.find((p) => p.name === "Lilith" || p.name === "Black Moon Lilith") as PlanetBase | undefined;
      const vertex = astro.extraPoints?.vertex as PlanetBase | undefined;
      const partOfFortune = astro.extraPoints?.partOfFortune as PlanetBase | undefined;

      if (chiron || lilith || vertex || partOfFortune) {
        parts.push("");
        parts.push(lang === "ko" ? "--- 특수 포인트 ---" : "--- Extra Points ---");
        if (chiron) {
          parts.push(lang === "ko"
            ? `💫 키론 (상처와 치유): ${chiron.sign} ${chiron.degree || ''}°`
            : `💫 Chiron (Wound & Healing): ${chiron.sign} ${chiron.degree || ''}°`);
        }
        if (lilith) {
          parts.push(lang === "ko"
            ? `🖤 릴리스 (그림자 자아): ${lilith.sign} ${lilith.degree || ''}°`
            : `🖤 Lilith (Shadow Self): ${lilith.sign} ${lilith.degree || ''}°`);
        }
        if (partOfFortune) {
          parts.push(lang === "ko"
            ? `🍀 행운의 파트: ${partOfFortune.sign} ${partOfFortune.degree || ''}°`
            : `🍀 Part of Fortune: ${partOfFortune.sign} ${partOfFortune.degree || ''}°`);
        }
      }
    }

    // 4. 사주 패턴 분석 (희귀도)
    if (saju?.pillars) {
      const patternAnalysis = analyzePatterns(saju.pillars as unknown as import("@/lib/Saju/types").SajuPillars);
      if (patternAnalysis.matchedPatterns.length > 0) {
        parts.push("");
        parts.push(lang === "ko" ? "--- 사주 패턴 분석 ---" : "--- Saju Pattern Analysis ---");

        const stats = getPatternStatistics(patternAnalysis.matchedPatterns);
        parts.push(lang === "ko"
          ? `📊 패턴 수: ${patternAnalysis.matchedPatterns.length}개 (평균 점수: ${stats.averageScore})`
          : `📊 Patterns: ${patternAnalysis.matchedPatterns.length} (Avg score: ${stats.averageScore})`);

        // 희귀 패턴 강조
        const rarePatterns = patternAnalysis.matchedPatterns.filter(
          p => p.rarity === 'rare' || p.rarity === 'very_rare' || p.rarity === 'legendary'
        );
        if (rarePatterns.length > 0) {
          parts.push(lang === "ko"
            ? `✨ 희귀 패턴: ${rarePatterns.map(p => p.patternName).join(', ')}`
            : `✨ Rare Patterns: ${rarePatterns.map(p => p.patternName).join(', ')}`);
        }

        parts.push(lang === "ko"
          ? `📝 요약: ${patternAnalysis.patternSummary}`
          : `📝 Summary: ${patternAnalysis.patternSummary}`);
      }
    }

    parts.push("");
    logger.debug(`[TIER 3] analysis completed`);

  } catch (e) {
    logger.warn("[TIER 3] Failed to generate analysis:", e);
  }

  return {
    section: parts.join("\n"),
    retrogrades,
    moonPhase: moonPhaseName,
  };
}
