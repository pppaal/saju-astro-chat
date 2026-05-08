// src/app/api/counselor-engine/chat-stream/analysis/tier2-daeun-transit.ts
// TIER 2: 대운-트랜짓 동기화 분석

import {
  convertSajuDaeunToInfo,
  analyzeDaeunTransitSync,
  type DaeunInfo,
} from "@/lib/prediction/daeunTransitSync";
import { logger } from "@/lib/logger";

export interface Tier2AnalysisInput {
  daeunData: unknown[];
  birthYear: number;
  currentAge: number;
  currentYear: number;
  lang: string;
}

export interface Tier2AnalysisResult {
  section: string;
  syncAnalysis?: ReturnType<typeof analyzeDaeunTransitSync>;
}

/**
 * Generate TIER 2 analysis: Daeun-Transit Synchronization
 */
export function generateTier2Analysis(input: Tier2AnalysisInput): Tier2AnalysisResult {
  const { daeunData, birthYear, currentAge, currentYear, lang } = input;

  try {
    const daeunList: DaeunInfo[] = convertSajuDaeunToInfo(daeunData);
    if (daeunList.length === 0) {
      return { section: "" };
    }

    const syncAnalysis = analyzeDaeunTransitSync(
      daeunList,
      birthYear || currentYear - currentAge,
      currentAge
    );

    const parts: string[] = [
      "",
      "═══════════════════════════════════════════════════════════════",
      lang === "ko" ? "[🌟 대운-트랜짓 동기화 분석 - 동양+서양 통합]" : "[🌟 DAEUN-TRANSIT SYNC - East+West Integration]",
      "═══════════════════════════════════════════════════════════════",
      "",
    ];

    // 인생 패턴
    parts.push(lang === "ko"
      ? `📈 인생 패턴: ${syncAnalysis.lifeCyclePattern}`
      : `📈 Life Pattern: ${syncAnalysis.lifeCyclePattern}`);
    parts.push(lang === "ko"
      ? `📊 분석 신뢰도: ${syncAnalysis.overallConfidence}%`
      : `📊 Confidence: ${syncAnalysis.overallConfidence}%`);

    // 주요 전환점 (최대 3개)
    if (syncAnalysis.majorTransitions.length > 0) {
      parts.push("");
      parts.push(lang === "ko" ? "--- 주요 전환점 ---" : "--- Major Transitions ---");
      for (const point of syncAnalysis.majorTransitions.slice(0, 3)) {
        const marker = point.age === currentAge ? "★현재★ " : "";
        parts.push(lang === "ko"
          ? `${marker}${point.age}세 (${point.year}년): ${point.synergyType} | 점수 ${point.synergyScore}`
          : `${marker}Age ${point.age} (${point.year}): ${point.synergyType} | Score ${point.synergyScore}`);
        if (point.themes.length > 0) {
          parts.push(`  → ${point.themes.slice(0, 2).join(', ')}`);
        }
      }
    }

    // 피크/도전 연도
    if (syncAnalysis.peakYears.length > 0) {
      parts.push("");
      parts.push(lang === "ko"
        ? `🌟 최고 시기: ${syncAnalysis.peakYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`
        : `🌟 Peak Years: ${syncAnalysis.peakYears.slice(0, 3).map(p => `Age ${p.age}(${p.year})`).join(', ')}`);
    }
    if (syncAnalysis.challengeYears.length > 0) {
      parts.push(lang === "ko"
        ? `⚡ 도전 시기: ${syncAnalysis.challengeYears.slice(0, 3).map(p => `${p.age}세(${p.year}년)`).join(', ')}`
        : `⚡ Challenge Years: ${syncAnalysis.challengeYears.slice(0, 3).map(p => `Age ${p.age}(${p.year})`).join(', ')}`);
    }

    parts.push("");

    logger.debug(`[TIER 2] Daeun-Transit sync: ${syncAnalysis.majorTransitions.length} transitions, confidence ${syncAnalysis.overallConfidence}%`);

    return {
      section: parts.join("\n"),
      syncAnalysis,
    };
  } catch (e) {
    logger.warn("[TIER 2] Failed to generate daeun-transit sync:", e);
    return { section: "" };
  }
}
