/**
 * Advanced Analysis Service
 * TIER 1~3 고급 분석 기능
 */

import {
  type LifePredictionInput,
} from '@/lib/prediction';
import {
  analyzeDaeunTransitSync,
  type DaeunInfo,
} from '@/lib/prediction/daeunTransitSync';
import { calculateUltraPrecisionScore } from '@/lib/prediction/ultraPrecisionEngine';
import { logger } from '@/lib/logger';
import type { AdvancedAnalysis, BaseRequest } from '../types';

/**
 * 달 위상 계산 (Sun-Moon 각도 기반)
 */
export function calculateMoonPhaseFromDegree(degree: number): { phase: string; illumination: number; name: string } {
  const normalizedDegree = ((degree % 360) + 360) % 360;
  const illumination = Math.round((1 - Math.cos(normalizedDegree * Math.PI / 180)) / 2 * 100);

  let phase: string;
  let name: string;

  if (normalizedDegree < 45) {
    phase = 'new_moon';
    name = '새달';
  } else if (normalizedDegree < 90) {
    phase = 'waxing_crescent';
    name = '초승달';
  } else if (normalizedDegree < 135) {
    phase = 'first_quarter';
    name = '상현달';
  } else if (normalizedDegree < 180) {
    phase = 'waxing_gibbous';
    name = '차오르는 달';
  } else if (normalizedDegree < 225) {
    phase = 'full_moon';
    name = '보름달';
  } else if (normalizedDegree < 270) {
    phase = 'waning_gibbous';
    name = '기우는 달';
  } else if (normalizedDegree < 315) {
    phase = 'last_quarter';
    name = '하현달';
  } else {
    phase = 'waning_crescent';
    name = '그믐달';
  }

  return { phase, illumination, name };
}

/**
 * TIER 1~3 고급 분석 수행
 */
export function performAdvancedAnalysis(
  req: BaseRequest,
  input: LifePredictionInput,
  targetDate: Date = new Date()
): AdvancedAnalysis {
  const analysis: AdvancedAnalysis = {};

  try {
    // TIER 1: 초정밀 분석
    const ultraScore = calculateUltraPrecisionScore({
      date: targetDate,
      dayStem: req.dayStem,
      dayBranch: req.dayBranch,
      monthBranch: req.monthBranch,
      yearBranch: req.yearBranch,
      allStems: req.allStems || [req.dayStem],
      allBranches: req.allBranches || [req.dayBranch, req.monthBranch, req.yearBranch],
    });

    analysis.tier1 = {
      gongmang: {
        emptyBranches: ultraScore.gongmang.emptyBranches,
        isAffected: ultraScore.gongmang.isToday空,
        affectedAreas: ultraScore.gongmang.affectedAreas,
      },
      shinsal: {
        active: ultraScore.shinsal.active.map(s => ({
          name: s.name,
          type: s.type,
          description: s.description,
        })),
        score: ultraScore.shinsal.score,
      },
      energyFlow: {
        strength: ultraScore.energyFlow.energyStrength,
        dominantElement: ultraScore.energyFlow.dominantElement,
        tonggeunCount: ultraScore.energyFlow.tonggeun.length,
        tuechulCount: ultraScore.energyFlow.tuechul.length,
      },
      hourlyAdvice: ultraScore.hourlyAdvice
        .filter(h => h.quality === 'excellent' || h.quality === 'good')
        .slice(0, 6)
        .map(h => ({
          hour: h.hour,
          quality: h.quality,
          activity: h.activity,
        })),
    };

    // TIER 2: 대운-트랜짓 동기화
    if (input.daeunList && input.daeunList.length > 0) {
      const currentAge = targetDate.getFullYear() - req.birthYear;
      const daeunSync = analyzeDaeunTransitSync(
        input.daeunList as DaeunInfo[],
        req.birthYear,
        currentAge
      );

      const currentDaeunInfo = (input.daeunList as DaeunInfo[]).find(
        d => currentAge >= d.startAge && currentAge <= d.endAge
      );

      const currentSyncPoint = daeunSync.syncPoints.find(p => p.age === currentAge);
      const majorThemes = currentSyncPoint?.themes ||
        daeunSync.majorTransitions.slice(0, 3).flatMap(t => t.themes).slice(0, 5);

      analysis.tier2 = {
        daeunSync: {
          currentDaeun: currentDaeunInfo ? {
            stem: currentDaeunInfo.stem,
            branch: currentDaeunInfo.branch,
            age: currentDaeunInfo.startAge,
          } : undefined,
          transitAlignment: currentSyncPoint?.synergyScore || 50,
          majorThemes,
        },
      };
    }

    // TIER 3: 고급 점성술 분석
    let moonPhaseData: { phase: string; illumination: number; name: string };
    let voidOfCourseData: { isVoid: boolean; endsAt?: string };
    let retrogradesData: string[] = [];

    if (req.advancedAstro?.electional) {
      const electional = req.advancedAstro.electional;
      moonPhaseData = {
        phase: electional.moonPhase?.phase || 'unknown',
        illumination: electional.moonPhase?.illumination || 0,
        name: electional.moonPhase?.name || '알 수 없음',
      };
      voidOfCourseData = {
        isVoid: electional.voidOfCourse?.isVoid || false,
        endsAt: electional.voidOfCourse?.endsAt,
      };
      retrogradesData = electional.retrograde || [];
    } else if (req.astroChart?.planets) {
      retrogradesData = req.astroChart.planets
        .filter(p => p.isRetrograde)
        .map(p => p.name);

      const sunLon = req.astroChart.sun?.longitude || 0;
      const moonLon = req.astroChart.moon?.longitude || 0;
      const phaseDegree = (moonLon - sunLon + 360) % 360;
      moonPhaseData = calculateMoonPhaseFromDegree(phaseDegree);
      voidOfCourseData = { isVoid: false };
    } else {
      const dayOfMonth = targetDate.getDate();
      const lunarPhaseEstimate = dayOfMonth <= 7 ? 'waxing_crescent' :
                                 dayOfMonth <= 14 ? 'first_quarter_to_full' :
                                 dayOfMonth <= 21 ? 'waning_gibbous' : 'last_quarter_to_new';
      const illuminationEstimate = Math.abs(Math.sin((dayOfMonth / 29.5) * Math.PI)) * 100;

      moonPhaseData = {
        phase: lunarPhaseEstimate,
        illumination: Math.round(illuminationEstimate),
        name: lunarPhaseEstimate === 'waxing_crescent' ? '초승달' :
              lunarPhaseEstimate === 'first_quarter_to_full' ? '상현달~보름' :
              lunarPhaseEstimate === 'waning_gibbous' ? '하현달' : '그믐달',
      };
      voidOfCourseData = { isVoid: false };
    }

    const patternResults: { name: string; rarity: number; description: string }[] = [];
    const patternRarityScore = 50;

    analysis.tier3 = {
      moonPhase: moonPhaseData,
      voidOfCourse: voidOfCourseData,
      retrogrades: retrogradesData,
      sajuPatterns: {
        found: patternResults,
        rarityScore: patternRarityScore,
      },
    };

    // 고급 점성 데이터 추가 분석
    if (req.advancedAstro) {
      if (req.advancedAstro.eclipses?.impact) {
        (analysis.tier3 as Record<string, unknown>).eclipseImpact = {
          type: req.advancedAstro.eclipses.impact.type,
          affectedPlanets: req.advancedAstro.eclipses.impact.affectedPlanets,
        };
      }

      if (req.advancedAstro.progressions?.secondary?.moonPhase) {
        (analysis.tier3 as Record<string, unknown>).progressedMoonPhase =
          req.advancedAstro.progressions.secondary.moonPhase;
      }

      if (req.advancedAstro.solarReturn?.summary) {
        (analysis.tier3 as Record<string, unknown>).solarReturnTheme = {
          year: req.advancedAstro.solarReturn.summary.year,
          theme: req.advancedAstro.solarReturn.summary.theme,
          keyPlanets: req.advancedAstro.solarReturn.summary.keyPlanets,
        };
      }

      if (req.advancedAstro.extraPoints) {
        (analysis.tier3 as Record<string, unknown>).extraPoints = {
          chiron: req.advancedAstro.extraPoints.chiron,
          lilith: req.advancedAstro.extraPoints.lilith,
          partOfFortune: req.advancedAstro.extraPoints.partOfFortune,
        };
      }
    }

  } catch (error) {
    logger.error('[Advanced Analysis Error]', error);
  }

  return analysis;
}

/**
 * 연도별 고급 분석 (multi-year용)
 */
export function analyzeYearWithAdvanced(
  req: BaseRequest,
  input: LifePredictionInput,
  year: number
): { year: number; advancedInsights: AdvancedAnalysis } {
  const targetDate = new Date(year, 0, 1);
  const analysis = performAdvancedAnalysis(req, input, targetDate);
  return { year, advancedInsights: analysis };
}

/**
 * 고급 분석 프롬프트 컨텍스트 생성
 */
export function generateAdvancedPromptContext(
  analysis: AdvancedAnalysis,
  locale: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (locale === 'ko') {
    lines.push('\n=== 고급 분석 (TIER 1~3) ===\n');

    if (analysis.tier1) {
      lines.push('【TIER 1: 초정밀 분석】');
      if (analysis.tier1.gongmang?.isAffected) {
        lines.push(`  ⚠️ 공망 활성: ${analysis.tier1.gongmang.affectedAreas.join(', ')} 영역 주의`);
      }
      if (analysis.tier1.shinsal?.active.length) {
        const shinsals = analysis.tier1.shinsal.active.map(s => `${s.name}(${s.type === 'lucky' ? '길' : s.type === 'unlucky' ? '흉' : '특'})`);
        lines.push(`  신살: ${shinsals.join(', ')}`);
      }
      lines.push(`  에너지: ${analysis.tier1.energyFlow?.strength} (${analysis.tier1.energyFlow?.dominantElement})`);
      if (analysis.tier1.hourlyAdvice?.length) {
        const goodHours = analysis.tier1.hourlyAdvice.filter(h => h.quality === 'excellent').map(h => `${h.hour}시`);
        if (goodHours.length) {
          lines.push(`  최적 시간대: ${goodHours.join(', ')}`);
        }
      }
    }

    if (analysis.tier2?.daeunSync) {
      lines.push('\n【TIER 2: 대운-트랜짓 동기화】');
      if (analysis.tier2.daeunSync.currentDaeun) {
        lines.push(`  현재 대운: ${analysis.tier2.daeunSync.currentDaeun.stem}${analysis.tier2.daeunSync.currentDaeun.branch}`);
      }
      lines.push(`  트랜짓 정렬도: ${analysis.tier2.daeunSync.transitAlignment}%`);
      if (analysis.tier2.daeunSync.majorThemes.length) {
        lines.push(`  주요 테마: ${analysis.tier2.daeunSync.majorThemes.join(', ')}`);
      }
    }

    if (analysis.tier3) {
      lines.push('\n【TIER 3: 고급 점성술 + 패턴】');
      if (analysis.tier3.moonPhase) {
        lines.push(`  달 위상: ${analysis.tier3.moonPhase.name} (${analysis.tier3.moonPhase.illumination}%)`);
      }
      if (analysis.tier3.voidOfCourse?.isVoid) {
        lines.push(`  ⚠️ Void of Course - 중요 결정 보류 권장`);
      }
      if (analysis.tier3.retrogrades?.length) {
        lines.push(`  역행 행성: ${analysis.tier3.retrogrades.join(', ')}`);
        if (analysis.tier3.retrogrades.includes('Mercury')) {
          lines.push(`    → 수성 역행: 계약/소통 재검토 필요`);
        }
      }
      if (analysis.tier3.sajuPatterns?.found.length) {
        lines.push(`  사주 패턴: ${analysis.tier3.sajuPatterns.found.map(p => p.name).join(', ')}`);
        lines.push(`  희귀도 점수: ${analysis.tier3.sajuPatterns.rarityScore}/100`);
      }
    }

  } else {
    lines.push('\n=== Advanced Analysis (TIER 1~3) ===\n');

    if (analysis.tier1) {
      lines.push('【TIER 1: Ultra-Precision】');
      lines.push(`  Energy: ${analysis.tier1.energyFlow?.strength}`);
      if (analysis.tier1.gongmang?.isAffected) {
        lines.push(`  ⚠️ Gongmang Active`);
      }
    }

    if (analysis.tier2?.daeunSync) {
      lines.push('\n【TIER 2: Daeun-Transit Sync】');
      lines.push(`  Transit Alignment: ${analysis.tier2.daeunSync.transitAlignment}%`);
    }

    if (analysis.tier3) {
      lines.push('\n【TIER 3: Advanced Astrology】');
      if (analysis.tier3.moonPhase) {
        lines.push(`  Moon Phase: ${analysis.tier3.moonPhase.name}`);
      }
      if (analysis.tier3.retrogrades?.length) {
        lines.push(`  Retrogrades: ${analysis.tier3.retrogrades.join(', ')}`);
      }
    }
  }

  return lines.join('\n');
}
