/**
 * 일간별 영혼 사명
 * 일간(天干)은 사주의 핵심으로, 개인의 본질과 사명을 나타냄
 */

import type { BilingualText } from '../../types/core';

export type DayMasterType = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계';

export interface DayMasterMission {
  core: BilingualText;
  expression: BilingualText;
  fulfillment: BilingualText;
}

export const DAY_MASTER_SOUL_MISSION: Record<DayMasterType, DayMasterMission> = {
  갑: {
    core: {
      ko: "세상에 새로운 시작과 가능성을 보여주는 개척자",
      en: "Pioneer showing new beginnings and possibilities to the world"
    },
    expression: {
      ko: "리더십, 창업, 혁신",
      en: "Leadership, entrepreneurship, innovation"
    },
    fulfillment: {
      ko: "당신이 시작한 것이 다른 사람들에게 영감을 줄 때",
      en: "When what you start inspires others"
    },
  },
  을: {
    core: {
      ko: "유연함과 적응력으로 어디서든 성장하는 치유자",
      en: "Healer who grows anywhere with flexibility and adaptability"
    },
    expression: {
      ko: "협력, 조율, 성장 지원",
      en: "Cooperation, coordination, growth support"
    },
    fulfillment: {
      ko: "당신의 유연함이 조직이나 관계를 살릴 때",
      en: "When your flexibility saves organizations or relationships"
    },
  },
  병: {
    core: {
      ko: "빛과 열정으로 어둠 속 사람들을 이끄는 태양",
      en: "Sun leading people in darkness with light and passion"
    },
    expression: {
      ko: "영감 주기, 비전 제시, 무대",
      en: "Inspiring, presenting vision, the stage"
    },
    fulfillment: {
      ko: "당신의 빛이 누군가의 삶을 밝힐 때",
      en: "When your light brightens someone's life"
    },
  },
  정: {
    core: {
      ko: "섬세한 불꽃으로 마음을 녹이는 촛불",
      en: "Candle that melts hearts with delicate flame"
    },
    expression: {
      ko: "예술, 감성 표현, 세심한 케어",
      en: "Art, emotional expression, attentive care"
    },
    fulfillment: {
      ko: "당신의 따뜻함이 차가운 마음을 녹일 때",
      en: "When your warmth melts cold hearts"
    },
  },
  무: {
    core: {
      ko: "흔들리지 않는 안정감으로 모든 것을 품는 산",
      en: "Mountain embracing everything with unwavering stability"
    },
    expression: {
      ko: "보호, 신뢰 구축, 중재",
      en: "Protection, building trust, mediation"
    },
    fulfillment: {
      ko: "사람들이 당신에게 안식을 느낄 때",
      en: "When people feel rest in you"
    },
  },
  기: {
    core: {
      ko: "비옥한 대지처럼 모든 것이 자라게 하는 양육자",
      en: "Nurturer who makes everything grow like fertile earth"
    },
    expression: {
      ko: "양육, 교육, 실용적 돌봄",
      en: "Nurturing, education, practical care"
    },
    fulfillment: {
      ko: "당신이 키운 것들이 열매를 맺을 때",
      en: "When what you nurtured bears fruit"
    },
  },
  경: {
    core: {
      ko: "정의와 결단으로 세상의 불균형을 바로잡는 검",
      en: "Sword correcting world's imbalance with justice and decision"
    },
    expression: {
      ko: "판단, 개혁, 명확한 결단",
      en: "Judgment, reform, clear decisions"
    },
    fulfillment: {
      ko: "당신의 결단이 정의를 세울 때",
      en: "When your decisions establish justice"
    },
  },
  신: {
    core: {
      ko: "정교함과 완벽함으로 아름다움을 창조하는 장인",
      en: "Artisan creating beauty with precision and perfection"
    },
    expression: {
      ko: "디테일, 완성도, 정교한 작업",
      en: "Details, completion, refined work"
    },
    fulfillment: {
      ko: "당신의 작품이 시간을 초월해 빛날 때",
      en: "When your work shines beyond time"
    },
  },
  임: {
    core: {
      ko: "깊은 지혜와 흐름으로 모든 것을 연결하는 바다",
      en: "Ocean connecting everything with deep wisdom and flow"
    },
    expression: {
      ko: "통찰, 연결, 지혜 전달",
      en: "Insight, connection, sharing wisdom"
    },
    fulfillment: {
      ko: "당신의 지혜가 세상을 연결할 때",
      en: "When your wisdom connects the world"
    },
  },
  계: {
    core: {
      ko: "섬세한 감수성으로 영감을 전하는 안개비",
      en: "Misty rain delivering inspiration with delicate sensitivity"
    },
    expression: {
      ko: "직관, 영감, 감성 치유",
      en: "Intuition, inspiration, emotional healing"
    },
    fulfillment: {
      ko: "당신의 감성이 마른 세상을 적실 때",
      en: "When your sensitivity moistens a dry world"
    },
  },
};
