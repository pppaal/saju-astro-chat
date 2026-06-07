'use client'

/**
 * 공유 카드(ShareCardData) 빌더 — 라이브 결과(ReadingResponse)와 저장 기록
 * (SavedTarotReading) 두 경로에서 같은 1:1 공유 카드를 만들도록 공통화.
 */

import type {
  ReadingResponse,
  InterpretationResult,
} from '@/app/tarot/[categoryName]/[spreadId]/types'
import { findCardBySavedName } from '@/lib/tarot/findCardByName'
import type { ShareCardData } from './TarotShareCard'

// 저장 기록 입력의 최소 구조적 타입 — historyClientUtils / tarot-storage 의
// SavedTarotReading 변형 둘 다와 호환되도록 필요한 필드만 받는다.
interface SavedReadingShareInput {
  question: string
  spread: { title: string; titleKo?: string }
  cards: Array<{ name: string; nameKo?: string; isReversed: boolean }>
  interpretation: { overallMessage: string }
}

function truncate(text: string, max: number): string {
  const t = (text || '').trim()
  return t.length > max ? `${t.slice(0, max - 1).trim()}…` : t
}

// 해석 본문의 첫 문장(또는 폴백)을 한 줄 메시지로.
export function pickKeyMessage(source: string | undefined | null, max = 80): string {
  const s = (source || '').trim()
  if (!s) return ''
  const match = s.match(/^[\s\S]*?[.!?。！？](\s|$)/)
  let sentence = (match ? match[0] : s).trim()
  if (sentence.length > max) sentence = `${sentence.slice(0, max - 1).trim()}…`
  return sentence
}

/** 라이브 결과 화면용. */
export function buildShareDataFromReading(
  readingResult: ReadingResponse,
  interpretation: InterpretationResult | null,
  userTopic: string,
  isKo: boolean
): ShareCardData {
  const question = truncate(
    (userTopic || '').trim() ||
      (isKo
        ? readingResult.spread.titleKo || readingResult.spread.title
        : readingResult.spread.title),
    90
  )
  return {
    question,
    spreadTitle: isKo
      ? readingResult.spread.titleKo || readingResult.spread.title
      : readingResult.spread.title,
    cards: readingResult.drawnCards.map((dc) => ({
      image: dc.card.image,
      name: isKo ? dc.card.nameKo || dc.card.name : dc.card.name,
      isReversed: dc.isReversed,
    })),
    keyMessage: pickKeyMessage(interpretation?.overall_message || interpretation?.affirmation),
    isKo,
  }
}

/** 저장된 과거 기록(히스토리 모달)용 — 카드 이미지는 이름으로 역추적. */
export function buildShareDataFromSavedReading(
  reading: SavedReadingShareInput,
  isKo: boolean
): ShareCardData {
  return {
    question: truncate(
      (reading.question || '').trim() ||
        (isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title),
      90
    ),
    spreadTitle: isKo ? reading.spread.titleKo || reading.spread.title : reading.spread.title,
    cards: reading.cards.map((c, idx) => {
      const full = findCardBySavedName(c, idx)
      return {
        image: full.image,
        name: isKo ? c.nameKo || full.nameKo || c.name : c.name || full.name,
        isReversed: c.isReversed,
      }
    }),
    keyMessage: pickKeyMessage(reading.interpretation.overallMessage),
    isKo,
  }
}
