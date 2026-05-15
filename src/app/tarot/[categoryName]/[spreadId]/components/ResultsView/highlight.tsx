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
