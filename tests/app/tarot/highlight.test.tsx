/**
 * 타로 결과 하이라이트 helper — 마지막 문장 자동 강조 + LLM 마커 호환.
 */

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  renderHighlighted,
  renderWithLastSentenceHighlight,
} from '@/app/tarot/[categoryName]/[spreadId]/components/ResultsView/highlight'

describe('renderHighlighted — LLM 마커', () => {
  it('**bold** → strong + amber', () => {
    const { container } = render(<>{renderHighlighted('plain **strong** tail')}</>)
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('strong')
  })

  it('*emph* → span + amber', () => {
    const { container } = render(<>{renderHighlighted('plain *emph* tail')}</>)
    const span = container.querySelector('span')
    expect(span?.textContent).toBe('emph')
  })

  it('마커 없으면 원문 그대로', () => {
    const { container } = render(<>{renderHighlighted('no markers here')}</>)
    expect(container.textContent).toBe('no markers here')
  })
})

describe('renderWithLastSentenceHighlight — 마지막 문장 자동 강조', () => {
  it('여러 문장 → 마지막 문장만 amber 강조 span 으로', () => {
    const text = '첫 문장입니다. 둘째 문장입니다. 결론 행동입니다.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toContain('결론 행동입니다.')
  })

  it('한 문장이면 강조 안 함 (renderHighlighted 로 fall through)', () => {
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
    expect(highlightSpan?.textContent).toContain('Final action point here.')
  })

  it('LLM 마커가 들어와도 같이 적용 (마지막 문장 안의 **bold** 도 렌더)', () => {
    const text = '앞 문장입니다. 마지막에 **중요한** 결론.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const strong = container.querySelector('strong')
    expect(strong?.textContent).toBe('중요한')
  })

  it('줄바꿈도 문장 경계로 처리', () => {
    const text = '첫 줄입니다\n둘째 줄에 핵심 메시지가 있어요.'
    const { container } = render(<>{renderWithLastSentenceHighlight(text)}</>)
    const highlightSpan = container.querySelector('span.ring-amber-400\\/30')
    expect(highlightSpan?.textContent).toContain('둘째 줄에 핵심 메시지가 있어요.')
  })
})
