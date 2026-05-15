import { DECK_STYLES, DECK_STYLE_INFO, DeckStyle } from './tarot.types'

export interface CardColorOption {
  id: DeckStyle
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  gradient: string
  border: string
  accent: string
  backImage: string
}

export const CARD_COLORS: CardColorOption[] = DECK_STYLES.map((style) => ({
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

export interface ThemeDisplayInfo {
  guidanceIcon: string
  guidanceTitle: string
  guidanceTitleKo: string
  guidanceFooter: string
  guidanceFooterKo: string
  affirmationIcon: string
  affirmationTitle: string
  affirmationTitleKo: string
}

const GENERAL_DISPLAY: ThemeDisplayInfo = {
  guidanceIcon: '💡',
  guidanceTitle: 'Key Insight',
  guidanceTitleKo: '핵심 조언',
  guidanceFooter: 'Take action on this advice',
  guidanceFooterKo: '이 조언을 실천해보세요',
  affirmationIcon: '✓',
  affirmationTitle: 'Action Plan',
  affirmationTitleKo: '실천 계획',
}

export const THEME_DISPLAY_INFO: Record<string, ThemeDisplayInfo> = {
  'general-insight': GENERAL_DISPLAY,
}

export function getThemeDisplayInfo(categoryId: string | undefined): ThemeDisplayInfo {
  return THEME_DISPLAY_INFO[categoryId || ''] || GENERAL_DISPLAY
}
