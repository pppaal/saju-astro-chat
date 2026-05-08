// src/app/api/counselor-engine/chat-stream/analysis/tier4-harmonics-eclipses.ts
// TIER 4: 하모닉, 이클립스, 항성 분석

import {
  generateHarmonicProfile,
  analyzeAgeHarmonic,
  getHarmonicMeaning,
} from "@/lib/astrology/foundation/harmonics";
import {
  findEclipseImpact,
  getUpcomingEclipses,
  checkEclipseSensitivity,
} from "@/lib/astrology/foundation/eclipses";
import {
  findFixedStarConjunctions,
} from "@/lib/astrology/foundation/fixedStars";
import { toChart, type NatalChartData } from "@/lib/astrology";
import { logger } from "@/lib/logger";

export interface Tier4AnalysisInput {
  natalChartData: NatalChartData | null;
  userAge?: number;
  currentYear: number;
  lang: string;
}

export interface Tier4AnalysisResult {
  section: string;
  hasRoyalStars: boolean;
  eclipseImpacts: number;
}

/**
 * Generate TIER 4 analysis: Harmonics, Eclipses, Fixed Stars
 */
export function generateTier4Analysis(input: Tier4AnalysisInput): Tier4AnalysisResult {
  const { natalChartData, userAge, currentYear, lang } = input;

  let hasRoyalStars = false;
  let eclipseImpactCount = 0;

  const parts: string[] = [
    "",
    "═══════════════════════════════════════════════════════════════",
    lang === "ko" ? "[🌟 고급 점성술 확장 - 하모닉/이클립스/항성]" : "[🌟 ADVANCED ASTROLOGY EXT - Harmonics/Eclipses/Fixed Stars]",
    "═══════════════════════════════════════════════════════════════",
    "",
  ];

  try {
    // 1. 하모닉 분석
    if (natalChartData && userAge) {
      try {
        const natalChart = toChart(natalChartData);

        const ageHarmonic = analyzeAgeHarmonic(natalChart, userAge);
        const harmonicMeaning = getHarmonicMeaning(userAge);

        parts.push(lang === "ko" ? "--- 🎵 하모닉 분석 ---" : "--- 🎵 Harmonic Analysis ---");
        parts.push(lang === "ko"
          ? `📊 나이 하모닉 (H${userAge}): ${harmonicMeaning.name}`
          : `📊 Age Harmonic (H${userAge}): ${harmonicMeaning.name}`);
        parts.push(lang === "ko"
          ? `  → 의미: ${harmonicMeaning.meaning}`
          : `  → Meaning: ${harmonicMeaning.meaning}`);
        parts.push(lang === "ko"
          ? `  → 영향 영역: ${harmonicMeaning.lifeArea}`
          : `  → Life Area: ${harmonicMeaning.lifeArea}`);
        parts.push(lang === "ko"
          ? `  → 강도: ${ageHarmonic.strength.toFixed(0)}점`
          : `  → Strength: ${ageHarmonic.strength.toFixed(0)} points`);

        if (harmonicMeaning.sajuParallel) {
          parts.push(lang === "ko"
            ? `  → 사주 병렬: ${harmonicMeaning.sajuParallel}`
            : `  → Saju Parallel: ${harmonicMeaning.sajuParallel}`);
        }

        if (ageHarmonic.patterns.length > 0) {
          parts.push(lang === "ko"
            ? `  → 패턴: ${ageHarmonic.patterns.map(p => p.type).join(', ')}`
            : `  → Patterns: ${ageHarmonic.patterns.map(p => p.type).join(', ')}`);
        }

        const profile = generateHarmonicProfile(natalChart, userAge);
        if (profile.strongestHarmonics.length > 0) {
          const strongest = profile.strongestHarmonics[0];
          parts.push(lang === "ko"
            ? `🌟 가장 강한 하모닉: H${strongest.harmonic} (${strongest.meaning})`
            : `🌟 Strongest Harmonic: H${strongest.harmonic} (${strongest.meaning})`);
        }

        logger.debug(`[TIER 4] Harmonics: age=${userAge}, strength=${ageHarmonic.strength.toFixed(0)}`);
      } catch (harmonicErr) {
        logger.warn("[TIER 4] Harmonic analysis failed:", harmonicErr);
      }
    }

    // 2. 이클립스 영향 분석
    if (natalChartData) {
      try {
        const natalChart = toChart(natalChartData);

        parts.push("");
        parts.push(lang === "ko" ? "--- 🌑 이클립스(일식/월식) 영향 ---" : "--- 🌑 Eclipse Impact ---");

        const upcomingEclipses = getUpcomingEclipses(new Date(), 4);
        if (upcomingEclipses.length > 0) {
          parts.push(lang === "ko" ? `📅 다가오는 이클립스:` : `📅 Upcoming Eclipses:`);
          for (const eclipse of upcomingEclipses.slice(0, 3)) {
            const eclipseType = eclipse.type === "solar"
              ? (lang === "ko" ? "일식" : "Solar")
              : (lang === "ko" ? "월식" : "Lunar");
            parts.push(`  → ${eclipse.date}: ${eclipseType} (${eclipse.sign} ${eclipse.degree}°)`);
          }
        }

        const eclipseImpacts = findEclipseImpact(natalChart, upcomingEclipses, 3.0);
        eclipseImpactCount = eclipseImpacts.length;

        if (eclipseImpacts.length > 0) {
          parts.push(lang === "ko" ? `⚡ 나탈 차트 영향:` : `⚡ Natal Chart Impact:`);
          for (const impact of eclipseImpacts.slice(0, 3)) {
            const aspectKo = impact.aspectType === "conjunction" ? "합" : impact.aspectType === "opposition" ? "충" : "사각";
            parts.push(lang === "ko"
              ? `  → ${impact.eclipse.date}: ${impact.affectedPoint} ${aspectKo} (오브 ${impact.orb.toFixed(1)}°)`
              : `  → ${impact.eclipse.date}: ${impact.affectedPoint} ${impact.aspectType} (orb ${impact.orb.toFixed(1)}°)`);
            parts.push(`    ${impact.interpretation}`);
          }
        }

        const sensitivity = checkEclipseSensitivity(natalChart);
        if (sensitivity.sensitive) {
          parts.push(lang === "ko"
            ? `⚠️ 이클립스 민감: 노드 축 근처 행성 ${sensitivity.sensitivePoints.join(', ')}`
            : `⚠️ Eclipse Sensitive: Planets near nodal axis ${sensitivity.sensitivePoints.join(', ')}`);
        }

        logger.debug(`[TIER 4] Eclipses: ${eclipseImpacts.length} impacts, sensitive=${sensitivity.sensitive}`);
      } catch (eclipseErr) {
        logger.warn("[TIER 4] Eclipse analysis failed:", eclipseErr);
      }
    }

    // 3. 항성 분석
    if (natalChartData) {
      try {
        const natalChart = toChart(natalChartData);

        parts.push("");
        parts.push(lang === "ko" ? "--- ⭐ 항성(Fixed Stars) 분석 ---" : "--- ⭐ Fixed Stars Analysis ---");

        const starConjunctions = findFixedStarConjunctions(natalChart, currentYear, 1.0);

        if (starConjunctions.length > 0) {
          parts.push(lang === "ko" ? `🌟 나탈 차트 항성 합 (오브 1°):` : `🌟 Fixed Star Conjunctions (orb 1°):`);

          for (const conj of starConjunctions.slice(0, 5)) {
            parts.push(lang === "ko"
              ? `  → ${conj.planet} ☌ ${conj.star.name_ko} (${conj.orb.toFixed(2)}°)`
              : `  → ${conj.planet} ☌ ${conj.star.name} (${conj.orb.toFixed(2)}°)`);
            parts.push(`    성질: ${conj.star.nature} | 키워드: ${conj.star.keywords.slice(0, 3).join(', ')}`);
            parts.push(`    해석: ${conj.star.interpretation}`);
          }

          // 왕의 별 체크
          const royalStars = ["Regulus", "Aldebaran", "Antares", "Fomalhaut"];
          const royalConjunctions = starConjunctions.filter(c => royalStars.includes(c.star.name));
          if (royalConjunctions.length > 0) {
            hasRoyalStars = true;
            parts.push(lang === "ko"
              ? `👑 왕의 별 영향: ${royalConjunctions.map(c => c.star.name_ko).join(', ')}`
              : `👑 Royal Star Influence: ${royalConjunctions.map(c => c.star.name).join(', ')}`);
            parts.push(lang === "ko"
              ? `  → 특별한 운명적 잠재력 (단, 도덕적 시험 동반)`
              : `  → Special destined potential (but with moral tests)`);
          }

          logger.debug(`[TIER 4] Fixed Stars: ${starConjunctions.length} conjunctions, royal=${hasRoyalStars}`);
        }
      } catch (starErr) {
        logger.warn("[TIER 4] Fixed star analysis failed:", starErr);
      }
    }

    parts.push("");

  } catch (e) {
    logger.warn("[TIER 4] Failed to generate analysis:", e);
  }

  return {
    section: parts.join("\n"),
    hasRoyalStars,
    eclipseImpacts: eclipseImpactCount,
  };
}
