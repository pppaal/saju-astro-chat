/**
 * Tarot Reading Types
 */

import type { Spread, DrawnCard } from '@/lib/Tarot/tarot.types'
import type { TarotQuestionAnalysisSnapshot } from '@/lib/Tarot/questionFlow'

export type GameState =
  | 'loading'
  | 'color-select'
  | 'picking'
  | 'revealing'
  | 'interpreting'
  | 'results'
  | 'error'

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
  combinations?: { cards: string[]; meaning: string }[]
  moon_phase_advice?: string
  followup_questions?: string[]
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
