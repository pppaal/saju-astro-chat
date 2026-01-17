/**
 * @file Internationalization data for TarotChat component
 */

export type LangKey = "ko" | "en";

export const I18N: Record<LangKey, {
  placeholder: string;
  send: string;
  thinking: string;
  empty: string;
  error: string;
  suggestedQuestions: string;
  cardContextTitle: string;
  followUpLabel: string;
  fallbackNote: string;
}> = {
  ko: {
    placeholder: "카드에 대해 더 물어보세요.",
    send: "보내기",
    thinking: "카드의 메시지를 해석하고 있어요...",
    empty: "카드에 대해 무엇이든 물어보세요. 예) 이 조합이 내 연애에 어떤 의미인가요?",
    error: "오류가 발생했습니다. 다시 시도해주세요.",
    suggestedQuestions: "추천 질문",
    cardContextTitle: "뽑은 카드 정보",
    followUpLabel: "다음으로 물어볼 것",
    fallbackNote: "대체 응답입니다. 다시 한 번 질문하면 더 신선한 리딩을 받을 수 있어요."
  },
  en: {
    placeholder: "Ask more about your cards...",
    send: "Send",
    thinking: "Interpreting the card's message...",
    empty: "Ask anything about your cards. E.g., 'What does this combination mean for my love life?'",
    error: "An error occurred. Please try again.",
    suggestedQuestions: "Suggested Questions",
    cardContextTitle: "Cards drawn",
    followUpLabel: "Ask next",
    fallbackNote: "This is a fallback response; try again for a fresher reading."
  }
};

export const LOADING_MESSAGES: Record<LangKey, string[]> = {
  ko: [
    "카드 해석 중...",
    "답변 준비 중...",
    "분석 중...",
    "응답 생성 중...",
    "조언 정리 중..."
  ],
  en: [
    "Analyzing cards...",
    "Preparing response...",
    "Processing...",
    "Generating answer...",
    "Organizing insights..."
  ]
};
