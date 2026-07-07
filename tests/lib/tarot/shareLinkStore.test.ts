// tests/lib/tarot/shareLinkStore.test.ts
//
// shareLink 저장소 — 공유 종류 타입 가드·siteBaseUrl·createShareLink·
// getShareLink(종류 분기·버전·타로 cards 검증·에러)·bumpShareViews 를 커버.
// (compat/calendar/tarot 공유 라우트가 전부 이 모듈에 의존한다.)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const cacheGet = vi.fn<(k: string) => Promise<unknown>>()
const cacheSet = vi.fn<(k: string, v: unknown, ttl: number) => Promise<boolean>>()
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (k: string) => cacheGet(k),
  cacheSet: (k: string, v: unknown, ttl: number) => cacheSet(k, v, ttl),
}))
vi.mock('@/lib/logger', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import {
  isCompatShare,
  isCalendarShare,
  isDayShare,
  isLifeShare,
  isReportShare,
  createShareLink,
  getShareLink,
  siteBaseUrl,
  bumpShareViews,
} from '@/lib/tarot/shareLink'

beforeEach(() => {
  vi.clearAllMocks()
  cacheSet.mockResolvedValue(true)
})

describe('공유 종류 타입 가드', () => {
  const guards = [
    ['compatibility', isCompatShare],
    ['calendar', isCalendarShare],
    ['day', isDayShare],
    ['life', isLifeShare],
    ['report', isReportShare],
  ] as const
  it('각 가드는 자기 kind 에만 true', () => {
    for (const [kind, guard] of guards) {
      expect(guard({ kind } as never)).toBe(true)
      expect(guard({ kind: 'tarot' } as never)).toBe(false)
    }
  })
})

describe('siteBaseUrl', () => {
  const prev = process.env.NEXT_PUBLIC_BASE_URL
  afterEach(() => {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_BASE_URL
    else process.env.NEXT_PUBLIC_BASE_URL = prev
  })
  it('env 없으면 .com 폴백', () => {
    delete process.env.NEXT_PUBLIC_BASE_URL
    expect(siteBaseUrl()).toBe('https://destinypal.com')
  })
  it('env 있으면 사용 + 끝 슬래시 제거', () => {
    process.env.NEXT_PUBLIC_BASE_URL = 'https://my.app/'
    expect(siteBaseUrl()).toBe('https://my.app')
  })
})

describe('createShareLink', () => {
  it('cacheSet 성공 → 토큰 반환', async () => {
    const token = await createShareLink({ v: 1, kind: 'compatibility' } as never)
    expect(typeof token).toBe('string')
    expect((token as string).length).toBeGreaterThan(0)
    expect(cacheSet).toHaveBeenCalledOnce()
  })
  it('cacheSet 실패 → null', async () => {
    cacheSet.mockResolvedValue(false)
    expect(await createShareLink({ v: 1, kind: 'compatibility' } as never)).toBeNull()
  })
})

describe('getShareLink', () => {
  it('빈 토큰 → null (조회 안 함)', async () => {
    expect(await getShareLink('  ')).toBeNull()
    expect(cacheGet).not.toHaveBeenCalled()
  })
  it('버전 불일치 → null', async () => {
    cacheGet.mockResolvedValue({ v: 2, kind: 'compatibility' })
    expect(await getShareLink('tok')).toBeNull()
  })
  it('궁합 kind → 그대로 반환', async () => {
    cacheGet.mockResolvedValue({ v: 1, kind: 'compatibility' })
    expect(await getShareLink('tok')).toMatchObject({ kind: 'compatibility' })
  })
  it('타로(cards 배열) → 반환, cards 없으면 null', async () => {
    cacheGet.mockResolvedValue({ v: 1, kind: 'tarot', cards: [] })
    expect(await getShareLink('tok')).toMatchObject({ kind: 'tarot' })
    cacheGet.mockResolvedValue({ v: 1, kind: 'tarot' })
    expect(await getShareLink('tok')).toBeNull()
  })
  it('조회 예외 → null', async () => {
    cacheGet.mockRejectedValue(new Error('redis down'))
    expect(await getShareLink('tok')).toBeNull()
  })
})

describe('bumpShareViews', () => {
  it('빈 토큰 → 0', async () => {
    expect(await bumpShareViews('')).toBe(0)
  })
  it('이전 값 +1', async () => {
    cacheGet.mockResolvedValue(4)
    expect(await bumpShareViews('tok')).toBe(5)
    expect(cacheSet).toHaveBeenCalled()
  })
  it('없던 값 → 1', async () => {
    cacheGet.mockResolvedValue(null)
    expect(await bumpShareViews('tok')).toBe(1)
  })
  it('에러 → 0', async () => {
    cacheGet.mockRejectedValue(new Error('x'))
    expect(await bumpShareViews('tok')).toBe(0)
  })
})
