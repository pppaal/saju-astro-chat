/**
 * Timing Matrix Analysis
 * Specialized timing analysis combining Saju and Astrology data
 */

import { logger } from '@/lib/logger';
import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import type { WesternElement } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import { findPlanetSign } from '../../utils/helpers';
import type { SajuData, AstroData } from '../../types';
import type { TimingMatrixResult, ExtendedSajuData } from '../types/specialized.types';

// Helper functions
function mapSajuElementToKo(el: string): FiveElement {
  const map: Record<string, FiveElement> = {
    wood: '목',
    fire: '화',
    earth: '토',
    metal: '금',
    water: '수',
  };
  return map[el] || '토';
}

function getWestElementFromSign(sign: string): WesternElement {
  const normalized = sign?.charAt(0).toUpperCase() + sign?.slice(1).toLowerCase();
  return SIGN_TO_ELEMENT[normalized] || 'earth';
}

/**
 * Analyze timing patterns using destiny matrix
 * Combines Saju timing patterns with astrological timing indicators
 */
export function getTimingMatrixAnalysis(
  saju: SajuData | ExtendedSajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): TimingMatrixResult | null {
  const isKo = lang === 'ko';
  if (!saju && !astro) {return null;}

  const extSaju = saju as ExtendedSajuData | undefined;
  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  // 1. 대운 타임라인
  const daeunTimeline: TimingMatrixResult['daeunTimeline'] = [];
  const daeunList = extSaju?.daeun || [];
  for (const daeun of daeunList.slice(0, 5)) {
    if (daeun.element && daeun.startAge !== undefined) {
      const daeunEl = mapSajuElementToKo(daeun.element);
      const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
      if (interaction) {
        daeunTimeline.push({
          startAge: daeun.startAge,
          endAge: daeun.startAge + 10,
          isCurrent: daeun.current || daeun.isCurrent || false,
          element: daeunEl,
          score: interaction.score,
          description: {
            ko: `${daeunEl} 대운 - ${interaction.keyword}`,
            en: `${daeunEl} Daeun - ${interaction.keywordEn}`,
          },
          icon: interaction.icon,
        });
      }
    }
  }

  // 2. 주요 트랜짓
  const majorTransits: TimingMatrixResult['majorTransits'] = [];
  const birthYear = extSaju?.birthYear || 1990;
  const age = currentYear - birthYear;

  if (age >= 28 && age <= 30) {
    majorTransits.push({
      transit: 'Saturn Return',
      planet: 'Saturn',
      timing: `${age}세`,
      score: 85,
      description: {
        ko: '토성회귀 - 중요한 전환기',
        en: 'Saturn Return - Major transition',
      },
      icon: '🪐',
    });
  }

  // 3. 역행 분석
  const retrogrades: TimingMatrixResult['retrogrades'] = [];
  const mercurySign = findPlanetSign(astro, 'mercury');
  if (mercurySign) {
    const mercuryEl = getWestElementFromSign(mercurySign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[mercuryEl];
    if (interaction) {
      retrogrades.push({
        planet: 'Mercury',
        element: mercuryEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: { ko: interaction.keyword, en: interaction.keywordEn },
        },
        effect: {
          ko: '수성역행 시 소통과 기술에 주의',
          en: 'Be careful with communication and technology during Mercury retrograde',
        },
        advice: {
          ko: '중요한 계약이나 결정은 미루세요',
          en: 'Postpone important contracts or decisions',
        },
      });
    }
  }

  // 4. 시기별 행운
  const yearEl = mapSajuElementToKo('wood');
  const yearInteraction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(yearEl)];
  const yearScore = yearInteraction?.score || 50;

  const periodLuck = {
    year: {
      element: yearEl,
      score: yearScore,
      description: {
        ko: `${currentYear}년 - ${yearInteraction?.keyword || '균형'}`,
        en: `Year ${currentYear} - ${yearInteraction?.keywordEn || 'Balance'}`,
      },
    },
    month: {
      element: mapSajuElementToKo('fire'),
      score: 60,
      description: {
        ko: `${currentMonth}월 운세`,
        en: `Month ${currentMonth} fortune`,
      },
    },
    day: {
      element: mapSajuElementToKo('earth'),
      score: 55,
      description: {
        ko: `${currentDay}일 운세`,
        en: `Day ${currentDay} fortune`,
      },
    },
  };

  // 5. 행운의 시기
  const luckyPeriods: TimingMatrixResult['luckyPeriods'] = [];
  const currentDaeun = daeunList.find(d => d.current || d.isCurrent);
  if (currentDaeun?.element) {
    const daeunEl = mapSajuElementToKo(currentDaeun.element);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(daeunEl)];
    if (interaction && interaction.score >= 60) {
      luckyPeriods.push({
        icon: '⭐',
        period: `${currentDaeun.startAge}세~`,
        strength: interaction.score >= 70 ? 'strong' : 'moderate',
        score: interaction.score,
        description: {
          ko: `${daeunEl} 대운 - 좋은 시기`,
          en: `${daeunEl} Daeun - Good period`,
        },
        goodFor: isKo ? ['새로운 시작', '중요한 결정'] : ['New beginnings', 'Important decisions'],
      });
    }
  }

  // 종합 점수
  const daeunScore = currentDaeun && currentDaeun.element ? ELEMENT_CORE_GRID[sajuEl]?.[getWestElementFromSign(mapSajuElementToKo(currentDaeun.element))]?.score || 50 : 50;
  const overallScore = Math.round((yearScore + daeunScore) / 2);
  const overallMessage = {
    ko: overallScore >= 70
      ? '현재 전반적으로 좋은 타이밍입니다!'
      : overallScore >= 50
      ? '안정적인 시기입니다.'
      : '신중하게 움직이세요.',
    en: overallScore >= 70
      ? 'Overall good timing now!'
      : overallScore >= 50
      ? 'A stable period.'
      : 'Move carefully.',
  };

  return {
    overallScore,
    overallMessage,
    daeunTimeline,
    majorTransits,
    retrogrades,
    periodLuck,
    luckyPeriods,
  };
}
