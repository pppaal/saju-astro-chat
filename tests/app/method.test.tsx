// /method 렌더 스모크 + /faq 데이터 일관성.
//
// - /method: 서버 컴포넌트를 await 해서 렌더. h1 하나, 직접 답변 첫 문단(40–70 단어),
//   JSON-LD 3개(Article · BreadcrumbList · FAQPage), 보이는 FAQ = 스키마 FAQ,
//   본문 900–1400 단어, 금지 표현 없음, /ko 요청은 noindex.
// - /faq: 화면 FAQ 목록(faqData.ts)과 레이아웃 FAQPage JSON-LD 가 같은 항목이어야 한다.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const headerState = { locale: 'en' as 'en' | 'ko' }

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => ({
    get: (name: string) => (name === 'x-locale' ? headerState.locale : null),
    has: (name: string) => name === 'x-locale',
  })),
}))

vi.mock('@/app/method/method.module.css', () => ({
  default: new Proxy({}, { get: (_t, k: string) => k }),
}))

import MethodPage, { generateMetadata as methodMetadata } from '@/app/method/page'
import FaqLayout from '@/app/faq/layout'
import { FAQ_ITEMS, faqItemsForJsonLd } from '@/app/faq/faqData'

function readJsonLd(container: HTMLElement): Array<Record<string, unknown>> {
  return Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
    (el) => JSON.parse(el.textContent ?? '{}') as Record<string, unknown>
  )
}

function wordCount(text: string): number {
  return text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => /[A-Za-z0-9]/.test(w)).length
}

beforeEach(() => {
  headerState.locale = 'en'
})

afterEach(() => {
  cleanup()
})

describe('/method page', () => {
  it('renders exactly one h1 and a 40–70 word direct-answer lead', async () => {
    const ui = await MethodPage()
    const { container } = render(ui)

    const h1s = container.querySelectorAll('h1')
    expect(h1s).toHaveLength(1)
    expect(h1s[0].textContent).toBe('How DestinyPal computes a reading')

    const lead = container.querySelector('.lead')
    expect(lead).not.toBeNull()
    const n = wordCount(lead!.textContent ?? '')
    expect(n).toBeGreaterThanOrEqual(40)
    expect(n).toBeLessThanOrEqual(70)
  })

  it('does not wrap content in <main> (root layout owns it) and uses <article>', async () => {
    const ui = await MethodPage()
    const { container } = render(ui)
    expect(container.querySelector('main')).toBeNull()
    expect(container.querySelector('article')).not.toBeNull()
  })

  it('emits Article, BreadcrumbList and FAQPage JSON-LD that match the visible content', async () => {
    const ui = await MethodPage()
    const { container } = render(ui)
    const blocks = readJsonLd(container)
    const types = blocks.map((b) => b['@type'])
    expect(types).toEqual(['Article', 'BreadcrumbList', 'FAQPage'])

    const article = blocks[0]
    expect(article.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(article.datePublished).toBe(article.dateModified)
    expect(article.headline).toBe('How DestinyPal Computes a Reading')
    expect(article.mainEntityOfPage).toBe('http://localhost:3000/method')

    const crumbs = (blocks[1].itemListElement as Array<{ item: string }>).map((c) => c.item)
    expect(crumbs).toEqual(['http://localhost:3000', 'http://localhost:3000/method'])

    const faqEntities = blocks[2].mainEntity as Array<{
      name: string
      acceptedAnswer: { text: string }
    }>
    expect(faqEntities).toHaveLength(5)
    const visibleQs = Array.from(container.querySelectorAll('h3.faqQ')).map((h) => h.textContent)
    expect(visibleQs).toEqual(faqEntities.map((f) => f.name))
    for (const f of faqEntities) {
      expect(container.textContent).toContain(f.acceptedAnswer.text)
    }
  })

  it('has 900–1400 words of body copy, no undefined, no banned claims', async () => {
    const ui = await MethodPage()
    const { container } = render(ui)
    const article = container.querySelector('article')!
    // JSON-LD 는 본문이 아니다 — 단어 수에서 제외.
    article.querySelectorAll('script').forEach((s) => s.remove())
    const text = article.textContent ?? ''
    const n = wordCount(text)
    expect(n).toBeGreaterThanOrEqual(900)
    expect(n).toBeLessThanOrEqual(1400)
    expect(text).not.toContain('undefined')
    expect(text.toLowerCase()).not.toContain('scientifically proven')
    expect(text.toLowerCase()).not.toContain('most accurate')
    // 사이드리얼/베다 지원을 주장하지 않는다 — "planned"/"not" 문맥에서만 등장.
    expect(text).not.toMatch(/supports? (the )?sidereal/i)
    expect(text).not.toMatch(/supports? vedic/i)
  })

  it('links to the conversion surfaces, siblings and the privacy policy', async () => {
    const ui = await MethodPage()
    const { container } = render(ui)
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'))
    for (const href of [
      '/integrated-report',
      '/compatibility/free',
      '/horoscope',
      '/compatibility/signs',
      '/fortune',
      '/policy/privacy',
      '/faq',
    ]) {
      expect(hrefs).toContain(href)
    }
  })

  it('metadata: bare canonical, en + x-default only, noindex on /ko requests', async () => {
    const en = await methodMetadata()
    expect(en.alternates?.canonical).toBe('http://localhost:3000/method')
    expect(en.alternates?.languages).toEqual({
      'en-US': 'http://localhost:3000/method',
      'x-default': 'http://localhost:3000/method',
    })
    expect(en.robots).toMatchObject({ index: true })

    headerState.locale = 'ko'
    const ko = await methodMetadata()
    expect(ko.alternates?.canonical).toBe('http://localhost:3000/method')
    expect(ko.robots).toMatchObject({ index: false, follow: true })
  })
})

describe('/faq shared data', () => {
  it('contains the three method questions with non-empty ko/en fields', () => {
    const qs = FAQ_ITEMS.map((f) => f.q)
    expect(qs).toContain('Is this computed or AI-generated?')
    expect(qs).toContain('Will I get the same reading twice?')
    expect(qs).toContain('Do you support Vedic astrology?')

    for (const item of FAQ_ITEMS) {
      for (const key of ['q', 'qKo', 'a', 'aKo', 'icon', 'category'] as const) {
        expect(item[key], `${item.q} → ${key}`).toBeTruthy()
      }
    }
    // 질문 중복 없음(스키마 Question 중복 방지).
    expect(new Set(qs).size).toBe(qs.length)
  })

  it('answers the Vedic question honestly (not yet)', () => {
    const vedic = FAQ_ITEMS.find((f) => f.q === 'Do you support Vedic astrology?')!
    expect(vedic.a).toMatch(/^Not yet\./)
    expect(vedic.a).toContain('tropical')
  })

  it('layout FAQPage JSON-LD is built from the same list the page renders (en and ko)', async () => {
    const enUi = await FaqLayout({ children: <div data-testid="child" /> })
    const en = render(enUi)
    const enBlocks = readJsonLd(en.container)
    const enFaq = enBlocks.find((b) => b['@type'] === 'FAQPage')!
    const enEntities = enFaq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>
    expect(enEntities).toHaveLength(FAQ_ITEMS.length)
    expect(enEntities.map((e) => e.name)).toEqual(faqItemsForJsonLd('en').map((f) => f.question))
    expect(enEntities.map((e) => e.acceptedAnswer.text)).toEqual(FAQ_ITEMS.map((f) => f.a))
    cleanup()

    headerState.locale = 'ko'
    const koUi = await FaqLayout({ children: <div /> })
    const ko = render(koUi)
    const koFaq = readJsonLd(ko.container).find((b) => b['@type'] === 'FAQPage')!
    const koEntities = koFaq.mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>
    expect(koEntities.map((e) => e.name)).toEqual(FAQ_ITEMS.map((f) => f.qKo))
    expect(koEntities.map((e) => e.acceptedAnswer.text)).toEqual(FAQ_ITEMS.map((f) => f.aKo))
  })
})
