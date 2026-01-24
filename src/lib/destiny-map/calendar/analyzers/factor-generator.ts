/**
 * Factor Generator - 요소 키 및 카테고리 생성 모듈
 *
 * Section 7-13 of date-analysis-orchestrator.ts
 * - 카테고리 결정
 * - sajuFactorKeys / astroFactorKeys 생성
 * - recommendationKeys / warningKeys 생성
 */

import type { BranchInteraction } from '@/lib/prediction/advancedTimingEngine';
import type { EventCategory } from '../types';
import {
  ELEMENT_RELATIONS,
  JIJANGGAN,
  STEM_TO_ELEMENT,
  SAMHAP,
  YUKHAP,
  CHUNG,
  XING,
} from '../constants';
import {
  getSipsin,
  isDohwaDay,
} from '../utils';
import { filterByScenario } from '../utils/recommendation-filter';
import { processShinsals } from '../utils/shinsal-mapper';
import { analyzeBranchRelationships } from '../utils/branch-relationship-analyzer';
import { calculateAreaScoresForCategories, getBestAreaCategory } from '../category-scoring';
import type { SajuAnalysisResult } from './saju-analyzer';
import type { AstrologyAnalysisResult } from './astrology-analyzer';

// ═══════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════

export interface FactorGeneratorInput {
  ganzhi: { stem: string; branch: string; stemElement: string; branchElement: string };
  dayMasterElement: string;
  dayMasterStem: string;
  dayBranch: string;
  yearBranch?: string;
  sajuResult: SajuAnalysisResult;
  astroResult: AstrologyAnalysisResult;
  advancedBranchInteractions: BranchInteraction[];
  transitSunElement: string;
  natalSunElement: string;
  crossVerified: boolean;
  sajuPositive: boolean;
  sajuNegative: boolean;
  astroPositive: boolean;
  astroNegative: boolean;
}

export interface FactorGeneratorResult {
  categories: EventCategory[];
  titleKey: string;
  descKey: string;
  sajuFactorKeys: string[];
  astroFactorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
}

// ═══════════════════════════════════════════════════════════
// 요소 키 생성기
// ═══════════════════════════════════════════════════════════

export function generateFactors(input: FactorGeneratorInput): FactorGeneratorResult {
  const {
    ganzhi,
    dayMasterElement,
    dayMasterStem,
    dayBranch,
    yearBranch,
    sajuResult,
    astroResult,
    advancedBranchInteractions,
    transitSunElement,
    natalSunElement,
    crossVerified,
    sajuPositive,
    sajuNegative,
    astroPositive,
    astroNegative,
  } = input;

  const categories: EventCategory[] = [];
  let titleKey = '';
  let descKey = '';
  const sajuFactorKeys: string[] = [];
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  const relations = ELEMENT_RELATIONS[dayMasterElement] || {
    generates: 'earth',
    generatedBy: 'water',
    controls: 'metal',
    controlledBy: 'fire',
  };

  // ─────────────────────────────────────────────────────
  // SECTION 7: 고급 지지 상호작용 결과 반영
  // ─────────────────────────────────────────────────────

  for (const bInter of advancedBranchInteractions) {
    if (bInter.impact === 'positive') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '육합') {
        recommendationKeys.push('partnership', 'harmony');
      } else if (bInter.type === '삼합') {
        recommendationKeys.push('collaboration', 'synergy');
      } else if (bInter.type === '방합') {
        recommendationKeys.push('expansion', 'growth');
      }
    } else if (bInter.impact === 'negative') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '충') {
        warningKeys.push('conflict', 'change');
      } else if (bInter.type === '형') {
        warningKeys.push('tension', 'challenge');
      }
    }
  }

  // ─────────────────────────────────────────────────────
  // SECTION 7: 특수 요소 체크 (천을귀인, 손없는날, 건록, 삼재, 역마, 도화)
  // ─────────────────────────────────────────────────────

  if (sajuResult.specialFactors.hasCheoneulGwiin) {
    sajuFactorKeys.push('cheoneulGwiin');
    recommendationKeys.push('majorDecision', 'contract', 'meeting');
    if (!titleKey) {
      titleKey = 'calendar.cheoneulGwiin';
      descKey = 'calendar.cheoneulGwiinDesc';
    }
  }

  if (sajuResult.specialFactors.hasSonEomneun) {
    sajuFactorKeys.push('sonEomneunDay');
    recommendationKeys.push('moving', 'wedding', 'business');
    if (!categories.includes('general')) categories.push('general');
  }

  if (sajuResult.specialFactors.hasGeonrok) {
    sajuFactorKeys.push('geonrokDay');
    recommendationKeys.push('career', 'authority', 'promotion');
    if (!categories.includes('career')) categories.push('career');
  }

  if (sajuResult.specialFactors.isSamjaeYear) {
    sajuFactorKeys.push('samjaeYear');
    warningKeys.push('samjae', 'caution');
  }

  if (sajuResult.specialFactors.hasYeokma) {
    sajuFactorKeys.push('yeokmaDay');
    recommendationKeys.push('travel', 'change', 'interview');
    warningKeys.push('instability');
    if (!categories.includes('travel')) categories.push('travel');
  }

  if (yearBranch && isDohwaDay(yearBranch, ganzhi.branch)) {
    sajuFactorKeys.push('dohwaDay');
    recommendationKeys.push('dating', 'socializing', 'charm');
    if (!categories.includes('love')) categories.push('love');
  }

  // ─────────────────────────────────────────────────────
  // SECTION 8: 신살 분석 결과 factorKeys에 추가
  // ─────────────────────────────────────────────────────

  if (sajuResult.shinsalForScoring?.active) {
    const shinsalResults = processShinsals(sajuResult.shinsalForScoring.active);
    sajuFactorKeys.push(...shinsalResults.factorKeys);
    recommendationKeys.push(...shinsalResults.recommendations);
    warningKeys.push(...shinsalResults.warnings);
  }

  // ─────────────────────────────────────────────────────
  // SECTION 9: 십신(十神) 완전 분석
  // ─────────────────────────────────────────────────────

  if (dayMasterStem) {
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (daySipsin) {
      sajuFactorKeys.push(`sipsin_${daySipsin}`);

      switch (daySipsin) {
        case '정재':
          if (!categories.includes('wealth')) categories.push('wealth');
          recommendationKeys.push('stableWealth', 'savings');
          break;
        case '편재':
          if (!categories.includes('wealth')) categories.push('wealth');
          recommendationKeys.push('speculation', 'windfall');
          warningKeys.push('riskManagement');
          break;
        case '정인':
          if (!categories.includes('study')) categories.push('study');
          recommendationKeys.push('learning', 'certification', 'mother');
          break;
        case '편인':
          if (!categories.includes('study')) categories.push('study');
          recommendationKeys.push('spirituality', 'unique');
          break;
        case '겁재':
          warningKeys.push('rivalry', 'loss');
          break;
      }
    }
  }

  // ─────────────────────────────────────────────────────
  // SECTION 10: 지장간(支藏干) 분석 - 숨은 기운
  // ─────────────────────────────────────────────────────

  const hiddenStems = JIJANGGAN[ganzhi.branch];
  if (hiddenStems) {
    const mainHiddenStem = hiddenStems.정기;
    const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

    if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
      sajuFactorKeys.push('hiddenStemSupport');
    }
    if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
      sajuFactorKeys.push('hiddenStemConflict');
    }
  }

  // ─────────────────────────────────────────────────────
  // SECTION 11: 영역별 세부 점수 계산
  // ─────────────────────────────────────────────────────

  const areaScores = calculateAreaScoresForCategories(
    ganzhi,
    sajuResult.seunAnalysis.score,
    sajuResult.wolunAnalysis.score
  );

  const bestAreaCategory = getBestAreaCategory(areaScores);
  if (bestAreaCategory && !categories.includes(bestAreaCategory)) {
    categories.push(bestAreaCategory);
  }

  // 천간 관계에 따른 카테고리 설정
  if (ganzhi.stemElement === dayMasterElement) {
    categories.push('career');
    titleKey = 'calendar.bijeon';
    descKey = 'calendar.bijeonDesc';
    sajuFactorKeys.push('stemBijeon');
    recommendationKeys.push('business', 'networking');
    warningKeys.push('competition');
  } else if (ganzhi.stemElement === relations.generatedBy) {
    categories.push('study', 'career');
    titleKey = 'calendar.inseong';
    descKey = 'calendar.inseongDesc';
    sajuFactorKeys.push('stemInseong');
    recommendationKeys.push('study', 'mentor', 'documents');
  } else if (ganzhi.stemElement === relations.controls) {
    categories.push('wealth', 'love');
    titleKey = 'calendar.jaeseong';
    descKey = 'calendar.jaeseongDesc';
    sajuFactorKeys.push('stemJaeseong');
    recommendationKeys.push('finance', 'investment', 'shopping');
  } else if (ganzhi.stemElement === relations.generates) {
    categories.push('love', 'career');
    titleKey = 'calendar.siksang';
    descKey = 'calendar.siksangDesc';
    sajuFactorKeys.push('stemSiksang');
    recommendationKeys.push('love', 'creative', 'expression');
  } else if (ganzhi.stemElement === relations.controlledBy) {
    categories.push('health', 'career');
    titleKey = 'calendar.gwansal';
    descKey = 'calendar.gwansalDesc';
    sajuFactorKeys.push('stemGwansal');
    warningKeys.push('conflict', 'health', 'avoidAuthority');
    recommendationKeys.push('careful', 'lowProfile');
    filterByScenario(recommendationKeys, 'gwansal');
  }

  // ─────────────────────────────────────────────────────
  // SECTION 12: 지지 관계 (삼합, 육합, 충, 형, 해)
  // ─────────────────────────────────────────────────────

  const branchAnalysis = analyzeBranchRelationships({
    dayBranch: dayBranch || '',
    ganzhiBranch: ganzhi.branch,
    dayMasterElement,
    relations,
    SAMHAP,
    YUKHAP,
    CHUNG,
    XING,
    currentTitleKey: titleKey,
  });

  sajuFactorKeys.push(...branchAnalysis.factorKeys);
  recommendationKeys.push(...branchAnalysis.recommendations);
  warningKeys.push(...branchAnalysis.warnings);

  for (const category of branchAnalysis.categories) {
    if (!categories.includes(category)) {
      categories.push(category);
    }
  }

  if (branchAnalysis.titleKey && !titleKey) {
    titleKey = branchAnalysis.titleKey;
    descKey = branchAnalysis.descKey || '';
  } else if (branchAnalysis.titleKey) {
    titleKey = branchAnalysis.titleKey;
    descKey = branchAnalysis.descKey || '';
  }

  for (const scenario of branchAnalysis.filterScenarios) {
    filterByScenario(recommendationKeys, scenario);
  }

  // ─────────────────────────────────────────────────────
  // SECTION 13: 점성술 분석 (강화)
  // ─────────────────────────────────────────────────────

  // 트랜짓 태양과 본명 태양의 관계
  if (transitSunElement === natalSunElement) {
    astroFactorKeys.push('sameElement');
    recommendationKeys.push('confidence', 'selfExpression');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    astroFactorKeys.push('supportElement');
    recommendationKeys.push('learning', 'receiving');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generates === transitSunElement) {
    astroFactorKeys.push('givingElement');
    recommendationKeys.push('giving', 'teaching');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    astroFactorKeys.push('conflictElement');
    warningKeys.push('stress', 'opposition');
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === transitSunElement) {
    astroFactorKeys.push('controlElement');
    recommendationKeys.push('achievement', 'discipline');
  }

  // 달의 위상 분석
  const phaseName = astroResult.lunarPhase.phaseName;
  if (phaseName === 'newMoon') {
    astroFactorKeys.push('lunarNewMoon');
    recommendationKeys.push('newBeginning', 'planning');
  } else if (phaseName === 'fullMoon') {
    astroFactorKeys.push('lunarFullMoon');
    recommendationKeys.push('completion', 'celebration');
  } else if (phaseName === 'firstQuarter') {
    astroFactorKeys.push('lunarFirstQuarter');
    warningKeys.push('tension', 'challenge');
  } else if (phaseName === 'lastQuarter') {
    astroFactorKeys.push('lunarLastQuarter');
    recommendationKeys.push('reflection', 'release');
  }

  // 대운/세운/월운/일진 요소 반영
  sajuFactorKeys.push(...sajuResult.daeunAnalysis.factorKeys);
  sajuFactorKeys.push(...sajuResult.seunAnalysis.factorKeys);
  sajuFactorKeys.push(...sajuResult.wolunAnalysis.factorKeys);
  sajuFactorKeys.push(...sajuResult.iljinAnalysis.factorKeys);
  sajuFactorKeys.push(...sajuResult.yongsinAnalysis.factorKeys);
  sajuFactorKeys.push(...sajuResult.geokgukAnalysis.factorKeys);

  // 행성 트랜짓 요소 반영
  astroFactorKeys.push(...astroResult.planetTransits.factorKeys);
  astroFactorKeys.push(...astroResult.solarReturnAnalysis.factorKeys);
  astroFactorKeys.push(...astroResult.progressionAnalysis.factorKeys);

  // 고급 점성학 요소 반영
  astroFactorKeys.push(astroResult.moonPhaseDetailed.factorKey);

  // 역행 행성
  if (astroResult.retrogradePlanets.length > 0) {
    for (const planet of astroResult.retrogradePlanets) {
      astroFactorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
    }
    if (astroResult.retrogradePlanets.includes('mercury')) {
      warningKeys.push('mercuryRetrograde');
      filterByScenario(recommendationKeys, 'mercuryRetrograde');
    }
    if (astroResult.retrogradePlanets.includes('venus')) {
      warningKeys.push('venusRetrograde');
      filterByScenario(recommendationKeys, 'venusRetrograde');
    }
    if (astroResult.retrogradePlanets.includes('mars')) {
      warningKeys.push('marsRetrograde');
    }
  }

  // Void of Course Moon
  if (astroResult.voidOfCourse.isVoid) {
    astroFactorKeys.push('voidOfCourse');
    warningKeys.push('voidOfCourse');
  }

  // 일/월식 영향
  if (astroResult.eclipseImpact.hasImpact) {
    if (astroResult.eclipseImpact.type === 'solar') {
      astroFactorKeys.push(`solarEclipse${astroResult.eclipseImpact.intensity}`);
    } else {
      astroFactorKeys.push(`lunarEclipse${astroResult.eclipseImpact.intensity}`);
    }
    if (astroResult.eclipseImpact.intensity === 'strong') {
      warningKeys.push('eclipseDay');
    } else if (astroResult.eclipseImpact.intensity === 'medium') {
      warningKeys.push('eclipseNear');
    }
  }

  // 행성 시간
  astroFactorKeys.push(`dayRuler${astroResult.planetaryHour.dayRuler}`);
  if (astroResult.planetaryHour.dayRuler === 'Jupiter') {
    recommendationKeys.push('expansion', 'luck');
  } else if (astroResult.planetaryHour.dayRuler === 'Venus') {
    recommendationKeys.push('love', 'beauty');
  }

  // 교차 검증
  if (crossVerified) {
    astroFactorKeys.push('crossVerified');
    recommendationKeys.push('majorDecision');
  }

  if (sajuNegative && astroNegative) {
    astroFactorKeys.push('crossNegative');
    warningKeys.push('extremeCaution');
  }

  if (ganzhi.stemElement === transitSunElement) {
    astroFactorKeys.push('alignedElement');
  }

  if ((sajuPositive && astroNegative) || (sajuNegative && astroPositive)) {
    astroFactorKeys.push('mixedSignals');
    warningKeys.push('confusion');
  }

  // 카테고리가 비어있으면 general 추가
  if (categories.length === 0) {
    categories.push('general');
  }

  return {
    categories,
    titleKey,
    descKey,
    sajuFactorKeys,
    astroFactorKeys,
    recommendationKeys,
    warningKeys,
  };
}
