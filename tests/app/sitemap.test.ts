/**
 * sitemap 이 /ko 경로 프리픽스 규약대로 en/ko URL 쌍 + hreflang alternates 를
 * 내보내는지 검증. (proxy.ts 리라이트 · SEO.tsx canonical 과 한 세트)
 */

import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

describe('sitemap — 언어별 URL 쌍', () => {
  const entries = sitemap()
  const urls = new Set(entries.map((e) => e.url))

  it('루트의 en/ko 쌍이 모두 존재한다', () => {
    expect(urls.has(BASE)).toBe(true)
    expect(urls.has(`${BASE}/ko`)).toBe(true)
  })

  it('무료 허브 등 주요 페이지도 /ko 변형을 가진다', () => {
    expect(urls.has(`${BASE}/free`)).toBe(true)
    expect(urls.has(`${BASE}/ko/free`)).toBe(true)
    expect(urls.has(`${BASE}/pricing`)).toBe(true)
    expect(urls.has(`${BASE}/ko/pricing`)).toBe(true)
  })

  it('alternates 는 en/ko 가 서로 다른 URL 을 가리킨다', () => {
    for (const entry of entries) {
      const langs = entry.alternates?.languages as Record<string, string> | undefined
      if (!langs) continue
      expect(langs.en).toBeTruthy()
      expect(langs.ko).toBeTruthy()
      expect(langs.en).not.toBe(langs.ko)
      expect(langs.ko).toContain('/ko')
    }
  })

  it('모든 entry 가 alternates 쌍을 가진다(단일 URL i18n 회귀 방지)', () => {
    for (const entry of entries) {
      const langs = entry.alternates?.languages as Record<string, string> | undefined
      expect(langs, `missing alternates: ${entry.url}`).toBeTruthy()
    }
  })

  it('타로 카드 사전(인덱스 + 78장)이 en/ko 쌍으로 들어간다', () => {
    expect(urls.has(`${BASE}/tarot/cards`)).toBe(true)
    expect(urls.has(`${BASE}/ko/tarot/cards`)).toBe(true)
    expect(urls.has(`${BASE}/tarot/cards/the-fool`)).toBe(true)
    expect(urls.has(`${BASE}/ko/tarot/cards/the-fool`)).toBe(true)
    const cardEntries = entries.filter((e) => e.url.includes('/tarot/cards/'))
    // 78장 × en/ko
    expect(cardEntries).toHaveLength(156)
  })

  it('60갑자 일주(허브 + 60개)가 en/ko 쌍으로 들어간다', () => {
    expect(urls.has(`${BASE}/saju/ilju`)).toBe(true)
    expect(urls.has(`${BASE}/ko/saju/ilju`)).toBe(true)
    // 실제 슬러그 샘플 — 엔진이 만드는 값과 사이트맵이 어긋나지 않는지
    expect(urls.has(`${BASE}/saju/ilju/gapja`)).toBe(true)
    expect(urls.has(`${BASE}/ko/saju/ilju/sinmi`)).toBe(true)
    const detail = entries.filter((e) => /\/saju\/ilju\/[a-z]+$/.test(e.url))
    // 60개 × en/ko
    expect(detail).toHaveLength(120)
  })

  it('일간 궁합은 **허브만** 올린다 — 상세 55쌍은 의도적 제외(thin content)', () => {
    expect(urls.has(`${BASE}/compatibility/ilgan`)).toBe(true)
    expect(urls.has(`${BASE}/ko/compatibility/ilgan`)).toBe(true)
    // 실측에서 55쌍 중 서로 다른 사실집합이 15개뿐이었다(십성이 오행관계 ×
    // 음양으로 결정돼 수렴). 40쌍이 사실상 중복이라 색인에 올리지 않고
    // noindex + 사이트맵 제외로 둔다. 이 가드가 실수로 다시 들어오는 걸 막는다.
    const pairs = entries.filter((e) => /\/compatibility\/ilgan\/[a-z]+-[a-z]+$/.test(e.url))
    expect(pairs).toHaveLength(0)
  })

  it('십성 사전(허브 + 10개)이 en/ko 쌍으로 들어간다', () => {
    expect(urls.has(`${BASE}/saju/sibsin`)).toBe(true)
    expect(urls.has(`${BASE}/ko/saju/sibsin`)).toBe(true)
    expect(urls.has(`${BASE}/saju/sibsin/jeongjae`)).toBe(true)
    expect(urls.has(`${BASE}/ko/saju/sibsin/pyeongwan`)).toBe(true)
    const detail = entries.filter((e) => /\/saju\/sibsin\/[a-z]+$/.test(e.url))
    // 10개 × en/ko
    expect(detail).toHaveLength(20)
  })

  it('중복 URL 이 없다', () => {
    expect(urls.size).toBe(entries.length)
  })
})
