// tests/components/v9/Tally.test.tsx
//
// 집계 — 4칸 막대(0 칸은 막대에서 빠지고 범례엔 0), 판정 라벨 ko/en, 한 줄 합의(AgreeLine).

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import Tally, { AgreeLine } from '@/components/v9/Tally'
import { tallyCrossRows } from '@/lib/report/natalCross'

describe('Tally', () => {
  it('7 · 5 · 1 · 2 → 비례 막대 + SAME 7 · SUPPORTIVE 5 · TWO PULLS 1 · UNRELATED 2', () => {
    const { container } = render(
      <Tally counts={{ same: 7, supportive: 5, twoPulls: 1, unrelated: 2 }} locale="en" />
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute('data-total')).toBe('15')
    const bar = container.querySelector('[data-seg]')!.parentElement as HTMLElement
    expect(bar.style.gridTemplateColumns).toBe('7fr 5fr 1fr 2fr')
    const keys = [...container.querySelectorAll('li')].map((li) => li.textContent)
    expect(keys).toEqual(['Same 7', 'Supportive 5', 'Two pulls 1', 'Unrelated 2'])
  })

  it('0 인 칸은 막대에서 빠지고 범례엔 0 으로 남는다', () => {
    const { container } = render(
      <Tally counts={{ same: 9, supportive: 4, twoPulls: 0, unrelated: 3 }} locale="ko" />
    )
    expect(
      [...container.querySelectorAll('[data-seg]')].map((i) => i.getAttribute('data-seg'))
    ).toEqual(['same', 'supportive', 'unrelated'])
    expect(container.querySelector('[data-key="twoPulls"]')?.textContent).toBe('두 결 0')
  })

  it('tallyCrossRows 결과를 그대로 받는다 (결핍 축 제외는 그 함수 몫)', () => {
    const counts = tallyCrossRows([
      { tone: 'resonant' },
      { tone: 'resonant', karmaAxis: true },
      { tone: 'complement' },
      { tone: 'tension' },
      { tone: 'neutral' },
    ])
    const { container } = render(<Tally counts={counts} locale="en" />)
    expect((container.firstElementChild as HTMLElement).getAttribute('data-total')).toBe('4')
  })
})

describe('AgreeLine', () => {
  it('문장 + total 칸 막대 (맞는 칸 비율)', () => {
    const { container } = render(<AgreeLine lineUp={7} total={15} locale="en" />)
    expect(container.textContent).toBe('Saju × stars line up on 7 of 15 traits')
    const bar = container.querySelector('[data-ratio]') as HTMLElement
    expect(bar.getAttribute('data-ratio')).toBe('0.467')
    expect(bar.style.gridTemplateColumns).toBe('7fr 8fr')
    // 몫 전체를 굵게 — 디자인 home9 '<b>12 of 15</b>'(QA VH-9).
    expect(container.querySelector('b')?.textContent).toBe('7 of 15')
  })

  it('전부 맞거나 0 이어도 빈 칸이 없다 · 범위 밖은 자른다', () => {
    const all = render(<AgreeLine lineUp={15} total={15} locale="en" />).container
    expect((all.querySelector('[data-ratio]') as HTMLElement).style.gridTemplateColumns).toBe(
      '15fr'
    )
    const none = render(<AgreeLine lineUp={0} total={15} locale="en" />).container
    expect((none.querySelector('[data-ratio]') as HTMLElement).style.gridTemplateColumns).toBe(
      '15fr'
    )
    expect(none.querySelectorAll('[data-ratio] i')).toHaveLength(1)
    const over = render(<AgreeLine lineUp={20} total={15} locale="en" />).container
    expect(over.textContent).toContain('15 of 15')
  })

  it('ko 문장', () => {
    const { container } = render(<AgreeLine lineUp={13} total={16} locale="ko" />)
    expect(container.textContent).toBe('사주와 별자리가 16가지 중 13가지에서 맞아요')
    expect(container.querySelector('b')?.textContent).toBe('16가지 중 13가지')
  })
})
