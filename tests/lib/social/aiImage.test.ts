// tests/lib/social/aiImage.test.ts
//
// AI 배경 생성 — 설정 게이트(토큰 2종 + off 토글), bg URL 허용 검사(우리 Blob
// 스토어만 — 카드 라우트는 공개라 임의 URL 은 SSRF/악용 통로), 생성 파이프라인
// (Redis 캐시 우선 → Replicate → Blob 영구화 → 실패는 전부 null 폴백) 계약.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const { cacheGetMock, cacheSetMock, putMock } = vi.hoisted(() => ({
  cacheGetMock: vi.fn(),
  cacheSetMock: vi.fn(async () => true),
  putMock: vi.fn(async () => ({
    url: 'https://abc123.public.blob.vercel-storage.com/social/bg/x.jpg',
  })),
}))
vi.mock('@/lib/cache/redis-cache', () => ({ cacheGet: cacheGetMock, cacheSet: cacheSetMock }))
vi.mock('@vercel/blob', () => ({ put: putMock }))

import { aiImagesConfigured, isAllowedCardBg, ensureCategoryBackground } from '@/lib/social/aiImage'

const fetchMock = vi.fn()
vi.stubGlobal('fetch', fetchMock)

const saved = { ...process.env }
beforeEach(() => {
  fetchMock.mockReset()
  cacheGetMock.mockReset()
  cacheGetMock.mockResolvedValue(null)
  putMock.mockClear()
  process.env.REPLICATE_API_TOKEN = 'r8_test'
  process.env.BLOB_READ_WRITE_TOKEN = 'blob_test'
  delete process.env.SOCIAL_AI_IMAGES
})
afterEach(() => {
  process.env.REPLICATE_API_TOKEN = saved.REPLICATE_API_TOKEN
  process.env.BLOB_READ_WRITE_TOKEN = saved.BLOB_READ_WRITE_TOKEN
  process.env.SOCIAL_AI_IMAGES = saved.SOCIAL_AI_IMAGES
})

describe('aiImagesConfigured', () => {
  it('토큰 둘 다 있으면 ON, 하나라도 없으면 OFF', () => {
    expect(aiImagesConfigured()).toBe(true)
    delete process.env.REPLICATE_API_TOKEN
    expect(aiImagesConfigured()).toBe(false)
  })

  it('SOCIAL_AI_IMAGES=off 로 끌 수 있다', () => {
    process.env.SOCIAL_AI_IMAGES = 'off'
    expect(aiImagesConfigured()).toBe(false)
  })
})

describe('isAllowedCardBg', () => {
  it('우리 Blob 스토어의 https URL 만 허용한다', () => {
    expect(isAllowedCardBg('https://abc123.public.blob.vercel-storage.com/social/bg/a.jpg')).toBe(
      true
    )
    expect(isAllowedCardBg('https://evil.com/a.jpg')).toBe(false)
    expect(isAllowedCardBg('http://abc123.public.blob.vercel-storage.com/a.jpg')).toBe(false)
    expect(isAllowedCardBg('https://evil.com/x.public.blob.vercel-storage.com')).toBe(false)
    expect(isAllowedCardBg('not-a-url')).toBe(false)
  })
})

describe('ensureCategoryBackground', () => {
  it('Redis 캐시 히트면 Replicate 를 부르지 않는다', async () => {
    cacheGetMock.mockResolvedValue('https://abc123.public.blob.vercel-storage.com/cached.jpg')
    const url = await ensureCategoryBackground('2026-07-09', 'zodiac')
    expect(url).toBe('https://abc123.public.blob.vercel-storage.com/cached.jpg')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('생성 성공 — Replicate 출력을 받아 Blob 에 저장하고 그 URL 을 캐시한다', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ status: 'succeeded', output: ['https://replicate.delivery/x.jpg'] }),
          { status: 201 }
        )
      )
      .mockResolvedValueOnce(new Response(new ArrayBuffer(8), { status: 200 }))
    const url = await ensureCategoryBackground('2026-07-09', 'saju')
    expect(url).toBe('https://abc123.public.blob.vercel-storage.com/social/bg/x.jpg')
    expect(putMock).toHaveBeenCalledWith(
      'social/bg/2026-07-09-saju.jpg',
      expect.anything(),
      expect.objectContaining({ access: 'public', allowOverwrite: true })
    )
    expect(cacheSetMock).toHaveBeenCalled()
  })

  it('Replicate 실패는 null (그라데이션 카드 폴백) — 예외를 던지지 않는다', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ status: 'failed', error: 'nsfw' }), { status: 200 })
    )
    expect(await ensureCategoryBackground('2026-07-09', 'astrology')).toBeNull()
    expect(putMock).not.toHaveBeenCalled()
  })

  it('미설정이면 아무것도 하지 않는다', async () => {
    delete process.env.REPLICATE_API_TOKEN
    expect(await ensureCategoryBackground('2026-07-09', 'calendar')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
