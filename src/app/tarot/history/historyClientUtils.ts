'use client'

export interface HistoryQuestionProfileField {
  code?: string
  label?: string
}

export interface HistoryQuestionProfile {
  type?: HistoryQuestionProfileField
  subject?: HistoryQuestionProfileField
  focus?: HistoryQuestionProfileField
  timeframe?: HistoryQuestionProfileField
  tone?: HistoryQuestionProfileField
}

export interface HistoryQuestionAnalysisSnapshot {
  question_summary?: string | null
  direct_answer?: string | null
  question_profile?: HistoryQuestionProfile | null
}

export interface SavedTarotReading {
  id: string
  timestamp: number
  question: string
  questionAnalysis?: HistoryQuestionAnalysisSnapshot | null
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

type ServerSavedReading = {
  id: string
  createdAt: string | Date
  question?: string | null
  theme?: string | null
  spreadId?: string | null
  spreadTitle?: string | null
  cards?: Array<{
    name?: string
    isReversed?: boolean
    position?: string
  }> | null
  questionContext?: HistoryQuestionAnalysisSnapshot | null
  overallMessage?: string | null
  guidance?: string | null
  cardInsights?: Array<{
    position?: string
    card_name?: string
    interpretation?: string
  }> | null
}

const STORAGE_KEY = 'tarot_saved_readings'
const RESTORE_STORAGE_PREFIX = 'tarot_restore_reading:'

function readStoredReadings(): SavedTarotReading[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as SavedTarotReading[]) : []
  } catch {
    return []
  }
}

function writeStoredReadings(readings: SavedTarotReading[]): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings))
    return true
  } catch {
    return false
  }
}

export function getSavedReadings(): SavedTarotReading[] {
  return readStoredReadings()
}

export function deleteReading(id: string): boolean {
  const readings = readStoredReadings()
  const filtered = readings.filter((reading) => reading.id !== id)
  if (filtered.length === readings.length) {
    return false
  }

  return writeStoredReadings(filtered)
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
  } catch {
    return null
  }
}

function formatReadingDate(timestamp: number, isKo: boolean): string {
  const date = new Date(timestamp)
  if (isKo) {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatRelativeTime(timestamp: number, isKo: boolean): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) {
    return isKo ? '방금 전' : 'Just now'
  }
  if (minutes < 60) {
    return isKo ? `${minutes}분 전` : `${minutes} min ago`
  }
  if (hours < 24) {
    return isKo ? `${hours}시간 전` : `${hours}h ago`
  }
  if (days < 7) {
    return isKo ? `${days}일 전` : `${days}d ago`
  }

  return formatReadingDate(timestamp, isKo)
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
