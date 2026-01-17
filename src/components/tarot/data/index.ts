/**
 * @file TarotChat data modules index
 *
 * This directory contains extracted constants and utilities from TarotChat.tsx:
 * - tarot-chat-i18n.ts: I18N translations and loading messages
 * - spread-questions.ts: Spread-specific and category-based questions
 * - card-questions.ts: Card-specific, suit, court card, and combination questions
 * - dynamic-questions.ts: Dynamic question generation utilities
 */

// Re-export i18n
export { I18N, LOADING_MESSAGES } from './tarot-chat-i18n';
export type { LangKey } from './tarot-chat-i18n';

// Re-export spread questions
export { SPREAD_QUESTIONS, CATEGORY_QUESTIONS } from './spread-questions';

// Re-export card questions
export {
  CARD_SPECIFIC_QUESTIONS,
  REVERSED_QUESTIONS,
  COMBINATION_QUESTIONS,
  SUIT_QUESTIONS,
  COURT_CARD_QUESTIONS,
  MINOR_ARCANA_QUESTIONS,
  ELEMENT_INTERACTION_QUESTIONS,
  COURT_RELATIONSHIP_QUESTIONS,
} from './card-questions';

// Re-export dynamic question utilities
export {
  getSuitFromCard,
  getNumberFromCard,
  getCourtRankFromCard,
  generateDynamicQuestions,
} from './dynamic-questions';
