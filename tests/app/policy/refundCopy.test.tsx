/**
 * 환불 정책의 "일부 사용" 예시는 pricing.ts(SSOT)의 플러스팩 크기를 따라야 한다.
 * 옛 문구는 "50크레딧 플러스팩"을 하드코딩해 팩 개편(plus=70) 뒤에도 남아 있었다.
 * pricing 을 센티널 값으로 목킹해 렌더가 리터럴이 아니라 CREDIT_PACKS 를 읽는지 확인한다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'

const h = vi.hoisted(() => ({
  locale: 'en' as 'en' | 'ko',
  // 실제 팩 크기(70)와도, 옛 리터럴(50)과도 겹치지 않는 값.
  SENTINEL_PLUS: 123,
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({
    locale: h.locale,
    t: (_path: string, fallback?: string) => fallback ?? _path,
  }),
}))

vi.mock('@/app/policy/_components/policyDocument.module.css', () => ({
  default: new Proxy({}, { get: (_t, k: string) => k }),
}))

vi.mock('@/components/ui/ScrollToTop', () => ({
  default: ({ label }: { label: string }) => <button data-testid="scroll-to-top">{label}</button>,
}))

vi.mock('@/lib/config/pricing', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config/pricing')>()
  return {
    ...actual,
    CREDIT_PACKS: {
      ...actual.CREDIT_PACKS,
      plus: { ...actual.CREDIT_PACKS.plus, credits: h.SENTINEL_PLUS },
    },
  }
})

import RefundPage from '@/app/policy/refund/page'

function sectionText(): string {
  const section = document.getElementById('credit-pack-purchases')
  expect(section, 'credit-pack-purchases section should render').not.toBeNull()
  return section!.textContent ?? ''
}

afterEach(() => {
  cleanup()
  h.locale = 'en'
})

describe('refund policy — Plus pack example follows pricing.ts', () => {
  it('en: renders the Plus pack size from CREDIT_PACKS, not a literal', () => {
    h.locale = 'en'
    render(<RefundPage />)
    const text = sectionText()
    const n = h.SENTINEL_PLUS
    expect(text).toContain(`${n}-credit Plus Pack`)
    expect(text).toContain(`the remaining ${n - 1} credits are not refundable`)
    expect(text).not.toMatch(/\b50-credit\b/)
    expect(text).not.toMatch(/\b70-credit\b/)
  })

  it('ko: renders the Plus pack size from CREDIT_PACKS, not a literal', () => {
    h.locale = 'ko'
    render(<RefundPage />)
    const text = sectionText()
    const n = h.SENTINEL_PLUS
    expect(text).toContain(`${n}크레딧 플러스팩`)
    expect(text).toContain(`남은 ${n - 1}개에 대해서도 환불받을 수 없습니다`)
    expect(text).not.toContain('50크레딧')
    expect(text).not.toContain('70크레딧')
  })
})
