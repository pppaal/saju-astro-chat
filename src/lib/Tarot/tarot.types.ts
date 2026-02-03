// Clean, human-readable types for Tarot logic.

// Deck style options
export const DECK_STYLES = [
  'celestial',
  'classic',
  'cyber',
  'egyptian',
  'elegant',
  'ethereal',
  'sacred',
  'minimal',
] as const
export type DeckStyle = (typeof DECK_STYLES)[number]
export type CardColor = DeckStyle // Alias for backward compatibility

export interface DeckStyleInfo {
  id: DeckStyle
  name: string
  nameKo: string
  description: string
  descriptionKo: string
  gradient: string
  accent: string
  backImage: string
}

export const DECK_STYLE_INFO: Record<DeckStyle, DeckStyleInfo> = {
  celestial: {
    id: 'celestial',
    name: 'Celestial',
    nameKo: '천체의 빛',
    description: 'Golden sun and moon, cosmic harmony',
    descriptionKo: '황금빛 태양과 달, 우주의 조화',
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
    accent: '#f4d03f',
    backImage: '/images/tarot/backs/celestial.png',
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    nameKo: '클래식',
    description: 'Traditional timeless elegance',
    descriptionKo: '전통적인 시대를 초월한 우아함',
    gradient: 'linear-gradient(135deg, #2c1810 0%, #4a3728 50%, #1a0f0a 100%)',
    accent: '#c9a959',
    backImage: '/images/tarot/backs/classic.png',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Mystic',
    nameKo: '사이버 미스틱',
    description: 'Futuristic digital mysticism',
    descriptionKo: '미래적인 디지털 신비주의',
    gradient: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0f0f2a 100%)',
    accent: '#00ffff',
    backImage: '/images/tarot/backs/cyber.png',
  },
  egyptian: {
    id: 'egyptian',
    name: 'Egyptian',
    nameKo: '이집트',
    description: 'Ancient Eye of Horus wisdom',
    descriptionKo: '고대 호루스의 눈, 지혜의 상징',
    gradient: 'linear-gradient(135deg, #1a1005 0%, #3d2914 50%, #0f0a05 100%)',
    accent: '#d4af37',
    backImage: '/images/tarot/backs/egyptian.png',
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    nameKo: '엘레강스',
    description: 'Refined sophistication',
    descriptionKo: '세련된 품격',
    gradient: 'linear-gradient(135deg, #1a0533 0%, #2d1b4e 50%, #0f0a1a 100%)',
    accent: '#e8d5b7',
    backImage: '/images/tarot/backs/elegant.png',
  },
  ethereal: {
    id: 'ethereal',
    name: 'Ethereal',
    nameKo: '에테리얼',
    description: 'Dreamy watercolor softness',
    descriptionKo: '몽환적인 수채화의 부드러움',
    gradient: 'linear-gradient(135deg, #f5e6d3 0%, #e8d5c4 50%, #d4c4b0 100%)',
    accent: '#8b7355',
    backImage: '/images/tarot/backs/ethereal.png',
  },
  sacred: {
    id: 'sacred',
    name: 'Sacred Geometry',
    nameKo: '신성한 기하학',
    description: 'Mandala patterns, cosmic balance',
    descriptionKo: '만다라 패턴, 우주적 균형',
    gradient: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 50%, #0f0a1a 100%)',
    accent: '#9f7aea',
    backImage: '/images/tarot/backs/sacred.png',
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal Modern',
    nameKo: '미니멀 모던',
    description: 'Clean geometric mysticism',
    descriptionKo: '깔끔한 기하학적 신비주의',
    gradient: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #0f0f0f 100%)',
    accent: '#e0e0e0',
    backImage: '/images/tarot/backs/minimal.png',
  },
}

// Card ID to filename mapping
const CARD_FILENAMES: Record<number, string> = {
  // Major Arcana (0-21)
  0: '00-fool',
  1: '01-magician',
  2: '02-high-priestess',
  3: '03-empress',
  4: '04-emperor',
  5: '05-hierophant',
  6: '06-lovers',
  7: '07-chariot',
  8: '08-strength',
  9: '09-hermit',
  10: '10-wheel-of-fortune',
  11: '11-justice',
  12: '12-hanged-man',
  13: '13-death',
  14: '14-temperance',
  15: '15-devil',
  16: '16-tower',
  17: '17-star',
  18: '18-moon',
  19: '19-sun',
  20: '20-judgement',
  21: '21-world',
  // Wands (22-35)
  22: 'wands-01-ace',
  23: 'wands-02',
  24: 'wands-03',
  25: 'wands-04',
  26: 'wands-05',
  27: 'wands-06',
  28: 'wands-07',
  29: 'wands-08',
  30: 'wands-09',
  31: 'wands-10',
  32: 'wands-11-page',
  33: 'wands-12-knight',
  34: 'wands-13-queen',
  35: 'wands-14-king',
  // Cups (36-49)
  36: 'cups-01-ace',
  37: 'cups-02',
  38: 'cups-03',
  39: 'cups-04',
  40: 'cups-05',
  41: 'cups-06',
  42: 'cups-07',
  43: 'cups-08',
  44: 'cups-09',
  45: 'cups-10',
  46: 'cups-11-page',
  47: 'cups-12-knight',
  48: 'cups-13-queen',
  49: 'cups-14-king',
  // Swords (50-63)
  50: 'swords-01-ace',
  51: 'swords-02',
  52: 'swords-03',
  53: 'swords-04',
  54: 'swords-05',
  55: 'swords-06',
  56: 'swords-07',
  57: 'swords-08',
  58: 'swords-09',
  59: 'swords-10',
  60: 'swords-11-page',
  61: 'swords-12-knight',
  62: 'swords-13-queen',
  63: 'swords-14-king',
  // Pentacles (64-77)
  64: 'pentacles-01-ace',
  65: 'pentacles-02',
  66: 'pentacles-03',
  67: 'pentacles-04',
  68: 'pentacles-05',
  69: 'pentacles-06',
  70: 'pentacles-07',
  71: 'pentacles-08',
  72: 'pentacles-09',
  73: 'pentacles-10',
  74: 'pentacles-11-page',
  75: 'pentacles-12-knight',
  76: 'pentacles-13-queen',
  77: 'pentacles-14-king',
}

// Helper function to get card image path
export function getCardImagePath(cardId: number, _style: DeckStyle = 'celestial'): string {
  const filename = CARD_FILENAMES[cardId]
  if (!filename) {
    return '/images/tarot/card-back.webp'
  }
  return `/images/tarot/${filename}.webp`
}

export type Arcana = 'major' | 'minor'
export type Suit = 'major' | 'wands' | 'cups' | 'swords' | 'pentacles'

export interface CardMeaning {
  keywords: string[]
  keywordsKo?: string[]
  meaning: string
  meaningKo?: string
  /**
   * Optional concise guidance distilled from the meaning.
   * If absent, consumers can derive advice from keywords/meaning.
   */
  advice?: string
  adviceKo?: string
}

export interface Card {
  id: number
  name: string
  nameKo: string // Required to match tarot-data.ts Card interface
  arcana: Arcana
  suit: Suit
  image: string
  upright: CardMeaning
  reversed: CardMeaning
}

export interface DrawnCard {
  card: Card
  isReversed: boolean
}

export interface SpreadPosition {
  title: string
  titleKo?: string
}

export interface Spread {
  id: string
  title: string
  titleKo?: string
  cardCount: number
  description: string
  descriptionKo?: string
  positions: SpreadPosition[]
}

export interface TarotTheme {
  id: string
  category: string
  categoryKo?: string
  description: string
  descriptionKo?: string
  spreads: Spread[]
}

// Premium Interpretation Types (Tier 4-6)

export interface BirthCardInfo {
  primary_card: string
  korean: string
  life_path: number
  traits: string[]
  shadow: string
}

export interface YearCardInfo {
  year_card: string
  year_card_korean: string
  personal_year: number
  theme: string
}

export interface PersonalizationData {
  birth_card?: BirthCardInfo
  year_card?: YearCardInfo
  personal_connections: string[]
}

export interface NarrativeData {
  opening_hook: string
  resolution: string
  card_transitions: string[]
  arc_structure: string
  tone: {
    mood: string
    keywords: string[]
  }
}

export interface CardInsight {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
  spirit_animal?: string | null
  chakra?: string | null
  element?: string | null
  shadow?: string | null
  multi_layer?: {
    surface: string
    psychological: string
    shadow: string
    spiritual: string
    action: string
  }
}

export interface TarotInterpretationResult {
  overall_message: string
  card_insights: CardInsight[]
  guidance: string
  affirmation: string
  combinations: string[]
  followup_questions: string[]
  fallback?: boolean
  // Premium fields (Tier 4-6)
  personalization?: PersonalizationData
  narrative?: NarrativeData
}
