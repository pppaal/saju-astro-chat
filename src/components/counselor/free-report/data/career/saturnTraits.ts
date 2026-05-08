/**
 * 토성 관련 커리어 특성
 * 토성은 책임, 구조, 제한, 성숙을 나타내는 행성
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

/**
 * 토성 별자리별 커리어 과제
 */
export const SATURN_CAREER_PATH: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "리더십과 독립심을 통해 성장해요. 인내심을 기르면 성공해요.",
    en: "Grow through leadership and independence. Patience brings success."
  },
  taurus: {
    ko: "재정적 안정과 가치 창출이 과제예요. 꾸준함이 보상 받아요.",
    en: "Financial stability and value creation are your challenges. Consistency is rewarded."
  },
  gemini: {
    ko: "깊이 있는 지식을 쌓는 게 과제예요. 집중력을 기르세요.",
    en: "Building deep knowledge is your challenge. Develop focus."
  },
  cancer: {
    ko: "정서적 안정과 보안을 확보하는 게 과제예요.",
    en: "Securing emotional stability and security is your challenge."
  },
  leo: {
    ko: "진정한 자신감과 권위를 구축하는 게 과제예요.",
    en: "Building genuine confidence and authority is your challenge."
  },
  virgo: {
    ko: "완벽주의를 내려놓고 실용성을 추구하세요.",
    en: "Let go of perfectionism and pursue practicality."
  },
  libra: {
    ko: "관계와 파트너십에서 균형을 찾는 게 과제예요.",
    en: "Finding balance in relationships and partnerships is your challenge."
  },
  scorpio: {
    ko: "권력과 통제에 대한 두려움을 극복하세요.",
    en: "Overcome fear of power and control."
  },
  sagittarius: {
    ko: "신념을 현실화하고 책임을 지는 게 과제예요.",
    en: "Making beliefs real and taking responsibility is your challenge."
  },
  capricorn: {
    ko: "야망과 사회적 성취가 자연스러워요. 구조를 만들어요.",
    en: "Ambition and social achievement come naturally. Build structures."
  },
  aquarius: {
    ko: "개혁과 집단에서의 역할이 과제예요.",
    en: "Reform and your role in groups is your challenge."
  },
  pisces: {
    ko: "영성과 현실의 균형을 찾는 게 과제예요.",
    en: "Finding balance between spirituality and reality is your challenge."
  },
};

/**
 * 대운 오행별 커리어 단계
 */
export type FiveElementKey = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const DAEUN_CAREER_PHASE: Record<FiveElementKey, BilingualText> = {
  wood: {
    ko: "성장과 확장의 시기예요. 새로운 시작이 유리해요.",
    en: "Time for growth and expansion. New beginnings are favorable."
  },
  fire: {
    ko: "빛나고 인정받는 시기예요. 열정을 발휘하세요.",
    en: "Time to shine and be recognized. Show your passion."
  },
  earth: {
    ko: "안정과 기반을 다지는 시기예요. 꾸준히 쌓으세요.",
    en: "Time for stability and foundation. Build steadily."
  },
  metal: {
    ko: "성과를 거두고 정리하는 시기예요. 결단력이 필요해요.",
    en: "Time to harvest and organize. Decisiveness needed."
  },
  water: {
    ko: "지혜를 쌓고 준비하는 시기예요. 다음을 위해 배우세요.",
    en: "Time to gather wisdom and prepare. Learn for what's next."
  },
};
