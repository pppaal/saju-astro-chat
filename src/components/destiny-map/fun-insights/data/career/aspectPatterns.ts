/**
 * 커리어 관련 행성 애스펙트 패턴
 */

import type { BilingualText, AspectType } from '../../types/core';

/**
 * 토성-MC 애스펙트별 커리어 성숙도
 */
export const SATURN_MC_ASPECTS: Record<AspectType, BilingualText> = {
  conjunction: {
    ko: "커리어에서 큰 책임을 맡아요. 천천히 정상에 올라요.",
    en: "Take great responsibility in career. Slowly climb to the top."
  },
  opposition: {
    ko: "커리어와 개인 사이 균형이 과제예요. 양쪽 다 챙기세요.",
    en: "Balancing career and personal life is a challenge. Care for both."
  },
  square: {
    ko: "커리어에서 도전이 있지만 성장해요. 인내가 보상받아요.",
    en: "Challenges in career but growth. Patience is rewarded."
  },
  trine: {
    ko: "커리어에서 안정적으로 성장해요. 구조를 잘 만들어요.",
    en: "Stable growth in career. Good at building structures."
  },
  sextile: {
    ko: "커리어 기회를 잘 잡아요. 노력이 결실을 맺어요.",
    en: "Seize career opportunities well. Efforts bear fruit."
  },
  quincunx: {
    ko: "커리어에서 조정이 필요해요. 유연하게 대처하세요.",
    en: "Adjustments needed in career. Be flexible."
  },
  semisextile: {
    ko: "커리어에서 작은 기회들을 놓치지 마세요.",
    en: "Don't miss small career opportunities."
  },
  semisquare: {
    ko: "커리어에서 작은 마찰이 있지만 극복 가능해요.",
    en: "Small career friction but overcomable."
  },
  sesquiquadrate: {
    ko: "커리어에서 긴장감이 있지만 성숙해질 수 있어요.",
    en: "Career tension but can lead to maturity."
  },
};

/**
 * 태양-토성 애스펙트별 권위와의 관계
 */
export const SUN_SATURN_ASPECTS: Record<AspectType, BilingualText> = {
  conjunction: {
    ko: "진지하고 책임감 있어요. 늦게 피지만 오래 가요.",
    en: "Serious and responsible. Bloom late but last long."
  },
  opposition: {
    ko: "권위에 도전하는 타입이에요. 독자적인 길을 가세요.",
    en: "Challenge authority. Take your own path."
  },
  square: {
    ko: "상사와 갈등이 있을 수 있어요. 자기 사업이 맞을 수도.",
    en: "May conflict with superiors. Own business might suit you."
  },
  trine: {
    ko: "권위를 자연스럽게 얻어요. 조직에서 신뢰받아요.",
    en: "Naturally gain authority. Trusted in organizations."
  },
  sextile: {
    ko: "멘토를 잘 만나요. 경험자에게 배우면 빨라요.",
    en: "Meet good mentors. Learning from experienced people is faster."
  },
  quincunx: {
    ko: "권위와의 관계에서 조정이 필요해요.",
    en: "Adjustment needed in relationship with authority."
  },
  semisextile: {
    ko: "권위 있는 사람들과의 미묘한 기회가 있어요.",
    en: "Subtle opportunities with authority figures."
  },
  semisquare: {
    ko: "권위와 약간의 마찰이 있지만 배움이 될 수 있어요.",
    en: "Slight friction with authority but can be a learning experience."
  },
  sesquiquadrate: {
    ko: "권위와의 관계에서 긴장이 있지만 성장할 수 있어요.",
    en: "Tension with authority but opportunity for growth."
  },
};
