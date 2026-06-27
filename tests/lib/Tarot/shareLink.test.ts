import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: unknown[]) => mockCacheGet(...args),
  cacheSet: (...args: unknown[]) => mockCacheSet(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import {
  createShareLink,
  getShareLink,
  siteBaseUrl,
  SHARE_TTL_SECONDS,
  isDayShare,
  isLifeShare,
  isCalendarShare,
  isCompatShare,
  type ShareLinkPayload,
  type DayShareLinkPayload,
  type LifeShareLinkPayload,
} from '@/lib/tarot/shareLink'

const makePayload = (over: Partial<ShareLinkPayload> = {}): ShareLinkPayload => ({
  v: 1,
  isKo: true,
  question: '연애운이 궁금해요',
  spreadTitle: '쓰리카드',
  cards: [{ name: 'The Sun', image: '/sun.png', isReversed: false }],
  keyMessage: '밝은 흐름이 옵니다.',
  ...over,
})

describe('tarot shareLink', () => {
  beforeEach(() => {
    mockCacheGet.mockReset()
    mockCacheSet.mockReset()
  })
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  describe('createShareLink', () => {
    it('성공 시 토큰(base64url) 반환 + TTL 로 cacheSet', async () => {
      mockCacheSet.mockResolvedValue(true)
      const token = await createShareLink(makePayload())
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      // base64url: A-Z a-z 0-9 - _ 만, 패딩 없음
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(mockCacheSet).toHaveBeenCalledTimes(1)
      const [key, payload, ttl] = mockCacheSet.mock.calls[0]
      expect(key).toBe(`tarot:share:${token}`)
      expect(payload).toEqual(makePayload())
      expect(ttl).toBe(SHARE_TTL_SECONDS)
    })

    it('매번 다른 토큰 생성', async () => {
      mockCacheSet.mockResolvedValue(true)
      const a = await createShareLink(makePayload())
      const b = await createShareLink(makePayload())
      expect(a).not.toBe(b)
    })

    it('cacheSet 실패 시 null', async () => {
      mockCacheSet.mockResolvedValue(false)
      const token = await createShareLink(makePayload())
      expect(token).toBeNull()
    })
  })

  describe('getShareLink', () => {
    it('정상 페이로드 반환', async () => {
      const payload = makePayload()
      mockCacheGet.mockResolvedValue(payload)
      const result = await getShareLink('abc123')
      expect(result).toEqual(payload)
      expect(mockCacheGet).toHaveBeenCalledWith('tarot:share:abc123')
    })

    it('토큰 trim 후 조회', async () => {
      mockCacheGet.mockResolvedValue(makePayload())
      await getShareLink('  spaced  ')
      expect(mockCacheGet).toHaveBeenCalledWith('tarot:share:spaced')
    })

    it('빈 토큰 → null (cache 조회 안 함)', async () => {
      expect(await getShareLink('')).toBeNull()
      expect(await getShareLink('   ')).toBeNull()
      // @ts-expect-error null 입력 안전 처리 확인
      expect(await getShareLink(null)).toBeNull()
      expect(mockCacheGet).not.toHaveBeenCalled()
    })

    it('캐시 miss(null) → null', async () => {
      mockCacheGet.mockResolvedValue(null)
      expect(await getShareLink('tok')).toBeNull()
    })

    it('버전 불일치(v !== 1) → null', async () => {
      mockCacheGet.mockResolvedValue({ ...makePayload(), v: 2 })
      expect(await getShareLink('tok')).toBeNull()
    })

    it('cards 가 배열이 아니면 → null', async () => {
      mockCacheGet.mockResolvedValue({ ...makePayload(), cards: 'nope' })
      expect(await getShareLink('tok')).toBeNull()
    })

    it('cacheGet throw → null (catch 경로)', async () => {
      mockCacheGet.mockRejectedValue(new Error('redis down'))
      expect(await getShareLink('tok')).toBeNull()
    })
  })

  describe('create → get 라운드트립 (인메모리 캐시 모킹)', () => {
    it('저장한 페이로드를 토큰으로 그대로 회수', async () => {
      const store = new Map<string, unknown>()
      mockCacheSet.mockImplementation(async (k: string, v: unknown) => {
        store.set(k, v)
        return true
      })
      mockCacheGet.mockImplementation(async (k: string) => store.get(k) ?? null)

      const payload = makePayload({ body: '추가 본문' })
      const token = await createShareLink(payload)
      expect(token).toBeTruthy()
      const fetched = await getShareLink(token as string)
      expect(fetched).toEqual(payload)
    })
  })

  describe('siteBaseUrl', () => {
    it('env 없으면 .com 폴백', () => {
      expect(siteBaseUrl()).toBe('https://destinypal.com')
    })

    it('env 사용 + 끝 슬래시 제거', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://staging.example.com/'
      expect(siteBaseUrl()).toBe('https://staging.example.com')
    })

    it('끝 슬래시 없으면 그대로', () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://x.io'
      expect(siteBaseUrl()).toBe('https://x.io')
    })
  })

  it('SHARE_TTL_SECONDS 는 90일', () => {
    expect(SHARE_TTL_SECONDS).toBe(90 * 24 * 60 * 60)
  })

  describe('day / life 공유 kind (cards 없음)', () => {
    const dayPayload: DayShareLinkPayload = {
      v: 1,
      kind: 'day',
      isKo: true,
      dateLabel: '6월 15일 토',
      score: 87,
      tone: 'positive',
      headline: '먼저 움직이면 풀리는 하루.',
      subline: '받쳐주는 흐름이 같이 와요.',
      curve: [40, 55, 60, 87, 70, 65],
      markerIndex: 3,
    }
    const lifePayload: LifeShareLinkPayload = {
      v: 1,
      kind: 'life',
      isKo: true,
      rangeLabel: '1994–2078',
      headline: '마흔에 판이 한 번 뒤집힌다.',
      curve: [30, 45, 40, 70, 88, 60],
      axisLabels: ['1994', '2022', '2050', '2078'],
      markerIndex: 2,
      peakIndex: 4,
    }

    it('day 페이로드는 cards 없이도 라운드트립', async () => {
      const store = new Map<string, unknown>()
      mockCacheSet.mockImplementation(async (k: string, v: unknown) => {
        store.set(k, v)
        return true
      })
      mockCacheGet.mockImplementation(async (k: string) => store.get(k) ?? null)
      const token = await createShareLink(dayPayload)
      const fetched = await getShareLink(token as string)
      expect(fetched).toEqual(dayPayload)
      expect(fetched && isDayShare(fetched)).toBe(true)
    })

    it('life 페이로드는 cards 없이도 라운드트립', async () => {
      mockCacheGet.mockResolvedValue(lifePayload)
      const fetched = await getShareLink('tok')
      expect(fetched).toEqual(lifePayload)
      expect(fetched && isLifeShare(fetched)).toBe(true)
    })

    it('타입 가드는 서로 배타적', () => {
      expect(isDayShare(dayPayload)).toBe(true)
      expect(isLifeShare(dayPayload)).toBe(false)
      expect(isCalendarShare(dayPayload)).toBe(false)
      expect(isCompatShare(dayPayload)).toBe(false)
      expect(isLifeShare(lifePayload)).toBe(true)
      expect(isDayShare(lifePayload)).toBe(false)
    })
  })
})
