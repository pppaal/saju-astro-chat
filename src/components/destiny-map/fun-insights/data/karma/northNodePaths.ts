/**
 * North Node 하우스별 성장 경로
 * North Node(라후)는 이번 생의 성장 방향을 나타냄
 */

import type { BilingualText, BilingualArray, HouseNumber } from '../../types/core';

export interface NorthNodeGrowthPath {
  direction: BilingualText;
  pastPattern: BilingualText;
  lesson: BilingualText;
  advice: BilingualArray;
}

export const NODE_HOUSE_GROWTH_PATH: Record<HouseNumber, NorthNodeGrowthPath> = {
  1: {
    direction: { ko: "자아 정체성 확립", en: "Establishing self-identity" },
    pastPattern: {
      ko: "전생에서 파트너에게 의존하며 살았어요. 항상 '우리'를 먼저 생각했죠.",
      en: "In past lives, you depended on partners. Always thought of 'us' first."
    },
    lesson: {
      ko: "이번 생에서는 '나'를 먼저 알아야 해요. 혼자서도 온전한 나로 설 수 있어야 해요.",
      en: "This life, know 'yourself' first. Stand complete even alone."
    },
    advice: {
      ko: ["혼자 결정하는 연습을 하세요", "자기 의견을 당당히 말하세요", "다른 사람 눈치 보지 마세요"],
      en: ["Practice deciding alone", "Express your opinions confidently", "Don't worry about others' eyes"]
    },
  },
  2: {
    direction: { ko: "자기 가치 인식과 물질적 독립", en: "Recognizing self-worth and material independence" },
    pastPattern: {
      ko: "전생에서 다른 사람의 자원(돈, 에너지)에 의존했어요.",
      en: "In past lives, you depended on others' resources (money, energy)."
    },
    lesson: {
      ko: "이번 생에서는 스스로 가치를 만들고, 자기 힘으로 일어서야 해요.",
      en: "This life, create your own value and stand on your own."
    },
    advice: {
      ko: ["자기만의 수입원을 만드세요", "투자나 재테크를 배우세요", "자신의 재능에 가격을 매기세요"],
      en: ["Create your own income source", "Learn investing", "Put a price on your talents"]
    },
  },
  3: {
    direction: { ko: "소통과 일상적 학습", en: "Communication and everyday learning" },
    pastPattern: {
      ko: "전생에서 큰 비전과 철학에만 집중했어요. 디테일을 무시했죠.",
      en: "In past lives, you focused only on big visions. Ignored details."
    },
    lesson: {
      ko: "이번 생에서는 작은 일상의 배움과 소통에서 지혜를 찾아요.",
      en: "This life, find wisdom in small daily learning and communication."
    },
    advice: {
      ko: ["가까운 사람들과 더 대화하세요", "작은 것부터 배워가세요", "글쓰기나 블로그를 시작하세요"],
      en: ["Talk more with people close to you", "Learn from small things", "Start writing or blogging"]
    },
  },
  4: {
    direction: { ko: "내면의 안정과 가정 만들기", en: "Inner stability and creating home" },
    pastPattern: {
      ko: "전생에서 사회적 성공과 명예에만 집중했어요. 가족을 소홀히 했죠.",
      en: "In past lives, you focused on social success. Neglected family."
    },
    lesson: {
      ko: "이번 생에서는 내면의 평화와 정서적 안정이 우선이에요.",
      en: "This life, inner peace and emotional stability come first."
    },
    advice: {
      ko: ["집을 아늑하게 꾸미세요", "가족과 시간을 보내세요", "감정을 표현하는 연습을 하세요"],
      en: ["Make your home cozy", "Spend time with family", "Practice expressing emotions"]
    },
  },
  5: {
    direction: { ko: "창의성과 자기 표현", en: "Creativity and self-expression" },
    pastPattern: {
      ko: "전생에서 집단에 맞추며 개성을 숨겼어요. 튀는 게 두려웠죠.",
      en: "In past lives, you hid individuality to fit groups. Feared standing out."
    },
    lesson: {
      ko: "이번 생에서는 두려움 없이 나를 표현하고 창작해야 해요!",
      en: "This life, express and create yourself without fear!"
    },
    advice: {
      ko: ["창작 활동을 시작하세요 (그림, 음악, 글)", "연애를 즐기세요", "아이처럼 놀아보세요"],
      en: ["Start creative activities (art, music, writing)", "Enjoy romance", "Play like a child"]
    },
  },
  6: {
    direction: { ko: "일상과 봉사를 통한 성장", en: "Growth through routine and service" },
    pastPattern: {
      ko: "전생에서 몽상에 빠져 현실을 무시했어요. 영적 세계에만 집중했죠.",
      en: "In past lives, you ignored reality lost in dreams. Focused only on spiritual."
    },
    lesson: {
      ko: "이번 생에서는 구체적이고 실용적인 기여를 해야 해요.",
      en: "This life, make concrete and practical contributions."
    },
    advice: {
      ko: ["건강 루틴을 만드세요", "봉사 활동을 시작하세요", "디테일에 집중하세요"],
      en: ["Create health routines", "Start volunteering", "Focus on details"]
    },
  },
  7: {
    direction: { ko: "파트너십과 관계의 배움", en: "Partnership and relationship learning" },
    pastPattern: {
      ko: "전생에서 혼자 다 해결하려 했어요. 도움을 거부했죠.",
      en: "In past lives, you tried solving everything alone. Refused help."
    },
    lesson: {
      ko: "이번 생에서는 함께하는 법을 배워야 해요. 관계가 성장의 열쇠예요.",
      en: "This life, learn to work together. Relationships are the key to growth."
    },
    advice: {
      ko: ["타협하는 연습을 하세요", "파트너의 의견을 존중하세요", "비즈니스 파트너십을 고려하세요"],
      en: ["Practice compromising", "Respect partner's opinions", "Consider business partnerships"]
    },
  },
  8: {
    direction: { ko: "깊은 변환과 친밀감", en: "Deep transformation and intimacy" },
    pastPattern: {
      ko: "전생에서 안전한 것만 추구했어요. 변화가 두려웠죠.",
      en: "In past lives, you only sought safety. Feared change."
    },
    lesson: {
      ko: "이번 생에서는 안전지대를 벗어나 진정한 결합과 변환을 경험해야 해요.",
      en: "This life, leave comfort zone for true union and transformation."
    },
    advice: {
      ko: ["두려움을 직면하세요", "깊은 관계를 맺으세요", "공유 자원(투자, 파트너십)을 활용하세요"],
      en: ["Face your fears", "Form deep relationships", "Use shared resources (investments, partnerships)"]
    },
  },
  9: {
    direction: { ko: "신념과 철학 확장", en: "Expanding beliefs and philosophy" },
    pastPattern: {
      ko: "전생에서 세부 사항과 정보 수집에만 집중했어요. 큰 그림을 놓쳤죠.",
      en: "In past lives, you focused on details and info gathering. Missed big picture."
    },
    lesson: {
      ko: "이번 생에서는 더 넓은 시야와 의미를 찾아야 해요. 여행하고 배우세요.",
      en: "This life, find wider perspective and meaning. Travel and learn."
    },
    advice: {
      ko: ["해외여행을 떠나세요", "새로운 철학이나 종교를 탐구하세요", "가르치는 일을 해보세요"],
      en: ["Travel abroad", "Explore new philosophies or religions", "Try teaching"]
    },
  },
  10: {
    direction: { ko: "사회적 역할과 커리어", en: "Social role and career" },
    pastPattern: {
      ko: "전생에서 가정에만 안주했어요. 세상에 나가기를 두려워했죠.",
      en: "In past lives, you stayed only at home. Feared going out to the world."
    },
    lesson: {
      ko: "이번 생에서는 세상에서 당신의 역할을 찾고 성취해야 해요.",
      en: "This life, find and achieve your role in the world."
    },
    advice: {
      ko: ["커리어 목표를 세우세요", "공적인 역할을 맡아보세요", "책임을 받아들이세요"],
      en: ["Set career goals", "Take public roles", "Accept responsibility"]
    },
  },
  11: {
    direction: { ko: "집단과 미래 비전", en: "Groups and future vision" },
    pastPattern: {
      ko: "전생에서 개인적 영광과 로맨스에만 집중했어요.",
      en: "In past lives, you focused only on personal glory and romance."
    },
    lesson: {
      ko: "이번 생에서는 공동체와 미래 세대를 위해 기여해야 해요.",
      en: "This life, contribute to community and future generations."
    },
    advice: {
      ko: ["커뮤니티 활동에 참여하세요", "사회적 대의를 지지하세요", "네트워킹을 넓히세요"],
      en: ["Join community activities", "Support social causes", "Expand networking"]
    },
  },
  12: {
    direction: { ko: "영적 성장과 치유", en: "Spiritual growth and healing" },
    pastPattern: {
      ko: "전생에서 분석과 통제에 집착했어요. 놓아주질 못했죠.",
      en: "In past lives, you obsessed with analysis and control. Couldn't let go."
    },
    lesson: {
      ko: "이번 생에서는 우주의 흐름에 맡기고, 영적 성장을 해야 해요.",
      en: "This life, trust universal flow and achieve spiritual growth."
    },
    advice: {
      ko: ["명상이나 요가를 시작하세요", "혼자만의 시간을 가지세요", "직관을 믿으세요"],
      en: ["Start meditation or yoga", "Have alone time", "Trust your intuition"]
    },
  },
};
