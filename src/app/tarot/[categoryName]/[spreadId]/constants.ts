/**
 * Tarot Reading Page Constants
 * 카드 색상, 테마 표시 정보 등
 */

import { DECK_STYLES, DECK_STYLE_INFO, DeckStyle } from '@/lib/Tarot/tarot.types';

// Card back color options - linked to deck styles
export const CARD_COLORS = DECK_STYLES.map(style => ({
  id: style,
  name: DECK_STYLE_INFO[style].name,
  nameKo: DECK_STYLE_INFO[style].nameKo,
  description: DECK_STYLE_INFO[style].description,
  descriptionKo: DECK_STYLE_INFO[style].descriptionKo,
  gradient: DECK_STYLE_INFO[style].gradient,
  border: `${DECK_STYLE_INFO[style].accent}99`,
  accent: DECK_STYLE_INFO[style].accent,
  backImage: DECK_STYLE_INFO[style].backImage,
}));

export type CardColor = typeof CARD_COLORS[number];

// Theme-specific titles and icons for guidance/affirmation sections
export const THEME_DISPLAY_INFO: Record<string, {
  guidanceIcon: string;
  guidanceTitle: string;
  guidanceTitleKo: string;
  guidanceFooter: string;
  guidanceFooterKo: string;
  affirmationIcon: string;
  affirmationTitle: string;
  affirmationTitleKo: string;
}> = {
  'general-insight': {
    guidanceIcon: '💡',
    guidanceTitle: 'Key Insight',
    guidanceTitleKo: '핵심 조언',
    guidanceFooter: 'Take action on this advice',
    guidanceFooterKo: '이 조언을 실천해보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Action Plan',
    affirmationTitleKo: '실천 계획',
  },
  'love-relationships': {
    guidanceIcon: '💡',
    guidanceTitle: 'Relationship Advice',
    guidanceTitleKo: '관계 조언',
    guidanceFooter: 'Apply this to your relationship',
    guidanceFooterKo: '관계에 적용해보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Next Step',
    affirmationTitleKo: '다음 단계',
  },
  'career-work': {
    guidanceIcon: '💡',
    guidanceTitle: 'Career Advice',
    guidanceTitleKo: '커리어 조언',
    guidanceFooter: 'Take these steps forward',
    guidanceFooterKo: '이 단계들을 실행하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Action Items',
    affirmationTitleKo: '실행 항목',
  },
  'money-finance': {
    guidanceIcon: '💡',
    guidanceTitle: 'Financial Advice',
    guidanceTitleKo: '재정 조언',
    guidanceFooter: 'Apply these money tips',
    guidanceFooterKo: '이 재정 팁을 활용하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Money Plan',
    affirmationTitleKo: '재정 계획',
  },
  'well-being-health': {
    guidanceIcon: '💡',
    guidanceTitle: 'Health Advice',
    guidanceTitleKo: '건강 조언',
    guidanceFooter: 'Take care of yourself',
    guidanceFooterKo: '자신을 돌보세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Wellness Plan',
    affirmationTitleKo: '건강 계획',
  },
  'spiritual-growth': {
    guidanceIcon: '💡',
    guidanceTitle: 'Growth Advice',
    guidanceTitleKo: '성장 조언',
    guidanceFooter: 'Practice these insights',
    guidanceFooterKo: '이 통찰을 실천하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Growth Plan',
    affirmationTitleKo: '성장 계획',
  },
  'decisions-crossroads': {
    guidanceIcon: '💡',
    guidanceTitle: 'Decision Advice',
    guidanceTitleKo: '결정 조언',
    guidanceFooter: 'Consider these factors',
    guidanceFooterKo: '이 요소들을 고려하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Decision Plan',
    affirmationTitleKo: '결정 계획',
  },
  'self-discovery': {
    guidanceIcon: '💡',
    guidanceTitle: 'Self Advice',
    guidanceTitleKo: '자기 이해 조언',
    guidanceFooter: 'Learn about yourself',
    guidanceFooterKo: '자신을 알아가세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Self Plan',
    affirmationTitleKo: '자기 계획',
  },
  'daily-reading': {
    guidanceIcon: '💡',
    guidanceTitle: 'Today\'s Advice',
    guidanceTitleKo: '오늘의 조언',
    guidanceFooter: 'Use this today',
    guidanceFooterKo: '오늘 활용하세요',
    affirmationIcon: '✓',
    affirmationTitle: 'Today\'s Plan',
    affirmationTitleKo: '오늘의 계획',
  },
};

export function getThemeDisplayInfo(categoryId: string | undefined) {
  return THEME_DISPLAY_INFO[categoryId || ''] || THEME_DISPLAY_INFO['general-insight'];
}
