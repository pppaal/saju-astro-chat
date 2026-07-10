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
  categoryOrderForDate,
  localeOrderForDate,
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

  it('로케일 필터를 지키고, 단일 로케일이면 그것만 나온다', async () => {
    getDraftsMock.mockResolvedValue([
      draft({ id: 'en1', locale: 'en' }),
      draft({ id: 'ko1', locale: 'ko' }),
    ])
    expect(await pickNextPlatformDraft('2026-07-09', ['ko'], 'threads')).toMatchObject({
      id: 'ko1',
    })
  })

  it('다양화 — 이미 나간 카테고리·로케일은 뒤로 밀린다 (하루 2개 = 2주제 × 2언어)', async () => {
    const date = '2026-07-10'
    const [first, second] = categoryOrderForDate(date)
    const [loc1, loc2] = localeOrderForDate(date, ['ko', 'en'], 'threads')
    // 1순위 카테고리의 loc1 이 이미 발행된 상태 → 다음 픽은 2순위 카테고리의 loc2.
    getDraftsMock.mockResolvedValue([
      draft({
        id: 'done',
        category: first,
        locale: loc1,
        status: 'published',
        variants: [variant('threads', { publishedUrl: 'https://t/1' }), variant('instagram')],
      }),
      draft({ id: 'same-cat-other-loc', category: first, locale: loc2 }),
      draft({ id: 'next-cat-loc1', category: second, locale: loc1 }),
      draft({ id: 'next-cat-loc2', category: second, locale: loc2 }),
    ])
    const picked = await pickNextPlatformDraft(date, ['ko', 'en'], 'threads')
    expect(picked?.id).toBe('next-cat-loc2')
  })

  it('IG 는 카테고리 회전이 한 칸 어긋난다 — 같은 날 Threads 와 다른 주제', async () => {
    const date = '2026-07-10'
    const [first, second] = categoryOrderForDate(date)
    getDraftsMock.mockResolvedValue([
      draft({ id: 'a', category: first, locale: 'ko' }),
      draft({ id: 'b', category: second, locale: 'ko' }),
    ])
    const th = await pickNextPlatformDraft(date, ['ko'], 'threads')
    const ig = await pickNextPlatformDraft(date, ['ko'], 'instagram')
    expect(th?.id).toBe('a')
    expect(ig?.id).toBe('b')
  })

  it('로케일 교대 — 날짜가 하루 지나면 우선 로케일이 뒤집히고, IG 는 Threads 와 반대', () => {
    const d1 = localeOrderForDate('2026-07-10', ['ko', 'en'], 'threads')
    const d2 = localeOrderForDate('2026-07-11', ['ko', 'en'], 'threads')
    expect(d1).not.toEqual(d2)
    const ig = localeOrderForDate('2026-07-10', ['ko', 'en'], 'instagram')
    expect(ig).not.toEqual(d1)
    // 단일 로케일이면 그대로.
    expect(localeOrderForDate('2026-07-10', ['ko'], 'instagram')).toEqual(['ko'])
  })
})
