/**
 * 연애 관련 행성 애스펙트 패턴
 */

import type { BilingualText, AspectType } from '../../types/core';

/**
 * 금성-화성 애스펙트 영향
 * 금성(사랑)과 화성(열정)의 상호작용
 */
export const VENUS_MARS_ASPECTS: Record<AspectType, BilingualText> = {
  conjunction: {
    ko: "사랑과 열정이 강하게 결합되어 있어요. 매력이 넘쳐요.",
    en: "Love and passion strongly combined. Overflowing charm."
  },
  opposition: {
    ko: "밀당의 긴장감이 연애에 자극을 줘요. 드라마틱한 관계.",
    en: "Push-pull tension stimulates love. Dramatic relationships."
  },
  square: {
    ko: "연애에서 도전과 성장이 함께해요. 격정적인 끌림.",
    en: "Challenges and growth in love. Intense attraction."
  },
  trine: {
    ko: "연애가 자연스럽고 조화로워요. 쉽게 끌리고 끌려요.",
    en: "Love flows naturally and harmoniously. Easy attraction."
  },
  sextile: {
    ko: "연애에서 기회를 잘 잡아요. 좋은 인연이 잘 찾아와요.",
    en: "Seize opportunities in love well. Good connections find you."
  },
  quincunx: {
    ko: "연애에서 조정과 적응이 필요해요. 성장의 기회.",
    en: "Adjustment needed in love. Opportunity for growth."
  },
  semisextile: {
    ko: "연애에서 미묘한 기회들이 있어요. 작은 신호에 주목하세요.",
    en: "Subtle opportunities in love. Pay attention to small signs."
  },
  semisquare: {
    ko: "연애에서 작은 마찰이 있지만 극복 가능해요.",
    en: "Small friction in love but overcomable."
  },
  sesquiquadrate: {
    ko: "연애에서 긴장감이 있지만 성숙해질 수 있어요.",
    en: "Tension in love but can lead to maturity."
  },
};

/**
 * 달-금성 애스펙트
 * 달(감정)과 금성(사랑)의 상호작용
 */
export const MOON_VENUS_ASPECTS: Record<AspectType, BilingualText> = {
  conjunction: {
    ko: "감정과 사랑이 하나예요. 따뜻하고 애정 어린 사람이에요.",
    en: "Emotion and love are one. You're warm and affectionate."
  },
  opposition: {
    ko: "감정과 욕구 사이에 긴장이 있어요. 때로는 밀당이 돼요.",
    en: "Tension between emotion and desire. Sometimes leads to push-pull."
  },
  square: {
    ko: "사랑에서 내면 갈등이 있을 수 있어요. 하지만 성장해요.",
    en: "May have inner conflict in love. But you grow through it."
  },
  trine: {
    ko: "감정과 사랑이 자연스럽게 흘러요. 연애 운이 좋아요.",
    en: "Emotion and love flow naturally. You have good love fortune."
  },
  sextile: {
    ko: "감정 표현과 사랑이 조화로워요. 친화력이 좋아요.",
    en: "Emotional expression and love harmonize. You have good rapport."
  },
  quincunx: {
    ko: "감정과 사랑 사이의 균형을 찾아가고 있어요.",
    en: "Finding balance between emotions and love."
  },
  semisextile: {
    ko: "감정과 사랑이 미묘하게 연결되어 있어요.",
    en: "Emotions and love subtly connected."
  },
  semisquare: {
    ko: "감정 표현에서 약간의 어려움이 있지만 배워가요.",
    en: "Some difficulty in emotional expression but learning."
  },
  sesquiquadrate: {
    ko: "감정과 사랑의 조화를 위해 노력이 필요해요.",
    en: "Effort needed to harmonize emotions and love."
  },
};

/**
 * 조화로운 애스펙트 여부 확인
 */
export const HARMONIOUS_ASPECTS: AspectType[] = ['conjunction', 'trine', 'sextile'];

/**
 * 긴장/도전적 애스펙트
 */
export const CHALLENGING_ASPECTS: AspectType[] = ['opposition', 'square', 'quincunx'];
