/**
 * 타로 결과 하이라이트 — 마지막 문장만 강조 (옵션 B 정책).
 * LLM 마커 (** / *) 는 plain text 로 정리, amber 강조 X.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  renderHighlighted,
  renderWithLastSentenceHighlight,
} from '@/app/tarot/[categoryName]/[spreadId]/components/ResultsView/highlight'

describe('renderHighlighted — LLM 마커 정리 (옵션 B)', () => {
  it('**bold** 마커 제거, plain text', () => {
    const { container } = render(<>{renderHighlighted('plain **strong** tail')}</>)
    expect(container.textContent).toBe('plain strong tail')
    expect(container.querySelector('strong')).toBeNull()
  })

  it('*emph* 마커 제거', () => {
    const { container } = render(<>{renderHighlighted('plain *emph* tail')}</>)
    expect(container.textContent).toBe('plain emph tail')
  })

  it('마커 없으면 원문 그대로', () => {
    const { container } = render(<>{renderHighlighted('no markers here')}</>)
    expect(container.textContent).toBe('no markers here')
  })
})

describe('renderWithLastSentenceHighlight — 마지막 문장만 강조', () => {
  it('여러 문장 → 마지막 문장만 amber span', () => {
    const text = '첫 문장입니다. 둘째 문장입니다. 결론 행동입니다.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toBe('결론 행동입니다.')
  })

  it('한 문장이면 강조 안 함', () => {
    const text = '하나의 문장만 있습니다.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    expect(container.querySelector('span.ring-amber-400\\/30')).toBeNull()
  })

  it('마지막 문장이 너무 짧으면 강조 skip', () => {
    const text = '길게 설명한 단락입니다. 응.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    expect(container.querySelector('span.ring-amber-400\\/30')).toBeNull()
  })

  it('영문 문장도 처리', () => {
    const text = 'First sentence. Second sentence. Final action point here.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toBe('Final action point here.')
  })

  it('LLM 마커 (** / *) 는 본문/마지막 둘 다에서 제거 — amber 강조 X', () => {
    const text = '앞에 **중요** 단어. 마지막에 **결론** 문장이에요.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('앞에 중요 단어. 마지막에 결론 문장이에요.')
    // 마지막 문장만 amber
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toBe('마지막에 결론 문장이에요.')
  })

  it('줄바꿈도 문장 경계로 처리', () => {
    const text = '첫 줄입니다\n둘째 줄에 핵심 메시지가 있어요.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toBe('둘째 줄에 핵심 메시지가 있어요.')
  })
})
