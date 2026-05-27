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
