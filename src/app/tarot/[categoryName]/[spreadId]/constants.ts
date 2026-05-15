/**
 * Tarot Reading Page Constants
 * 카드 색상, 테마 표시 정보 등
 */

import { DECK_STYLES, DECK_STYLE_INFO } from '@/lib/tarot/tarot.types'

// Card back color options - linked to deck styles
export const CARD_COLORS = DECK_STYLES.map((style) => ({
  id: style,
  name: DECK_STYLE_INFO[style].name,
  nameKo: DECK_STYLE_INFO[style].nameKo,
  description: DECK_STYLE_INFO[style].description,
  descriptionKo: DECK_STYLE_INFO[style].descriptionKo,
  gradient: DECK_STYLE_INFO[style].gradient,
  border: `${DECK_STYLE_INFO[style].accent}99`,
  accent: DECK_STYLE_INFO[style].accent,
  backImage: DECK_STYLE_INFO[style].backImage,
}))

export type CardColor = (typeof CARD_COLORS)[number]

// Theme-specific titles and icons for guidance/affirmation sections
export const THEME_DISPLAY_INFO: Record<
  string,
  {
    guidanceIcon: string
    guidanceTitle: string
    guidanceTitleKo: string
    guidanceFooter: string
    guidanceFooterKo: string
    affirmationIcon: string
    affirmationTitle: string
    affirmationTitleKo: string
  }
> = {
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
}

export function getThemeDisplayInfo(categoryId: string | undefined) {
  return THEME_DISPLAY_INFO[categoryId || ''] || THEME_DISPLAY_INFO['general-insight']
}
