// tests/lib/social/insights.test.ts
//
// IG 성과 수집 — 지표 매핑(comments→replies, shares→reposts), insights 권한
// 없을 때 기본 필드(like_count/comments_count) 폴백, 요약 집계의 IG 포함
// (IG 는 publishedUrl 없이 externalId 만 남는다) 계약.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchIgInsights, summarizeDrafts } from '@/lib/social/insights'
import type { SocialPostDraft } from '@/lib/social/types'

vi.mock('@/lib/social/igToken', () => ({ getIgAccessToken: vi.fn(async () => 'ig-token') }))
vi.mock('@/lib/social/threadsToken', () => ({
  getThreadsAccessToken: vi.fn(async () => 'th-token'),
}))

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status })
}

beforeEach(() => {
  fetchMock.mockReset()
})

describe('fetchIgInsights', () => {
  it('IG 지표를 Threads 형태로 매핑한다 (comments→replies, shares→reposts)', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, {
        data: [
          { name: 'views', total_value: { value: 120 } },
          { name: 'likes', values: [{ value: 7 }] },
          { name: 'comments', total_value: { value: 3 } },
          { name: 'shares', total_value: { value: 2 } },
        ],
      })
    )
    const result = await fetchIgInsights('media-1')
    expect(result).toMatchObject({
      metrics: { views: 120, likes: 7, replies: 3, reposts: 2, quotes: 0 },
    })
  })

  it('insights 권한이 없으면 like_count/comments_count 기본 필드로 폴백한다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(403, { error: { message: 'permission denied' } }))
      .mockResolvedValueOnce(jsonResponse(200, { like_count: 4, comments_count: 1 }))
    const result = await fetchIgInsights('media-2')
    expect(result).toMatchObject({
      metrics: { views: 0, likes: 4, replies: 1, reposts: 0, quotes: 0 },
    })
  })

  it('둘 다 실패하면 에러 메시지를 돌려준다', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(403, { error: { message: 'permission denied' } }))
      .mockResolvedValueOnce(jsonResponse(400, { error: { message: 'bad id' } }))
    expect(await fetchIgInsights('media-3')).toEqual({ error: 'permission denied' })
  })
})

describe('summarizeDrafts — IG 포함', () => {
  it('publishedUrl 없이 externalId 만 있는 IG 발행도 집계한다', () => {
    const draft: SocialPostDraft = {
      id: 'd1',
      date: '2026-07-09',
      locale: 'ko',
      category: 'zodiac',
      cardName: '띠운세',
      cardImage: '/api/social/card?v=zodiac',
      isReversed: false,
      hook: '오늘 말띠',
      variants: [
        {
          platform: 'instagram',
          caption: 'c',
          hashtags: [],
          externalId: 'ig-1',
          metrics: { views: 50, likes: 5, replies: 1, reposts: 0, quotes: 0, fetchedAt: 'x' },
        },
      ],
      status: 'published',
      createdAt: 'x',
      updatedAt: 'x',
    }
    const summary = summarizeDrafts([{ date: '2026-07-09', drafts: [draft] }])
    expect(summary.publishedPosts).toBe(1)
    expect(summary.totalViews).toBe(50)
    expect(summary.byCategory.zodiac).toMatchObject({ posts: 1, views: 50, likes: 5 })
  })
})
