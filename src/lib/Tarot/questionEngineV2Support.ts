import { prepareForMatching } from './utils/koreanTextNormalizer'
import { recommendSpreads } from './tarot-recommend'
import { tarotThemes } from './tarot-spreads-data'
export type QuestionEngineV2FallbackReason =
  | 'auth_failed'
  | 'server_error'
  | 'network_error'
  | 'parse_failed'
  | 'no_candidate'

export type EngineLanguage = 'ko' | 'en'
export type AnalyzeSource = 'llm' | 'heuristic' | 'fallback'
export type QuestionSubject =
  | 'self'
  | 'other_person'
  | 'relationship'
  | 'overall_flow'
  | 'external_situation'
export type QuestionTimeframe = 'immediate' | 'near_term' | 'current_phase' | 'mid_term' | 'open'
export type QuestionTone = 'prediction' | 'advice' | 'emotion' | 'flow'
export type TarotQuestionIntent =
  | 'self_decision'
  | 'other_person_response'
  | 'meeting_likelihood'
  | 'near_term_outcome'
  | 'timing'
  | 'reconciliation'
  | 'inner_feelings'
  | 'unknown'

export interface SpreadOption {
  id: string
  themeId: string
  themeTitle: string
  themeTitleKo: string
  title: string
  titleKo: string
  cardCount: number
}

export interface QuestionProfileField {
  code: string
  label: string
}

export interface QuestionProfile {
  type: QuestionProfileField
  subject: QuestionProfileField
  focus: QuestionProfileField
  timeframe: QuestionProfileField
  tone: QuestionProfileField
}

export interface StructuredIntent {
  questionType: TarotQuestionIntent
  subject: QuestionSubject
  focus: string
  timeframe: QuestionTimeframe
  tone: QuestionTone
}

export interface EngineSpreadOption {
  themeId: string
  themeTitle: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  reason: string
  matchScore: number | null
  path: string
  recommended: boolean
}

export interface LLMAnalysisPayload {
  questionType?: string
  subject?: string
  focus?: string
  timeframe?: string
  tone?: string
  themeId?: string
  spreadId?: string
  reason?: string
  userFriendlyExplanation?: string
  directAnswer?: string
}

export interface PrimarySelection {
  themeId: string
  spreadId: string
  reason: string
  userFriendlyExplanation: string
}

export interface QuestionEngineV2Result {
  isDangerous: boolean
  message?: string
  themeId: string
  spreadId: string
  spreadTitle: string
  cardCount: number
  userFriendlyExplanation: string
  question_summary: string
  question_profile: QuestionProfile
  direct_answer: string
  intent: string
  intent_label: string
  recommended_spreads: EngineSpreadOption[]
  path: string
  source: AnalyzeSource
  fallback_reason: QuestionEngineV2FallbackReason | null
}

const DANGEROUS_KEYWORDS = [
  '자살',
  '죽고 싶',
  '죽을래',
  '살기 싫',
  '끝내고 싶',
  '죽어버릴',
  '자해',
  '목숨',
  '생을 마감',
  '세상 떠나',
  'suicide',
  'kill myself',
  'end my life',
  'want to die',
]

export function getSpreadOptions(): SpreadOption[] {
  const options: SpreadOption[] = []

  for (const theme of tarotThemes) {
    for (const spread of theme.spreads) {
      options.push({
        id: spread.id,
        themeId: theme.id,
        themeTitle: theme.category,
        themeTitleKo: theme.categoryKo || theme.category,
        title: spread.title,
        titleKo: spread.titleKo || spread.title,
        cardCount: spread.cardCount,
      })
    }
  }

  return options
}

export function buildPath(themeId: string, spreadId: string, question: string) {
  return `/tarot/${themeId}/${spreadId}?question=${encodeURIComponent(question)}`
}

export function isDangerousQuestion(question: string) {
  const normalized = question.toLowerCase()
  return DANGEROUS_KEYWORDS.some((keyword) => normalized.includes(keyword.toLowerCase()))
}



