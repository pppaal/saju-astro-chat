/**
 * 십신별 직업 적성 및 커리어 특성
 */

import type { BilingualText, BilingualArray, SibsinCategory } from '../../types/core';

export interface SibsinCareerTrait {
  description: BilingualText;
  fields: BilingualArray;
}

/**
 * 십신별 직업 적성 (대분류 기준)
 */
export const SIBSIN_CAREER_TRAITS: Record<SibsinCategory, SibsinCareerTrait> = {
  비겁: {
    description: {
      ko: "경쟁적인 환경에서 빛나요. 자영업, 스포츠, 영업이 어울려요.",
      en: "Shine in competitive environments. Self-employment, sports, sales suit you."
    },
    fields: {
      ko: ["자영업", "스포츠", "영업"],
      en: ["Self-employment", "Sports", "Sales"]
    }
  },
  식상: {
    description: {
      ko: "창의력과 표현이 중요한 분야가 어울려요.",
      en: "Fields valuing creativity and expression suit you."
    },
    fields: {
      ko: ["예술", "미디어", "교육"],
      en: ["Arts", "Media", "Education"]
    }
  },
  재성: {
    description: {
      ko: "재물을 다루고 관계를 관리하는 분야가 어울려요.",
      en: "Fields handling wealth and managing relationships suit you."
    },
    fields: {
      ko: ["금융", "무역", "부동산"],
      en: ["Finance", "Trade", "Real Estate"]
    }
  },
  관성: {
    description: {
      ko: "조직과 시스템 안에서 성장해요. 공직, 대기업이 어울려요.",
      en: "Grow in organizations and systems. Public service, corporations suit you."
    },
    fields: {
      ko: ["공무원", "대기업", "법률"],
      en: ["Public Service", "Corporations", "Law"]
    }
  },
  인성: {
    description: {
      ko: "지식과 보호가 중요한 분야가 어울려요.",
      en: "Fields valuing knowledge and protection suit you."
    },
    fields: {
      ko: ["연구", "의료", "상담"],
      en: ["Research", "Healthcare", "Counseling"]
    }
  },
};
