/**
 * Deterministic 3-card relationship spread for the destiny-match oracle.
 *
 * Positions:
 *  1) present   — current state of the connection
 *  2) potential — where the relationship can grow
 *  3) advice    — what each side should bring to it
 *
 * The same (connectionId, activity, date) always yields the same draw,
 * so both partners see identical cards.
 */

import { tarotDeck } from '@/lib/Tarot/data';
import { createSeededRandom } from './seededRandom';

export type RelationshipPosition = 'present' | 'potential' | 'advice';

export interface DrawnCard {
  position: RelationshipPosition;
  id: number;
  name: string;
  nameKo: string;
  image: string;
  reversed: boolean;
  keywordsKo: string[];
  meaningKo: string;
  adviceKo: string;
}

export interface RelationshipSpread {
  spread: 'relationship-3card';
  seed: string;
  cards: DrawnCard[];
}

const POSITIONS: RelationshipPosition[] = ['present', 'potential', 'advice'];

/**
 * Build a deterministic seed for the **tarot draw**.
 *
 * Bucketed by UTC day so the cards refresh once per day. Intentionally
 * does NOT include `activity` — the same pair sees the same cards even
 * if they toggle the activity selector (only the date list should swap).
 */
export function buildOracleSeed(input: {
  connectionId: string;
  asOf: Date;
}): string {
  const yyyy = input.asOf.getUTCFullYear();
  const mm = String(input.asOf.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(input.asOf.getUTCDate()).padStart(2, '0');
  return `${input.connectionId}|${yyyy}-${mm}-${dd}`;
}

/**
 * Build the Redis cache key for a full oracle reading. Includes activity
 * because the auspicious-date list changes when activity flips, even if
 * the tarot cards stay the same.
 */
export function buildOracleCacheKey(input: {
  connectionId: string;
  activity: string;
  asOf: Date;
}): string {
  const yyyy = input.asOf.getUTCFullYear();
  const mm = String(input.asOf.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(input.asOf.getUTCDate()).padStart(2, '0');
  return `oracle:v1:${input.connectionId}:${input.activity}:${yyyy}-${mm}-${dd}`;
}

export function drawRelationshipSpread(seed: string): RelationshipSpread {
  const rng = createSeededRandom(seed);
  const deckSize = tarotDeck.length;
  const drawn: DrawnCard[] = [];
  const usedIds = new Set<number>();

  for (const position of POSITIONS) {
    let card = tarotDeck[rng.nextInt(deckSize)];
    // Avoid duplicates within a single 3-card spread
    let safety = 0;
    while (usedIds.has(card.id) && safety < 32) {
      card = tarotDeck[rng.nextInt(deckSize)];
      safety++;
    }
    usedIds.add(card.id);

    const reversed = rng.chance(0.5);
    const face = reversed ? card.reversed : card.upright;

    drawn.push({
      position,
      id: card.id,
      name: card.name,
      nameKo: card.nameKo,
      image: card.image,
      reversed,
      keywordsKo: face.keywordsKo,
      meaningKo: face.meaningKo,
      adviceKo: face.adviceKo,
    });
  }

  return { spread: 'relationship-3card', seed, cards: drawn };
}
