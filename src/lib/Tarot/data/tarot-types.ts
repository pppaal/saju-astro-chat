/**
 * @file Shared types for tarot card data modules
 */

import type { Arcana, Suit } from '../tarot.types';

// Raw card data before image path is applied
export interface RawCard {
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
