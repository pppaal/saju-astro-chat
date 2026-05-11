import type { TarotQuestionAnalysisSnapshot } from './questionFlow'
import type { Prisma } from '@prisma/client'

type SavedCardRecord = Record<string, unknown>

type StoredCardsEnvelope = {
  items: SavedCardRecord[]
  questionContext?: TarotQuestionAnalysisSnapshot | null
}

export function buildStoredCardsPayload(
  cards: SavedCardRecord[],
  questionContext?: TarotQuestionAnalysisSnapshot | null
): Prisma.InputJsonObject {
  const payload: StoredCardsEnvelope = {
    items: cards,
  }

  if (questionContext) {
    payload.questionContext = questionContext
  }

  return payload as Prisma.InputJsonObject
}

export function extractStoredCards(cardsValue: unknown): SavedCardRecord[] {
  if (Array.isArray(cardsValue)) {
    return cardsValue as SavedCardRecord[]
  }

  if (!cardsValue || typeof cardsValue !== 'object') {
    return []
  }

  const envelope = cardsValue as StoredCardsEnvelope
  return Array.isArray(envelope.items) ? (envelope.items as SavedCardRecord[]) : []
}

export function extractStoredQuestionContext(
  cardsValue: unknown
): TarotQuestionAnalysisSnapshot | null {
  if (!cardsValue || typeof cardsValue !== 'object' || Array.isArray(cardsValue)) {
    return null
  }

  const envelope = cardsValue as StoredCardsEnvelope
  const questionContext = envelope.questionContext

  if (!questionContext || typeof questionContext !== 'object') {
    return null
  }

  return questionContext
}
