// Clean, human-readable types for Tarot logic. No logic changes.

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
