/**
 * 공개 공유 페이지 /r/[token] · OG 이미지 — 인생 흐름 공유.
 *
 *  - v2(A5): 사주 타입 + 인생 모양만 그린다 — 범위 라벨 · 연도 축 · 곡선 · 기둥 없음.
 *  - v1(옛 링크, 90일 TTL): 곡선 · 연도 축 그대로 계속 그린다.
 */
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const getShareLink = vi.fn()
vi.mock('@/lib/share/shareLink', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/share/shareLink')>()
  return {
    ...actual,
    getShareLink: (...a: unknown[]) => getShareLink(...a),
    bumpShareViews: vi.fn(async () => 0),
  }
})
const recordCounter = vi.fn()
vi.mock('@/lib/metrics', () => ({ recordCounter: (...a: unknown[]) => recordCounter(...a) }))
vi.mock('@/lib/share/ogFont', () => ({ loadOgFonts: vi.fn(async () => []) }))
vi.mock('next/og', () => ({
  ImageResponse: class {
    element: React.ReactElement
    constructor(element: React.ReactElement) {
      this.element = element
    }
  },
}))

import OgImage from '@/app/r/[token]/opengraph-image'
import SharedReadingPage, { generateMetadata } from '@/app/r/[token]/page'
import type { LifeShareLinkPayload, LifeShareLinkPayloadV2 } from '@/lib/share/shareLink'

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()

const params = { params: Promise.resolve({ token: 'tok' }) }

const V2: LifeShareLinkPayloadV2 = {
  v: 2,
  kind: 'life',
  isKo: false,
  crossType: 'steady-building Free Spirit',
  lifeShape: 'Ups and downs',
}

const V1: LifeShareLinkPayload = {
  v: 1,
  kind: 'life',
  isKo: true,
  typeName: '굴곡형',
  rangeLabel: '1997 — 2081',
  headline: '마흔에, 판이 한 번 뒤집힌다.',
  curve: [30, 45, 40, 70, 88, 60],
  axisLabels: ['1997', '2025', '2053', '2081'],
  markerIndex: 2,
  peakIndex: 4,
}

async function pageHtml(reading: unknown) {
  getShareLink.mockResolvedValueOnce(reading)
  const el = await SharedReadingPage(params as never)
  return renderToStaticMarkup(el as React.ReactElement)
}

async function ogText(reading: unknown) {
  getShareLink.mockResolvedValueOnce(reading)
  const res = (await OgImage(params)) as unknown as { element: React.ReactElement }
  return strip(renderToStaticMarkup(res.element))
}

beforeEach(() => {
  getShareLink.mockReset()
  recordCounter.mockReset()
})

describe('/r/[token] — 인생 흐름 공유 v2', () => {
  it('공개 페이지: 사주 타입 + 인생 모양만 — 범위 · 연도 · 곡선 없음', async () => {
    const html = await pageHtml(V2)
    const text = strip(html)
    expect(html).toContain('data-life-share="v2"')
    expect(text).toContain('SAJU TYPE')
    expect(text).toContain('steady-building Free Spirit')
    expect(text).toContain('Life shape')
    expect(text).toContain('Ups and downs')
    expect(text).not.toMatch(/\b(19|20)\d{2}\b/)
    expect(html).not.toContain('<img src="data:image/svg')
    expect(recordCounter).toHaveBeenCalledWith('life.share.viewed', 1)
  })

  it('한국어 v2 — 사주 타입 라벨 · 인생 모양', async () => {
    const text = strip(
      await pageHtml({ ...V2, isKo: true, crossType: '착실히 쌓는 자유인', lifeShape: '굴곡형' })
    )
    expect(text).toContain('사주 타입')
    expect(text).toContain('착실히 쌓는 자유인')
    expect(text).toContain('인생 모양')
    expect(text).toContain('굴곡형')
  })

  it('메타데이터 — 제목은 사주 타입, 설명에 연도 없음', async () => {
    getShareLink.mockResolvedValueOnce(V2)
    const meta = await generateMetadata(params as never)
    expect(meta.title).toBe('steady-building Free Spirit — DestinyPal')
    expect(String(meta.description)).toBe(
      'Saju type: steady-building Free Spirit · Life shape: Ups and downs'
    )
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('OG 이미지: 사주 타입 · 인생 모양 · 도메인, 범위 · 연도 축 없음', async () => {
    const text = await ogText(V2)
    expect(text).toContain('SAJU TYPE')
    expect(text).toContain('steady-building Free Spirit')
    expect(text).toContain('LIFE SHAPE')
    expect(text).toContain('Ups and downs')
    expect(text).not.toMatch(/\b(19|20)\d{2}\b/)
  })
})

describe('/r/[token] — 옛 v1 링크(TTL 안)는 계속 그린다', () => {
  it('공개 페이지: 헤드라인 · 범위 라벨 · 곡선 · 연도 축', async () => {
    const html = await pageHtml(V1)
    const text = strip(html)
    expect(text).toContain('마흔에, 판이 한 번 뒤집힌다.')
    expect(text).toContain('1997 — 2081')
    expect(text).toContain('2053')
    expect(html).toContain('data:image/svg')
    expect(html).not.toContain('data-life-share="v2"')
  })

  it('OG 이미지: 유형 배지 + 헤드라인 + 축 라벨', async () => {
    const text = await ogText(V1)
    expect(text).toContain('굴곡형')
    expect(text).toContain('마흔에, 판이 한 번 뒤집힌다.')
    expect(text).toContain('2025')
  })
})
