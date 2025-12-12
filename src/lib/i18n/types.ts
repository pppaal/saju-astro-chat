// src/lib/i18n/types.ts
// 새로운 기능 추가 시 여기에 타입 정의

export type SupportedLocale = "en" | "ko" | "es" | "fr" | "ja" | "zh" | "ru" | "ar";

// 확장 번역 타입
export interface LocaleExtension {
  [locale: string]: {
    [namespace: string]: Record<string, unknown>;
  };
}

// 통합 분석 관련 타입 (미래 확장용)
export interface UnifiedAnalysisLabels {
  diagnose: {
    title: string;
    description: string;
  };
  analyze: {
    title: string;
    description: string;
  };
  heal: {
    title: string;
    description: string;
  };
}

// Daily Ritual 관련 타입
export interface DailyRitualLabels {
  title: string;
  subtitle: string;
  todayRitual: string;
  meditation: string;
  journaling: string;
  gratitude: string;
  elementBoost: string;
  duration: string;
  complete: string;
  skip: string;
}

// Psychology 관련 타입
export interface PsychologyLabels {
  mbti: {
    title: string;
    description: string;
  };
  big5: {
    title: string;
    openness: string;
    conscientiousness: string;
    extraversion: string;
    agreeableness: string;
    neuroticism: string;
  };
}

// Meditation 관련 타입
export interface MeditationLabels {
  title: string;
  guided: string;
  breathing: string;
  singingBowl: string;
  nature: string;
  duration: string;
  start: string;
  pause: string;
  complete: string;
}
