import React from 'react'

/**
 * LLM 이 강조용으로 박은 *...* / **...** 마커를 시각 하이라이트로 변환.
 * - `**bold**` → 굵게 + amber 강조 (행동 트리거)
 * - `*emph*`   → amber tint (보조 강조)
 * 보안: 단순 토큰 split (innerHTML 사용 X).
 */
export function renderHighlighted(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let lastIdx = 0
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index))
    const isStrong = Boolean(m[1])
    const inner = isStrong ? m[1] : m[2]
    parts.push(
      isStrong ? (
        <strong key={`s${key++}`} className="text-amber-200 font-semibold">
          {inner}
        </strong>
      ) : (
        <span key={`e${key++}`} className="text-amber-100/90 font-medium">
          {inner}
        </span>
      )
    )
    lastIdx = m.index + m[0].length
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx))
  return parts.length > 0 ? parts : text
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
 * 마지막 문장 자동 하이라이트 + 기존 LLM 강조 마커 (single/double asterisk) 도 같이 적용.
 *
 * 각 텍스트 블록 (타로 overall_message / 카드 interpretation / advice item) 마다
 * 마지막 문장 (또는 결론부) 을 amber 톤 highlight 로 시각 분리해 사용자가
 * "결론/액션" 만 빨리 훑어볼 수 있게 한다.
 *
 * 안전장치:
 *  - 문장 1개 이하 → 일반 렌더 (renderHighlighted)
 *  - 마지막 문장이 너무 짧거나 길면 강조 skip
 */
export function renderWithLastSentenceHighlight(text: string): React.ReactNode {
  if (!text || typeof text !== 'string') return text
  const sentences = splitIntoSentences(text)
  if (sentences.length <= 1) return renderHighlighted(text)

  const last = sentences[sentences.length - 1]
  if (last.length < LAST_SENTENCE_MIN_CHARS || last.length > LAST_SENTENCE_MAX_CHARS) {
    return renderHighlighted(text)
  }

  // 원문에서 마지막 문장의 시작 인덱스 찾기 — split 후 join 시 공백 손실 방지.
  const lastIdx = text.lastIndexOf(last)
  if (lastIdx < 0) return renderHighlighted(text)
  const lead = text.slice(0, lastIdx)

  return (
    <>
      {renderHighlighted(lead)}
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-100 font-medium ring-1 ring-amber-400/30">
        {renderHighlighted(last)}
      </span>
    </>
  )
}
