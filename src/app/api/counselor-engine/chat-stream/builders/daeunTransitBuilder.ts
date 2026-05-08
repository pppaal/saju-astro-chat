/**
 * Daeun Transit Builder
 *
 * 대운-트랜짓 동기화 분석 섹션 구성
 * TIER 2: 대운과 트랜짓의 동기화 분석
 */

import {
  convertSajuDaeunToInfo,
  analyzeDaeunTransitSync,
  type DaeunInfo,
} from '@/lib/prediction/daeunTransitSync';
import { extractBirthYear } from '@/lib/prediction/utils';
import { logger } from '@/lib/logger';
import type { SajuDataStructure } from '../lib/types';

/**
 * 대운-트랜짓 동기화 분석 섹션 구성
 *
 * @param saju - Saju 데이터
 * @param birthDate - 생년월일
 * @param lang - 언어
 * @returns 대운-트랜짓 동기화 프롬프트 섹션
 */
export function buildDaeunTransitSection(
  saju: SajuDataStructure | undefined,
  birthDate: string,
  lang: string
): string {
  if (!saju?.unse?.daeun) {
    return '';
  }

  try {
    const currentYear = new Date().getFullYear();
    const birthYear = birthDate ? extractBirthYear(birthDate) : currentYear - 30;
    const currentAge = currentYear - birthYear;

    const daeunList: DaeunInfo[] = convertSajuDaeunToInfo(saju.unse.daeun);

    if (daeunList.length === 0) {
      return '';
    }

    const syncAnalysis = analyzeDaeunTransitSync(
      daeunList,
      birthYear,
      currentAge
    );

    const daeunParts: string[] = [
      '',
      '═══════════════════════════════════════════════════════════════',
      lang === 'ko'
        ? '[🌟 대운-트랜짓 동기화 분석 - 동양+서양 통합]'
        : '[🌟 DAEUN-TRANSIT SYNC - East+West Integration]',
      '═══════════════════════════════════════════════════════════════',
      '',
    ];

    // 인생 패턴
    daeunParts.push(
      lang === 'ko'
        ? `📈 인생 패턴: ${syncAnalysis.lifeCyclePattern}`
        : `📈 Life Pattern: ${syncAnalysis.lifeCyclePattern}`
    );
    daeunParts.push(
      lang === 'ko'
        ? `📊 분석 신뢰도: ${syncAnalysis.overallConfidence}%`
        : `📊 Confidence: ${syncAnalysis.overallConfidence}%`
    );

    // 주요 전환점 (최대 3개)
    if (syncAnalysis.majorTransitions.length > 0) {
      daeunParts.push('');
      daeunParts.push(
        lang === 'ko' ? '--- 주요 전환점 ---' : '--- Major Transitions ---'
      );

      for (const point of syncAnalysis.majorTransitions.slice(0, 3)) {
        const marker = point.age === currentAge ? '★현재★ ' : '';
        daeunParts.push(
          lang === 'ko'
            ? `${marker}${point.age}세 (${point.year}년): ${point.synergyType} | 점수 ${point.synergyScore}`
            : `${marker}Age ${point.age} (${point.year}): ${point.synergyType} | Score ${point.synergyScore}`
        );

        if (point.themes.length > 0) {
          daeunParts.push(`  → ${point.themes.slice(0, 2).join(', ')}`);
        }
      }
    }

    // 피크/도전 연도
    if (syncAnalysis.peakYears.length > 0) {
      daeunParts.push('');
      daeunParts.push(
        lang === 'ko'
          ? `🌟 최고 시기: ${syncAnalysis.peakYears
              .slice(0, 3)
              .map((p) => `${p.age}세(${p.year}년)`)
              .join(', ')}`
          : `🌟 Peak Years: ${syncAnalysis.peakYears
              .slice(0, 3)
              .map((p) => `Age ${p.age}(${p.year})`)
              .join(', ')}`
      );
    }

    if (syncAnalysis.challengeYears.length > 0) {
      daeunParts.push(
        lang === 'ko'
          ? `⚡ 도전 시기: ${syncAnalysis.challengeYears
              .slice(0, 3)
              .map((p) => `${p.age}세(${p.year}년)`)
              .join(', ')}`
          : `⚡ Challenge Years: ${syncAnalysis.challengeYears
              .slice(0, 3)
              .map((p) => `Age ${p.age}(${p.year})`)
              .join(', ')}`
      );
    }

    daeunParts.push('');

    logger.warn(
      `[daeunTransitBuilder] Sync: ${syncAnalysis.majorTransitions.length} transitions, confidence ${syncAnalysis.overallConfidence}%`
    );

    return daeunParts.join('\n');
  } catch (e) {
    logger.warn('[daeunTransitBuilder] Error:', e);
    return '';
  }
}
