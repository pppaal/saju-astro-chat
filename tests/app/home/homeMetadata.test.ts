/**
 * 홈 메타데이터 — description 은 155자 이하(검색 스니펫 잘림 · e2e/seo.spec 의 < 160).
 * ko · en · 레퍼럴(?ref=) 세 갈래 모두.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

let locale: 'ko' | 'en' = 'en'
vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-locale', locale]]),
}))
vi.mock('@/app/(main)/MainPageClient', () => ({ default: () => null }))
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn() }))

import { generateMetadata } from '@/app/(main)/page'

const meta = (sp: Record<string, string> = {}) =>
  generateMetadata({ searchParams: Promise.resolve(sp) })

describe('home generateMetadata description length', () => {
  beforeEach(() => {
    locale = 'en'
  })

  it('en description is at most 155 characters', async () => {
    const m = await meta()
    expect(typeof m.description).toBe('string')
    expect(m.description!.length).toBeLessThanOrEqual(155)
    expect(m.description).toMatch(/Saju Card/)
  })

  it('ko description is at most 155 characters', async () => {
    locale = 'ko'
    const m = await meta()
    expect(m.description!.length).toBeLessThanOrEqual(155)
    expect(m.description).toMatch(/사주 카드/)
  })

  it('referral (?ref=) description is at most 155 characters', async () => {
    locale = 'ko'
    const m = await meta({ ref: 'abc123' })
    expect(m.description!.length).toBeLessThanOrEqual(155)
    expect(m.description).toMatch(/free Saju Card/)
  })
})
