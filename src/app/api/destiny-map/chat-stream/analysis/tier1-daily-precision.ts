// src/app/api/destiny-map/chat-stream/analysis/tier1-daily-precision.ts
// TIER 1: 공망/신살/에너지/시간대 분석

import {
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
  calculateDailyPillar,
} from "@/lib/prediction/ultraPrecisionEngine";
import type { SajuDataStructure } from "../lib/types";

export interface Tier1AnalysisInput {
  saju: SajuDataStructure;
  dayStem: string;
  dayBranch: string;
  lang: string;
}

export interface Tier1AnalysisResult {
  section: string;
  dailyPillar: { stem: string; branch: string };
}

/**
 * Generate TIER 1 precision analysis: Gongmang, Shinsal, Energy Flow, Hourly Advice
 */
export function generateTier1Analysis(input: Tier1AnalysisInput): Tier1AnalysisResult {
  const { saju, dayStem, dayBranch, lang } = input;

  const today = new Date();
  const dailyPillar = calculateDailyPillar(today);
  const monthBranchVal = saju?.pillars?.month?.earthlyBranch?.name || '子';
  const yearBranchVal = saju?.pillars?.year?.earthlyBranch?.name || '子';

  const allStemsArr = [
    saju?.pillars?.year?.heavenlyStem?.name,
    saju?.pillars?.month?.heavenlyStem?.name,
    dayStem,
    saju?.pillars?.time?.heavenlyStem?.name,
  ].filter((x): x is string => Boolean(x));

  const allBranchesArr = [
    yearBranchVal,
    monthBranchVal,
    dayBranch,
    saju?.pillars?.time?.earthlyBranch?.name,
  ].filter((x): x is string => Boolean(x));

  // 공망 분석
  const gongmangResult = analyzeGongmang(dayStem, dayBranch, dailyPillar.branch);

  // 신살 분석
  const shinsalResult = analyzeShinsal(dayBranch, dailyPillar.branch);

  // 에너지 흐름 분석
  const energyResult = analyzeEnergyFlow(dayStem, allStemsArr, allBranchesArr);

  // 시간대별 조언
  const hourlyResult = generateHourlyAdvice(dailyPillar.stem, dailyPillar.branch);
  const excellentHours = hourlyResult.filter(h => h.quality === 'excellent').map(h => `${h.hour}시(${h.siGan})`);
  const goodHours = hourlyResult.filter(h => h.quality === 'good').map(h => `${h.hour}시`);
  const cautionHours = hourlyResult.filter(h => h.quality === 'caution').map(h => `${h.hour}시`);

  const parts: string[] = [
    "",
    "═══════════════════════════════════════════════════════════════",
    lang === "ko" ? "[🔮 오늘의 정밀 분석 - 공망/신살/에너지/시간대]" : "[🔮 TODAY'S PRECISION ANALYSIS - Gongmang/Shinsal/Energy/Hours]",
    "═══════════════════════════════════════════════════════════════",
    "",
    lang === "ko" ? `📅 오늘 일진: ${dailyPillar.stem}${dailyPillar.branch}` : `📅 Today: ${dailyPillar.stem}${dailyPillar.branch}`,
  ];

  // 공망 상태
  if (gongmangResult.isToday空) {
    parts.push(lang === "ko"
      ? `⚠️ 공망: ${gongmangResult.emptyBranches.join(', ')} 공망 - ${gongmangResult.affectedAreas.join(', ')} 관련 신중히`
      : `⚠️ Gongmang: ${gongmangResult.emptyBranches.join(', ')} empty - Be careful with ${gongmangResult.affectedAreas.join(', ')}`);
  } else {
    parts.push(lang === "ko"
      ? `✅ 공망: 영향 없음 (${gongmangResult.emptyBranches.join(', ')}는 공망이나 오늘과 무관)`
      : `✅ Gongmang: No effect today`);
  }

  // 신살 분석
  if (shinsalResult.active.length > 0) {
    parts.push("");
    parts.push(lang === "ko" ? "🎯 활성 신살:" : "🎯 Active Shinsals:");
    for (const shinsal of shinsalResult.active.slice(0, 4)) {
      const isPositive = shinsal.type === 'lucky';
      parts.push(lang === "ko"
        ? `  • ${shinsal.name}: ${shinsal.description} (${isPositive ? '길' : '흉'})`
        : `  • ${shinsal.name}: ${shinsal.description} (${isPositive ? 'positive' : 'caution'})`);
    }
  }

  // 에너지 흐름
  parts.push("");
  parts.push(lang === "ko"
    ? `⚡ 에너지 흐름: ${energyResult.dominantElement} 기운 ${energyResult.energyStrength}`
    : `⚡ Energy Flow: ${energyResult.dominantElement} energy ${energyResult.energyStrength}`);
  if (energyResult.description) {
    parts.push(lang === "ko"
      ? `  → ${energyResult.description}`
      : `  → ${energyResult.description}`);
  }

  // 시간대 추천
  parts.push("");
  parts.push(lang === "ko" ? "⏰ 오늘 시간대 추천:" : "⏰ Today's Recommended Hours:");
  if (excellentHours.length > 0) {
    parts.push(lang === "ko"
      ? `  🌟 최고: ${excellentHours.slice(0, 3).join(', ')}`
      : `  🌟 Excellent: ${excellentHours.slice(0, 3).join(', ')}`);
  }
  if (goodHours.length > 0) {
    parts.push(lang === "ko"
      ? `  ✅ 좋음: ${goodHours.slice(0, 4).join(', ')}`
      : `  ✅ Good: ${goodHours.slice(0, 4).join(', ')}`);
  }
  if (cautionHours.length > 0) {
    parts.push(lang === "ko"
      ? `  ⚠️ 주의: ${cautionHours.slice(0, 3).join(', ')}`
      : `  ⚠️ Caution: ${cautionHours.slice(0, 3).join(', ')}`);
  }

  parts.push("");

  return {
    section: parts.join("\n"),
    dailyPillar,
  };
}
