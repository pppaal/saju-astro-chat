import { describe, it, expect, vi, beforeEach } from 'vitest'

// 발행 어댑터를 전부 mock — 재시도 멱등성(이미 발행된 플랫폼 스킵)만 검증.
const publishThreads = vi.fn(async () => ({
  ok: true,
  platform: 'threads' as const,
  url: 'https://t/2',
}))
const publishInstagram = vi.fn(async () => ({
  ok: true,
  platform: 'instagram' as const,
  url: 'https://i/2',
}))

vi.mock('@/lib/social/publish/threads', () => ({
  threadsAdapter: {
    platform: 'threads',
    isConfigured: () => true,
    publish: (...a: unknown[]) => publishThreads(...(a as [])),
  },
}))
vi.mock('@/lib/social/publish/instagram', () => ({
  instagramAdapter: {
    platform: 'instagram',
    isConfigured: () => true,
    publish: (...a: unknown[]) => publishInstagram(...(a as [])),
  },
}))
vi.mock('@/lib/social/publish/youtube', () => ({
  youtubeAdapter: { platform: 'youtube', isConfigured: () => false, publish: vi.fn() },
}))
vi.mock('@/lib/social/draftStore', () => ({
  updateDraft: vi.fn(async (_d: string, _id: string, patch: unknown) => patch),
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { publishAndRecord } from '@/lib/social/publish'
import type { SocialPostDraft } from '@/lib/social/types'

function draft(): SocialPostDraft {
  return {
    id: 'd1',
    date: '2026-07-17',
    locale: 'en',
    category: 'saju',
    cardName: 'Water-Snake day',
    cardImage: '/api/social/card?x=1',
    isReversed: false,
    hook: 'h',
    // IG 는 이미 발행됨(externalId 기록), Threads 는 직전 시도 실패로 미발행.
    variants: [
      { platform: 'instagram', caption: 'ig cap', hashtags: [], externalId: 'ig_123' },
      { platform: 'threads', caption: 'th cap', hashtags: ['#koreanastrology'] },
      { platform: 'youtube', caption: 'yt', hashtags: [] },
    ],
    status: 'pending',
    createdAt: '',
    updatedAt: '',
  }
}

describe('publishAndRecord — 부분 실패 후 재시도 멱등성', () => {
  beforeEach(() => {
    publishThreads.mockClear()
    publishInstagram.mockClear()
  })

  it('이미 발행된 플랫폼(IG)은 스킵하고 미발행(Threads)만 재시도한다 — 중복 포스트 방지', async () => {
    const { results } = await publishAndRecord(draft())

    expect(publishInstagram).not.toHaveBeenCalled()
    expect(publishThreads).toHaveBeenCalledTimes(1)

    const ig = results.find((r) => r.platform === 'instagram')
    expect(ig?.ok).toBe(false)
    expect(ig?.skipped).toBe('already_published')
    const th = results.find((r) => r.platform === 'threads')
    expect(th?.ok).toBe(true)
  })

  it('already_published 스킵은 기존 발행 기록(variant)을 건드리지 않는다', async () => {
    const { draft: updatedPatch } = await publishAndRecord(draft())
    // updateDraft mock 이 patch 를 그대로 돌려준다 — IG variant 의 externalId 가
    // 그대로 살아 있고 publishError 로 오염되지 않았는지 확인.
    const variants = (updatedPatch as unknown as { variants: Array<Record<string, unknown>> })
      .variants
    const ig = variants.find((v) => v.platform === 'instagram')
    expect(ig?.externalId).toBe('ig_123')
    expect(ig?.publishError).toBeUndefined()
  })
})
