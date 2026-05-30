import React from 'react'

/**
 * 마커 스트립 helper — LLM 이 답변에 박는 `**bold**` / `*emph*` 마커를 plain
 * text 로 정리한다. 옛 동작 (renderHighlighted 가 amber 강조) 은 사용자 요청
 * (옵션 B) 에 따라 끔. 결과 일관성 — "마지막 문장만 강조" 가 유일한 강조 룰.
 */
function stripMarkers(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1')
}

/**
 * 옛 동작: LLM 마커를 amber 강조로 변환.
 * 새 동작: 마커 제거 후 plain text — "마지막 문장만 강조" 정책 (UX 일관성).
 *
 * 다른 곳에서 직접 호출하는 경우를 위해 sig 는 유지. 호출자는 일반 텍스트만 받음.
 */
export function renderHighlighted(text: string): React.ReactNode {
  return stripMarkers(text)
}

/**
 * 문장 종결 부호 (한국어/영어 공통) 기준으로 텍스트를 문장 배열로 split.
 * 줄바꿈도 문장 경계로 간주. 빈 문자열 제거.
 */
function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

// 마지막 문장 강조 최소/최대 길이 — 너무 짧으면 ("응.") 강조 의미 없고,
// 너무 길면 (전체 단락) 강조 무의미.
const LAST_SENTENCE_MIN_CHARS = 6
const LAST_SENTENCE_MAX_CHARS = 200

/**
 * 마지막 문장 자동 하이라이트 — 유일한 강조 룰.
 *
 * 각 텍스트 블록 (타로 overall_message / 카드 interpretation / advice item) 마다
 * 마지막 문장 (= 결론/액션) 을 amber 톤 highlight 로 시각 분리. 사용자가
 * 결론만 빠르게 훑어볼 수 있게 한다.
 *
 * 안전장치:
 *  - 문장 1개 이하 → 일반 렌더 (마커 stripped plain text)
 *  - 마지막 문장이 너무 짧거나 길면 강조 skip (전체 plain text)
 *
 * LLM 이 박는 `**` / `*` 마커는 강조 안 함 (사용자 요청 — 일관성). 마커는
 * plain text 에서 제거됨.
 */
export function renderWithLastSentenceHighlight(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text
  const cleaned = stripMarkers(text)
  const sentences = splitIntoSentences(cleaned)
  if (sentences.length <= 1) return cleaned

  const last = sentences[sentences.length - 1]
  if (last.length < LAST_SENTENCE_MIN_CHARS || last.length > LAST_SENTENCE_MAX_CHARS) {
    return cleaned
  }

  // 원문에서 마지막 문장의 시작 인덱스 찾기 — split 후 join 시 공백 손실 방지.
  const lastIdx = cleaned.lastIndexOf(last)
  if (lastIdx < 0) return cleaned
  const lead = cleaned.slice(0, lastIdx)

  return (
    <>
      {lead}
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-100 font-medium ring-1 ring-amber-400/30">
        {last}
      </span>
    </>
  )
}
