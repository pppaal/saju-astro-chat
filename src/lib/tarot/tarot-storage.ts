// 타로 리딩 결과 저장 및 관리

import { DrawnCard, Spread } from './tarot.types'
import type { TarotQuestionAnalysisSnapshot } from './questionFlow'
import { logger } from '@/lib/logger'

export interface SavedTarotReading {
  id: string
  timestamp: number
  question: string
  questionAnalysis?: TarotQuestionAnalysisSnapshot | null
  storageOrigin?: 'local' | 'server'
  spread: {
    title: string
    titleKo?: string
    cardCount: number
  }
  cards: {
    name: string
    nameKo?: string
    isReversed: boolean
    position: string
    positionKo?: string
  }[]
  interpretation: {
    overallMessage: string
    guidance: string
    cardInsights: {
      position: string
      cardName: string
      interpretation: string
    }[]
  }
  categoryId: string
  spreadId: string
  deckStyle?: string
}

const STORAGE_KEY = 'tarot_saved_readings'
const MAX_SAVED_READINGS = 50
const RESTORE_STORAGE_PREFIX = 'tarot_restore_reading:'

type ServerSavedCard = {
  name?: string
  isReversed?: boolean
  position?: string
}

type ServerSavedInsight = {
  position?: string
  card_name?: string
  interpretation?: string
}

type ServerSavedReading = {
  id: string
  createdAt: string | Date
  question?: string | null
  theme?: string | null
  spreadId?: string | null
  spreadTitle?: string | null
  cards?: ServerSavedCard[] | null
  questionContext?: TarotQuestionAnalysisSnapshot | null
  overallMessage?: string | null
  guidance?: string | null
  cardInsights?: ServerSavedInsight[] | null
}

function normalizeQuestionText(
  question: string,
  spread: Pick<Spread, 'title' | 'titleKo'>
): string {
  const trimmed = question.trim()
  if (trimmed) {
    return trimmed
  }
  return spread.titleKo || spread.title || 'Tarot reading'
}

// 저장된 리딩 목록 가져오기
export function getSavedReadings(): SavedTarotReading[] {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (e) {
    logger.error('Failed to parse saved readings from localStorage:', e)
    return []
  }
}

// 리딩 저장하기
export function saveReading(
  reading: Omit<SavedTarotReading, 'id' | 'timestamp'>
): SavedTarotReading {
  const savedReading: SavedTarotReading = {
    ...reading,
    id: generateId(),
    timestamp: Date.now(),
    storageOrigin: reading.storageOrigin || 'local',
  }

  const readings = getSavedReadings()
  readings.unshift(savedReading)

  // 최대 저장 개수 제한
  const trimmed = readings.slice(0, MAX_SAVED_READINGS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (e) {
    logger.error('Failed to save reading:', e)
  }

  return savedReading
}

// 리딩 삭제하기
export function deleteReading(id: string): boolean {
  const readings = getSavedReadings()
  const filtered = readings.filter((r) => r.id !== id)

  if (filtered.length === readings.length) {
    return false
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (e) {
    logger.error('Failed to delete reading:', e)
    return false
  }
}

export function storeReadingRestorePayload(reading: SavedTarotReading): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  const key = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  try {
    window.sessionStorage.setItem(
      `${RESTORE_STORAGE_PREFIX}${key}`,
      JSON.stringify({
        reading,
        savedAt: Date.now(),
      })
    )
    return key
  } catch (e) {
    logger.error('Failed to store reading restore payload:', e)
    return null
  }
}

export function loadReadingRestorePayload(key?: string | null): SavedTarotReading | null {
  if (typeof window === 'undefined' || !key) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(`${RESTORE_STORAGE_PREFIX}${key}`)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as { reading?: SavedTarotReading }
    return parsed.reading || null
  } catch (e) {
    logger.error('Failed to load reading restore payload:', e)
    return null
  }
}

// ID 생성
function generateId(): string {
  return `tarot_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// 리딩 결과를 저장 형식으로 변환
export function formatReadingForSave(
  question: string,
  spread: Spread,
  drawnCards: DrawnCard[],
  interpretation: {
    overall_message?: string
    guidance?: string
    card_insights?: {
      position: string
      card_name: string
      interpretation: string
    }[]
  } | null,
  categoryId: string,
  spreadId: string,
  deckStyle?: string,
  questionAnalysis?: TarotQuestionAnalysisSnapshot | null
): Omit<SavedTarotReading, 'id' | 'timestamp'> {
  return {
    question: normalizeQuestionText(question, spread),
    questionAnalysis: questionAnalysis || null,
    storageOrigin: 'local',
    spread: {
      title: spread.title,
      titleKo: spread.titleKo,
      cardCount: spread.cardCount,
    },
    cards: drawnCards.map((dc, idx) => ({
      name: dc.card.name,
      nameKo: dc.card.nameKo,
      isReversed: dc.isReversed,
      position: spread.positions[idx]?.title || `Card ${idx + 1}`,
      positionKo: spread.positions[idx]?.titleKo,
    })),
    interpretation: {
      overallMessage: interpretation?.overall_message || '',
      guidance: interpretation?.guidance || '',
      cardInsights:
        interpretation?.card_insights?.map((ci) => ({
          position: ci.position,
          cardName: ci.card_name,
          interpretation: ci.interpretation,
        })) || [],
    },
    categoryId,
    spreadId,
    deckStyle,
  }
}

export function mapServerReadingToSavedReading(reading: ServerSavedReading): SavedTarotReading {
  const cards = Array.isArray(reading.cards) ? reading.cards : []
  const cardInsights = Array.isArray(reading.cardInsights) ? reading.cardInsights : []
  const createdAt =
    reading.createdAt instanceof Date
      ? reading.createdAt.getTime()
      : new Date(reading.createdAt).getTime()

  return {
    id: reading.id,
    timestamp: Number.isFinite(createdAt) ? createdAt : Date.now(),
    question: (reading.question || '').trim() || reading.spreadTitle || 'Tarot reading',
    questionAnalysis: reading.questionContext || null,
    storageOrigin: 'server',
    spread: {
      title: reading.spreadTitle || 'Tarot Reading',
      cardCount: cards.length,
    },
    cards: cards.map((card, index) => ({
      name: card.name || `Card ${index + 1}`,
      isReversed: Boolean(card.isReversed),
      position: card.position || `Card ${index + 1}`,
    })),
    interpretation: {
      overallMessage: reading.overallMessage || '',
      guidance: reading.guidance || '',
      cardInsights: cardInsights.map((insight) => ({
        position: insight.position || '',
        cardName: insight.card_name || '',
        interpretation: insight.interpretation || '',
      })),
    },
    categoryId: reading.theme || 'general',
    spreadId: reading.spreadId || '',
  }
}

// 날짜/시간 포맷터는 src/app/tarot/history/historyClientUtils.ts 에 자체 구현이 있어 그쪽 사용.
// 이전에는 공개 export 두었으나 어디서도 import 하지 않음 → 제거.
