/**
 * 십신별 연애 에너지 및 특성
 * 사주의 십신(十神)은 개인의 관계 패턴을 나타냄
 */

import type { BilingualText, SibsinCategory } from '../../types/core';

/**
 * 십신별 연애 에너지 (대분류 기준)
 */
export const SIBSIN_LOVE_TRAITS: Record<SibsinCategory, BilingualText> = {
  비겁: {
    ko: "연애에서도 주도권을 잡으려 해요. 독립적인 연애를 해요.",
    en: "Try to take initiative in love. Independent in relationships."
  },
  식상: {
    ko: "연애에서 표현이 풍부해요. 로맨틱하고 창의적으로 사랑해요.",
    en: "Rich expression in love. Love romantically and creatively."
  },
  재성: {
    ko: "연애에서 현실적이에요. 안정적인 관계를 원해요.",
    en: "Realistic in love. Want stable relationships."
  },
  관성: {
    ko: "연애에서 책임감을 중시해요. 진지하게 관계를 맺어요.",
    en: "Value responsibility in love. Form serious relationships."
  },
  인성: {
    ko: "연애에서 보호본능이 강해요. 깊이 있는 사랑을 해요.",
    en: "Strong protective instincts in love. Love deeply."
  },
};

/**
 * 십신별 결혼운 특성 (대분류 기준)
 */
export const SIBSIN_MARRIAGE_TRAITS: Record<SibsinCategory, BilingualText> = {
  비겁: {
    ko: "배우자와 동등한 관계를 원해요. 서로 존중하는 결혼 생활.",
    en: "Want equal relationship with spouse. Marriage based on mutual respect."
  },
  식상: {
    ko: "자유롭고 창의적인 가정을 꿈꿔요. 표현이 풍부한 배우자를 원해요.",
    en: "Dream of free and creative home. Want expressive spouse."
  },
  재성: {
    ko: "경제적으로 안정된 결혼 생활을 중시해요. 실용적인 파트너십.",
    en: "Value financially stable marriage. Practical partnership."
  },
  관성: {
    ko: "질서 있고 책임감 있는 가정을 원해요. 전통적 결혼관.",
    en: "Want orderly, responsible home. Traditional marriage values."
  },
  인성: {
    ko: "정서적으로 안정된 결혼을 원해요. 서로 돌봐주는 관계.",
    en: "Want emotionally stable marriage. Caring relationship."
  },
};

/**
 * Juno(주노) 소행성 별자리별 결혼 이상형
 * 주노는 결혼과 헌신적 파트너십을 나타내는 소행성
 */
import type { ZodiacSign } from '../../types/core';

export const JUNO_PARTNER_TRAITS: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "독립적이고 열정적인 파트너가 이상형. 서로 자극을 주는 관계.",
    en: "Ideal partner: independent, passionate. Mutually stimulating."
  },
  taurus: {
    ko: "안정적이고 충실한 파트너가 이상형. 물질적 안정을 함께 추구.",
    en: "Ideal partner: stable, loyal. Seek material security together."
  },
  gemini: {
    ko: "지적이고 대화가 통하는 파트너가 이상형. 평생 배우자 = 친구.",
    en: "Ideal partner: intellectual, communicative. Spouse = best friend."
  },
  cancer: {
    ko: "가정적이고 따뜻한 파트너가 이상형. 정서적 안정이 최우선.",
    en: "Ideal partner: domestic, warm. Emotional stability first."
  },
  leo: {
    ko: "당당하고 관대한 파트너가 이상형. 함께 빛나고 싶어요.",
    en: "Ideal partner: confident, generous. Want to shine together."
  },
  virgo: {
    ko: "성실하고 헌신적인 파트너가 이상형. 실용적 사랑을 원해요.",
    en: "Ideal partner: diligent, devoted. Want practical love."
  },
  libra: {
    ko: "우아하고 조화로운 파트너가 이상형. 동등한 파트너십 추구.",
    en: "Ideal partner: elegant, harmonious. Seek equal partnership."
  },
  scorpio: {
    ko: "깊고 강렬한 유대를 나눌 파트너가 이상형. 영혼까지 연결.",
    en: "Ideal partner: deep, intense bond. Soul-level connection."
  },
  sagittarius: {
    ko: "자유롭고 모험적인 파트너가 이상형. 함께 성장하는 관계.",
    en: "Ideal partner: free, adventurous. Grow together."
  },
  capricorn: {
    ko: "야망 있고 책임감 있는 파트너가 이상형. 장기 비전 공유.",
    en: "Ideal partner: ambitious, responsible. Share long-term vision."
  },
  aquarius: {
    ko: "독창적이고 진보적인 파트너가 이상형. 친구 같은 관계.",
    en: "Ideal partner: original, progressive. Friend-like relationship."
  },
  pisces: {
    ko: "감성적이고 영적인 파트너가 이상형. 무조건적 사랑 추구.",
    en: "Ideal partner: emotional, spiritual. Seek unconditional love."
  },
};
