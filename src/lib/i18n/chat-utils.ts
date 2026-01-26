/**
 * Unified chat i18n utilities
 * Replaces the scattered chat-i18n implementations across components
 */

import { useI18n } from "@/i18n/I18nProvider";

export type ChatLangKey = "en" | "ko";

/**
 * Hook to get chat-related translations
 */
export function useChatI18n() {
  const { t, locale } = useI18n();

  return {
    locale: locale as ChatLangKey,
    t: (key: string, fallback?: string) => t(`chat.${key}`, fallback),

    // Common chat messages
    placeholder: t("chat.placeholder"),
    send: t("chat.send"),
    thinking: t("chat.thinking"),
    empty: t("chat.empty"),
    error: t("chat.error"),
    cancel: t("chat.cancel"),

    // Session management
    newChat: t("chat.newChat"),
    previousChats: t("chat.previousChats"),
    noHistory: t("chat.noHistory"),
    loadSession: t("chat.loadSession"),
    deleteSession: t("chat.deleteSession"),
    confirmDelete: t("chat.confirmDelete"),

    // Time-related
    today: t("chat.today"),
    yesterday: t("chat.yesterday"),
    daysAgo: t("chat.daysAgo"),
    messages: t("chat.messages"),

    // Crisis support
    crisis: {
      title: t("chat.crisis.title"),
      message: t("chat.crisis.message"),
      hotline: t("chat.crisis.hotline"),
      hotlineNumber: t("chat.crisis.hotlineNumber"),
      close: t("chat.crisis.close"),
    },

    // Tarot integration
    tarot: {
      prompt: t("chat.tarot.prompt"),
      button: t("chat.tarot.button"),
      desc: t("chat.tarot.desc"),
      cardContextTitle: t("chat.tarot.cardContextTitle"),
      followUpLabel: t("chat.tarot.followUpLabel"),
      suggestedQuestions: t("chat.tarot.suggestedQuestions"),
    },

    // Loading states
    loading: {
      analyzing: t("chat.loading.analyzing"),
      preparingResponse: t("chat.loading.preparingResponse"),
      processing: t("chat.loading.processing"),
      generatingAnswer: t("chat.loading.generatingAnswer"),
      organizingInsights: t("chat.loading.organizingInsights"),
      interpretingCards: t("chat.loading.interpretingCards"),
    },
  };
}

/**
 * Get a random loading message
 */
export function getRandomLoadingMessage(locale: ChatLangKey): string {
  const messages: Record<ChatLangKey, string[]> = {
    ko: [
      "카드 해석 중...",
      "답변 준비 중...",
      "분석 중...",
      "응답 생성 중...",
      "조언 정리 중...",
    ],
    en: [
      "Analyzing cards...",
      "Preparing response...",
      "Processing...",
      "Generating answer...",
      "Organizing insights...",
    ],
  };

  const msgs = messages[locale] || messages.en;
  return msgs[Math.floor(Math.random() * msgs.length)];
}

/**
 * Crisis detection keywords
 */
const CRISIS_KEYWORDS: Record<ChatLangKey, string[]> = {
  ko: ["죽고 싶", "자살", "끝내고 싶", "사라지고 싶", "자해", "삶이 싫"],
  en: ["kill myself", "suicide", "end it all", "want to die", "self harm"],
};

/**
 * Detect if a message contains crisis-related keywords
 */
export function detectCrisis(text: string, lang: ChatLangKey): boolean {
  const keywords = CRISIS_KEYWORDS[lang] || CRISIS_KEYWORDS.en;
  const lowerText = text.toLowerCase();
  return keywords.some((kw) => lowerText.includes(kw.toLowerCase()));
}
