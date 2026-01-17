/**
 * Date Analysis Orchestrator (날짜 분석 통합 모듈)
 * Module 9 of Destiny Calendar System - THE CORE ORCHESTRATOR
 *
 * 이 모듈은 운명 캘린더 시스템의 핵심 오케스트레이터입니다.
 * 모든 사주/점성술 분석 모듈을 통합하여 특정 날짜의 종합 운세를 계산합니다.
 *
 * 주요 통합 분석:
 * ─────────────────────────────────────────────────────────────
 * 【사주 분석】
 * - 대운(大運): 10년 주기 분석
 * - 세운(歲運): 연간 운세
 * - 월운(月運): 월간 운세
 * - 일진(日辰): 당일 상세 분석
 * - 용신(用神): 사주 보완 오행
 * - 격국(格局): 사주 구조 유형
 *
 * 【점성술 분석】
 * - 행성 트랜짓: 7개 주요 행성
 * - 달 위상: 8단계 분석
 * - Solar Return: 생일 주변 에너지
 * - Progressions: 인생 발전 단계
 * - 역행 행성: Retrograde 체크
 * - VoC Moon: 공허한 달 체크
 * - 일/월식: Eclipse 영향
 * - 행성 시간: Planetary Hour
 *
 * 【고급 예측 엔진】
 * - ultraPrecisionEngine: 공망/신살/에너지/시간대
 * - daeunTransitSync: 대운-트랜짓 동기화
 * - advancedTimingEngine: 다층 레이어 상호작용
 *
 * 【점수 시스템】
 * - 0~100점 만점 (사주 50점 + 점성술 50점)
 * - 5등급 시스템 (Grade 0~4)
 * - 영역별 점수 (연애/재물/건강/직업 등)
 * - 교차 검증: 사주+점성술 일치 시 신뢰도 상승
 *
 * @module date-analysis-orchestrator
 */

import {
  calculateDailyPillar,
  analyzeGongmang,
  analyzeShinsal,
  analyzeEnergyFlow,
  generateHourlyAdvice,
} from '@/lib/prediction/ultraPrecisionEngine';
import {
  analyzeDaeunTransitSync,
  convertSajuDaeunToInfo,
} from '@/lib/prediction/daeunTransitSync';
import {
  analyzeMultiLayer,
  calculatePreciseTwelveStage,
  calculateYearlyGanji,
  calculateMonthlyGanji as advancedMonthlyGanji,
  type BranchInteraction,
} from '@/lib/prediction/advancedTimingEngine';

// 모듈화된 등급 결정 로직
import {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
} from './grading';

// 새 점수 시스템
import {
  calculateTotalScore,
  type SajuScoreInput,
  type AstroScoreInput,
  type ScoreResult,
} from './scoring';
import {
  adaptDaeunResult,
  adaptSeunResult,
  adaptWolunResult,
  adaptIljinResult,
  adaptYongsinResult,
  adaptPlanetTransits,
  type LegacyBranchInteraction,
} from './scoring-adapter';
import { calculateAreaScoresForCategories, getBestAreaCategory } from './category-scoring';
import { calculateActivityScore } from './activity-scoring';

// Transit analysis
import {
  analyzePlanetTransits,
  getMoonPhaseDetailed,
} from './transit-analysis';

// Planetary hours
import {
  getPlanetaryHourForDate,
  checkVoidOfCourseMoon,
  checkEclipseImpact,
  getRetrogradePlanetsForDate,
  getSunSign,
} from './planetary-hours';

// Temporal scoring (Modules 4 & 5)
import {
  calculateDaeunScore,
  calculateSeunScore,
  calculateWolunScore,
  calculateIljinScore,
  analyzeYongsin,
  analyzeGeokguk,
  analyzeSolarReturn,
  analyzeProgressions,
  getYearGanzhi,
  getGanzhiForDate,
  getLunarPhase,
} from './temporal-scoring';

// Constants and utilities
import {
  BRANCHES,
  BRANCH_TO_ELEMENT,
  CHUNG,
  ELEMENT_RELATIONS,
  HAI,
  JIJANGGAN,
  SAMHAP,
  STEMS,
  STEM_TO_ELEMENT,
  YUKHAP,
  XING,
  ZODIAC_TO_ELEMENT,
} from './constants';
import {
  approximateLunarDay,
  getSipsin,
  isCheoneulGwiin,
  isDohwaDay,
  isGeonrokDay,
  isSamjaeYear,
  isSonEomneunDay,
  isYeokmaDay,
  normalizeElement,
} from './utils';

// Types - types.ts에서 import (중복 제거)
import type {
  ImportanceGrade as TypesImportanceGrade,
  EventCategory as TypesEventCategory,
  UserSajuProfile as TypesUserSajuProfile,
  UserAstroProfile as TypesUserAstroProfile,
} from './types';

// Re-export for backward compatibility (extended version)
export type ImportanceGrade = TypesImportanceGrade | 5; // 확장: 5등급 추가
export type EventCategory = TypesEventCategory;

/**
 * 중요 날짜 상세 정보 (확장 버전 - 고급 예측 필드 포함)
 */
export interface ImportantDate {
  date: string;
  grade: ImportanceGrade;
  score: number;
  categories: EventCategory[];
  titleKey: string;
  descKey: string;
  ganzhi: string;
  crossVerified: boolean;
  transitSunSign: string;
  sajuFactorKeys: string[];
  astroFactorKeys: string[];
  recommendationKeys: string[];
  warningKeys: string[];
  // 고급 예측 필드
  confidence?: number;
  confidenceNote?: string;
  gongmangStatus?: {
    isEmpty: boolean;
    emptyBranches: string[];
    affectedAreas: string[];
  };
  shinsalActive?: {
    name: string;
    type: 'lucky' | 'unlucky' | 'special';
    affectedArea: string;
  }[];
  energyFlow?: {
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak';
    dominantElement: string;
    tonggeunCount: number;
    tuechulCount: number;
  };
  bestHours?: {
    hour: number;
    siGan: string;
    quality: 'excellent' | 'good' | 'neutral' | 'caution';
  }[];
  transitSync?: {
    isMajorTransitYear: boolean;
    transitType?: string;
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  };
  activityScores?: {
    marriage?: number;
    career?: number;
    investment?: number;
    moving?: number;
    surgery?: number;
    study?: number;
  };
  timeContext?: {
    isPast: boolean;
    isFuture: boolean;
    isToday: boolean;
    daysFromToday: number;
    retrospectiveNote?: string;
  };
}

// Re-export user profile types
export type UserSajuProfile = TypesUserSajuProfile;
export type UserAstroProfile = TypesUserAstroProfile;

/**
 * 달의 원소 계산 (근사값)
 */
function getMoonElement(date: Date): string {
  const month = date.getMonth();
  const signs = ["Capricorn", "Aquarius", "Pisces", "Aries", "Taurus", "Gemini",
    "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius"];
  const approxSign = signs[month];
  return normalizeElement(ZODIAC_TO_ELEMENT[approxSign] || "earth");
}

/**
 * ═══════════════════════════════════════════════════════════════
 * 메인 분석 함수: analyzeDate()
 * ═══════════════════════════════════════════════════════════════
 *
 * 이 함수는 운명 캘린더 시스템의 핵심입니다.
 * 모든 분석 모듈을 통합하여 특정 날짜의 종합 운세를 계산합니다.
 *
 * 처리 흐름:
 * 1. 기본 정보 계산 (간지, 오행, 관계)
 * 2. 사주 분석 (대운/세운/월운/일진)
 * 3. 사주 고급 분석 (용신/격국)
 * 4. 점성술 분석 (트랜짓/달위상/Solar Return)
 * 5. 고급 예측 (공망/신살/에너지/시간대)
 * 6. 점수 계산 (0~100점)
 * 7. 등급 결정 (Grade 0~4)
 * 8. 추천/경고 생성
 *
 * @param date - 분석할 날짜
 * @param sajuProfile - 사주 프로필
 * @param astroProfile - 점성술 프로필
 * @returns 분석 결과 또는 null (중요하지 않은 날)
 */
export function analyzeDate(
  date: Date,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): ImportantDate | null {
  // ═══════════════════════════════════════════════════════════
  // SECTION 1: 기본 정보 계산
  // ═══════════════════════════════════════════════════════════

  // 로컬 타임존 기준 YYYY-MM-DD 문자열 생성
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  const ganzhi = getGanzhiForDate(date);
  const transitSun = getSunSign(date);
  const transitSunElement = normalizeElement(ZODIAC_TO_ELEMENT[transitSun] || "fire");

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const dayMasterElement = sajuProfile.dayMasterElement;
  const dayBranch = sajuProfile.dayBranch;
  const natalSunElement = astroProfile.sunElement;
  const relations = ELEMENT_RELATIONS[dayMasterElement];

  if (!relations) return null;

  // 날짜별 변동성을 위한 해시 기반 미세 조정
  const yearStartUtc = Date.UTC(date.getFullYear(), 0, 0);
  const dateUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const dayOfYear = Math.floor((dateUtc - yearStartUtc) / (1000 * 60 * 60 * 24));
  const microVariance = ((dayOfYear * 17 + date.getDate() * 7) % 21) - 10; // -10 ~ +10

  // ═══════════════════════════════════════════════════════════
  // SECTION 2: 사주 분석 (대운/세운/월운/일진)
  // ═══════════════════════════════════════════════════════════

  // 용신(用神) 분석 - 사주의 핵심 보완 오행
  const yongsinAnalysis = analyzeYongsin(sajuProfile.yongsin, ganzhi, date);

  // 격국(格局) 분석 - 사주 구조 유형
  const geokgukAnalysis = analyzeGeokguk(sajuProfile.geokguk, ganzhi, sajuProfile.pillars);

  // Solar Return (태양회귀) 분석
  const solarReturnAnalysis = analyzeSolarReturn(date, astroProfile.birthMonth, astroProfile.birthDay);

  // Progressions (이차진행) 분석
  const progressionAnalysis = analyzeProgressions(date, sajuProfile.birthYear, astroProfile.sunElement, dayMasterElement);

  // 대운(大運) 분석 - 10년 주기
  const daeunAnalysis = calculateDaeunScore(
    dayMasterElement,
    dayBranch,
    sajuProfile.daeunCycles,
    sajuProfile.birthYear,
    year
  );

  // 세운(歲運) 분석
  const seunAnalysis = calculateSeunScore(dayMasterElement, dayBranch, year);

  // 월운(月運) 분석
  const wolunAnalysis = calculateWolunScore(dayMasterElement, dayBranch, year, month);

  // 일진(日辰) 분석 - 일별 운세
  const dayMasterStem = sajuProfile.dayMaster;
  const iljinAnalysis = calculateIljinScore(dayMasterElement, dayMasterStem, dayBranch, ganzhi);

  // ═══════════════════════════════════════════════════════════
  // SECTION 3: 고급 다층 분석 (대운+세운+월운 레이어 상호작용)
  // ═══════════════════════════════════════════════════════════

  let advancedMultiLayerScore = 0;
  let advancedBranchInteractions: BranchInteraction[] = [];

  if (dayMasterStem && dayBranch) {
    try {
      // 세운/월운 간지 계산 (advancedTimingEngine 사용)
      const advSaeun = calculateYearlyGanji(year);
      const advWolun = advancedMonthlyGanji(year, month);

      // 대운 정보 (있으면 사용)
      let daeunInfo: { stem: string; branch: string } | undefined;
      if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0 && sajuProfile.birthYear) {
        const currentAge = year - sajuProfile.birthYear;
        const sortedDaeuns = [...sajuProfile.daeunCycles].sort((a, b) => a.age - b.age);
        const currentDaeun = sortedDaeuns.find((d, idx) => {
          const nextDaeun = sortedDaeuns[idx + 1];
          if (nextDaeun) {
            return currentAge >= d.age && currentAge < nextDaeun.age;
          }
          return currentAge >= d.age; // 마지막 대운
        });
        if (currentDaeun && currentDaeun.heavenlyStem && currentDaeun.earthlyBranch) {
          daeunInfo = { stem: currentDaeun.heavenlyStem, branch: currentDaeun.earthlyBranch };
        }
      }

      // 다층 레이어 분석
      const multiLayerResult = analyzeMultiLayer({
        dayStem: dayMasterStem,
        dayBranch: dayBranch,
        daeun: daeunInfo,
        saeun: advSaeun,
        wolun: advWolun,
      });

      // 레이어 상호작용 점수 합산
      for (const interaction of multiLayerResult.interactions) {
        advancedMultiLayerScore += interaction.scoreModifier * 0.3;
      }

      // 지지 상호작용 분석 (육합/삼합/충/형 등)
      advancedBranchInteractions = multiLayerResult.branchInteractions;
      for (const bInter of advancedBranchInteractions) {
        advancedMultiLayerScore += bInter.score * 0.25;
      }

      // 정밀 12운성 분석 (월지 기준)
      const preciseStage = calculatePreciseTwelveStage(dayMasterStem, advWolun.branch);

      // 12운성 에너지 단계에 따른 보너스/페널티
      if (preciseStage.energy === 'peak') {
        advancedMultiLayerScore += 8;  // 건록/제왕
      } else if (preciseStage.energy === 'rising') {
        advancedMultiLayerScore += 4;  // 장생/목욕/관대/태/양
      } else if (preciseStage.energy === 'declining') {
        advancedMultiLayerScore -= 2;  // 쇠/병/사
      } else if (preciseStage.energy === 'dormant') {
        advancedMultiLayerScore -= 5;  // 묘/절
      }
    } catch {
      // 오류 발생 시 무시 (기본 분석 유지)
      advancedMultiLayerScore = 0;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 4: 점성술 분석
  // ═══════════════════════════════════════════════════════════

  // 달 위상 분석 (기존)
  const lunarPhase = getLunarPhase(date);

  // 고급 달 위상 분석 (8위상)
  const moonPhaseDetailed = getMoonPhaseDetailed(date);

  // 행성 트랜짓 분석 (수성, 금성, 화성, 목성, 토성, 태양, 달 + 어스펙트)
  const planetTransits = analyzePlanetTransits(date, astroProfile.sunSign, natalSunElement, astroProfile.sunLongitude);

  // 고급 점성학: 역행 행성 체크
  const retrogradePlanets = getRetrogradePlanetsForDate(date);

  // 고급 점성학: Void of Course Moon 체크
  const voidOfCourse = checkVoidOfCourseMoon(date);

  // 고급 점성학: 일/월식 영향 체크
  const eclipseImpact = checkEclipseImpact(date);

  // 고급 점성학: 행성 시간 (요일 기준)
  const planetaryHour = getPlanetaryHourForDate(date);

  // ═══════════════════════════════════════════════════════════
  // SECTION 5: 신살 분석 (점수 계산용)
  // ═══════════════════════════════════════════════════════════

  const shinsalForScoring = analyzeShinsal(dayBranch || ganzhi.branch, ganzhi.branch);

  // ═══════════════════════════════════════════════════════════
  // SECTION 6: 점수 시스템 (0~100점)
  // ═══════════════════════════════════════════════════════════

  // 사주 50점 + 점성술 50점 = 100점 만점
  let advancedAstroScore = 0;
  advancedAstroScore += moonPhaseDetailed.score; // 달 위상 점수 (-3 ~ +12)

  // 특수 요소 체크 (일진 분석용)
  const hasCheoneulGwiin = dayMasterStem ? isCheoneulGwiin(dayMasterStem, ganzhi.branch) : false;
  const hasGeonrok = dayMasterStem ? isGeonrokDay(dayMasterStem, ganzhi.branch) : false;
  const approxLunarDay = approximateLunarDay(date);
  const hasSonEomneun = isSonEomneunDay(approxLunarDay);
  const hasYeokma = sajuProfile.yearBranch ? isYeokmaDay(sajuProfile.yearBranch, ganzhi.branch) : false;
  const hasDohwa = sajuProfile.yearBranch ? isDohwaDay(sajuProfile.yearBranch, ganzhi.branch) : false;

  // 삼재년 체크
  const yearGanzhi = getYearGanzhi(year);
  const isSamjaeYearFlag = sajuProfile.yearBranch ? isSamjaeYear(sajuProfile.yearBranch, yearGanzhi.branch) : false;

  // 지지 상호작용 변환 (transformative → neutral 매핑)
  const branchInteractions: LegacyBranchInteraction[] = advancedBranchInteractions.map((bi: any) => ({
    type: bi.type,
    impact: (bi.impact === 'transformative' ? 'neutral' : bi.impact) as 'positive' | 'negative' | 'neutral',
    element: bi.element,
  }));

  // 사주 입력 데이터 구성
  const hasAnyGwiin = hasCheoneulGwiin || shinsalForScoring?.active?.some(
    s => s.name.includes('귀인') || s.name === '태극귀인' || s.name === '천덕귀인' || s.name === '월덕귀인'
  );
  const sajuInput: SajuScoreInput = {
    daeun: adaptDaeunResult(daeunAnalysis),
    seun: adaptSeunResult(seunAnalysis, isSamjaeYearFlag, hasAnyGwiin),
    wolun: adaptWolunResult(wolunAnalysis),
    iljin: adaptIljinResult(iljinAnalysis, {
      hasCheoneulGwiin,
      hasGeonrok,
      hasSonEomneun,
      hasYeokma,
      hasDohwa,
      branchInteractions,
      shinsalResult: shinsalForScoring,
    }),
    yongsin: adaptYongsinResult(yongsinAnalysis as any, geokgukAnalysis),
  };

  // 점성술 입력 데이터 구성
  const astroInput: AstroScoreInput = adaptPlanetTransits(planetTransits, {
    retrogradePlanets,
    voidOfCourse: voidOfCourse.isVoid,
    lunarPhase: moonPhaseDetailed.phaseName,
    daysFromBirthday: solarReturnAnalysis.daysFromBirthday,
    natalSunElement: normalizeElement(astroProfile.sunElement),
    transitSunElement,
    transitMoonElement: getMoonElement(date),
    elementRelations: ELEMENT_RELATIONS,
    eclipseImpact,
  });

  // 새 점수 시스템으로 계산
  const scoreResult: ScoreResult = calculateTotalScore(sajuInput, astroInput);

  // 점수 및 플래그 추출
  const score = scoreResult.totalScore;
  let sajuPositive = scoreResult.sajuPositive;
  let sajuNegative = scoreResult.sajuNegative;
  let astroPositive = scoreResult.astroPositive;
  let astroNegative = scoreResult.astroNegative;
  const crossVerified = scoreResult.crossVerified;

  // ═══════════════════════════════════════════════════════════
  // SECTION 7: 카테고리 및 요소 키 생성
  // ═══════════════════════════════════════════════════════════

  const categories: EventCategory[] = [];
  let titleKey = "";
  let descKey = "";
  const sajuFactorKeys: string[] = [];
  const astroFactorKeys: string[] = [];
  const recommendationKeys: string[] = [];
  const warningKeys: string[] = [];

  // 고급 지지 상호작용 결과 반영
  for (const bInter of advancedBranchInteractions) {
    if (bInter.impact === 'positive') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '육합') {
        recommendationKeys.push("partnership", "harmony");
      } else if (bInter.type === '삼합') {
        recommendationKeys.push("collaboration", "synergy");
      } else if (bInter.type === '방합') {
        recommendationKeys.push("expansion", "growth");
      }
    } else if (bInter.impact === 'negative') {
      sajuFactorKeys.push(`advanced_${bInter.type}`);
      if (bInter.type === '충') {
        warningKeys.push("conflict", "change");
      } else if (bInter.type === '형') {
        warningKeys.push("tension", "challenge");
      }
    }
  }

  // 천을귀인(天乙貴人) 체크
  if (hasCheoneulGwiin) {
    sajuFactorKeys.push("cheoneulGwiin");
    recommendationKeys.push("majorDecision", "contract", "meeting");
    if (!titleKey) {
      titleKey = "calendar.cheoneulGwiin";
      descKey = "calendar.cheoneulGwiinDesc";
    }
  }

  // 손없는 날 (擇日)
  if (hasSonEomneun) {
    sajuFactorKeys.push("sonEomneunDay");
    recommendationKeys.push("moving", "wedding", "business");
    if (!categories.includes("general")) categories.push("general");
  }

  // 건록(建祿) 체크
  if (hasGeonrok) {
    sajuFactorKeys.push("geonrokDay");
    recommendationKeys.push("career", "authority", "promotion");
    if (!categories.includes("career")) categories.push("career");
  }

  // 삼재(三災) 체크
  if (isSamjaeYearFlag) {
    sajuFactorKeys.push("samjaeYear");
    warningKeys.push("samjae", "caution");
  }

  // 역마살(驛馬殺) 체크
  if (hasYeokma) {
    sajuFactorKeys.push("yeokmaDay");
    recommendationKeys.push("travel", "change", "interview");
    warningKeys.push("instability");
    if (!categories.includes("travel")) categories.push("travel");
  }

  // 도화살(桃花殺) 체크 - 연애/매력의 날
  if (sajuProfile.yearBranch && isDohwaDay(sajuProfile.yearBranch, ganzhi.branch)) {
    sajuFactorKeys.push("dohwaDay");
    recommendationKeys.push("dating", "socializing", "charm");
    if (!categories.includes("love")) categories.push("love");
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 8: 신살 분석 결과 factorKeys에 추가
  // ═══════════════════════════════════════════════════════════

  if (shinsalForScoring?.active) {
    for (const shinsal of shinsalForScoring.active) {
      const name = shinsal.name;
      // 길신
      if (name === '태극귀인') {
        sajuFactorKeys.push("shinsal_taegukGwiin");
        recommendationKeys.push("majorLuck", "blessing");
      } else if (name === '천덕귀인' || name === '천덕') {
        sajuFactorKeys.push("shinsal_cheondeokGwiin");
        recommendationKeys.push("heavenlyHelp", "protection");
      } else if (name === '월덕귀인' || name === '월덕') {
        sajuFactorKeys.push("shinsal_woldeokGwiin");
        recommendationKeys.push("lunarBlessing", "assistance");
      } else if (name === '화개') {
        sajuFactorKeys.push("shinsal_hwagae");
        recommendationKeys.push("creativity", "spiritual");
      }
      // 흉신
      else if (name === '공망') {
        sajuFactorKeys.push("shinsal_gongmang");
        warningKeys.push("emptiness", "voidDay");
      } else if (name === '원진') {
        sajuFactorKeys.push("shinsal_wonjin");
        warningKeys.push("resentment", "conflict");
      } else if (name === '양인') {
        sajuFactorKeys.push("shinsal_yangin");
        warningKeys.push("danger", "impulsiveness");
      } else if (name === '괴강') {
        sajuFactorKeys.push("shinsal_goegang");
        warningKeys.push("extremes", "intensity");
      } else if (name === '백호') {
        sajuFactorKeys.push("shinsal_backho");
        warningKeys.push("accident", "surgery");
      } else if (name === '귀문관') {
        sajuFactorKeys.push("shinsal_guimungwan");
        warningKeys.push("mentalConfusion", "anxiety");
      }
      // 특수 신살
      else if (name === '역마') {
        sajuFactorKeys.push("shinsal_yeokma");
        recommendationKeys.push("travel", "movement");
      } else if (name === '재살') {
        sajuFactorKeys.push("shinsal_jaesal");
        warningKeys.push("dispute", "legalIssue");
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 9: 십신(十神) 완전 분석
  // ═══════════════════════════════════════════════════════════

  if (dayMasterStem) {
    const daySipsin = getSipsin(dayMasterStem, ganzhi.stem);
    if (daySipsin) {
      sajuFactorKeys.push(`sipsin_${daySipsin}`);

      // 십신별 카테고리 조정
      switch (daySipsin) {
        case "정재":
          if (!categories.includes("wealth")) categories.push("wealth");
          recommendationKeys.push("stableWealth", "savings");
          break;
        case "편재":
          if (!categories.includes("wealth")) categories.push("wealth");
          recommendationKeys.push("speculation", "windfall");
          warningKeys.push("riskManagement");
          break;
        case "정인":
          if (!categories.includes("study")) categories.push("study");
          recommendationKeys.push("learning", "certification", "mother");
          break;
        case "편인":
          if (!categories.includes("study")) categories.push("study");
          recommendationKeys.push("spirituality", "unique");
          break;
        case "겁재":
          warningKeys.push("rivalry", "loss");
          break;
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 10: 지장간(支藏干) 분석 - 숨은 기운
  // ═══════════════════════════════════════════════════════════

  const hiddenStems = JIJANGGAN[ganzhi.branch];
  if (hiddenStems) {
    const mainHiddenStem = hiddenStems.정기;
    const mainHiddenElement = STEM_TO_ELEMENT[mainHiddenStem];

    // 지장간 정기가 일간을 생해주면 좋음
    if (mainHiddenElement && relations.generatedBy === mainHiddenElement) {
      sajuFactorKeys.push("hiddenStemSupport");
    }
    // 지장간 정기가 일간을 극하면 주의
    if (mainHiddenElement && relations.controlledBy === mainHiddenElement) {
      sajuFactorKeys.push("hiddenStemConflict");
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 11: 영역별 세부 점수 계산
  // ═══════════════════════════════════════════════════════════

  const areaScores = calculateAreaScoresForCategories(
    ganzhi,
    seunAnalysis.score,
    wolunAnalysis.score
  );

  const bestAreaCategory = getBestAreaCategory(areaScores);
  if (bestAreaCategory && !categories.includes(bestAreaCategory)) {
    categories.push(bestAreaCategory);
  }

  // 천간 관계에 따른 카테고리 설정
  if (ganzhi.stemElement === dayMasterElement) {
    // 비견 - 자기 힘 강화, 경쟁도 있음
    categories.push("career");
    titleKey = "calendar.bijeon";
    descKey = "calendar.bijeonDesc";
    sajuFactorKeys.push("stemBijeon");
    recommendationKeys.push("business", "networking");
    warningKeys.push("competition");
  } else if (ganzhi.stemElement === relations.generatedBy) {
    // 인성 - 도움/학습/보호
    categories.push("study", "career");
    titleKey = "calendar.inseong";
    descKey = "calendar.inseongDesc";
    sajuFactorKeys.push("stemInseong");
    recommendationKeys.push("study", "mentor", "documents");
  } else if (ganzhi.stemElement === relations.controls) {
    // 재성 - 재물, 아버지/아내
    categories.push("wealth", "love");
    titleKey = "calendar.jaeseong";
    descKey = "calendar.jaeseongDesc";
    sajuFactorKeys.push("stemJaeseong");
    recommendationKeys.push("finance", "investment", "shopping");
  } else if (ganzhi.stemElement === relations.generates) {
    // 식상 - 표현/창작/연애/자녀
    categories.push("love", "career");
    titleKey = "calendar.siksang";
    descKey = "calendar.siksangDesc";
    sajuFactorKeys.push("stemSiksang");
    recommendationKeys.push("love", "creative", "expression");
  } else if (ganzhi.stemElement === relations.controlledBy) {
    // 관살 - 외부 압박, 직장/권위
    categories.push("health", "career");
    titleKey = "calendar.gwansal";
    descKey = "calendar.gwansalDesc";
    sajuFactorKeys.push("stemGwansal");
    warningKeys.push("conflict", "health", "avoidAuthority");
    recommendationKeys.push("careful", "lowProfile");
    // 관살이 있으면 권위/승진 추천 제거
    const removeRecs = ["authority", "promotion", "interview"];
    for (let i = recommendationKeys.length - 1; i >= 0; i--) {
      if (removeRecs.includes(recommendationKeys[i])) {
        recommendationKeys.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 12: 지지 관계 (삼합, 육합, 충, 형, 해)
  // ═══════════════════════════════════════════════════════════

  if (dayBranch) {
    // 삼합 체크 - 가장 강력
    for (const [element, branches] of Object.entries(SAMHAP)) {
      if (branches.includes(dayBranch) && branches.includes(ganzhi.branch)) {
        if (element === dayMasterElement || element === relations.generatedBy) {
          sajuFactorKeys.push("branchSamhap");
          if (!titleKey) {
            titleKey = "calendar.samhap";
            descKey = "calendar.samhapDesc";
          }
          recommendationKeys.push("bigDecision", "contract", "partnership");
          if (!categories.includes("general")) categories.push("general");
        } else if (element === relations.controlledBy) {
          sajuFactorKeys.push("branchSamhapNegative");
          warningKeys.push("opposition");
        }
      }
    }

    // 육합 체크 - 인연/화합
    if (YUKHAP[dayBranch] === ganzhi.branch) {
      sajuFactorKeys.push("branchYukhap");
      if (!titleKey) {
        titleKey = "calendar.yukhap";
        descKey = "calendar.yukhapDesc";
      }
      categories.push("love");
      recommendationKeys.push("love", "meeting", "reconciliation");
    }

    // 충 체크 - 충돌/변화
    if (CHUNG[dayBranch] === ganzhi.branch) {
      categories.push("travel", "health");
      titleKey = "calendar.chung";
      descKey = "calendar.chungDesc";
      sajuFactorKeys.push("branchChung");
      warningKeys.push("avoidTravel", "conflict", "accident", "avoidChange");
      recommendationKeys.push("careful", "postpone");
      // 충이 있으면 여행/변화 추천 제거
      const removeRecs = ["travel", "change"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }

    // 형 (刑) 체크
    if (XING[dayBranch]?.includes(ganzhi.branch)) {
      sajuFactorKeys.push("branchXing");
      warningKeys.push("legal", "injury");
      // 형이 있으면 계약 관련 추천 제거
      const removeRecs = ["contract", "bigDecision", "partnership"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }

    // 해 (害) 체크 - 육해
    const HAI_MAP: Record<string, string> = {
      "子": "未", "未": "子", "丑": "午", "午": "丑",
      "寅": "巳", "巳": "寅", "卯": "辰", "辰": "卯",
      "申": "亥", "亥": "申", "酉": "戌", "戌": "酉",
    };
    if (HAI_MAP[dayBranch] === ganzhi.branch) {
      sajuFactorKeys.push("branchHai");
      warningKeys.push("betrayal", "misunderstanding");
      // 해가 있으면 소셜/네트워킹 추천 제거
      const removeRecs = ["networking", "socializing"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 13: 점성술 분석 (강화)
  // ═══════════════════════════════════════════════════════════

  // 트랜짓 태양과 본명 태양의 관계
  if (transitSunElement === natalSunElement) {
    astroFactorKeys.push("sameElement");
    recommendationKeys.push("confidence", "selfExpression");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generatedBy === transitSunElement) {
    astroFactorKeys.push("supportElement");
    recommendationKeys.push("learning", "receiving");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.generates === transitSunElement) {
    astroFactorKeys.push("givingElement");
    recommendationKeys.push("giving", "teaching");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controlledBy === transitSunElement) {
    astroFactorKeys.push("conflictElement");
    warningKeys.push("stress", "opposition");
  } else if (ELEMENT_RELATIONS[natalSunElement]?.controls === transitSunElement) {
    astroFactorKeys.push("controlElement");
    recommendationKeys.push("achievement", "discipline");
  }

  // 달의 위상 분석
  if (lunarPhase.phaseName === "newMoon") {
    astroFactorKeys.push("lunarNewMoon");
    recommendationKeys.push("newBeginning", "planning");
  } else if (lunarPhase.phaseName === "fullMoon") {
    astroFactorKeys.push("lunarFullMoon");
    recommendationKeys.push("completion", "celebration");
  } else if (lunarPhase.phaseName === "firstQuarter") {
    astroFactorKeys.push("lunarFirstQuarter");
    warningKeys.push("tension", "challenge");
  } else if (lunarPhase.phaseName === "lastQuarter") {
    astroFactorKeys.push("lunarLastQuarter");
    recommendationKeys.push("reflection", "release");
  }

  // 대운/세운/월운/일진 요소 반영
  sajuFactorKeys.push(...daeunAnalysis.factorKeys);
  sajuFactorKeys.push(...seunAnalysis.factorKeys);
  sajuFactorKeys.push(...wolunAnalysis.factorKeys);
  sajuFactorKeys.push(...iljinAnalysis.factorKeys);

  // 용신/격국 요소 반영
  sajuFactorKeys.push(...yongsinAnalysis.factorKeys);
  sajuFactorKeys.push(...geokgukAnalysis.factorKeys);

  // 행성 트랜짓 요소 반영
  astroFactorKeys.push(...planetTransits.factorKeys);

  // Solar Return / Progressions 요소 반영
  astroFactorKeys.push(...solarReturnAnalysis.factorKeys);
  astroFactorKeys.push(...progressionAnalysis.factorKeys);

  // 고급 점성학 요소 반영

  // 1. 달 위상 (8단계)
  astroFactorKeys.push(moonPhaseDetailed.factorKey);
  if (moonPhaseDetailed.score > 10) astroPositive = true;
  if (moonPhaseDetailed.score < -2) astroNegative = true;

  // 2. 역행 행성
  if (retrogradePlanets.length > 0) {
    for (const planet of retrogradePlanets) {
      astroFactorKeys.push(`retrograde${planet.charAt(0).toUpperCase() + planet.slice(1)}`);
    }
    // 수성 역행은 커뮤니케이션/계약에 특히 주의
    if (retrogradePlanets.includes("mercury")) {
      warningKeys.push("mercuryRetrograde");
      const removeRecs = ["contract", "documents", "interview"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
    // 금성 역행은 연애/재물에 주의
    if (retrogradePlanets.includes("venus")) {
      warningKeys.push("venusRetrograde");
      const removeRecs = ["dating", "love", "finance", "investment", "shopping"];
      for (let i = recommendationKeys.length - 1; i >= 0; i--) {
        if (removeRecs.includes(recommendationKeys[i])) {
          recommendationKeys.splice(i, 1);
        }
      }
    }
    // 화성 역행은 행동/에너지에 주의
    if (retrogradePlanets.includes("mars")) {
      warningKeys.push("marsRetrograde");
    }
  }

  // 3. Void of Course Moon (공허한 달)
  if (voidOfCourse.isVoid) {
    astroFactorKeys.push("voidOfCourse");
    warningKeys.push("voidOfCourse");
  }

  // 4. 일/월식 영향
  if (eclipseImpact.hasImpact) {
    if (eclipseImpact.type === "solar") {
      astroFactorKeys.push(`solarEclipse${eclipseImpact.intensity}`);
    } else {
      astroFactorKeys.push(`lunarEclipse${eclipseImpact.intensity}`);
    }

    if (eclipseImpact.intensity === "strong") {
      warningKeys.push("eclipseDay");
    } else if (eclipseImpact.intensity === "medium") {
      warningKeys.push("eclipseNear");
    }
  }

  // 5. 행성 시간 (요일 지배 행성)
  astroFactorKeys.push(`dayRuler${planetaryHour.dayRuler}`);
  if (planetaryHour.dayRuler === "Jupiter") {
    recommendationKeys.push("expansion", "luck");
  } else if (planetaryHour.dayRuler === "Venus") {
    recommendationKeys.push("love", "beauty");
  }

  // 긍정/부정 플래그 업데이트
  if (iljinAnalysis.positive) sajuPositive = true;
  if (iljinAnalysis.negative) sajuNegative = true;
  if (daeunAnalysis.positive) sajuPositive = true;
  if (daeunAnalysis.negative) sajuNegative = true;
  if (seunAnalysis.positive) sajuPositive = true;
  if (seunAnalysis.negative) sajuNegative = true;
  if (wolunAnalysis.positive) sajuPositive = true;
  if (wolunAnalysis.negative) sajuNegative = true;
  if (yongsinAnalysis.positive) sajuPositive = true;
  if (yongsinAnalysis.negative) sajuNegative = true;
  if (geokgukAnalysis.positive) sajuPositive = true;
  if (geokgukAnalysis.negative) sajuNegative = true;
  if (planetTransits.positive) astroPositive = true;
  if (planetTransits.negative) astroNegative = true;
  if (solarReturnAnalysis.positive) astroPositive = true;
  if (progressionAnalysis.positive) astroPositive = true;
  if (progressionAnalysis.negative) astroNegative = true;

  // 교차 검증
  if (crossVerified) {
    astroFactorKeys.push("crossVerified");
    recommendationKeys.push("majorDecision");
  }

  if (sajuNegative && astroNegative) {
    astroFactorKeys.push("crossNegative");
    warningKeys.push("extremeCaution");
  }

  if (ganzhi.stemElement === transitSunElement) {
    astroFactorKeys.push("alignedElement");
  }

  if ((sajuPositive && astroNegative) || (sajuNegative && astroPositive)) {
    astroFactorKeys.push("mixedSignals");
    warningKeys.push("confusion");
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 14: 중요하지 않은 날 제외
  // ═══════════════════════════════════════════════════════════

  const hasSignificantFactors = sajuFactorKeys.length > 0 || astroFactorKeys.length > 0;
  if (score >= 42 && score <= 58 && !crossVerified && !hasSignificantFactors) {
    return null;
  }

  // 카테고리가 비어있으면 general 추가
  if (categories.length === 0) {
    categories.push("general");
  }

  // ═══════════════════════════════════════════════════════════
  // SECTION 15: 등급 결정 (5단계 시스템)
  // ═══════════════════════════════════════════════════════════

  let grade: ImportanceGrade;

  // 사주 요소 체크
  const gradeCheoneulGwiin = sajuFactorKeys.includes("cheoneulGwiin");
  const gradeSamhap = sajuFactorKeys.some(k => k.toLowerCase().includes("samhap"));
  const gradeYukhap = sajuFactorKeys.some(k => k.toLowerCase().includes("yukhap"));
  const gradeChung = sajuFactorKeys.some(k => k.toLowerCase().includes("chung") || k.includes("충"));
  const gradeXing = sajuFactorKeys.some(k => k.toLowerCase().includes("xing") || k.includes("형"));

  // 점성술 요소 체크
  const hasJupiterTrine = astroFactorKeys.includes("jupiterTrine");
  const hasVenusTrine = astroFactorKeys.includes("venusTrine");
  const hasSaturnTrine = astroFactorKeys.includes("saturnTrine");
  const hasJupiterVenusTrine = astroFactorKeys.includes("jupiterVenusTrine");

  const hasFullMoon = astroFactorKeys.includes("moonPhaseFull") || astroFactorKeys.includes("lunarFullMoon");
  const hasFirstQuarter = astroFactorKeys.includes("moonPhaseFirstQuarter") || astroFactorKeys.includes("lunarFirstQuarter");
  const hasGoodMoonPhase = hasFullMoon || hasFirstQuarter;

  const hasMercuryRetrograde = astroFactorKeys.includes("retrogradeMercury");
  const hasVenusRetrograde = astroFactorKeys.includes("retrogradeVenus");
  const hasMarsRetrograde = astroFactorKeys.includes("retrogradeMars");
  const hasNoMajorRetrograde = !hasMercuryRetrograde && !hasVenusRetrograde && !hasMarsRetrograde;

  const hasVoidOfCourse = astroFactorKeys.includes("voidOfCourse");

  const hasSameElement = astroFactorKeys.includes("sameElement");
  const hasSupportElement = astroFactorKeys.includes("supportElement");
  const hasAlignedElement = astroFactorKeys.includes("alignedElement");
  const hasGoodElementHarmony = hasSameElement || hasSupportElement || hasAlignedElement;

  const hasYongsinMatch = sajuFactorKeys.includes("yongsinPrimaryMatch");
  const hasYongsinBranchMatch = sajuFactorKeys.includes("yongsinBranchMatch");
  const hasKibsinMatch = sajuFactorKeys.includes("kibsinMatch");
  const hasGeokgukFavor = sajuFactorKeys.some(k => k.startsWith("geokgukFavor_"));

  const sajuStrengthCount = [
    gradeCheoneulGwiin,
    gradeSamhap,
    gradeYukhap,
    hasYongsinMatch,
    hasYongsinBranchMatch,
    hasGeokgukFavor,
  ].filter(Boolean).length;

  const hasSolarReturn = solarReturnAnalysis.isBirthday || solarReturnAnalysis.daysFromBirthday <= 3;

  const astroStrengthCount = [
    hasJupiterTrine,
    hasVenusTrine,
    hasJupiterVenusTrine,
    hasGoodMoonPhase,
    hasNoMajorRetrograde,
    hasGoodElementHarmony,
    hasSolarReturn,
  ].filter(Boolean).length;

  const isBirthdaySpecial = (
    solarReturnAnalysis.isBirthday &&
    crossVerified &&
    sajuPositive && astroPositive &&
    hasNoMajorRetrograde
  );

  const retrogradeCount = [hasMercuryRetrograde, hasVenusRetrograde, hasMarsRetrograde].filter(Boolean).length;

  const sajuBadCount = [gradeChung, gradeXing, hasKibsinMatch].filter(Boolean).length;
  const astroBadCount = [
    retrogradeCount >= 2,
    hasVoidOfCourse,
    astroNegative,
  ].filter(Boolean).length;
  const totalBadCount = sajuBadCount + astroBadCount;

  const totalStrengthCount = sajuStrengthCount + astroStrengthCount;

  // 등급 결정
  const gradeInput = {
    score,
    isBirthdaySpecial,
    crossVerified,
    sajuPositive,
    astroPositive,
    totalStrengthCount,
    sajuBadCount,
    hasChung: gradeChung,
    hasXing: gradeXing,
    hasNoMajorRetrograde,
    retrogradeCount,
    totalBadCount,
  };

  const gradeResult = calculateGrade(gradeInput);
  grade = gradeResult.grade;

  // 타이틀/설명 키 설정
  if (grade === 0 || !titleKey) {
    const keys = getGradeKeys(grade);
    titleKey = keys.titleKey;
    descKey = keys.descKey;
  }

  // 등급별 추천 추가
  const gradeRecs = getGradeRecommendations(grade);
  if (grade <= 1) {
    recommendationKeys.unshift(...gradeRecs);
  } else {
    recommendationKeys.push(...gradeRecs);
  }

  // 경고 필터링
  const filteredWarnings = filterWarningsByGrade(grade, warningKeys);
  warningKeys.length = 0;
  warningKeys.push(...filteredWarnings);

  // ═══════════════════════════════════════════════════════════
  // SECTION 16: 고급 예측 분석 (ultraPrecisionEngine + daeunTransitSync)
  // ═══════════════════════════════════════════════════════════

  // 1. 일진 간지 계산
  const dailyPillar = calculateDailyPillar(date);
  const dayStem = sajuProfile.dayMaster || dailyPillar.stem;

  // 2. 공망(空亡) 분석
  const gongmangBranches = analyzeGongmang(dayStem, dayBranch || dailyPillar.branch, dailyPillar.branch);
  const gongmangStatus = {
    isEmpty: gongmangBranches.isToday空,
    emptyBranches: gongmangBranches.emptyBranches,
    affectedAreas: gongmangBranches.affectedAreas,
  };

  // 3. 신살(神煞) 분석
  const shinsalResult = analyzeShinsal(dayBranch || dailyPillar.branch, dailyPillar.branch);
  const shinsalActive = shinsalResult.active.map(s => ({
    name: s.name,
    type: s.type,
    affectedArea: s.affectedArea,
  }));

  // 4. 에너지 흐름 분석 (통근/투출)
  const allStems = sajuProfile.pillars
    ? [sajuProfile.pillars.year?.stem, sajuProfile.pillars.month?.stem, sajuProfile.pillars.day?.stem, sajuProfile.pillars.time?.stem].filter(Boolean) as string[]
    : [dayStem];
  const allBranches = sajuProfile.pillars
    ? [sajuProfile.pillars.year?.branch, sajuProfile.pillars.month?.branch, sajuProfile.pillars.day?.branch, sajuProfile.pillars.time?.branch].filter(Boolean) as string[]
    : [dayBranch || dailyPillar.branch];
  const energyResult = analyzeEnergyFlow(dayStem, allStems, allBranches);
  const energyFlow = {
    strength: energyResult.energyStrength as 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak',
    dominantElement: energyResult.dominantElement,
    tonggeunCount: energyResult.tonggeun.length,
    tuechulCount: energyResult.tuechul.length,
  };

  // 5. 최적 시간대 분석
  const hourlyAdvice = generateHourlyAdvice(dayStem, dayBranch || dailyPillar.branch);
  const bestHours = hourlyAdvice
    .filter(h => h.quality === 'excellent' || h.quality === 'good')
    .slice(0, 4)
    .map(h => ({
      hour: h.hour,
      siGan: h.siGan,
      quality: h.quality,
    }));

  // 6. 대운-트랜짓 동기화 분석 (목성회귀, 토성회귀)
  let transitSync: {
    isMajorTransitYear: boolean;
    transitType?: string;
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral';
    synergyScore?: number;
  } = { isMajorTransitYear: false };

  if (sajuProfile.birthYear && sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0) {
    const daeunInfo = convertSajuDaeunToInfo(sajuProfile.daeunCycles);
    const currentAge = year - sajuProfile.birthYear;
    const syncAnalysis = analyzeDaeunTransitSync(daeunInfo, sajuProfile.birthYear, currentAge);

    const majorTransitionForYear = syncAnalysis.majorTransitions.find((t: { year: number }) => t.year === year);
    if (majorTransitionForYear) {
      const primaryTransit = majorTransitionForYear.transits[0];
      transitSync = {
        isMajorTransitYear: true,
        transitType: primaryTransit?.type || 'daeun_transition',
        synergyType: majorTransitionForYear.synergyType,
        synergyScore: majorTransitionForYear.synergyScore,
      };
    }
  }

  // 7. 신뢰도 계산
  let confidenceBase = 60;
  const confidenceNotes: string[] = [];

  if (sajuProfile.pillars?.time) {
    confidenceBase += 15;
  } else {
    confidenceNotes.push('시주 없음');
  }
  if (sajuProfile.daeunCycles && sajuProfile.daeunCycles.length > 0) {
    confidenceBase += 10;
  } else {
    confidenceNotes.push('대운 정보 없음');
  }
  if (sajuProfile.yongsin) {
    confidenceBase += 10;
  } else {
    confidenceNotes.push('용신 정보 없음');
  }
  if (crossVerified) {
    confidenceBase += 5;
  }
  const confidence = Math.min(confidenceBase, 100);
  const confidenceNote = confidenceNotes.length > 0
    ? `제한: ${confidenceNotes.join(', ')}`
    : '완전한 분석';

  // 8. 활동별 점수 계산
  const activityScores = {
    marriage: calculateActivityScore('love', score, gongmangStatus, shinsalActive, energyFlow),
    career: calculateActivityScore('career', score, gongmangStatus, shinsalActive, energyFlow),
    investment: calculateActivityScore('wealth', score, gongmangStatus, shinsalActive, energyFlow),
    moving: calculateActivityScore('travel', score, gongmangStatus, shinsalActive, energyFlow),
    surgery: calculateActivityScore('health', score, gongmangStatus, shinsalActive, energyFlow),
    study: calculateActivityScore('study', score, gongmangStatus, shinsalActive, energyFlow),
  };

  // 9. 시간 맥락 (과거/현재/미래) 분석
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const daysFromToday = Math.round((targetUtc - todayUtc) / (1000 * 60 * 60 * 24));

  const isPast = daysFromToday < 0;
  const isFuture = daysFromToday > 0;
  const isToday = daysFromToday === 0;

  // 과거 날짜에 대한 회고적 분석 노트 생성
  let retrospectiveNote: string | undefined;
  if (isPast) {
    if (grade <= 1) {
      retrospectiveNote = '이 날은 매우 좋은 기운이 있었습니다. 주요 성과나 좋은 일이 있었을 가능성이 높습니다.';
    } else if (grade >= 4) {
      retrospectiveNote = '이 날은 도전적인 기운이 있었습니다. 어려움이나 장애물이 있었을 수 있습니다.';
    } else if (gongmangStatus.isEmpty) {
      retrospectiveNote = '공망이 활성화된 날이었습니다. 계획했던 일이 예상대로 진행되지 않았을 수 있습니다.';
    } else if (shinsalActive.some(s => s.type === 'lucky')) {
      retrospectiveNote = '길신이 활성화된 날이었습니다. 예상치 못한 도움이나 행운이 있었을 수 있습니다.';
    } else if (transitSync.isMajorTransitYear) {
      retrospectiveNote = `${transitSync.transitType} 주기의 해였습니다. 인생의 중요한 전환점이었을 수 있습니다.`;
    }
  }

  const timeContext = {
    isPast,
    isFuture,
    isToday,
    daysFromToday,
    retrospectiveNote,
  };

  // ═══════════════════════════════════════════════════════════
  // SECTION 17: 최종 결과 반환
  // ═══════════════════════════════════════════════════════════

  return {
    date: dateStr,
    grade,
    score,
    categories,
    titleKey,
    descKey,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    crossVerified,
    transitSunSign: transitSun,
    sajuFactorKeys,
    astroFactorKeys,
    recommendationKeys,
    warningKeys,
    // 고급 예측 필드
    confidence,
    confidenceNote,
    gongmangStatus,
    shinsalActive,
    energyFlow,
    bestHours,
    transitSync,
    activityScores,
    timeContext,
  };
}
