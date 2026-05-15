/**
 * Tarot Reading Page Types
 */

import type { Spread, DrawnCard } from '@/lib/tarot/tarot.types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/tarot/questionFlow'

export interface CardInsight {
  position: string
  card_name: string
  is_reversed: boolean
  interpretation: string
}

export interface AdviceItem {
  title: string
  detail: string
}

export interface InterpretationResult {
  overall_message: string
  card_insights: CardInsight[]
  guidance: string | AdviceItem[]
  affirmation: string
  fallback?: boolean
  interpretation_source?:
    | 'backend_rag'
    | 'gpt_fallback'
    | 'emergency_fallback'
    | 'stream_sse_fallback'
    | 'stream_json_fallback'
    | 'local_personalized_fallback'
}

export interface ReadingResponse {
  category: string
  spread: Spread
  drawnCards: DrawnCard[]
  questionContext?: TarotQuestionAnalysisSnapshot | null
}

// Alias for component compatibility
export type ReadingResult = ReadingResponse

export type GameState =
  | 'loading'
  | 'color-select'
  | 'picking'
  | 'revealing'
  | 'interpreting'
  | 'results'
  | 'error'

// Re-export types for convenience
export type { Spread, CardColor, DeckStyle } from '@/lib/tarot/tarot.types'
