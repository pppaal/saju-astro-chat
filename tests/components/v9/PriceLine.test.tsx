// tests/components/v9/PriceLine.test.tsx
//
// 가격 줄 — 1회 비용(CREDIT_COSTS)과 최저가(creditsFromLabel)를 SSOT 에서 읽고 /pricing 링크.

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import PriceLine from '@/components/v9/PriceLine'
import { CREDIT_COSTS } from '@/lib/config/creditCosts'
import { creditsFromLabel } from '@/lib/config/pricing'

describe('PriceLine', () => {
  it('en — From {counselorTurn} credit · Credits from $4.99 + See pricing', () => {
    const { container } = render(<PriceLine locale="en" />)
    const p = container.querySelector('[data-price-line]') as HTMLElement
    expect(p.textContent).toBe(
      `From ${CREDIT_COSTS.counselorTurn} credit·Credits from ${creditsFromLabel('en')}See pricing`
    )
    expect(p.textContent).toContain('Credits from $4.99')
    const a = p.querySelector('a') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/pricing')
  })

  it('ko — 1크레딧부터 · 크레딧은 ₩5,900부터 + 요금제 보기', () => {
    const { container } = render(<PriceLine locale="ko" />)
    expect(container.textContent).toBe(
      `${CREDIT_COSTS.counselorTurn}크레딧부터·크레딧은 ${creditsFromLabel('ko')}부터요금제 보기`
    )
    expect(container.textContent).toContain('₩5,900')
  })

  it('복수 크레딧 · 링크 생략', () => {
    const { container } = render(<PriceLine locale="en" cost={2} showLink={false} />)
    expect(container.textContent).toContain('From 2 credits')
    expect(container.querySelector('a')).toBeNull()
  })
})
