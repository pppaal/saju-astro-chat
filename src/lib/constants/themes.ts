// src/lib/constants/themes.ts
// Theme descriptions and constants used across counseling features

export type ThemeKey =
  | "love"
  | "career"
  | "wealth"
  | "health"
  | "family"
  | "today"
  | "month"
  | "year"
  | "life"
  | "chat"
  | "newyear";

export interface ThemeDescription {
  ko: string;
  en: string;
}

/**
 * Theme descriptions for counseling context
 */
export const THEME_DESCRIPTIONS: Record<ThemeKey, ThemeDescription> = {
  love: { ko: "연애/결혼/배우자 관련 질문", en: "Love, marriage, partner questions" },
  career: { ko: "직업/취업/이직/사업 관련 질문", en: "Career, job, business questions" },
  wealth: { ko: "재물/투자/재정 관련 질문", en: "Money, investment, finance questions" },
  health: { ko: "건강/체력/웰빙 관련 질문", en: "Health, wellness questions" },
  family: { ko: "가족/인간관계 관련 질문", en: "Family, relationships questions" },
  today: { ko: "오늘의 운세/조언", en: "Today's fortune and advice" },
  month: { ko: "이번 달 운세/조언", en: "This month's fortune" },
  year: { ko: "올해 운세/연간 예측", en: "This year's fortune" },
  newyear: { ko: "새해 운세/신년 계획", en: "New year fortune and planning" },
  life: { ko: "인생 전반/종합 상담", en: "Life overview, general counseling" },
  chat: { ko: "자유 주제 상담", en: "Free topic counseling" },
};

/**
 * Get theme description by key
 */
export function getThemeDescription(theme: string): ThemeDescription {
  return THEME_DESCRIPTIONS[theme as ThemeKey] || THEME_DESCRIPTIONS.chat;
}

/**
 * Build theme context string for prompts
 */
export function buildThemeContext(theme: string, lang: "ko" | "en"): string {
  const desc = getThemeDescription(theme);

  if (lang === "ko") {
    return `현재 상담 테마: ${theme} (${desc.ko})\n이 테마에 맞춰 답변해주세요.`;
  }
  return `Current theme: ${theme} (${desc.en})\nFocus your answer on this theme.`;
}

/**
 * Valid themes list
 */
export const VALID_THEMES: ThemeKey[] = [
  "love",
  "career",
  "wealth",
  "health",
  "family",
  "today",
  "month",
  "year",
  "newyear",
  "life",
  "chat",
];

/**
 * Check if a theme is valid
 */
export function isValidTheme(theme: string): theme is ThemeKey {
  return VALID_THEMES.includes(theme as ThemeKey);
}
