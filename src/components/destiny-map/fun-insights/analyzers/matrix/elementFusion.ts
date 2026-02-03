/**
 * Layer 1: Element Fusion Analysis
 * 오행-원소 융합 분석
 */

import { getInteractionColor } from '@/lib/destiny-matrix/engine';
import { ELEMENT_CORE_GRID, SIGN_TO_ELEMENT } from '@/lib/destiny-matrix/data/layer1-element-core';
import type { WesternElement } from '@/lib/destiny-matrix/types';
import type { FiveElement } from '@/lib/Saju/types';
import { findPlanetSign } from '../../utils/helpers';
import type { SajuData, AstroData } from '../../types';
import type { ElementFusionResult } from './types';

// 오행 한글명
const elementNameKo: Record<string, string> = {
  '목': '나무',
  '화': '불',
  '토': '흙',
  '금': '쇠',
  '수': '물',
};

// 서양 원소 한글명
const westElementNameKo: Record<string, string> = {
  'fire': '불',
  'earth': '흙',
  'air': '바람',
  'water': '물',
};

// 오행(한글) → 서양 원소 매핑
function _mapSajuElementToWestern(element: string): 'fire' | 'earth' | 'air' | 'water' {
  const mapping: Record<string, 'fire' | 'earth' | 'air' | 'water'> = {
    '목': 'air',    // 목 → 바람 (성장, 확장)
    '화': 'fire',   // 화 → 불
    '토': 'earth',  // 토 → 흙
    '금': 'air',    // 금 → 바람 (날카로움, 결단)
    '수': 'water',  // 수 → 물
    'wood': 'air',
    'fire': 'fire',
    'earth': 'earth',
    'metal': 'air',
    'water': 'water',
  };
  return mapping[element] || 'earth';
}

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

// 융합 설명 생성 (한국어)
function getFusionDescriptionKo(sajuEl: string, westEl: string, planet: string, level: string): string {
  const sajuName = elementNameKo[sajuEl] || sajuEl;
  const westName = westElementNameKo[westEl] || westEl;

  const levelMessages: Record<string, string> = {
    extreme: `당신의 ${sajuName} 기운과 ${planet}의 ${westName} 에너지가 완벽하게 공명해요!`,
    amplify: `${sajuName} 기운이 ${planet}의 ${westName} 에너지와 만나 더욱 강해져요.`,
    balance: `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 조화롭게 균형을 이뤄요.`,
    clash: `${sajuName} 기운과 ${planet}의 ${westName} 에너지 사이에 약간의 긴장감이 있어요.`,
    conflict: `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 서로 다른 방향을 향해요.`,
  };

  return levelMessages[level] || `${sajuName} 기운과 ${planet}의 ${westName} 에너지가 만났어요.`;
}

// 융합 설명 생성 (영어)
function getFusionDescriptionEn(sajuEl: string, westEl: string, planet: string, level: string): string {
  const levelMessages: Record<string, string> = {
    extreme: `Your ${sajuEl} energy and ${planet}'s ${westEl} element resonate perfectly!`,
    amplify: `Your ${sajuEl} energy is amplified by ${planet}'s ${westEl} element.`,
    balance: `Your ${sajuEl} energy harmonizes with ${planet}'s ${westEl} element.`,
    clash: `There's some tension between your ${sajuEl} energy and ${planet}'s ${westEl} element.`,
    conflict: `Your ${sajuEl} energy and ${planet}'s ${westEl} element pull in different directions.`,
  };

  return levelMessages[level] || `Your ${sajuEl} energy meets ${planet}'s ${westEl} element.`;
}

/**
 * Analyzes the fusion between Saju Five Elements and Western Four Elements
 *
 * This function combines the Five Elements system from Saju (사주) with the Four Elements
 * from Western astrology to identify synergies and conflicts in a person's energy patterns.
 *
 * @param saju - Saju birth data containing Five Elements information
 * @param astro - Western astrology data containing planetary positions and zodiac signs
 * @returns Array of element fusion results with interaction details, scores, and descriptions
 *
 * @example
 * ```typescript
 * const fusions = analyzeElementFusion(sajuData, astroData);
 * // Returns: [{ sajuElement: '목', westElement: 'air', planet: 'Jupiter', fusion: {...} }]
 * ```
 */
export function analyzeElementFusion(
  saju: SajuData | undefined,
  astro: AstroData | undefined
): ElementFusionResult[] {
  const elementFusions: ElementFusionResult[] = [];

  if (!saju && !astro) {return elementFusions;}

  const dayElement = saju?.dayMaster?.element || 'wood';
  const sajuEl = mapSajuElementToKo(dayElement);
  const sunSign = findPlanetSign(astro, 'sun');
  const moonSign = findPlanetSign(astro, 'moon');

  // 일간 vs 태양 별자리 원소
  if (sunSign) {
    const westEl = getWestElementFromSign(sunSign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[westEl];
    if (interaction) {
      elementFusions.push({
        sajuElement: sajuEl,
        westElement: westEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: getFusionDescriptionKo(sajuEl, westEl, '태양', interaction.level),
            en: getFusionDescriptionEn(sajuEl, westEl, 'Sun', interaction.level),
          },
        },
      });
    }
  }

  // 일간 vs 달 별자리 원소
  if (moonSign) {
    const westEl = getWestElementFromSign(moonSign);
    const interaction = ELEMENT_CORE_GRID[sajuEl]?.[westEl];
    if (interaction) {
      elementFusions.push({
        sajuElement: sajuEl,
        westElement: westEl,
        fusion: {
          level: interaction.level,
          score: interaction.score,
          icon: interaction.icon,
          color: getInteractionColor(interaction.level),
          keyword: { ko: interaction.keyword, en: interaction.keywordEn },
          description: {
            ko: getFusionDescriptionKo(sajuEl, westEl, '달', interaction.level),
            en: getFusionDescriptionEn(sajuEl, westEl, 'Moon', interaction.level),
          },
        },
      });
    }
  }

  return elementFusions;
}

/**
 * Retrieves a formatted description for a specific element fusion combination
 *
 * This function looks up the interaction data between a Saju Five Element and
 * a Western Four Element, returning a formatted string with the keyword, level,
 * and score information.
 *
 * @param sajuElement - The Five Element from Saju (木/火/土/金/水)
 * @param westElement - The Western element (fire/earth/air/water)
 * @param lang - Language code ('ko' for Korean, 'en' for English)
 * @returns Formatted description string, or null if no interaction data found
 *
 * @example
 * ```typescript
 * const desc = getElementFusionDescription('목', 'air', 'ko');
 * // Returns: "목(사주) × air(서양) = 조화로운 흐름 (극강 시너지, 점수: 10/10)"
 * ```
 */
export function getElementFusionDescription(
  sajuElement: FiveElement,
  westElement: WesternElement,
  lang: string
): string | null {
  const isKo = lang === 'ko';
  const interaction = ELEMENT_CORE_GRID[sajuElement]?.[westElement];
  if (!interaction) {return null;}

  function getLevelDescription(level: string, isKo: boolean): string {
    const descriptions: Record<string, { ko: string; en: string }> = {
      extreme: { ko: '극강 시너지', en: 'Extreme Synergy' },
      amplify: { ko: '증폭 효과', en: 'Amplified Effect' },
      balance: { ko: '균형 상태', en: 'Balanced State' },
      clash: { ko: '긴장 관계', en: 'Tension' },
      conflict: { ko: '상충 에너지', en: 'Conflicting Energy' },
    };
    return isKo ? descriptions[level]?.ko || level : descriptions[level]?.en || level;
  }

  const levelDesc = getLevelDescription(interaction.level, isKo);
  return isKo
    ? `${sajuElement}(사주) × ${westElement}(서양) = ${interaction.keyword} (${levelDesc}, 점수: ${interaction.score}/10)`
    : `${sajuElement}(Saju) × ${westElement}(Western) = ${interaction.keywordEn} (${levelDesc}, Score: ${interaction.score}/10)`;
}
