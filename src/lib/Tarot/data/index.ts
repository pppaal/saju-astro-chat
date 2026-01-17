/**
 * @file Main entry point for tarot deck data
 * Combines all card suits into a complete 78-card deck
 */

import { getCardImagePath } from '../tarot.types';
import type { RawCard } from './tarot-types';
import { majorArcanaCards } from './major-arcana';
import { wandsCards } from './suit-wands';
import { cupsCards } from './suit-cups';
import { swordsCards } from './suit-swords';
import { pentaclesCards } from './suit-pentacles';

// Re-export the Card interface for backward compatibility
export type { RawCard as Card } from './tarot-types';

// Combine all cards and apply image paths
const allRawCards: RawCard[] = [
  ...majorArcanaCards,
  ...wandsCards,
  ...cupsCards,
  ...swordsCards,
  ...pentaclesCards,
];

// Apply proper image paths to all cards
export const tarotDeck = allRawCards.map(card => ({
  ...card,
  image: getCardImagePath(card.id)
}));

export default tarotDeck;
