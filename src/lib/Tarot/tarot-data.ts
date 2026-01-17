/**
 * @file Re-exports tarot deck data from modular structure
 *
 * The 78-card tarot deck has been split into separate files for maintainability:
 * - data/major-arcana.ts - Major Arcana (22 cards)
 * - data/suit-wands.ts - Wands suit (14 cards)
 * - data/suit-cups.ts - Cups suit (14 cards)
 * - data/suit-swords.ts - Swords suit (14 cards)
 * - data/suit-pentacles.ts - Pentacles suit (14 cards)
 */

import { Arcana, Suit } from './tarot.types';

// Defines the structure for a single tarot card object.
export interface Card {
  id: number;
  name: string;
  nameKo: string;
  arcana: Arcana;
  suit: Suit;
  image: string;
  upright: {
    keywords: string[];
    keywordsKo: string[];
    meaning: string;
    meaningKo: string;
    advice: string;
    adviceKo: string;
  };
  reversed: {
    keywords: string[];
    keywordsKo: string[];
    meaning: string;
    meaningKo: string;
    advice: string;
    adviceKo: string;
  };
}

// Re-export the complete tarot deck from the modular data structure
export { tarotDeck } from './data';
export { default } from './data';
