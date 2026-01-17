// src/app/api/destiny-map/chat-stream/lib/constants.ts
// Constants and configurations for chat-stream API

import type { FiveElement } from "@/lib/prediction/timingScore";

export const ALLOWED_LANG = new Set(["ko", "en"]);
export const ALLOWED_ROLE = new Set(["system", "user", "assistant"]);
export const ALLOWED_GENDER = new Set(["male", "female", "other", "prefer_not"]);
export const MAX_MESSAGES = 10;

// 천간 → 오행 매핑
export const STEMS_MAP: Record<string, FiveElement> = {
  '甲': '목', '乙': '목', '丙': '화', '丁': '화', '戊': '토',
  '己': '토', '庚': '금', '辛': '금', '壬': '수', '癸': '수',
};

// Theme descriptions for context
export const THEME_DESCRIPTIONS: Record<string, { ko: string; en: string }> = {
  love: { ko: "연애/결혼/배우자 관련 질문", en: "Love, marriage, partner questions" },
  career: { ko: "직업/취업/이직/사업 관련 질문", en: "Career, job, business questions" },
  wealth: { ko: "재물/투자/재정 관련 질문", en: "Money, investment, finance questions" },
  health: { ko: "건강/체력/웰빙 관련 질문", en: "Health, wellness questions" },
  family: { ko: "가족/인간관계 관련 질문", en: "Family, relationships questions" },
  today: { ko: "오늘의 운세/조언", en: "Today's fortune and advice" },
  month: { ko: "이번 달 운세/조언", en: "This month's fortune" },
  year: { ko: "올해 운세/연간 예측", en: "This year's fortune" },
  life: { ko: "인생 전반/종합 상담", en: "Life overview, general counseling" },
  chat: { ko: "자유 주제 상담", en: "Free topic counseling" },
};

// Life prediction themes
export const LIFE_PREDICTION_THEMES = ["future", "life-plan", "career", "marriage", "investment", "money", "love"];

// Event type mapping for life prediction
export const EVENT_TYPE_MAP: Record<string, string> = {
  'marriage': 'marriage',
  'love': 'relationship',
  'career': 'career',
  'investment': 'investment',
  'money': 'investment',
};
