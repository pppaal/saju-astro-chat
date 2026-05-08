/**
 * 10하우스 별자리별 사회적 역할 및 리더십
 * 10하우스(MC)는 커리어, 사회적 지위, 공적 이미지를 나타냄
 */

import type { BilingualText, ZodiacSign } from '../../types/core';

export interface House10Pattern {
  role: BilingualText;
  leadership: BilingualText;
}

export const HOUSE10_PATTERNS: Record<ZodiacSign, House10Pattern> = {
  aries: {
    role: {
      ko: "선구자로서 새로운 분야를 개척하는 역할이 어울려요.",
      en: "Suited for pioneering new fields as a trailblazer."
    },
    leadership: {
      ko: "앞장서서 이끄는 리더",
      en: "Leading from the front"
    }
  },
  taurus: {
    role: {
      ko: "안정적인 기반을 구축하고 자원을 관리하는 역할이 어울려요.",
      en: "Suited for building stable foundations and managing resources."
    },
    leadership: {
      ko: "신뢰를 쌓는 리더",
      en: "Building trust"
    }
  },
  gemini: {
    role: {
      ko: "정보를 전달하고 연결하는 역할이 어울려요.",
      en: "Suited for conveying information and connecting."
    },
    leadership: {
      ko: "소통하는 리더",
      en: "Communicating leader"
    }
  },
  cancer: {
    role: {
      ko: "사람들을 돌보고 보호하는 역할이 어울려요.",
      en: "Suited for caring and protecting people."
    },
    leadership: {
      ko: "돌봐주는 리더",
      en: "Nurturing leader"
    }
  },
  leo: {
    role: {
      ko: "주목받는 자리에서 영감을 주는 역할이 어울려요.",
      en: "Suited for inspiring from the spotlight."
    },
    leadership: {
      ko: "카리스마 리더",
      en: "Charismatic leader"
    }
  },
  virgo: {
    role: {
      ko: "디테일을 관리하고 시스템을 개선하는 역할이 어울려요.",
      en: "Suited for managing details and improving systems."
    },
    leadership: {
      ko: "꼼꼼한 리더",
      en: "Meticulous leader"
    }
  },
  libra: {
    role: {
      ko: "조화와 균형을 맞추는 역할이 어울려요.",
      en: "Suited for balancing and harmonizing."
    },
    leadership: {
      ko: "조율하는 리더",
      en: "Balancing leader"
    }
  },
  scorpio: {
    role: {
      ko: "깊이 파고들어 변화를 이끄는 역할이 어울려요.",
      en: "Suited for digging deep and leading change."
    },
    leadership: {
      ko: "변혁의 리더",
      en: "Transformative leader"
    }
  },
  sagittarius: {
    role: {
      ko: "비전을 제시하고 확장하는 역할이 어울려요.",
      en: "Suited for presenting vision and expanding."
    },
    leadership: {
      ko: "비전을 제시하는 리더",
      en: "Visionary leader"
    }
  },
  capricorn: {
    role: {
      ko: "장기적인 목표를 향해 꾸준히 쌓아가는 역할이 어울려요.",
      en: "Suited for steadily building toward long-term goals."
    },
    leadership: {
      ko: "전략적 리더",
      en: "Strategic leader"
    }
  },
  aquarius: {
    role: {
      ko: "혁신적인 아이디어로 변화를 주도하는 역할이 어울려요.",
      en: "Suited for leading change with innovative ideas."
    },
    leadership: {
      ko: "혁신하는 리더",
      en: "Innovative leader"
    }
  },
  pisces: {
    role: {
      ko: "창의성과 영감으로 사람들을 이끄는 역할이 어울려요.",
      en: "Suited for leading with creativity and inspiration."
    },
    leadership: {
      ko: "영감을 주는 리더",
      en: "Inspiring leader"
    }
  },
};
