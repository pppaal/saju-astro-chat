/**
 * Tarot Reading Page Constants — 페이지 로컬 상수.
 *
 * (이전엔 THEME_DISPLAY_INFO / getThemeDisplayInfo 가 여기서도 정의돼
 * 있었으나 양쪽 다 호출 0건 dead code 라 제거. 미래에 카테고리별 표시
 * 차별화가 필요해지면 그때 다시 추가.)
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
