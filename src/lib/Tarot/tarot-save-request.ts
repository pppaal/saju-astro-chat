import { getCardImagePath, type DeckStyle, type DrawnCard, type Spread } from './tarot.types'
import type { TarotQuestionAnalysisSnapshot } from './questionFlow'

type GuidanceItem = {
  title: string
  detail: string
}

type CardInsightLike = {
  position: string
  card_name: string
  is_reversed?: boolean
  interpretation: string
}

type InterpretationLike = {
  overall_message: string
  guidance?: string | GuidanceItem[]
  card_insights?: CardInsightLike[]
  affirmation?: string
} | null

type ReadingResultLike = {
  drawnCards: DrawnCard[]
  spread: {
    positions: Array<{
      title?: string
      titleKo?: string
    }>
  }
  questionContext?: TarotQuestionAnalysisSnapshot | null
}

export interface TarotSaveRequestPayload {
  question: string
  theme?: string
  spreadId: string
  spreadTitle: string
  cards: Array<{
    cardId: string
    name: string
    image: string
    isReversed: boolean
    position: string
  }>
  overallMessage: string
  cardInsights: Array<{
    position: string
    card_name: string
    is_reversed: boolean
    interpretation: string
  }>
  guidance: string
  affirmation: string
  source: 'standalone'
  locale: string
  questionContext?: TarotQuestionAnalysisSnapshot
}

export function normalizeTarotQuestionText(
  question: string,
  spread: Pick<Spread, 'title' | 'titleKo'>,
  language: string
): string {
  const trimmed = question.trim()
  if (trimmed) {
    return trimmed
  }

  return language === 'ko'
    ? `${spread.titleKo || spread.title} 리딩`
    : `${spread.title} reading`
}

export function flattenTarotGuidance(guidance?: string | GuidanceItem[]): string {
  if (Array.isArray(guidance)) {
    return guidance.map((item) => `${item.title}: ${item.detail}`).join('\n')
  }

  return guidance || ''
}

export function buildTarotSaveRequest(input: {
  question: string
  spreadInfo: Spread
  readingResult: ReadingResultLike
  interpretation: InterpretationLike
  categoryName?: string
  spreadId: string
  selectedDeckStyle: DeckStyle
  language: string
  questionAnalysis?: TarotQuestionAnalysisSnapshot | null
}): TarotSaveRequestPayload {
  const {
    question,
    spreadInfo,
    readingResult,
    interpretation,
    categoryName,
    spreadId,
    selectedDeckStyle,
    language,
    questionAnalysis,
  } = input

  const normalizedQuestion = normalizeTarotQuestionText(question, spreadInfo, language)
  const guidanceText = flattenTarotGuidance(interpretation?.guidance)

  return {
    question: normalizedQuestion,
    theme: categoryName,
    spreadId,
    spreadTitle: language === 'ko' ? spreadInfo.titleKo || spreadInfo.title : spreadInfo.title,
    cards: readingResult.drawnCards.map((dc, idx) => ({
      cardId: String(dc.card.id),
      name: language === 'ko' ? dc.card.nameKo || dc.card.name : dc.card.name,
      image: getCardImagePath(dc.card.id, selectedDeckStyle),
      isReversed: dc.isReversed,
      position:
        language === 'ko'
          ? readingResult.spread.positions[idx]?.titleKo ||
            readingResult.spread.positions[idx]?.title ||
            `카드 ${idx + 1}`
          : readingResult.spread.positions[idx]?.title || `Card ${idx + 1}`,
    })),
    overallMessage: interpretation?.overall_message || '',
    cardInsights:
      interpretation?.card_insights?.map((ci) => ({
        position: ci.position,
        card_name: ci.card_name,
        is_reversed: Boolean(ci.is_reversed),
        interpretation: ci.interpretation,
      })) || [],
    guidance: guidanceText,
    affirmation: interpretation?.affirmation || '',
    source: 'standalone',
    locale: language,
    questionContext: questionAnalysis || readingResult.questionContext || undefined,
  }
}
