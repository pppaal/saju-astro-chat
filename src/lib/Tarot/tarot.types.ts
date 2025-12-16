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

// Card ID to filename mapping
const CARD_FILENAMES: Record<number, string> = {
  // Major Arcana (0-21)
  0: '00-fool', 1: '01-magician', 2: '02-high-priestess', 3: '03-empress',
  4: '04-emperor', 5: '05-hierophant', 6: '06-lovers', 7: '07-chariot',
  8: '08-strength', 9: '09-hermit', 10: '10-wheel-of-fortune', 11: '11-justice',
  12: '12-hanged-man', 13: '13-death', 14: '14-temperance', 15: '15-devil',
  16: '16-tower', 17: '17-star', 18: '18-moon', 19: '19-sun',
  20: '20-judgement', 21: '21-world',
  // Wands (22-35)
  22: 'wands-01-ace', 23: 'wands-02', 24: 'wands-03', 25: 'wands-04',
  26: 'wands-05', 27: 'wands-06', 28: 'wands-07', 29: 'wands-08',
  30: 'wands-09', 31: 'wands-10', 32: 'wands-11-page', 33: 'wands-12-knight',
  34: 'wands-13-queen', 35: 'wands-14-king',
  // Cups (36-49)
  36: 'cups-01-ace', 37: 'cups-02', 38: 'cups-03', 39: 'cups-04',
  40: 'cups-05', 41: 'cups-06', 42: 'cups-07', 43: 'cups-08',
  44: 'cups-09', 45: 'cups-10', 46: 'cups-11-page', 47: 'cups-12-knight',
  48: 'cups-13-queen', 49: 'cups-14-king',
  // Swords (50-63)
  50: 'swords-01-ace', 51: 'swords-02', 52: 'swords-03', 53: 'swords-04',
  54: 'swords-05', 55: 'swords-06', 56: 'swords-07', 57: 'swords-08',
  58: 'swords-09', 59: 'swords-10', 60: 'swords-11-page', 61: 'swords-12-knight',
  62: 'swords-13-queen', 63: 'swords-14-king',
  // Pentacles (64-77)
  64: 'pentacles-01-ace', 65: 'pentacles-02', 66: 'pentacles-03', 67: 'pentacles-04',
  68: 'pentacles-05', 69: 'pentacles-06', 70: 'pentacles-07', 71: 'pentacles-08',
  72: 'pentacles-09', 73: 'pentacles-10', 74: 'pentacles-11-page', 75: 'pentacles-12-knight',
  76: 'pentacles-13-queen', 77: 'pentacles-14-king',
};

// Helper function to get card image path
export function getCardImagePath(cardId: number, _style: DeckStyle = 'mystic'): string {
  const filename = CARD_FILENAMES[cardId];
  if (!filename) {
    return '/images/tarot/card-back.webp';
  }
  return `/images/tarot/${filename}.webp`;
}

export type Arcana = 'major' | 'minor';
export type Suit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles';

export interface CardMeaning {
  keywords: string[];
  keywordsKo?: string[];
  meaning: string;
  meaningKo?: string;
  /**
   * Optional concise guidance distilled from the meaning.
   * If absent, consumers can derive advice from keywords/meaning.
   */
  advice?: string;
  adviceKo?: string;
}

export interface Card {
  id: number;
  name: string;
  nameKo?: string;
  arcana: Arcana;
  suit: Suit;
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
  titleKo?: string;
}

export interface Spread {
  id: string;
  title: string;
  titleKo?: string;
  cardCount: number;
  description: string;
  descriptionKo?: string;
  positions: SpreadPosition[];
}

export interface TarotTheme {
  id: string;
  category: string;
  categoryKo?: string;
  description: string;
  descriptionKo?: string;
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
