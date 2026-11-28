/**
 * 라우트 검색 메타 — /destiny(인생 흐름) · /calendar(운세 달력)의 로캘별 제목 · 설명, 루트 설명
 * (QA R-CA-9 · triage A4/A5). 설명은 155자 이하(검색 스니펫 잘림 · e2e/seo.spec 의 < 160), 엔진이
 * 계산한다는 말로 — 'AI 가 사주를 읽는다' 류 표현 금지. 출생 쿼리(?date=…) 보기는 noindex 이고
 * canonical 은 맨 경로.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

let locale: 'ko' | 'en' = 'en'
vi.mock('next/headers', () => ({
  headers: async () => new Map([['x-locale', locale]]),
}))
// 메타만 본다 — 화면 · 뷰모델 모듈은 가볍게.
vi.mock('@/app/destiny/LifeFlow', () => ({ default: () => null }))
vi.mock('@/app/calendar/CalendarClient', () => ({ default: () => null }))
vi.mock('@/components/push/DailyFortunePushBanner', () => ({ default: () => null }))
vi.mock('@/lib/calendar-view/lifetimeViewModel', () => ({ buildLifetimeViewModel: vi.fn() }))
vi.mock('@/lib/calendar-view/monthViewModel', () => ({ buildMonthViewModel: vi.fn() }))
vi.mock('@/lib/calendar-view/dayViewModel', () => ({ buildDayViewModel: vi.fn() }))

import { generateMetadata as destinyMeta } from '@/app/destiny/page'
import { generateMetadata as calendarMeta } from '@/app/calendar/page'
import { SITE_DESCRIPTION } from '@/components/seo/SEO'

const HANGUL = /[가-힣]/
const AI_READS = /\bAI\b[^.]*\b(reads?|analy[sz]es?)\b|AI\s*가\s*사주/i
const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Gen = typeof destinyMeta
const run = (gen: Gen, sp: Record<string, string> = {}) =>
  gen({ searchParams: Promise.resolve(sp) })

const ROUTES: Array<{
  name: string
  gen: Gen
  path: string
  title: { en: string; ko: string }
}> = [
  {
    name: '/destiny',
    gen: destinyMeta,
    path: '/destiny',
    title: { en: 'Life Flow', ko: '인생 흐름' },
  },
  {
    name: '/calendar',
    gen: calendarMeta,
    path: '/calendar',
    title: { en: 'Fortune Calendar', ko: '운세 달력' },
  },
]

describe.each(ROUTES)('$name generateMetadata — 로캘별 제목 · 설명', ({ gen, path: p, title }) => {
  beforeEach(() => {
    locale = 'en'
  })

  it('en — 제목은 루트 템플릿을 거치는 짧은 이름, 설명은 155자 이하 · 영어 · 엔진 말', async () => {
    const m = await run(gen)
    // 'DestinyPal' 을 담지 않은 제목은 루트 템플릿 '%s | DestinyPal' 이 붙는다.
    expect(m.title).toBe(title.en)
    expect(`${title.en} | DestinyPal`.length).toBeLessThan(70)
    expect(typeof m.description).toBe('string')
    expect(m.description!.length).toBeLessThanOrEqual(155)
    expect(m.description).not.toMatch(HANGUL)
    expect(m.description).toMatch(/computed/)
    expect(m.description).not.toMatch(AI_READS)
    expect(m.openGraph?.description).toBe(m.description)
    expect(m.alternates?.canonical).toBe(`${BASE}${p}`)
  })

  it('ko — 한국어 제목 · 설명(155자 이하), canonical 은 /ko 경로', async () => {
    locale = 'ko'
    const m = await run(gen)
    expect(m.title).toBe(title.ko)
    expect(m.description!.length).toBeLessThanOrEqual(155)
    expect(m.description).toMatch(HANGUL)
    expect(m.description).toMatch(/계산/)
    expect(m.description).not.toMatch(AI_READS)
    expect(m.alternates?.canonical).toBe(`${BASE}/ko${p}`)
  })

  it('맨 경로는 색인한다', async () => {
    const m = await run(gen)
    expect(m.robots).toMatchObject({ index: true })
  })

  it('출생 쿼리(?date=…) 보기는 noindex — canonical 은 맨 경로 그대로', async () => {
    const m = await run(gen, { date: '1995-02-09', time: '06:40', gender: 'female' })
    expect(m.robots).toEqual({ index: false, follow: false })
    expect(m.alternates?.canonical).toBe(`${BASE}${p}`)
    // 값이 잘못돼도(override 로 안 받아도) 출생 쿼리가 있으면 색인하지 않는다.
    const bad = await run(gen, { date: 'nope' })
    expect(bad.robots).toEqual({ index: false, follow: false })
  })
})

describe('루트 설명(SITE_DESCRIPTION) — 루트 메타 EN · og · twitter · WebSite JSON-LD', () => {
  it('en · ko 모두 155자 이하, 엔진 말, AI 가 사주를 읽는다는 표현 없음', () => {
    expect(SITE_DESCRIPTION.en.length).toBeLessThanOrEqual(155)
    expect(SITE_DESCRIPTION.ko.length).toBeLessThanOrEqual(155)
    expect(SITE_DESCRIPTION.en).not.toMatch(HANGUL)
    expect(SITE_DESCRIPTION.ko).toMatch(HANGUL)
    expect(SITE_DESCRIPTION.en).toMatch(/computed/)
    expect(SITE_DESCRIPTION.ko).toMatch(/계산/)
    for (const d of Object.values(SITE_DESCRIPTION)) expect(d).not.toMatch(AI_READS)
  })

  it('루트 레이아웃이 description · og · twitter 에 EN 을, JSON-LD 에 서버 로캘 설명을 쓴다', () => {
    const src = readFileSync(path.resolve(__dirname, '../../src/app/layout.tsx'), 'utf8')
    expect(src.match(/description: SITE_DESCRIPTION\.en/g)).toHaveLength(3)
    expect(src).toMatch(/description: SITE_DESCRIPTION\[serverLocale === 'ko' \? 'ko' : 'en'\]/)
    // 예전 문구('AI reads your Saju …', 'AI가 사주와 점성을 함께 분석해 …')가 남지 않는다.
    expect(src).not.toMatch(AI_READS)
    expect(src).not.toMatch(/AI가 사주와 점성/)
  })
})
