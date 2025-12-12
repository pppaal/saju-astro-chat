// Clean, human-readable types for Tarot logic.

// Deck style options
export const DECK_STYLES = ['mystic', 'nouveau', 'modern'] as const;
export type DeckStyle = typeof DECK_STYLES[number];

export interface DeckStyleInfo {
  id: DeckStyle;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  gradient: string;
  accent: string;
}

export const DECK_STYLE_INFO: Record<DeckStyle, DeckStyleInfo> = {
  mystic: {
    id: 'mystic',
    name: 'Mystic Ethereal',
    nameKo: '미스틱 에테리얼',
    description: 'Cosmic purple & gold, ethereal and mysterious',
    descriptionKo: '우주적 보라색과 금색, 신비롭고 몽환적인',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 50%, #0f0a1a 100%)',
    accent: '#d4af37',
  },
  nouveau: {
    id: 'nouveau',
    name: 'Art Nouveau',
    nameKo: '아르누보',
    description: 'Elegant curves, classic artistic style',
    descriptionKo: '우아한 곡선, 클래식 예술 스타일',
    gradient: 'linear-gradient(135deg, #2c1810 0%, #4a3728 50%, #1a0f0a 100%)',
    accent: '#c9a959',
  },
  modern: {
    id: 'modern',
    name: 'Minimal Modern',
    nameKo: '미니멀 모던',
    description: 'Clean lines, contemporary minimalist design',
    descriptionKo: '깔끔한 선, 현대적 미니멀 디자인',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0f0f1a 100%)',
    accent: '#ffffff',
  },
};

// Helper function to get card image path
export function getCardImagePath(cardId: number, style: DeckStyle = 'mystic'): string {
  return `/cards/${style}/${cardId}.jpg`;
}

export interface CardMeaning {
  keywords: string[];
  meaning: string;
  /**
   * Optional concise guidance distilled from the meaning.
   * If absent, consumers can derive advice from keywords/meaning.
   */
  advice?: string;
}

export interface Card {
  id: number;
  name: string;
  image: string;
  upright: CardMeaning;
  reversed: CardMeaning;
}

export interface DrawnCard {
  card: Card;
  isReversed: boolean;
}

export interface SpreadPosition {
  title: string;
}

export interface Spread {
  id: string;
  title: string;
  cardCount: number;
  description: string;
  positions: SpreadPosition[];
}

export interface TarotTheme {
  id: string;
  category: string;
  description: string;
  spreads: Spread[];
}

// Premium Interpretation Types (Tier 4-6)

export interface BirthCardInfo {
  primary_card: string;
  korean: string;
  life_path: number;
  traits: string[];
  shadow: string;
}

export interface YearCardInfo {
  year_card: string;
  year_card_korean: string;
  personal_year: number;
  theme: string;
}

export interface PersonalizationData {
  birth_card?: BirthCardInfo;
  year_card?: YearCardInfo;
  personal_connections: string[];
}

export interface NarrativeData {
  opening_hook: string;
  resolution: string;
  card_transitions: string[];
  arc_structure: string;
  tone: {
    mood: string;
    keywords: string[];
  };
}

export interface CardInsight {
  position: string;
  card_name: string;
  is_reversed: boolean;
  interpretation: string;
  spirit_animal?: string | null;
  chakra?: string | null;
  element?: string | null;
  shadow?: string | null;
  multi_layer?: {
    surface: string;
    psychological: string;
    shadow: string;
    spiritual: string;
    action: string;
  };
}

export interface TarotInterpretationResult {
  overall_message: string;
  card_insights: CardInsight[];
  guidance: string;
  affirmation: string;
  combinations: string[];
  followup_questions: string[];
  fallback?: boolean;
  // Premium fields (Tier 4-6)
  personalization?: PersonalizationData;
  narrative?: NarrativeData;
}
