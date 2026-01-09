/**
 * Saturn 하우스별 인생 수업
 * 토성은 인생의 중요한 과제와 시험, 그리고 mastery를 나타냄
 */

import type { BilingualText, HouseNumber } from '../../types/core';

export interface SaturnLifeLesson {
  lesson: BilingualText;
  timing: BilingualText;
  mastery: BilingualText;
}

export const SATURN_LIFE_LESSON: Record<HouseNumber, SaturnLifeLesson> = {
  1: {
    lesson: {
      ko: "자기 표현에 대한 두려움을 극복하고, 진정한 나로 당당히 서는 법",
      en: "Overcome fear of self-expression and stand confidently as your true self"
    },
    timing: {
      ko: "29세, 58세경 자아 정체성에 대한 큰 시험이 와요",
      en: "Major identity tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 자기 자신에 대한 확신이 강해지고 존재감이 커져요",
      en: "Self-confidence and presence grow stronger with age"
    },
  },
  2: {
    lesson: {
      ko: "물질에 대한 불안을 극복하고, 자기 가치를 스스로 인정하는 법",
      en: "Overcome material anxiety and recognize your own worth"
    },
    timing: {
      ko: "29세, 58세경 재정적 위기나 가치관 시험이 와요",
      en: "Financial crises or value tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 재정적으로 안정되고, 자기 가치에 확신이 생겨요",
      en: "Financial stability and self-worth confidence grow with age"
    },
  },
  3: {
    lesson: {
      ko: "소통에 대한 두려움을 극복하고, 자신의 목소리를 내는 법",
      en: "Overcome fear of communication and use your voice"
    },
    timing: {
      ko: "29세, 58세경 소통이나 학습에 관한 시험이 와요",
      en: "Communication or learning tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 표현력이 풍부해지고 가르치는 능력이 생겨요",
      en: "Expression enriches and teaching ability develops with age"
    },
  },
  4: {
    lesson: {
      ko: "가족/가정에 대한 상처를 치유하고, 내면의 안정을 만드는 법",
      en: "Heal family wounds and create inner stability"
    },
    timing: {
      ko: "29세, 58세경 가정사나 뿌리에 관한 시험이 와요",
      en: "Family or roots tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 내면이 안정되고, 진정한 '집'을 만들 수 있어요",
      en: "Inner stability and true 'home' creation develop with age"
    },
  },
  5: {
    lesson: {
      ko: "창의성과 자기 표현에 대한 두려움을 극복하는 법",
      en: "Overcome fear of creativity and self-expression"
    },
    timing: {
      ko: "29세, 58세경 창작이나 연애, 자녀에 관한 시험이 와요",
      en: "Creation, romance, or children tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 창작 능력이 깊어지고, 진정한 자기 표현을 해요",
      en: "Creative ability deepens and true self-expression develops with age"
    },
  },
  6: {
    lesson: {
      ko: "일과 건강에 대한 완벽주의를 놓고, 균형을 찾는 법",
      en: "Let go of perfectionism about work and health; find balance"
    },
    timing: {
      ko: "29세, 58세경 건강이나 직업에 관한 시험이 와요",
      en: "Health or job tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 효율적으로 일하고, 건강을 잘 관리해요",
      en: "Work efficiently and manage health well with age"
    },
  },
  7: {
    lesson: {
      ko: "관계에 대한 두려움을 극복하고, 진정한 파트너십을 배우는 법",
      en: "Overcome fear of relationships and learn true partnership"
    },
    timing: {
      ko: "29세, 58세경 결혼이나 파트너십에 관한 시험이 와요",
      en: "Marriage or partnership tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 관계가 성숙해지고, 진정한 동반자를 만나요",
      en: "Relationships mature and true partners come with age"
    },
  },
  8: {
    lesson: {
      ko: "깊은 친밀감과 변화에 대한 두려움을 극복하는 법",
      en: "Overcome fear of deep intimacy and transformation"
    },
    timing: {
      ko: "29세, 58세경 죽음, 상속, 깊은 변화에 관한 시험이 와요",
      en: "Death, inheritance, or deep change tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 변화를 두려워하지 않고, 깊은 연결을 해요",
      en: "Fear change less and make deep connections with age"
    },
  },
  9: {
    lesson: {
      ko: "신념과 철학에 대한 경직성을 풀고, 열린 마음을 배우는 법",
      en: "Release rigidity about beliefs and learn open-mindedness"
    },
    timing: {
      ko: "29세, 58세경 신념이나 해외/학업에 관한 시험이 와요",
      en: "Belief, abroad, or academic tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 지혜가 깊어지고, 가르치는 역할을 해요",
      en: "Wisdom deepens and teaching roles come with age"
    },
  },
  10: {
    lesson: {
      ko: "성공과 실패에 대한 두려움을 극복하고, 진정한 성취를 배우는 법",
      en: "Overcome fear of success and failure; learn true achievement"
    },
    timing: {
      ko: "29세, 58세경 커리어에 관한 큰 시험이 와요",
      en: "Major career tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 커리어가 탄탄해지고, 사회적 인정을 받아요",
      en: "Career solidifies and social recognition comes with age"
    },
  },
  11: {
    lesson: {
      ko: "집단에 대한 두려움을 극복하고, 진정한 소속감을 찾는 법",
      en: "Overcome fear of groups and find true belonging"
    },
    timing: {
      ko: "29세, 58세경 친구나 커뮤니티에 관한 시험이 와요",
      en: "Friend or community tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 진정한 친구를 알아보고, 공동체에 기여해요",
      en: "Recognize true friends and contribute to community with age"
    },
  },
  12: {
    lesson: {
      ko: "무의식적 두려움을 직면하고, 영적 성장을 이루는 법",
      en: "Face unconscious fears and achieve spiritual growth"
    },
    timing: {
      ko: "29세, 58세경 무의식이나 영성에 관한 시험이 와요",
      en: "Unconscious or spirituality tests come around ages 29 and 58"
    },
    mastery: {
      ko: "나이 들수록 영적으로 성장하고, 치유 능력이 생겨요",
      en: "Spiritual growth and healing ability develop with age"
    },
  },
};
