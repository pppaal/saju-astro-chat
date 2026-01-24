/**
 * i18n constants for InlineTarotModal
 */

export type LangKey = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de' | 'pt' | 'ru';

export interface TarotI18n {
  title: string;
  concernTitle: string;
  concernPlaceholder: string;
  concernHint: string;
  next: string;
  autoSelect: string;
  spreadTitle: string;
  quickTip: string;
  normalTip: string;
  deepTip: string;
  drawCards: string;
  drawing: string;
  interpreting: string;
  overallMessage: string;
  guidance: string;
  affirmation: string;
  cardInsights: string;
  deeperReading: string;
  continueChat: string;
  close: string;
  cards: string;
  drawAgain: string;
  yourConcern: string;
  save: string;
  saved: string;
  analyzing: string;
}

export const TAROT_I18N: Record<string, TarotI18n> = {
  ko: {
    title: '타로 리딩',
    concernTitle: '어떤 고민이 있으신가요?',
    concernPlaceholder: '고민을 입력해주세요...',
    concernHint: '구체적으로 적을수록 더 정확한 해석이 가능해요',
    next: '직접 선택',
    autoSelect: '🔮 AI가 골라줘',
    spreadTitle: '스프레드를 선택해주세요',
    quickTip: '빠른 답변',
    normalTip: '시간의 흐름',
    deepTip: '깊은 분석',
    drawCards: '카드 뽑기',
    drawing: '카드를 뽑는 중...',
    interpreting: '카드를 해석하고 있어요...',
    overallMessage: '전체 메시지',
    guidance: '조언',
    affirmation: '오늘의 확언',
    cardInsights: '카드별 해석',
    deeperReading: '더 깊은 리딩 받기',
    continueChat: '상담 계속하기',
    close: '닫기',
    cards: '장',
    drawAgain: '🔄 다시 뽑기',
    yourConcern: '나의 고민',
    save: '💾 저장하기',
    saved: '✓ 저장됨',
    analyzing: '질문 분석 중...',
  },
  en: {
    title: 'Tarot Reading',
    concernTitle: "What's on your mind?",
    concernPlaceholder: 'Enter your concern...',
    concernHint: 'The more specific you are, the more accurate the reading',
    next: 'Choose Manually',
    autoSelect: '🔮 AI Picks',
    spreadTitle: 'Choose a spread',
    quickTip: 'Quick answer',
    normalTip: 'Timeline view',
    deepTip: 'Deep analysis',
    drawCards: 'Draw Cards',
    drawing: 'Drawing cards...',
    interpreting: 'Interpreting your cards...',
    overallMessage: 'Overall Message',
    guidance: 'Guidance',
    affirmation: 'Affirmation',
    cardInsights: 'Card Insights',
    deeperReading: 'Get Deeper Reading',
    continueChat: 'Continue Chat',
    close: 'Close',
    cards: 'cards',
    drawAgain: '🔄 Draw Again',
    yourConcern: 'Your Concern',
    save: '💾 Save',
    saved: '✓ Saved',
    analyzing: 'Analyzing question...',
  },
};

export function getTarotTranslations(lang: LangKey): TarotI18n {
  return TAROT_I18N[lang] ?? TAROT_I18N.ko;
}
