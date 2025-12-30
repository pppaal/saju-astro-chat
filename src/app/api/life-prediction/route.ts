// src/app/api/life-prediction/route.ts
// 종합 인생 예측 API - 다년간 트렌드 + 과거 회고 + 이벤트 타이밍
// TIER 1~3 고급 분석 엔진 통합

import { NextRequest, NextResponse } from 'next/server';
import {
  analyzeMultiYearTrend,
  analyzePastDate,
  analyzePastPeriod,
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
  generateComprehensivePrediction,
  generateLifePredictionPromptContext,
  generateEventTimingPromptContext,
  generatePastAnalysisPromptContext,
  convertSajuDaeunToInfo,
  type LifePredictionInput,
  type EventType,
} from '@/lib/prediction';

// TIER 1: 공망/신살/에너지/시간대 (calculateUltraPrecisionScore 내부에서 사용)
// ultraPrecisionEngine.ts의 함수들은 calculateUltraPrecisionScore에서 통합 호출됨

// TIER 2: 대운-트랜짓 동기화
import {
  analyzeDaeunTransitSync,
  type DaeunInfo,
} from '@/lib/prediction/daeunTransitSync';

// TIER 3: 사주 패턴 분석
// 참고: analyzePatterns, getPatternStatistics는 완전한 SajuPillars가 필요하므로
// life-prediction에서는 간소화된 분석만 수행 (패턴 분석은 destinyMap에서)

// TIER 3 추가: 점성술 고급 엔진
// 참고: getMoonPhase, checkVoidOfCourse, getRetrogradePlanets는 Chart 객체가 필요하므로
// life-prediction API에서는 사주 기반 분석만 수행 (간소화된 달 위상 추정 사용)

// 초정밀 엔진
import {
  calculateUltraPrecisionScore,
} from '@/lib/prediction/ultraPrecisionEngine';

// ============================================================
// 고급 분석 결과 타입
// ============================================================

interface AdvancedAnalysis {
  // TIER 1: 초정밀 분석
  tier1?: {
    gongmang?: {
      emptyBranches: string[];
      isAffected: boolean;
      affectedAreas: string[];
    };
    shinsal?: {
      active: Array<{
        name: string;
        type: 'lucky' | 'unlucky' | 'special';
        description: string;
      }>;
      score: number;
    };
    energyFlow?: {
      strength: string;
      dominantElement: string;
      tonggeunCount: number;
      tuechulCount: number;
    };
    hourlyAdvice?: Array<{
      hour: number;
      quality: string;
      activity: string;
    }>;
  };

  // TIER 2: 대운-트랜짓 동기화
  tier2?: {
    daeunSync?: {
      currentDaeun?: {
        stem: string;
        branch: string;
        age: number;
      };
      transitAlignment: number;
      majorThemes: string[];
    };
  };

  // TIER 3: 고급 점성술 + 패턴
  tier3?: {
    moonPhase?: {
      phase: string;
      illumination: number;
      name: string;
    };
    voidOfCourse?: {
      isVoid: boolean;
      endsAt?: string;
    };
    retrogrades?: string[];
    sajuPatterns?: {
      found: Array<{
        name: string;
        rarity: number;
        description: string;
      }>;
      rarityScore: number;
    };
  };
}

// ============================================================
// 요청 타입 정의
// ============================================================

// 점성술 차트 데이터 타입
interface AstroChartData {
  sun?: { sign?: string; signKo?: string; house?: number; longitude?: number };
  moon?: { sign?: string; signKo?: string; house?: number; longitude?: number };
  mercury?: { sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  venus?: { sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  mars?: { sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  jupiter?: { sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  saturn?: { sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean };
  ascendant?: { sign?: string; signKo?: string; longitude?: number };
  mc?: { sign?: string; signKo?: string; longitude?: number };
  planets?: Array<{ name: string; sign?: string; signKo?: string; house?: number; longitude?: number; isRetrograde?: boolean }>;
}

// 고급 점성술 데이터 타입
interface AdvancedAstroData {
  extraPoints?: {
    chiron?: { sign?: string; house?: number };
    lilith?: { sign?: string; house?: number };
    partOfFortune?: { sign?: string; house?: number; longitude?: number };
    vertex?: { sign?: string; house?: number };
  };
  solarReturn?: {
    chart?: unknown;
    summary?: { year?: number; theme?: string; keyPlanets?: string[] };
  };
  lunarReturn?: {
    chart?: unknown;
    summary?: { month?: number; theme?: string };
  };
  progressions?: {
    secondary?: { chart?: unknown; moonPhase?: string; summary?: unknown };
    solarArc?: { chart?: unknown; summary?: unknown };
  };
  draconic?: {
    chart?: unknown;
    comparison?: unknown;
  };
  harmonics?: {
    h5?: unknown;
    h7?: unknown;
    h9?: unknown;
    profile?: unknown;
  };
  eclipses?: {
    impact?: { type?: string; date?: string; affectedPlanets?: string[] };
    upcoming?: Array<{ date?: string; type?: string }>;
  };
  electional?: {
    moonPhase?: { phase?: string; illumination?: number; name?: string };
    voidOfCourse?: { isVoid?: boolean; endsAt?: string };
    retrograde?: string[];
  };
  midpoints?: {
    sunMoon?: { longitude?: number };
    ascMc?: { longitude?: number };
    activations?: unknown[];
  };
}

interface BaseRequest {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour?: number;
  gender: 'male' | 'female';
  dayStem: string;
  dayBranch: string;
  monthBranch: string;
  yearBranch: string;
  allStems?: string[];
  allBranches?: string[];
  daeunList?: Array<{
    startAge?: number;
    age?: number;
    stem?: string;
    heavenlyStem?: string;
    branch?: string;
    earthlyBranch?: string;
  }>;
  yongsin?: string[];
  kisin?: string[];
  locale?: 'ko' | 'en';
  // 점성술 데이터 (precompute-chart에서 전달)
  astroChart?: AstroChartData;
  advancedAstro?: AdvancedAstroData;
}

interface MultiYearRequest extends BaseRequest {
  type: 'multi-year';
  startYear: number;
  endYear: number;
}

interface PastAnalysisRequest extends BaseRequest {
  type: 'past-analysis';
  targetDate?: string;  // YYYY-MM-DD
  startDate?: string;   // for period analysis
  endDate?: string;     // for period analysis
}

interface EventTimingRequest extends BaseRequest {
  type: 'event-timing';
  eventType: EventType;
  startYear: number;
  endYear: number;
}

interface ComprehensiveRequest extends BaseRequest {
  type: 'comprehensive';
  yearsRange?: number;
}

interface WeeklyTimingRequest extends BaseRequest {
  type: 'weekly-timing';
  eventType: EventType;
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD (기본 3개월)
}

type PredictionRequest = MultiYearRequest | PastAnalysisRequest | EventTimingRequest | ComprehensiveRequest | WeeklyTimingRequest;

// ============================================================
// 헬퍼 함수
// ============================================================

function buildPredictionInput(req: BaseRequest): LifePredictionInput {
  const daeunList = req.daeunList
    ? convertSajuDaeunToInfo(req.daeunList)
    : undefined;

  // 점성 데이터 변환 (API 타입 -> Engine 타입)
  const astroChart = req.astroChart ? {
    sun: req.astroChart.sun,
    moon: req.astroChart.moon,
    venus: req.astroChart.venus,
    mars: req.astroChart.mars,
    jupiter: req.astroChart.jupiter,
    saturn: req.astroChart.saturn,
    mercury: req.astroChart.mercury,
    ascendant: req.astroChart.ascendant,
    planets: req.astroChart.planets,
  } : undefined;

  const advancedAstro = req.advancedAstro ? {
    electional: req.advancedAstro.electional,
    solarReturn: req.advancedAstro.solarReturn,
    lunarReturn: req.advancedAstro.lunarReturn,
    progressions: req.advancedAstro.progressions,
    eclipses: req.advancedAstro.eclipses,
    extraPoints: req.advancedAstro.extraPoints,
  } : undefined;

  return {
    birthYear: req.birthYear,
    birthMonth: req.birthMonth,
    birthDay: req.birthDay,
    birthHour: req.birthHour,
    gender: req.gender,
    dayStem: req.dayStem,
    dayBranch: req.dayBranch,
    monthBranch: req.monthBranch,
    yearBranch: req.yearBranch,
    allStems: req.allStems || [req.dayStem],
    allBranches: req.allBranches || [req.dayBranch, req.monthBranch, req.yearBranch],
    daeunList,
    yongsin: req.yongsin as LifePredictionInput['yongsin'],
    kisin: req.kisin as LifePredictionInput['kisin'],
    // 점성술 데이터 전달
    astroChart,
    advancedAstro,
  };
}

function validateRequest(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const req = body as Record<string, unknown>;

  if (!req.type) {
    return { valid: false, error: 'type is required (multi-year, past-analysis, event-timing, comprehensive)' };
  }

  if (!req.birthYear || !req.birthMonth || !req.birthDay) {
    return { valid: false, error: 'birthYear, birthMonth, birthDay are required' };
  }

  if (!req.dayStem || !req.dayBranch) {
    return { valid: false, error: 'dayStem and dayBranch are required' };
  }

  if (!req.gender || !['male', 'female'].includes(req.gender as string)) {
    return { valid: false, error: 'gender is required (male or female)' };
  }

  return { valid: true };
}

/**
 * TIER 1~3 고급 분석 수행
 * 점성술 데이터가 전달되면 실제 데이터 사용, 없으면 추정값 사용
 */
function performAdvancedAnalysis(
  req: BaseRequest,
  input: LifePredictionInput,
  targetDate: Date = new Date()
): AdvancedAnalysis {
  const analysis: AdvancedAnalysis = {};

  try {
    // ========================================
    // TIER 1: 초정밀 분석 (공망/신살/에너지/시간대)
    // ========================================
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

    // ========================================
    // TIER 2: 대운-트랜짓 동기화
    // ========================================
    if (input.daeunList && input.daeunList.length > 0) {
      const currentAge = targetDate.getFullYear() - req.birthYear;
      const daeunSync = analyzeDaeunTransitSync(
        input.daeunList as DaeunInfo[],
        req.birthYear,
        currentAge
      );

      // 현재 나이에 해당하는 대운 찾기
      const currentDaeunInfo = (input.daeunList as DaeunInfo[]).find(
        d => currentAge >= d.startAge && currentAge <= d.endAge
      );

      // 현재 시점의 주요 테마 수집
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

    // ========================================
    // TIER 3: 고급 점성술 분석
    // 점성 데이터가 전달되면 실제 값 사용
    // ========================================

    // 달 위상 - 점성 데이터 우선, 없으면 추정값
    let moonPhaseData: { phase: string; illumination: number; name: string };
    let voidOfCourseData: { isVoid: boolean; endsAt?: string };
    let retrogradesData: string[] = [];

    if (req.advancedAstro?.electional) {
      // 실제 점성 데이터 사용
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
      // 기본 점성 차트에서 역행 행성 추출
      retrogradesData = req.astroChart.planets
        .filter(p => p.isRetrograde)
        .map(p => p.name);

      // 달 위상 추정 (Sun, Moon longitude 기반)
      const sunLon = req.astroChart.sun?.longitude || 0;
      const moonLon = req.astroChart.moon?.longitude || 0;
      const phaseDegree = (moonLon - sunLon + 360) % 360;
      const phaseInfo = calculateMoonPhaseFromDegree(phaseDegree);
      moonPhaseData = phaseInfo;
      voidOfCourseData = { isVoid: false };
    } else {
      // 점성 데이터 없음 - 날짜 기반 추정값
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

    // 사주 패턴 분석 (기본값)
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

    // ========================================
    // 고급 점성 데이터 추가 분석 (전달된 경우)
    // ========================================
    if (req.advancedAstro) {
      // 일식/월식 영향
      if (req.advancedAstro.eclipses?.impact) {
        (analysis.tier3 as Record<string, unknown>).eclipseImpact = {
          type: req.advancedAstro.eclipses.impact.type,
          affectedPlanets: req.advancedAstro.eclipses.impact.affectedPlanets,
        };
      }

      // 프로그레션 달 위상 (Secondary Progression)
      if (req.advancedAstro.progressions?.secondary?.moonPhase) {
        (analysis.tier3 as Record<string, unknown>).progressedMoonPhase =
          req.advancedAstro.progressions.secondary.moonPhase;
      }

      // Solar Return 테마
      if (req.advancedAstro.solarReturn?.summary) {
        (analysis.tier3 as Record<string, unknown>).solarReturnTheme = {
          year: req.advancedAstro.solarReturn.summary.year,
          theme: req.advancedAstro.solarReturn.summary.theme,
          keyPlanets: req.advancedAstro.solarReturn.summary.keyPlanets,
        };
      }

      // 카이론, 릴리스, Part of Fortune
      if (req.advancedAstro.extraPoints) {
        (analysis.tier3 as Record<string, unknown>).extraPoints = {
          chiron: req.advancedAstro.extraPoints.chiron,
          lilith: req.advancedAstro.extraPoints.lilith,
          partOfFortune: req.advancedAstro.extraPoints.partOfFortune,
        };
      }
    }

  } catch (error) {
    console.error('[Advanced Analysis Error]', error);
    // 에러 시에도 부분 결과 반환
  }

  return analysis;
}

/**
 * 달 위상 계산 (Sun-Moon 각도 기반)
 */
function calculateMoonPhaseFromDegree(degree: number): { phase: string; illumination: number; name: string } {
  // 0° = New Moon, 90° = First Quarter, 180° = Full Moon, 270° = Last Quarter
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
 * 연도별 고급 분석 (multi-year용)
 */
function analyzeYearWithAdvanced(
  req: BaseRequest,
  input: LifePredictionInput,
  year: number
): { year: number; advancedInsights: AdvancedAnalysis } {
  // 해당 연도 1월 1일 기준으로 분석
  const targetDate = new Date(year, 0, 1);
  const analysis = performAdvancedAnalysis(req, input, targetDate);

  return {
    year,
    advancedInsights: analysis,
  };
}

/**
 * 고급 분석 프롬프트 컨텍스트 생성
 */
function generateAdvancedPromptContext(
  analysis: AdvancedAnalysis,
  locale: 'ko' | 'en' = 'ko'
): string {
  const lines: string[] = [];

  if (locale === 'ko') {
    lines.push('\n=== 고급 분석 (TIER 1~3) ===\n');

    // TIER 1
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

    // TIER 2
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

    // TIER 3
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

// ============================================================
// API 핸들러
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as PredictionRequest;

    // 유효성 검사
    const validation = validateRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const input = buildPredictionInput(body);
    const locale = body.locale || 'ko';

    switch (body.type) {
      case 'multi-year': {
        const { startYear, endYear } = body;

        if (!startYear || !endYear) {
          return NextResponse.json(
            { success: false, error: 'startYear and endYear are required for multi-year analysis' },
            { status: 400 }
          );
        }

        const trend = analyzeMultiYearTrend(input, startYear, endYear);

        // TIER 1~3 고급 분석 추가 (주요 연도별)
        const peakYearsAnalysis = trend.peakYears.slice(0, 3).map(year =>
          analyzeYearWithAdvanced(body, input, year)
        );
        const currentYearAnalysis = performAdvancedAnalysis(body, input, new Date());

        const promptContext = generateLifePredictionPromptContext(
          { input, generatedAt: new Date(), multiYearTrend: trend, upcomingHighlights: [], confidence: 85 },
          locale
        ) + generateAdvancedPromptContext(currentYearAnalysis, locale);

        return NextResponse.json({
          success: true,
          type: 'multi-year',
          data: {
            trend,
            summary: trend.summary,
            peakYears: trend.peakYears,
            lowYears: trend.lowYears,
            daeunTransitions: trend.daeunTransitions,
            lifeCycles: trend.lifeCycles,
            // 고급 분석 추가
            advancedAnalysis: {
              currentYear: currentYearAnalysis,
              peakYearsInsights: peakYearsAnalysis,
            },
          },
          promptContext,
        });
      }

      case 'past-analysis': {
        const { targetDate, startDate, endDate } = body;

        if (targetDate) {
          // 단일 날짜 분석
          const date = new Date(targetDate);
          if (isNaN(date.getTime())) {
            return NextResponse.json(
              { success: false, error: 'Invalid targetDate format. Use YYYY-MM-DD' },
              { status: 400 }
            );
          }

          const retrospective = analyzePastDate(input, date);

          // TIER 1~3 고급 분석 추가
          const advancedAnalysis = performAdvancedAnalysis(body, input, date);

          const promptContext = generatePastAnalysisPromptContext(retrospective, locale)
            + generateAdvancedPromptContext(advancedAnalysis, locale);

          return NextResponse.json({
            success: true,
            type: 'past-analysis',
            mode: 'single',
            data: {
              ...retrospective,
              advancedAnalysis,
            },
            promptContext,
          });

        } else if (startDate && endDate) {
          // 기간 분석
          const start = new Date(startDate);
          const end = new Date(endDate);

          if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return NextResponse.json(
              { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
              { status: 400 }
            );
          }

          // 최대 30일로 제한
          const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff > 30) {
            return NextResponse.json(
              { success: false, error: 'Period cannot exceed 30 days' },
              { status: 400 }
            );
          }

          const retrospectives = analyzePastPeriod(input, start, end);

          // 기간의 첫날, 마지막날, 가장 좋은/나쁜 날에 대한 고급 분석
          const bestDay = retrospectives.reduce((best, r) => r.score > best.score ? r : best);
          const worstDay = retrospectives.reduce((worst, r) => r.score < worst.score ? r : worst);

          const advancedInsights = {
            periodStart: performAdvancedAnalysis(body, input, start),
            periodEnd: performAdvancedAnalysis(body, input, end),
            bestDayAnalysis: performAdvancedAnalysis(body, input, bestDay.targetDate),
            worstDayAnalysis: performAdvancedAnalysis(body, input, worstDay.targetDate),
          };

          const summary = {
            totalDays: retrospectives.length,
            averageScore: Math.round(
              retrospectives.reduce((sum, r) => sum + r.score, 0) / retrospectives.length
            ),
            bestDay,
            worstDay,
          };

          return NextResponse.json({
            success: true,
            type: 'past-analysis',
            mode: 'period',
            data: {
              retrospectives,
              summary,
              advancedInsights,
            },
          });

        } else {
          return NextResponse.json(
            { success: false, error: 'Either targetDate or both startDate and endDate are required' },
            { status: 400 }
          );
        }
      }

      case 'event-timing': {
        const { eventType, startYear, endYear } = body;

        if (!eventType) {
          return NextResponse.json(
            { success: false, error: 'eventType is required (marriage, career, investment, move, study, health, relationship)' },
            { status: 400 }
          );
        }

        if (!startYear || !endYear) {
          return NextResponse.json(
            { success: false, error: 'startYear and endYear are required' },
            { status: 400 }
          );
        }

        const result = findOptimalEventTiming(input, eventType, startYear, endYear);

        // 최적 기간들에 대한 TIER 1~3 고급 분석
        const optimalPeriodsWithAdvanced = result.optimalPeriods.slice(0, 3).map(period => {
          const analysis = performAdvancedAnalysis(body, input, period.startDate);
          return {
            ...period,
            startDate: period.startDate.toISOString().split('T')[0],
            endDate: period.endDate.toISOString().split('T')[0],
            specificDays: period.specificDays?.map(d => d.toISOString().split('T')[0]),
            advancedAnalysis: analysis,
          };
        });

        // 현재 시점 분석
        const currentAnalysis = performAdvancedAnalysis(body, input, new Date());

        const promptContext = generateEventTimingPromptContext(result, locale)
          + generateAdvancedPromptContext(currentAnalysis, locale);

        return NextResponse.json({
          success: true,
          type: 'event-timing',
          data: {
            eventType: result.eventType,
            searchRange: result.searchRange,
            optimalPeriods: optimalPeriodsWithAdvanced,
            avoidPeriods: result.avoidPeriods.map(p => ({
              ...p,
              startDate: p.startDate.toISOString().split('T')[0],
              endDate: p.endDate.toISOString().split('T')[0],
            })),
            nextBestWindow: result.nextBestWindow ? {
              ...result.nextBestWindow,
              startDate: result.nextBestWindow.startDate.toISOString().split('T')[0],
              endDate: result.nextBestWindow.endDate.toISOString().split('T')[0],
              specificDays: result.nextBestWindow.specificDays?.map(d => d.toISOString().split('T')[0]),
            } : null,
            advice: result.advice,
            // 고급 분석 추가
            currentAnalysis,
          },
          promptContext,
        });
      }

      case 'comprehensive': {
        const yearsRange = body.yearsRange || 10;

        const prediction = generateComprehensivePrediction(input, yearsRange);

        // TIER 1~3 종합 고급 분석
        const now = new Date();
        const currentAnalysis = performAdvancedAnalysis(body, input, now);

        // 하이라이트 날짜들에 대한 고급 분석
        const highlightsWithAdvanced = prediction.upcomingHighlights.slice(0, 5).map(h => ({
          ...h,
          date: h.date.toISOString().split('T')[0],
          advancedAnalysis: performAdvancedAnalysis(body, input, h.date),
        }));

        // 향후 5년간 각 연도 분석
        const currentYear = now.getFullYear();
        const yearlyAdvancedInsights = [];
        for (let year = currentYear; year <= currentYear + Math.min(yearsRange, 5); year++) {
          yearlyAdvancedInsights.push(analyzeYearWithAdvanced(body, input, year));
        }

        // 종합 신뢰도 계산 (TIER 추가로 향상)
        const enhancedConfidence = Math.min(95, prediction.confidence + 15);

        const promptContext = generateLifePredictionPromptContext(
          { ...prediction, confidence: enhancedConfidence },
          locale
        ) + generateAdvancedPromptContext(currentAnalysis, locale);

        return NextResponse.json({
          success: true,
          type: 'comprehensive',
          data: {
            generatedAt: prediction.generatedAt.toISOString(),
            confidence: enhancedConfidence,
            multiYearTrend: {
              ...prediction.multiYearTrend,
              yearlyScores: prediction.multiYearTrend.yearlyScores.map(y => ({
                ...y,
                yearGanji: y.yearGanji,
                twelveStage: y.twelveStage,
              })),
            },
            upcomingHighlights: highlightsWithAdvanced,
            lifeSync: prediction.lifeSync,
            // TIER 1~3 고급 분석 추가
            advancedAnalysis: {
              current: currentAnalysis,
              yearlyInsights: yearlyAdvancedInsights,
              analysisLevels: ['TIER1_UltraPrecision', 'TIER2_DaeunTransit', 'TIER3_AdvancedAstrology'],
            },
          },
          promptContext,
        });
      }

      case 'weekly-timing': {
        const { eventType, startDate: startDateStr, endDate: endDateStr } = body as WeeklyTimingRequest;

        if (!eventType) {
          return NextResponse.json(
            { success: false, error: 'eventType is required' },
            { status: 400 }
          );
        }

        const startDate = startDateStr ? new Date(startDateStr) : new Date();
        const endDate = endDateStr ? new Date(endDateStr) : undefined;

        const weeklyResult = findWeeklyOptimalTiming(input, eventType, startDate, endDate);

        // 날짜를 ISO 문자열로 변환
        const weeklyPeriodsFormatted = weeklyResult.weeklyPeriods.map(w => ({
          ...w,
          startDate: w.startDate.toISOString().split('T')[0],
          endDate: w.endDate.toISOString().split('T')[0],
          bestDays: w.bestDays.map(d => d.toISOString().split('T')[0]),
        }));

        return NextResponse.json({
          success: true,
          type: 'weekly-timing',
          data: {
            eventType: weeklyResult.eventType,
            searchRange: {
              startDate: weeklyResult.searchRange.startDate.toISOString().split('T')[0],
              endDate: weeklyResult.searchRange.endDate.toISOString().split('T')[0],
            },
            weeklyPeriods: weeklyPeriodsFormatted,
            bestWeek: weeklyResult.bestWeek ? {
              ...weeklyResult.bestWeek,
              startDate: weeklyResult.bestWeek.startDate.toISOString().split('T')[0],
              endDate: weeklyResult.bestWeek.endDate.toISOString().split('T')[0],
              bestDays: weeklyResult.bestWeek.bestDays.map(d => d.toISOString().split('T')[0]),
            } : null,
            worstWeek: weeklyResult.worstWeek ? {
              ...weeklyResult.worstWeek,
              startDate: weeklyResult.worstWeek.startDate.toISOString().split('T')[0],
              endDate: weeklyResult.worstWeek.endDate.toISOString().split('T')[0],
              bestDays: weeklyResult.worstWeek.bestDays.map(d => d.toISOString().split('T')[0]),
            } : null,
            summary: weeklyResult.summary,
          },
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid type. Use multi-year, past-analysis, event-timing, weekly-timing, or comprehensive' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('[life-prediction API error]', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET 요청 - API 정보
export async function GET() {
  return NextResponse.json({
    name: 'Life Prediction API',
    version: '2.0.0',
    description: '종합 인생 예측 API - TIER 1~3 고급 분석 엔진 통합',
    features: {
      tier1: {
        name: '초정밀 분석 (Ultra-Precision)',
        capabilities: [
          '공망(空亡) 분석 - 빈 기운 영역 탐지',
          '신살(神殺) 분석 - 길흉 신살 활성화 체크',
          '에너지 흐름 - 통근/투출 분석',
          '시간대별 조언 - 최적 활동 시간 추천',
        ],
      },
      tier2: {
        name: '대운-트랜짓 동기화',
        capabilities: [
          '현재 대운 분석',
          '트랜짓 정렬도 계산',
          '주요 테마 도출',
        ],
      },
      tier3: {
        name: '고급 점성술 + 패턴',
        capabilities: [
          '달 위상 (Moon Phase) 분석',
          'Void of Course 체크',
          '역행 행성 (Retrogrades) 감지',
          '사주 패턴 분석 & 희귀도 점수',
        ],
      },
    },
    endpoints: {
      POST: {
        types: {
          'multi-year': {
            description: '다년간 트렌드 분석 + TIER 1~3 고급 분석',
            requiredParams: ['startYear', 'endYear'],
            response: ['trend', 'peakYears', 'lowYears', 'advancedAnalysis'],
            example: {
              type: 'multi-year',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              startYear: 2020,
              endYear: 2030,
            },
          },
          'past-analysis': {
            description: '과거 특정 날짜/기간 분석 + TIER 1~3',
            requiredParams: ['targetDate (or startDate + endDate)'],
            response: ['retrospective', 'advancedAnalysis'],
            example: {
              type: 'past-analysis',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              targetDate: '2023-06-15',
            },
          },
          'event-timing': {
            description: '이벤트 최적 타이밍 + 기간별 고급 분석',
            requiredParams: ['eventType', 'startYear', 'endYear'],
            eventTypes: ['marriage', 'career', 'investment', 'move', 'study', 'health', 'relationship'],
            response: ['optimalPeriods (with advancedAnalysis)', 'avoidPeriods', 'currentAnalysis'],
            example: {
              type: 'event-timing',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              eventType: 'marriage',
              startYear: 2025,
              endYear: 2028,
            },
          },
          'comprehensive': {
            description: '종합 예측 - 모든 TIER 통합 분석',
            optionalParams: ['yearsRange (default: 10)'],
            response: ['multiYearTrend', 'upcomingHighlights', 'advancedAnalysis (current + yearlyInsights)'],
            example: {
              type: 'comprehensive',
              birthYear: 1990,
              birthMonth: 5,
              birthDay: 15,
              gender: 'male',
              dayStem: '甲',
              dayBranch: '子',
              monthBranch: '巳',
              yearBranch: '午',
              yearsRange: 10,
            },
          },
        },
        commonParams: {
          required: ['type', 'birthYear', 'birthMonth', 'birthDay', 'gender', 'dayStem', 'dayBranch', 'monthBranch', 'yearBranch'],
          optional: ['birthHour', 'allStems', 'allBranches', 'daeunList', 'yongsin', 'kisin', 'locale'],
        },
      },
    },
  });
}
