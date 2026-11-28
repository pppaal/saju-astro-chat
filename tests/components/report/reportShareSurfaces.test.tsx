/**
 * 통합 리포트 공유 표면 — 한 숫자·한 라벨·바른 조사 (감사 CR-3·CR-6·CR-8).
 *
 *  - CR-3: 링크 미리보기(OG)가 "사주 × 별자리가 3가지에서 일치"라고 말했다 — 3 은 공유
 *    페이로드의 상한(목록 3개)이지 개수가 아니었다. 리포트는 같은 차트를 "align in 7"로 센다.
 *    이제 리포트 → 공유 버튼 → API → OG 가 tallyCrossRows(rows).same 하나를 나른다.
 *    수가 없는 옛 링크는 숫자를 말하지 않는다.
 *  - CR-6: 유형 이름은 사주만으로 계산된다(결정 2) → 카드·공유 PNG·공유 페이지·OG 모두
 *    "사주 타입". 동·서양 일치 수는 교차 값이라 OG 의 "일치" 문구는 그대로.
 *  - CR-8: KO 공유 PNG 의 목적격 조사 — '관계을' 이 아니라 eulReul('관계를').
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

vi.mock('@/components/report/integrated/viral/ViralTopCard.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))
vi.mock('@/components/report/integrated/IntegratedReport.module.css', () => ({
  default: new Proxy({}, { get: (_t, k) => k }),
}))

const apiFetch = vi.fn()
vi.mock('@/lib/api/client', () => ({
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))
vi.mock('html-to-image', () => ({ toBlob: vi.fn() }))

// 공유 링크 저장소 — 공개 페이지·OG 가 읽는 값만 바꿔 끼운다(타입 가드는 실물).
const getShareLink = vi.fn()
vi.mock('@/lib/share/shareLink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/share/shareLink')>()
  return {
    ...actual,
    getShareLink: (...a: unknown[]) => getShareLink(...a),
    bumpShareViews: vi.fn(async () => 0),
  }
})
vi.mock('@/lib/metrics', () => ({ recordCounter: vi.fn() }))
vi.mock('@/lib/share/ogFont', () => ({ loadOgFonts: vi.fn(async () => []) }))
// next/og — 렌더 대신 JSX 트리를 붙잡아 텍스트로 검사한다.
vi.mock('next/og', () => ({
  ImageResponse: class {
    element: React.ReactElement
    constructor(element: React.ReactElement) {
      this.element = element
    }
  },
}))

import ViralTopCard from '@/components/report/integrated/viral/ViralTopCard'
import { ReportShareCard } from '@/components/report/integrated/viral/ReportShareCard'
import { ShareReportButton } from '@/components/report/integrated/viral/ShareReportButton'
import { IntegratedReport } from '@/components/report/integrated/IntegratedReport'
import { buildViralSummary, SAJU_TYPE_LABEL } from '@/lib/report/viralArchetype'
import { tallyCrossRows } from '@/lib/report/natalCross'
import { buildReportContext } from '@/lib/report/buildReportContext'
import { natalToReportData, type CrossRowOut } from '@/lib/report/integratedAdapter'
import OgImage from '@/app/r/[token]/opengraph-image'
import SharedReadingPage from '@/app/r/[token]/page'
import type { ReportShareLinkPayload } from '@/lib/share/shareLink'

const NOW = new Date('2026-11-25T03:00:00Z')
const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const SEVEN = ['Fortune', 'Relationships', 'Strength', 'Core Trait', 'Love', 'Wealth', 'Rhythm']

function summary(lang: 'ko' | 'en', resonant: string[], resonantCount?: number) {
  return buildViralSummary({
    dayMaster: '壬',
    strengths: ['통찰'],
    resonant,
    resonantCount,
    yongsinElement: 'metal',
    strength: 'medium',
    dominantSibsin: '정관',
    lang,
  })!
}

describe('buildViralSummary — 일치 수는 잘린 목록이 아니라 전체 수 (CR-3)', () => {
  it('resonant 는 3개로 잘려도 resonantCount 는 넘겨받은 전체 수', () => {
    const s = summary('en', SEVEN, 7)
    expect(s.resonant).toHaveLength(3)
    expect(s.resonantCount).toBe(7)
  })
  it('수를 안 넘기면 자르기 전 목록 길이', () => {
    expect(summary('en', SEVEN).resonantCount).toBe(7)
    expect(summary('en', ['A']).resonantCount).toBe(1)
  })
})

describe('사주 타입 라벨 — 카드·공유 PNG (CR-6)', () => {
  it('ViralTopCard eyebrow 는 "My Saju type" / "나의 사주 타입"', () => {
    for (const lang of ['en', 'ko'] as const) {
      const html = renderToStaticMarkup(
        <ViralTopCard summary={summary(lang, ['Strength'], 1)} lang={lang} />
      )
      expect(html).toContain(SAJU_TYPE_LABEL.mine[lang])
      expect(html).not.toMatch(/Zodiac type|별자리 유형/)
    }
    expect(SAJU_TYPE_LABEL.mine).toEqual({ ko: '나의 사주 타입', en: 'My Saju type' })
  })

  it('ReportShareCard eyebrow 도 같은 라벨', () => {
    for (const isKo of [true, false]) {
      const lang = isKo ? 'ko' : 'en'
      const html = renderToStaticMarkup(
        <ReportShareCard data={{ summary: summary(lang, ['Strength'], 1), isKo }} />
      )
      expect(html).toContain(SAJU_TYPE_LABEL.mine[lang])
      expect(html).not.toMatch(/Zodiac type|별자리 유형/)
    }
  })
})

describe('KO 공유 PNG 목적격 조사 (CR-8)', () => {
  const line = (resonant: string[]) =>
    strip(
      renderToStaticMarkup(
        <ReportShareCard data={{ summary: summary('ko', resonant, resonant.length), isKo: true }} />
      )
    )
  it('받침 없는 끝(관계·에너지·이동·변화)은 "를"', () => {
    expect(line(['강점', '관계'])).toContain('사주와 별자리가 강점 · 관계를 둘 다 가리켜요')
    expect(line(['에너지'])).toContain('에너지를 둘 다')
    expect(line(['이동·변화'])).toContain('이동·변화를 둘 다')
  })
  it('받침 있는 끝(재물 그릇·음양 리듬·강점)은 "을"', () => {
    expect(line(['재물 그릇'])).toContain('재물 그릇을 둘 다')
    expect(line(['음양 리듬'])).toContain('음양 리듬을 둘 다')
    expect(line(['관계', '강점'])).toContain('관계 · 강점을 둘 다')
  })
})

describe('공유 버튼 → API 본문에 전체 일치 수 (CR-3)', () => {
  beforeEach(() => {
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { url: 'https://destinypal.app/r/tok' } }),
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn(async () => undefined) },
      configurable: true,
    })
  })
  afterEach(() => cleanup())

  const postedBody = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Share as link|링크로 공유/ }))
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(1))
    return JSON.parse((apiFetch.mock.calls[0][1] as { body: string }).body)
  }

  it('ShareReportButton 은 잘린 목록(3)과 함께 전체 수(7)를 보낸다', async () => {
    render(<ShareReportButton summary={summary('en', SEVEN, 7)} isKo={false} />)
    const body = await postedBody()
    expect(body.resonant).toHaveLength(3)
    expect(body.resonantCount).toBe(7)
  })

  it('리포트에서 누른 공유 링크의 수 = 리포트 톤 막대(tallyCrossRows.same)', async () => {
    const ctx = (await buildReportContext({
      birthDate: '1997-03-21',
      birthTime: '14:30',
      gender: 'female',
      latitude: 37.5665,
      longitude: 126.978,
      timeZone: 'Asia/Seoul',
    })) as unknown as Record<string, unknown>
    ctx.input = { ...(ctx.input as object), name: 'X', gender: 'female', place: 'P' }
    const data = natalToReportData(ctx, 'en', NOW)
    // 같은 결 7행(목록 상한 3 을 넘는 수) + 카르마 축(집계 제외) + 다른 톤.
    const rows: CrossRowOut[] = [
      ...['identity', 'needs', 'fortune', 'relations', 'strength', 'keyTrait', 'romance'].map(
        (key) => ({ key, category: key, tone: 'resonant' as const, reason: 'r' })
      ),
      { key: 'karma', category: 'Void / Karma', tone: 'resonant', reason: 'k', karmaAxis: true },
      { key: 'energy', category: 'Energy', tone: 'complement', reason: 'c' },
      { key: 'drive', category: 'Drive', tone: 'tension', reason: 't', left: 'a', right: 'b' },
    ]
    const tally = tallyCrossRows(rows)
    expect(tally.same).toBe(7)
    render(<IntegratedReport data={data} cross={{ synthesis: 's', rows }} lang="en" />)
    const body = await postedBody()
    expect(body.resonantCount).toBe(tally.same)
    expect(body.resonant.length).toBeLessThanOrEqual(3)
  })
})

describe('링크 미리보기(OG)·공유 페이지 (CR-3·CR-6)', () => {
  const reading = (over: Partial<ReportShareLinkPayload> = {}): ReportShareLinkPayload => ({
    v: 1,
    kind: 'report',
    isKo: false,
    emoji: '🌊',
    typeName: 'Balanced · straight-arrow Free Spirit',
    oneLiner: 'One line.',
    resonant: SEVEN.slice(0, 3),
    ...over,
  })
  const ogText = async (r: ReportShareLinkPayload) => {
    getShareLink.mockResolvedValueOnce(r)
    const res = (await OgImage({ params: Promise.resolve({ token: 'tok' }) })) as unknown as {
      element: React.ReactElement
    }
    return strip(renderToStaticMarkup(res.element))
  }

  it('OG eyebrow 는 리포트와 같은 전체 수를 말한다(목록 길이 3 이 아니라)', async () => {
    expect(await ogText(reading({ resonantCount: 7 }))).toContain(
      'Korean astrology × zodiac agree on 7 things'
    )
    expect(await ogText(reading({ isKo: true, resonantCount: 7 }))).toContain(
      '사주 × 별자리가 7가지에서 일치'
    )
  })

  it('수가 없는 옛 링크는 숫자 없이 사주 타입 라벨', async () => {
    const en = await ogText(reading())
    expect(en).not.toMatch(/agree on \d/)
    expect(en).toContain('SAJU TYPE')
    expect(en).not.toContain('ZODIAC')
    const ko = await ogText(reading({ isKo: true }))
    expect(ko).not.toMatch(/\d가지에서 일치/)
    expect(ko).toContain('사주 타입')
    expect(ko).not.toContain('별자리 유형')
  })

  it('일치가 1개뿐이면 수 대신 사주 타입 라벨', async () => {
    expect(await ogText(reading({ resonantCount: 1 }))).toContain('SAJU TYPE')
  })

  it('공유 페이지 /r 의 유형 라벨은 사주 타입', async () => {
    for (const isKo of [false, true]) {
      getShareLink.mockResolvedValueOnce(reading({ isKo, resonantCount: 7 }))
      const el = await SharedReadingPage({ params: Promise.resolve({ token: 'tok' }) } as never)
      const text = strip(renderToStaticMarkup(el as React.ReactElement))
      expect(text).toContain(SAJU_TYPE_LABEL.plain[isKo ? 'ko' : 'en'])
      expect(text).not.toMatch(/KOREAN ASTROLOGY × ZODIAC|사주 × 별자리 유형/)
    }
  })
})
