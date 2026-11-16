/**
 * sitemap 이 /ko 경로 프리픽스 규약대로 en/ko URL 쌍 + hreflang alternates 를
 * 내보내는지, 그리고 영어 전용 표면(/horoscope·/compatibility/signs·/method)은
 * 베어 URL 하나 + en/x-default alternates 로만 올리는지 검증.
 * (proxy.ts 리라이트 · SEO.tsx generateLocalizedMetadata/generateEnglishOnlyMetadata 와 한 세트)
 */

import { describe, it, expect } from 'vitest'
import sitemap from '@/app/sitemap'
import { SUN_SIGNS } from '@/lib/astrology/sunSigns'
import { allSignPairSlugs } from '@/lib/compatibility/sunSignCompat'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 날짜를 고정해 데일리 lastModified 를 정확히 검증한다(결정론 컨벤션).
const NOW = new Date('2026-11-16T15:42:13.000Z')
const TODAY_UTC_MIDNIGHT = '2026-11-16T00:00:00.000Z'

type Langs = Record<string, string>
const langsOf = (entry: ReturnType<typeof sitemap>[number]): Langs | undefined =>
  entry.alternates?.languages as Langs | undefined

const ENGLISH_ONLY_PREFIXES = [`${BASE}/horoscope`, `${BASE}/compatibility/signs`, `${BASE}/method`]
const isEnglishOnlyUrl = (url: string) =>
  ENGLISH_ONLY_PREFIXES.some((prefix) => url === prefix || url.startsWith(`${prefix}/`))

describe('sitemap — 언어별 URL 쌍', () => {
  const entries = sitemap(NOW)
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

  it('무료 도구(캘린더·인생 곡선·통합 리포트·오늘의 타로·무료 궁합)가 en/ko 쌍으로 들어간다', () => {
    for (const path of [
      '/calendar',
      '/destiny',
      '/integrated-report',
      '/tarot/daily',
      '/compatibility/free',
    ]) {
      expect(urls.has(`${BASE}${path}`), `missing en: ${path}`).toBe(true)
      expect(urls.has(`${BASE}/ko${path}`), `missing ko: ${path}`).toBe(true)
    }
  })

  it('bilingual entry 의 alternates 는 en/ko 가 서로 다른 URL 을 가리키고, 둘 다 사이트맵에 있다', () => {
    let bilingualCount = 0
    for (const entry of entries) {
      const langs = langsOf(entry)
      if (!langs || !langs.ko) continue
      bilingualCount++
      expect(langs.en).toBeTruthy()
      expect(langs.en).not.toBe(langs.ko)
      expect(langs.ko).toContain('/ko')
      expect([langs.en, langs.ko]).toContain(entry.url)
      expect(urls.has(langs.en), `en twin missing for ${entry.url}`).toBe(true)
      expect(urls.has(langs.ko), `ko twin missing for ${entry.url}`).toBe(true)
    }
    expect(bilingualCount).toBeGreaterThan(0)
  })

  it('모든 entry 가 alternates 를 가진다(단일 URL i18n 회귀 방지) — bilingual 은 en+ko, 영어 전용은 en+x-default', () => {
    for (const entry of entries) {
      const langs = langsOf(entry)
      expect(langs, `missing alternates: ${entry.url}`).toBeTruthy()
      expect(langs?.en, `missing en alternate: ${entry.url}`).toBeTruthy()
      if (isEnglishOnlyUrl(entry.url)) {
        expect(langs?.ko, `english-only entry must not have ko: ${entry.url}`).toBeUndefined()
        expect(langs?.['x-default']).toBe(entry.url)
      } else {
        expect(langs?.ko, `bilingual entry must have ko: ${entry.url}`).toBeTruthy()
      }
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

  it('중복 URL 이 없다', () => {
    expect(urls.size).toBe(entries.length)
  })
})

describe('sitemap — 영어 전용 표면(베어 URL 하나, en + x-default)', () => {
  const entries = sitemap(NOW)
  const urls = new Set(entries.map((e) => e.url))
  const byUrl = new Map(entries.map((e) => [e.url, e]))

  const expectEnglishOnly = (url: string) => {
    const entry = byUrl.get(url)
    expect(entry, `missing entry: ${url}`).toBeTruthy()
    const langs = langsOf(entry!)
    expect(langs).toEqual({ en: url, 'x-default': url })
  }

  it('/method 가 있고 /ko/method 는 없다', () => {
    expectEnglishOnly(`${BASE}/method`)
    expect(urls.has(`${BASE}/ko/method`)).toBe(false)
  })

  it('/horoscope 허브 + 12 별자리 URL 이 있고 /ko 변형은 없다', () => {
    expectEnglishOnly(`${BASE}/horoscope`)
    expect(SUN_SIGNS).toHaveLength(12)
    for (const sign of SUN_SIGNS) {
      expectEnglishOnly(`${BASE}/horoscope/${sign.slug}`)
      expect(urls.has(`${BASE}/ko/horoscope/${sign.slug}`)).toBe(false)
    }
    const signEntries = entries.filter((e) => e.url.startsWith(`${BASE}/horoscope/`))
    expect(signEntries).toHaveLength(12)
    expect(urls.has(`${BASE}/ko/horoscope`)).toBe(false)
  })

  it('/compatibility/signs 허브 + 78 정규 쌍 URL 이 있고 /ko 변형은 없다', () => {
    expectEnglishOnly(`${BASE}/compatibility/signs`)
    const slugs = allSignPairSlugs()
    expect(slugs).toHaveLength(78)
    for (const slug of slugs) {
      expectEnglishOnly(`${BASE}/compatibility/signs/${slug}`)
      expect(urls.has(`${BASE}/ko/compatibility/signs/${slug}`)).toBe(false)
    }
    const pairEntries = entries.filter((e) => e.url.startsWith(`${BASE}/compatibility/signs/`))
    expect(pairEntries).toHaveLength(78)
    // 정규(낮은 index 먼저) 슬러그만 — 역순(leo-aries) 은 canonical 로 정규를 가리킨다
    expect(urls.has(`${BASE}/compatibility/signs/aries-leo`)).toBe(true)
    expect(urls.has(`${BASE}/compatibility/signs/leo-aries`)).toBe(false)
    expect(urls.has(`${BASE}/compatibility/signs/aries-aries`)).toBe(true)
  })

  it('영어 전용 URL 은 어느 bilingual entry 의 ko alternate 로도 등장하지 않는다', () => {
    for (const entry of entries) {
      const langs = langsOf(entry)
      if (!langs?.ko) continue
      expect(isEnglishOnlyUrl(langs.en)).toBe(false)
    }
  })
})

describe('sitemap — lastModified', () => {
  const entries = sitemap(NOW)
  const byUrl = new Map(entries.map((e) => [e.url, e]))
  const lastModOf = (url: string) => {
    const entry = byUrl.get(url)
    expect(entry, `missing entry: ${url}`).toBeTruthy()
    return entry!.lastModified
  }

  it('데일리 표면(/horoscope·/fortune)은 주입된 now 의 UTC 날짜 00:00 을 쓴다', () => {
    expect(lastModOf(`${BASE}/horoscope`)).toBe(TODAY_UTC_MIDNIGHT)
    for (const sign of SUN_SIGNS) {
      expect(lastModOf(`${BASE}/horoscope/${sign.slug}`)).toBe(TODAY_UTC_MIDNIGHT)
    }
    expect(lastModOf(`${BASE}/fortune`)).toBe(TODAY_UTC_MIDNIGHT)
    expect(lastModOf(`${BASE}/ko/fortune/rat`)).toBe(TODAY_UTC_MIDNIGHT)
  })

  it('now 미주입(Next 가 handler() 로 호출)이면 오늘의 UTC 날짜 00:00 — 요청 시각이 아니다', () => {
    const live = sitemap()
    const hub = live.find((e) => e.url === `${BASE}/horoscope`)
    const expected = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
    expect(hub?.lastModified).toBe(expected)
  })

  it('UTC 날짜 경계: 23:59Z 와 다음날 00:00Z 는 서로 다른 날짜를 낸다', () => {
    const before = sitemap(new Date('2026-11-16T23:59:59.999Z'))
    const after = sitemap(new Date('2026-11-17T00:00:00.000Z'))
    const pick = (list: ReturnType<typeof sitemap>) =>
      list.find((e) => e.url === `${BASE}/horoscope`)?.lastModified
    expect(pick(before)).toBe('2026-11-16T00:00:00.000Z')
    expect(pick(after)).toBe('2026-11-17T00:00:00.000Z')
  })

  it('상시 가족(/method·별자리 궁합 78쌍)은 가족별 단일 상수(ISO 날짜)를 쓴다', () => {
    const iso = /^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/
    expect(String(lastModOf(`${BASE}/method`))).toMatch(iso)
    const pairValues = new Set(
      allSignPairSlugs().map((slug) => String(lastModOf(`${BASE}/compatibility/signs/${slug}`)))
    )
    expect(pairValues.size).toBe(1)
    expect([...pairValues][0]).toMatch(iso)
    expect(lastModOf(`${BASE}/compatibility/signs`)).toBe([...pairValues][0])
  })

  it('블로그 글은 post.date 를 쓴다', () => {
    const post = blogPosts.find((p) => !isBlockedBlogPost(p) && Boolean(p.date))
    expect(post, 'need at least one public blog post with a date').toBeTruthy()
    expect(lastModOf(`${BASE}/blog/${post!.slug}`)).toBe(post!.date)
    expect(lastModOf(`${BASE}/ko/blog/${post!.slug}`)).toBe(post!.date)
  })

  it('같은 now 로 두 번 호출하면 deep-equal(결정론)', () => {
    expect(sitemap(NOW)).toEqual(sitemap(NOW))
  })
})
