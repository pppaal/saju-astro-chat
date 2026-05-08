/**
 * Advanced Timing Builder
 *
 * 고급 타이밍 분석 섹션 구성
 * TIER 타이밍: 월별 다층 점수 + 연간 예측
 */

import type { FiveElement } from '@/lib/prediction/timingScore';
import {
  calculateAdvancedMonthlyScore,
  generateAdvancedTimingPromptContext,
  type LayeredTimingScore,
} from '@/lib/prediction/advancedTimingEngine';
import {
  generateYearlyPrediction,
  generatePredictionPromptContext,
} from '@/lib/prediction/timingScore';
import { extractBirthYear } from '@/lib/prediction/utils';
import { STEMS_MAP } from '../lib/constants';
import type { SajuDataStructure } from '../lib/types';
import { logger } from '@/lib/logger';

/**
 * 고급 타이밍 분석 섹션 구성
 *
 * @param saju - Saju 데이터
 * @param birthDate - 생년월일
 * @param theme - 테마
 * @param lang - 언어
 * @returns 타이밍 분석 프롬프트 섹션
 */
export function buildAdvancedTimingSection(
  saju: SajuDataStructure | undefined,
  birthDate: string,
  theme: string,
  lang: string
): string {
  // 특정 테마에서만 활성화
  const allowedThemes = ['year', 'month', 'today', 'life', 'chat'];
  if (!saju?.dayMaster || !allowedThemes.includes(theme)) {
    return '';
  }

  try {
    const dayStem = saju.dayMaster?.heavenlyStem || '甲';
    const dayBranch = saju?.pillars?.day?.earthlyBranch?.name || '子';
    const dayElement = (saju.dayMaster?.element as FiveElement) || '토';

    const yongsin: FiveElement[] = saju?.advancedAnalysis?.yongsin?.primary
      ? [saju.advancedAnalysis.yongsin.primary]
      : [];
    const kisin: FiveElement[] = saju?.advancedAnalysis?.yongsin?.avoid
      ? [saju.advancedAnalysis.yongsin.avoid]
      : [];

    // 현재 대운 추출
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const birthYear = birthDate ? extractBirthYear(birthDate) : undefined;
    const currentAge = birthYear ? currentYear - birthYear : undefined;

    let currentDaeun: { stem: string; branch: string } | undefined;

    if (saju?.unse?.daeun && currentAge) {
      const daeunList = saju.unse.daeun as Array<{
        startAge?: number;
        stem?: string;
        heavenlyStem?: string;
        branch?: string;
        earthlyBranch?: string;
      }>;

      for (const d of daeunList) {
        const startAge = d.startAge ?? 0;
        if (currentAge >= startAge && currentAge < startAge + 10) {
          currentDaeun = {
            stem: d.stem || d.heavenlyStem || '甲',
            branch: d.branch || d.earthlyBranch || '子',
          };
          break;
        }
      }
    }

    // 고급 월별 점수 계산 (향후 6개월)
    const advancedScores: LayeredTimingScore[] = [];
    for (let i = 0; i < 6; i++) {
      let targetMonth = currentMonth + i;
      let targetYear = currentYear;
      if (targetMonth > 12) {
        targetMonth -= 12;
        targetYear++;
      }

      const score = calculateAdvancedMonthlyScore({
        year: targetYear,
        month: targetMonth,
        dayStem,
        dayBranch,
        daeun: currentDaeun,
        yongsin,
        kisin,
      });
      advancedScores.push(score);
    }

    // 기본 연간 예측도 병행 (호환성 유지)
    const yearlyPrediction = generateYearlyPrediction({
      year: currentYear,
      dayStem,
      dayElement,
      yongsin,
      kisin,
      currentDaeunElement: currentDaeun
        ? (STEMS_MAP[currentDaeun.stem] || '토')
        : undefined,
      birthYear,
    });

    // 프롬프트 컨텍스트 생성
    const advancedTimingContext = generateAdvancedTimingPromptContext(
      advancedScores,
      lang as 'ko' | 'en'
    );
    const yearlyContext = generatePredictionPromptContext(yearlyPrediction, lang as 'ko' | 'en');

    return `${advancedTimingContext}\n\n${yearlyContext}`;
  } catch (e) {
    logger.error('[advancedTimingBuilder] Error:', e);
    return '';
  }
}
