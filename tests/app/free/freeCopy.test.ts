/**
 * /free 카피 가드 — 교차검증 엔진은 "일치한 지점만" 골라내지 않는다.
 * 엔진은 사주·별자리가 같은 결론을 낸 곳과 엇갈린 곳을 둘 다 보여주므로, 메타 설명과
 * proofline 이 "지점만 / only where" 류의 과장으로 되돌아가지 않도록 막는다 (ko·en 둘 다).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const h = vi.hoisted(() => ({ locale: 'ko' as 'ko' | 'en' }))

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => (name === 'x-locale' ? h.locale : null),
  })),
}))

vi.mock('@/lib/metrics/index', () => ({
  recordCounter: vi.fn(),
}))

import FreeFunnelHub, { generateMetadata } from '@/app/free/page'

const FORBIDDEN = [/only where/i, /지점만/]

async function renderProofline(): Promise<string> {
  const html = renderToStaticMarkup(await FreeFunnelHub())
  const match = html.match(/<div class="fh-proofline">([\s\S]*?)<\/div>/)
  expect(match, 'proofline block should render').not.toBeNull()
  // <br> 는 공백으로, 나머지 태그(<b> 등)는 벗겨서 문장 단위로 비교한다.
  return match![1]
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

describe('/free copy — agreement and divergence, not "only where"', () => {
  beforeEach(() => {
    h.locale = 'ko'
  })

  describe.each(['ko', 'en'] as const)('locale=%s', (locale) => {
    beforeEach(() => {
      h.locale = locale
    })

    it('metadata description (and OG/Twitter copies) carry no "only where" / "지점만" claim', async () => {
      const meta = await generateMetadata()
      const descriptions = [
        meta.description,
        meta.openGraph?.description,
        meta.twitter?.description,
      ]
      for (const d of descriptions) {
        expect(typeof d).toBe('string')
        for (const re of FORBIDDEN) expect(d as string).not.toMatch(re)
      }
    })

    it('proofline carries no "only where" / "지점만" claim', async () => {
      const text = await renderProofline()
      for (const re of FORBIDDEN) expect(text).not.toMatch(re)
    })
  })

  it('ko: metadata and proofline say both agreement and divergence are shown', async () => {
    h.locale = 'ko'
    const meta = await generateMetadata()
    expect(meta.description).toContain(
      '사주와 별자리가 같은 결론을 낸 곳과 엇갈린 곳을 나눠 보여드려요.'
    )
    expect(await renderProofline()).toContain(
      '사주와 별자리가 같은 결론을 낸 곳과 엇갈린 곳을 나눠 보여드려요.'
    )
  })

  it('en: metadata and proofline say both agreement and divergence are shown', async () => {
    h.locale = 'en'
    const meta = await generateMetadata()
    expect(meta.description).toContain(
      'we show where Korean and Western astrology agree — and where they pull apart.'
    )
    expect(await renderProofline()).toContain(
      'We show where Korean and Western astrology agree — and where they pull apart.'
    )
  })
})
