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
  /** LLM 이 직접 뽑은 공유 카드용 한 줄 펀치라인(정곡+여운). 없으면 overall 첫 문장 폴백. */
  hook?: string
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
  // 서버(draw 라우트)가 발급한 단일-사용 nonce. interpret-stream 에 그대로
  // 넘겨 차감 면제(무료 재해석) 판정에 사용. 게스트/구버전 응답엔 없을 수 있음.
  drawNonce?: string
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
