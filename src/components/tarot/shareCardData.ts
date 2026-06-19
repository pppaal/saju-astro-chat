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

// 공유 이미지엔 순수 텍스트만 박는다. 해석 프롬프트가 강조에 쓰는 `*별표*`,
// `_밑줄_`, `` `코드` ``, `#헤더`, `~취소선` 마커가 이미지에 그대로 찍히지
// 않게 출력단에서 제거한다. (프롬프트에 "마크다운 쓰지 마"를 박아도 모델이
// 또 까먹으므로, 렌더 직전 strip 이 가장 확실하다.)
export function stripMarkdown(text: string | undefined | null): string {
  return (text || '')
    .replace(/[*_`~]/g, '') // 강조/코드/취소선 마커 제거
    .replace(/^#{1,6}\s+/gm, '') // 줄머리 헤더(#) 제거
    .replace(/\s{2,}/g, ' ') // 마커 삭제로 생긴 이중 공백 정리
    .trim()
}

/**
 * 공유 카드 한 줄(hook/펀치라인) 방탄 정리 — *모델이 무엇을 뱉든* 카드에 깔끔한
 * 한 줄로 박히게 한다. 프롬프트에 "따옴표·해시태그·마침표 쓰지 마"를 박아도
 * 모델은 또 까먹으므로, 출력단에서 전부 정리한다:
 *  - 마크다운 마커 제거(stripMarkdown)
 *  - 해시태그(#viral / ＃떡밥) 제거
 *  - 개행/중복 공백 → 한 칸
 *  - 통째로 감싼 따옴표(" ' “ ” ‘ ’ 「」 『』) 벗기기
 *  - 끝에 붙은 마침표·느낌표·물결·하이픈 제거(여운은 살리되 군더더기만)
 *  - 너무 길면(모델이 글자수 무시) max 로 잘라 … 붙임
 * 빈 값이면 '' → 호출자는 overall 첫 문장으로 폴백.
 */
export function cleanShareHook(text: string | undefined | null, max = 42): string {
  let s = stripMarkdown(text)
  if (!s) return ''
  s = s.replace(/[#＃][^\s#＃]+/g, '') // 해시태그
  s = s
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() // 개행/중복공백
  s = s
    .replace(/^["'“”‘’「『(]+/, '')
    .replace(/["'”’」』)]+$/, '')
    .trim() // 감싼 따옴표
  s = s.replace(/[.!?。！？~\-—…\s]+$/, '').trim() // 끝 군더더기 구두점
  if (s.length > max) s = `${s.slice(0, max - 1).trim()}…`
  return s
}

// 해석 본문의 첫 문장(또는 폴백)을 한 줄 메시지로. 공유 이미지에 실명이
// 박히지 않게 앞머리 'OOO님,' 호명을 떼고, 너무 길지 않게 자른다.
export function pickKeyMessage(source: string | undefined | null, max = 58): string {
  let s = stripMarkdown(source)
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

// 후크 아래에 깔 "해석 티저" — 본문 앞부분을 짧게 따 "…"로 끊어 궁금증을
// 남긴다(Berger 의 curiosity gap). 실명(앞머리 호명)은 떼고, 후크와 겹치지
// 않게 호출부에서 후크가 따로 있을 때만 쓴다.
export function pickTeaser(source: string | undefined | null, max = 100): string {
  let s = stripMarkdown(source)
  if (!s) return ''
  // 실명 노출 방지 — pickKeyMessage 와 동일한 호명 제거.
  s = s.replace(/^[가-힣A-Za-z·\s]{1,12}님(께서|은|이|,|，|!|\s)+/, '').trim()
  s = s
    .replace(
      /^(?:hi|hey|hello|dear)\b[\s,]+[A-Za-z][A-Za-z'’.-]*(?:\s+[A-Za-z][A-Za-z'’.-]*){0,2}\s*[,!:.—-]+\s*/i,
      ''
    )
    .trim()
  s = s
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  if (!s) return ''
  if (/^[a-z]/.test(s)) s = s[0].toUpperCase() + s.slice(1)
  // 끊어서 궁금증 — 항상 max 근처에서 자르고 "…" 를 붙인다.
  if (s.length > max) s = s.slice(0, max).trim()
  s = s.replace(/[.!?。！？,，·\s]+$/, '').trim()
  return s ? `${s}…` : ''
}

/** 라이브 결과 화면용. */
export function buildShareDataFromReading(
  readingResult: ReadingResponse,
  interpretation: InterpretationResult | null,
  userTopic: string,
  isKo: boolean
): ShareCardData {
  const question = truncate(
    stripMarkdown(userTopic) ||
      (isKo
        ? readingResult.spread.titleKo || readingResult.spread.title
        : readingResult.spread.title),
    90
  )
  // LLM 펀치라인(정곡+여운)을 방탄 정리해 우선 사용. 비면 overall 첫 문장 폴백.
  const hook = cleanShareHook(interpretation?.hook)
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
    keyMessage:
      hook || pickKeyMessage(interpretation?.overall_message || interpretation?.affirmation),
    // 후크가 따로 있을 때만 본문 티저를 깐다(후크=주인공, 티저=궁금증 한 줄).
    // 후크가 없으면 keyMessage 가 이미 본문 첫 문장이라 중복되므로 생략.
    teaser: hook
      ? pickTeaser(interpretation?.overall_message || interpretation?.affirmation)
      : undefined,
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
      stripMarkdown(reading.question) ||
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
