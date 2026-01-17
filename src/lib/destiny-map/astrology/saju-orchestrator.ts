/**
 * Saju Orchestrator
 * 사주 계산 조율 모듈
 *
 * Orchestrates all Saju (Korean astrology) calculations including:
 * - Core pillar calculations
 * - Daeun/Seun/Wolun/Iljin cycles
 * - Shinsal annotations
 * - Advanced analysis modules (Geokguk, Yongsin, Tonggeun, etc.)
 */

// Note: 'use server' removed - exports include interface definitions

import {
  calculateSajuData,
  getDaeunCycles,
  getAnnualCycles,
  getMonthlyCycles,
  getIljinCalendar,
  analyzeExtendedSaju,
  determineGeokguk,
  determineYongsin,
  calculateTonggeun,
  calculateTuechul,
  calculateHoeguk,
  calculateDeukryeong,
  analyzeHyeongchung,
  analyzeSibsinComprehensive,
  analyzeHealthCareer,
  calculateComprehensiveScore,
  performUltraAdvancedAnalysis,
} from '@/lib/Saju';

import { annotateShinsal, toSajuPillarsLike } from '@/lib/Saju/shinsal';
import { logger } from '@/lib/logger';
import { getYinYangFromName, formatBirthTime } from './helpers';
import type { SajuPillars, SajuData, AdvancedSajuAnalysis } from './types';

// ======================================================
// Types
// ======================================================

export interface SajuInput {
  birthDate: string;
  birthTime: string;
  gender: 'male' | 'female';
  timezone: string;
}

export interface SajuOrchestrationResult extends SajuData {
  // Already extends SajuData which includes all fields
}

// ======================================================
// Internal: Shinsal Calculation
// ======================================================

async function getSinsal(
  pillars: SajuPillars,
  enableDebugLogs = false
): Promise<unknown> {
  try {
    if (!pillars?.year || !pillars?.month || !pillars?.day || !pillars?.time) {
      return null;
    }
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
    if (enableDebugLogs) logger.error('[getSinsal_error]', err);
    return null;
  }
}

// ======================================================
// Internal: Advanced Saju Analysis
// ======================================================

async function calculateAdvancedSajuAnalysis(
  pillars: SajuPillars,
   
  sajuFacts: any,
  enableDebugLogs = false
): Promise<AdvancedSajuAnalysis | undefined> {
  if (!pillars.year || !pillars.month || !pillars.day || !pillars.time) {
    return undefined;
  }

  try {
    const dm = sajuFacts?.dayMaster;

    // Pillars for analysis - with heavenlyStem/earthlyBranch structure
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

    // Day master for analysis
    const dayMasterForAnalysis = {
      name: dm?.name || pillars.day.heavenlyStem?.name || '',
      element: (dm?.element || pillars.day.heavenlyStem?.element || '목') as '목' | '화' | '토' | '금' | '수',
      yin_yang: (dm?.yinYang || '양') as '음' | '양',
    };

    // Simple pillars format (stem/branch)
    const timePillarSimple = {
      stem: pillars.time.heavenlyStem?.name || '',
      branch: pillars.time.earthlyBranch?.name || '',
    };
    const pillarsSimple = {
      year: { stem: pillars.year.heavenlyStem?.name || '', branch: pillars.year.earthlyBranch?.name || '' },
      month: { stem: pillars.month.heavenlyStem?.name || '', branch: pillars.month.earthlyBranch?.name || '' },
      day: { stem: pillars.day.heavenlyStem?.name || '', branch: pillars.day.earthlyBranch?.name || '' },
      hour: timePillarSimple,
      time: timePillarSimple,
    };

    const advancedAnalysis: AdvancedSajuAnalysis = {};

    // 1. Extended analysis (신강/신약 + 격국 + 용신 + 통근 + 조후용신)
    try {
      const extended = analyzeExtendedSaju(dayMasterForAnalysis, pillarsForAnalysis);
      advancedAnalysis.extended = extended;
      if (enableDebugLogs) {
        logger.debug('[Extended analysis]:', { strength: extended.strength.level, geokguk: extended.geokguk.type });
      }
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Extended analysis skipped]', e);
    }

    // 2. Geokguk (격국)
    try {
      advancedAnalysis.geokguk = determineGeokguk(pillarsSimple);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Geokguk skipped]', e);
    }

    // 3. Yongsin (용신)
    try {
      advancedAnalysis.yongsin = determineYongsin(pillarsSimple);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Yongsin skipped]', e);
    }

    // 4. Tonggeun/Tuechul/Hoeguk/Deukryeong
    try {
      advancedAnalysis.tonggeun = calculateTonggeun(dayMasterForAnalysis.name, pillarsSimple);
      advancedAnalysis.tuechul = calculateTuechul(pillarsSimple);
      advancedAnalysis.hoeguk = calculateHoeguk(pillarsSimple);
      const monthBranch = pillarsSimple.month.branch;
      advancedAnalysis.deukryeong = calculateDeukryeong(dayMasterForAnalysis.name, monthBranch);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Tonggeun/Tuechul/Hoeguk skipped]', e);
    }

    // 5. Hyeongchung (형충회합)
    try {
      advancedAnalysis.hyeongchung = analyzeHyeongchung(pillarsSimple);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Hyeongchung skipped]', e);
    }

    // 6. Sibsin comprehensive analysis (십신 심층 분석)
    try {
      advancedAnalysis.sibsin = analyzeSibsinComprehensive(pillarsSimple);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Sibsin analysis skipped]', e);
    }

    // 7. Health/Career analysis (건강/직업 분석)
    try {
      advancedAnalysis.healthCareer = analyzeHealthCareer(pillarsSimple);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Health/Career analysis skipped]', e);
    }

    // 8. Comprehensive score (종합 점수)
    try {
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
       
      advancedAnalysis.score = calculateComprehensiveScore(pillarsForScore as any);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Score calculation skipped]', e);
    }

    // 9. Ultra Advanced analysis (종격, 화격, 일주론 심화, 공망 심화, 삼기)
    try {
      const pillarsForUltra = {
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
       
      advancedAnalysis.ultraAdvanced = performUltraAdvancedAnalysis(pillarsForUltra as any);
    } catch (e) {
      if (enableDebugLogs) logger.debug('[Ultra Advanced analysis skipped]', e);
    }

    if (enableDebugLogs) {
      logger.debug('[Advanced Saju Analysis completed]:', {
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

    return advancedAnalysis;
  } catch (advErr) {
    if (enableDebugLogs) logger.warn('[Advanced Saju Analysis error]', advErr);
    return undefined;
  }
}

// ======================================================
// Main Orchestration Function
// ======================================================

/**
 * Calculate all Saju data with cycles and advanced analysis
 * 사주 데이터 전체 계산 (운세 주기 및 고급 분석 포함)
 *
 * @param input - Saju calculation input
 * @param enableDebugLogs - Enable debug logging
 * @returns Complete Saju orchestration result
 */
export async function calculateSajuOrchestrated(
  input: SajuInput,
  enableDebugLogs = false
): Promise<SajuOrchestrationResult> {
  const { birthDate, birthTime, gender, timezone } = input;
  const safeBirthTime = formatBirthTime(birthTime);

  // Parse birth date for cycle calculations
  const [year, month, day] = birthDate.split('-').map(Number);
  const [hour, minute] = birthTime.split(':').map((v) => Number(v) || 0);
  const birthDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Calculate core Saju data
   
  let sajuFacts: any = {};
  try {
    sajuFacts = await calculateSajuData(birthDate.trim(), safeBirthTime, gender, 'solar', timezone);
    if (enableDebugLogs) {
      logger.debug('[SajuFacts keys]:', Object.keys(sajuFacts || {}));
    }
  } catch (err) {
    logger.error('[calculateSajuData Error]', err);
  }

  // Extract pillars
  const pillars: SajuPillars = {
    year: sajuFacts?.yearPillar,
    month: sajuFacts?.monthPillar,
    day: sajuFacts?.dayPillar,
    time: sajuFacts?.timePillar,
  };

   
  const dayMaster: any = sajuFacts?.dayMaster ?? {};
  if (enableDebugLogs) {
    logger.debug('[calculateSajuOrchestrated] dayMaster extracted:', JSON.stringify(dayMaster));
  }

  // Calculate cycles (운세)
  let daeun: unknown[] = [];
  let annual: unknown[] = [];
  let monthly: unknown[] = [];
  let iljin: unknown[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const hasValidPillars = Boolean(pillars.year && pillars.month && pillars.day);
  if (hasValidPillars) {
    try {
       
      const d = getDaeunCycles(birthDateObj, gender, pillars as any, dayMaster, timezone);

      // 세운: 현재 연도부터 향후 10년
      const a = getAnnualCycles(currentYear, 10, dayMaster);

      // 월운: 현재 연도 기준
      const m = getMonthlyCycles(currentYear, dayMaster);

      // 일진: 현재 연/월 기준
      const i = getIljinCalendar(currentYear, currentMonth, dayMaster);

      daeun = Array.isArray(d?.cycles) ? d.cycles : [];
      annual = Array.isArray(a) ? a : [];
      monthly = Array.isArray(m) ? m : [];
      iljin = Array.isArray(i) ? i : [];

      if (enableDebugLogs) {
        logger.debug('[Unse cycles]', { daeun: daeun.length, annual: annual.length, monthly: monthly.length });
      }

      if (daeun.length === 0) {
        logger.error('[Unse CRITICAL] daeun is EMPTY - check input data');
      }
    } catch (err) {
      logger.error('[Unse calculation ERROR]', err);
    }
  } else {
    logger.error('[Unse CRITICAL] Invalid pillars - cannot calculate daeun!', {
      year: !!pillars.year,
      month: !!pillars.month,
      day: !!pillars.day,
    });
  }

  // Calculate shinsal
  const sinsal = hasValidPillars ? await getSinsal(pillars, enableDebugLogs) : null;

  // Calculate advanced analysis
  let advancedAnalysis: SajuOrchestrationResult['advancedAnalysis'];
  if (hasValidPillars && pillars.year && pillars.month && pillars.day && pillars.time) {
    advancedAnalysis = await calculateAdvancedSajuAnalysis(pillars, sajuFacts, enableDebugLogs);
  }

  return {
    facts: { ...sajuFacts, birthDate },
    pillars,
    dayMaster,
    unse: { daeun, annual, monthly, iljin },
    sinsal,
    advancedAnalysis,
  };
}
