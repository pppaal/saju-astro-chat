/**
 * hreflang/canonical 이 /ko 경로 프리픽스 규약(proxy.ts)과 일치하는지 검증.
 *
 * 회귀 배경: en/ko 가 같은 URL 을 canonical 로 공유해 hreflang 이 무력했고,
 * 영어/한국어 키워드가 같은 URL 을 놓고 경쟁했다. 베어 경로 = en,
 * /ko/... = ko 로 언어별 고유 URL 을 가리켜야 한다.
 */

import { describe, it, expect } from 'vitest'
import { generateLocalizedMetadata, toKoUrl } from '@/components/seo/SEO'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

describe('toKoUrl', () => {
  it('사이트 루트는 /ko 로 변환한다', () => {
    expect(toKoUrl(BASE, BASE)).toBe(`${BASE}/ko`)
    expect(toKoUrl(`${BASE}/`, BASE)).toBe(`${BASE}/ko`)
  })

  it('하위 경로는 /ko 프리픽스를 붙인다', () => {
    expect(toKoUrl(`${BASE}/free`, BASE)).toBe(`${BASE}/ko/free`)
    expect(toKoUrl(`${BASE}/blog/some-post`, BASE)).toBe(`${BASE}/ko/blog/some-post`)
  })

  it('베이스가 다른 외부 URL 은 건드리지 않는다', () => {
    expect(toKoUrl('https://example.com/x', BASE)).toBe('https://example.com/x')
  })
})

describe('generateLocalizedMetadata — 언어별 canonical/hreflang', () => {
  const input = {
    en: { title: 'Free Readings', description: 'free stuff' },
    ko: { title: '무료 리딩', description: '무료' },
    canonicalUrl: `${BASE}/free`,
  }

  it('en 로케일: canonical 은 베어 URL, hreflang 은 en/ko 가 서로 다른 URL', () => {
    const meta = generateLocalizedMetadata(input, 'en')
    expect(meta.alternates?.canonical).toBe(`${BASE}/free`)
    const langs = meta.alternates?.languages as Record<string, string>
    expect(langs['en-US']).toBe(`${BASE}/free`)
    expect(langs['ko-KR']).toBe(`${BASE}/ko/free`)
    expect(langs['x-default']).toBe(`${BASE}/free`)
    expect(langs['en-US']).not.toBe(langs['ko-KR'])
  })

  it('ko 로케일: canonical 은 /ko URL 을 가리킨다', () => {
    const meta = generateLocalizedMetadata(input, 'ko')
    expect(meta.alternates?.canonical).toBe(`${BASE}/ko/free`)
    const langs = meta.alternates?.languages as Record<string, string>
    expect(langs['en-US']).toBe(`${BASE}/free`)
    expect(langs['ko-KR']).toBe(`${BASE}/ko/free`)
    // x-default 는 언어 무관 기본 진입점(영어 베어 URL)로 고정
    expect(langs['x-default']).toBe(`${BASE}/free`)
  })

  it('og:url 도 로케일별 canonical 과 일치한다', () => {
    const en = generateLocalizedMetadata(input, 'en')
    const ko = generateLocalizedMetadata(input, 'ko')
    expect(en.openGraph?.url).toBe(`${BASE}/free`)
    expect(ko.openGraph?.url).toBe(`${BASE}/ko/free`)
  })

  it('canonicalUrl 미지정 시 사이트 루트 쌍(/ ↔ /ko)을 만든다', () => {
    const meta = generateLocalizedMetadata({ en: input.en, ko: input.ko }, 'ko')
    expect(meta.alternates?.canonical).toBe(`${BASE}/ko`)
    const langs = meta.alternates?.languages as Record<string, string>
    expect(langs['en-US']).toBe(BASE)
  })
})
