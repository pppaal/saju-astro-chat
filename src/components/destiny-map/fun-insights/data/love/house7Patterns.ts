/**
 * 7하우스 별자리별 파트너 패턴
 * 7하우스는 공식적 파트너십(결혼, 사업 파트너)을 나타내는 하우스
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export const HOUSE7_PATTERNS: Record<ZodiacSign, BilingualText> = {
  aries: {
    ko: "독립적이고 열정적인 파트너를 원해요. 서로 자극이 되는 관계.",
    en: "Want independent, passionate partner. Mutually stimulating relationship."
  },
  taurus: {
    ko: "안정적이고 감각적인 파트너를 원해요. 물질적 안정이 중요해요.",
    en: "Want stable, sensual partner. Material stability matters."
  },
  gemini: {
    ko: "대화가 통하는 파트너를 원해요. 지적 교감이 중요해요.",
    en: "Want partner who communicates well. Intellectual connection matters."
  },
  cancer: {
    ko: "가정적이고 보호적인 파트너를 원해요. 정서적 안정 추구.",
    en: "Want domestic, protective partner. Seek emotional stability."
  },
  leo: {
    ko: "당당하고 관대한 파트너를 원해요. 함께 빛나고 싶어요.",
    en: "Want confident, generous partner. Want to shine together."
  },
  virgo: {
    ko: "실용적이고 헌신적인 파트너를 원해요. 디테일을 챙겨주는 사람.",
    en: "Want practical, devoted partner. Someone who cares for details."
  },
  libra: {
    ko: "우아하고 조화로운 파트너를 원해요. 동등한 파트너십 추구.",
    en: "Want elegant, harmonious partner. Seek equal partnership."
  },
  scorpio: {
    ko: "깊이 있고 열정적인 파트너를 원해요. 영혼까지 연결되고 싶어요.",
    en: "Want deep, passionate partner. Want soul-level connection."
  },
  sagittarius: {
    ko: "자유롭고 모험적인 파트너를 원해요. 함께 성장하고 싶어요.",
    en: "Want free, adventurous partner. Want to grow together."
  },
  capricorn: {
    ko: "야망 있고 책임감 있는 파트너를 원해요. 장기적 비전 공유.",
    en: "Want ambitious, responsible partner. Share long-term vision."
  },
  aquarius: {
    ko: "독특하고 진보적인 파트너를 원해요. 친구 같은 연인.",
    en: "Want unique, progressive partner. Lover like a friend."
  },
  pisces: {
    ko: "감성적이고 영적인 파트너를 원해요. 무조건적 사랑 추구.",
    en: "Want emotional, spiritual partner. Seek unconditional love."
  },
};
