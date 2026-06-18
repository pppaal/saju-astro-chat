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

// 해석 본문의 첫 문장(또는 폴백)을 한 줄 메시지로. 공유 이미지에 실명이
// 박히지 않게 앞머리 'OOO님,' 호명을 떼고, 너무 길지 않게 자른다.
export function pickKeyMessage(source: string | undefined | null, max = 58): string {
  let s = (source || '').trim()
  if (!s) return ''
  // 앞머리 호명 제거: "이준영님, " / "이준영 님께서" 등 → 실명 노출 방지.
  s = s.replace(/^[가-힣A-Za-z·\s]{1,12}님(께서|은|이|,|，|!|\s)+/, '').trim()
  // 영어 호명 제거: 해석 프롬프트가 영어는 'Hi {이름},' 형식으로 호명한다.
  // 'Hi'·'Hey'·'Hello'·'Dear' 로 시작하는 인사+이름만 떼므로 'Today,' 같은
  // 정상 문장 첫머리는 오삭제하지 않는다(영미권 공유 시 실명 노출 방지).
  s = s
    .replace(
      /^(?:hi|hey|hello|dear)\b[\s,]+[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2}\s*[,!:.—-]+\s*/i,
      ''
    )
    .trim()
  const match = s.match(/^[\s\S]*?[.!?。！？](\s|$)/)
  let sentence = (match ? match[0] : s).trim()
  // 호명을 떼고 남은 영어 문장의 첫 글자를 대문자로 ("a new..." → "A new...").
  if (/^[a-z]/.test(sentence)) sentence = sentence[0].toUpperCase() + sentence.slice(1)
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
    // LLM 이 직접 뽑은 공유용 후크가 있으면 그대로(짧고 강렬). 없으면 overall
    // 첫 문장을 잘라 쓰는 기존 폴백.
    keyMessage:
      (interpretation?.hook || '').trim() ||
      pickKeyMessage(interpretation?.overall_message || interpretation?.affirmation),
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
