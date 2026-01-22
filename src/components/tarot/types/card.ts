import type { Spread, DrawnCard } from "@/lib/Tarot/tarot.types";

/**
 * Individual card insight from AI interpretation
 */
export interface CardInsight {
  /** Position name in the spread */
  position: string;
  /** Card name */
  card_name: string;
  /** Whether the card is reversed */
  is_reversed: boolean;
  /** AI-generated interpretation for this card */
  interpretation: string;
}

/**
 * Complete AI interpretation result
 */
export interface InterpretationResult {
  /** Overall message from the reading */
  overall_message: string;
  /** Individual card insights */
  card_insights: CardInsight[];
  /** Guidance for the querent */
  guidance: string;
  /** Affirmation message */
  affirmation: string;
}

/**
 * Reading response from the API
 */
export interface ReadingResponse {
  /** Category of the reading */
  category: string;
  /** Spread used for the reading */
  spread: Spread;
  /** Cards drawn for this reading */
  drawnCards: DrawnCard[];
}
