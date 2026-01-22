// Localization Utilities
// Korean/English text generation for matrix analysis

import { elementNameKo, westElementNameKo } from './elementMapping';

/**
 * Gets localized description for fusion level
 */
export function getLevelDescription(level: string, isKo: boolean): string {
  const descriptions: Record<string, { ko: string; en: string }> = {
    extreme: { ko: '극강 시너지', en: 'Extreme Synergy' },
    amplify: { ko: '증폭 효과', en: 'Amplified Effect' },
    balance: { ko: '균형 상태', en: 'Balanced State' },
    clash: { ko: '긴장 관계', en: 'Tension' },
    conflict: { ko: '상충 에너지', en: 'Conflicting Energy' },
  };
  return isKo ? descriptions[level]?.ko || level : descriptions[level]?.en || level;
}

/**
 * Generates fusion description in Korean
 */
export function getFusionDescriptionKo(
  sajuEl: string,
  westEl: string,
  planet: string,
  level: string
): string {
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

/**
 * Generates fusion description in English
 */
export function getFusionDescriptionEn(
  sajuEl: string,
  westEl: string,
  planet: string,
  level: string
): string {
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
 * Gets life area description for house number
 */
export function getHouseLifeArea(house: number, isKo: boolean): string {
  const areas: Record<number, { ko: string; en: string }> = {
    1: { ko: '자아/외모', en: 'Self/Appearance' },
    2: { ko: '재물/가치', en: 'Money/Values' },
    3: { ko: '소통/학습', en: 'Communication/Learning' },
    4: { ko: '가정/뿌리', en: 'Home/Roots' },
    5: { ko: '창조/연애', en: 'Creativity/Romance' },
    6: { ko: '건강/일상', en: 'Health/Daily Work' },
    7: { ko: '관계/파트너', en: 'Relationships/Partner' },
    8: { ko: '변혁/깊이', en: 'Transformation/Depth' },
    9: { ko: '확장/철학', en: 'Expansion/Philosophy' },
    10: { ko: '커리어/명예', en: 'Career/Status' },
    11: { ko: '희망/네트워크', en: 'Hopes/Network' },
    12: { ko: '영성/무의식', en: 'Spirituality/Unconscious' },
  };
  return isKo ? areas[house]?.ko || '' : areas[house]?.en || '';
}
