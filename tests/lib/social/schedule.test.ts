// tests/lib/social/schedule.test.ts
//
// 자동 발행 스케줄링 — 플랫폼별 상한/발행 카운트/다음 초안 선택 규칙.
// 핵심 계약: 플랫폼별 독립 판단 — Threads 로 이미 나간(status=published) 초안도
// IG variant 가 미발행이면 IG 후보에 남아야 한다.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  platformDailyLimit,
  publishedPlatformCount,
  pickNextPlatformDraft,
} from '@/lib/social/schedule'
import type { SocialPostDraft, SocialVariant } from '@/lib/social/types'

const { getDraftsMock } = vi.hoisted(() => ({ getDraftsMock: vi.fn() }))
vi.mock('@/lib/social/draftStore', () => ({ getDrafts: getDraftsMock }))

function variant(platform: SocialVariant['platform'], extra: Partial<SocialVariant> = {}) {
  return { platform, caption: `${platform} caption`, hashtags: [], ...extra }
}

function draft(over: Partial<SocialPostDraft> = {}): SocialPostDraft {
  return {
    id: 'd1',
    date: '2026-07-09',
    locale: 'ko',
    category: 'tarot',
    cardName: 'The Fool',
    cardImage: '/api/social/card?v=tarot',
    isReversed: false,
    hook: 'hook',
    variants: [variant('threads'), variant('instagram')],
    status: 'pending',
    createdAt: '2026-07-09T00:00:00Z',
    updatedAt: '2026-07-09T00:00:00Z',
    ...over,
  }
}

beforeEach(() => {
  getDraftsMock.mockReset()
})

describe('platformDailyLimit', () => {
  const saved = { ...process.env }
  afterEach(() => {
    process.env.SOCIAL_THREADS_DAILY_LIMIT = saved.SOCIAL_THREADS_DAILY_LIMIT
    process.env.SOCIAL_IG_DAILY_LIMIT = saved.SOCIAL_IG_DAILY_LIMIT
  })

  it('기본값 — threads 2, instagram 1', () => {
    delete process.env.SOCIAL_THREADS_DAILY_LIMIT
    delete process.env.SOCIAL_IG_DAILY_LIMIT
    expect(platformDailyLimit('threads')).toBe(2)
    expect(platformDailyLimit('instagram')).toBe(1)
  })

  it('env 로 오버라이드하되 10 에서 캡', () => {
    process.env.SOCIAL_THREADS_DAILY_LIMIT = '4'
    process.env.SOCIAL_IG_DAILY_LIMIT = '99'
    expect(platformDailyLimit('threads')).toBe(4)
    expect(platformDailyLimit('instagram')).toBe(10)
  })
})

describe('publishedPlatformCount', () => {
  it('플랫폼별로 독립 카운트 — publishedUrl 또는 externalId 가 있으면 발행됨', () => {
    const drafts = [
      draft({
        id: 'a',
        variants: [variant('threads', { publishedUrl: 'https://t' }), variant('instagram')],
      }),
      // IG 는 url 없이 externalId 만 기록된다 — 그것도 발행으로 세어야 중복 발행이 없다.
      draft({
        id: 'b',
        variants: [variant('threads'), variant('instagram', { externalId: '123' })],
      }),
    ]
    expect(publishedPlatformCount(drafts, 'threads')).toBe(1)
    expect(publishedPlatformCount(drafts, 'instagram')).toBe(1)
  })
})

describe('pickNextPlatformDraft', () => {
  it('Threads 로 이미 발행된(status=published) 초안도 IG 미발행이면 IG 후보', async () => {
    getDraftsMock.mockResolvedValue([
      draft({
        id: 'cross',
        status: 'published',
        variants: [variant('threads', { publishedUrl: 'https://t' }), variant('instagram')],
      }),
    ])
    const forIg = await pickNextPlatformDraft('2026-07-09', ['ko'], 'instagram')
    expect(forIg?.id).toBe('cross')
    // 같은 초안이 threads 후보로는 다시 나오면 안 된다(중복 발행).
    const forThreads = await pickNextPlatformDraft('2026-07-09', ['ko'], 'threads')
    expect(forThreads).toBeNull()
  })

  it('반려(rejected)·해당 플랫폼 캡션 없음은 제외', async () => {
    getDraftsMock.mockResolvedValue([
      draft({ id: 'rej', status: 'rejected' }),
      draft({ id: 'nocap', variants: [variant('threads'), variant('instagram', { caption: '' })] }),
    ])
    expect(await pickNextPlatformDraft('2026-07-09', ['ko'], 'instagram')).toBeNull()
  })

  it('로케일 필터 + 로케일 목록 순서를 따른다', async () => {
    getDraftsMock.mockResolvedValue([
      draft({ id: 'en1', locale: 'en' }),
      draft({ id: 'ko1', locale: 'ko' }),
    ])
    const picked = await pickNextPlatformDraft('2026-07-09', ['en', 'ko'], 'threads')
    expect(picked?.id).toBe('en1')
    expect(await pickNextPlatformDraft('2026-07-09', ['ko'], 'threads')).toMatchObject({
      id: 'ko1',
    })
  })
})
