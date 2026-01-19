import type { DrawnCard } from './tarot.types';

export interface CardInsight {
  position: string;
  card_name: string;
  upright: boolean;
  keywords: string[];
  interpretation: string;
  spirit_animal?: {
    animal: string;
    meaning: string;
  };
  chakra?: {
    name: string;
    color: string;
    meaning: string;
  };
  shadow_work?: {
    shadow: string;
    integration: string;
  };
  element?: {
    name: string;
    quality: string;
    guidance: string;
  };
}

export interface AdviceItem {
  action: string;
  detail: string;
}

export interface InterpretationResult {
  overall_message: string;
  card_insights?: CardInsight[];
  advice?: AdviceItem[];
  affirmation?: string;
}

export interface ReadingResponse {
  cards: DrawnCard[];
  timestamp: string;
  spreadId: string;
  categoryId: string;
  theme?: {
    id: string;
    title: string;
    titleKo: string;
  };
  userTopic?: string;
}

export type GameState = 'deck-selection' | 'card-picking' | 'result';
