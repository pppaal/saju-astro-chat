/**
 * ensureTarotReadingRecord — 타로 차감-기록 불일치 방지 안전망 단위 테스트.
 *
 * 보장 불변식: 리딩이 생성되어 과금이 확정된 턴은 클라 tarot/save 가 끝내
 * 도착하지 않아도 TarotReading 행이 반드시 남는다(해석은 클라가 채움).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ensureTarotReadingRecord } from '@/lib/tarot/ensureReadingRecord'

const baseArgs = () => ({
  readingId: 'tr_abcdef0123456789abcdef01',
  userId: 'user-1',
  question: '올해 이직 어떨까요?',
  spreadId: 'three-card',
  spreadTitle: '쓰리 카드',
  cards: [{ cardId: '1', name: 'The Fool', isReversed: false, position: 'past' }],
  locale: 'ko',
})

describe('ensureTarotReadingRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({})
  })

  it('행이 없으면 해석 비운 채 생성한다 (차감됐는데 기록 0 을 메움)', async () => {
    const result = await ensureTarotReadingRecord(baseArgs())

    expect(result).toBe('created')
    const data = mockCreate.mock.calls[0][0].data
    expect(data.id).toBe('tr_abcdef0123456789abcdef01')
    expect(data.userId).toBe('user-1')
    expect(data.spreadId).toBe('three-card')
    expect(data.cards).toHaveLength(1)
    // 해석 필드는 비워 둔다 — 클라 tarot/save 가 같은 id 로 채운다.
    expect(data.overallMessage).toBeUndefined()
  })

  it('행이 이미 있으면 건드리지 않는다 (클라 저장이 해석 채우는 권한)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'tr_abcdef0123456789abcdef01' })
    const result = await ensureTarotReadingRecord(baseArgs())
    expect(result).toBe('exists')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('find/create 사이 race(P2002)는 "이미 존재"로 처리한다', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockRejectedValue({ code: 'P2002' })
    const result = await ensureTarotReadingRecord(baseArgs())
    expect(result).toBe('exists')
  })

  it('DB 일시 오류는 삼키고 skipped — 스트림/과금 경로를 깨지 않는다', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))
    const result = await ensureTarotReadingRecord(baseArgs())
    expect(result).toBe('skipped')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('readingId / userId / spreadId 가 없으면 skipped', async () => {
    expect(await ensureTarotReadingRecord({ ...baseArgs(), readingId: '' })).toBe('skipped')
    expect(await ensureTarotReadingRecord({ ...baseArgs(), userId: '' })).toBe('skipped')
    expect(await ensureTarotReadingRecord({ ...baseArgs(), spreadId: '' })).toBe('skipped')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('비정상적으로 긴 readingId 는 거부한다(헤더 변조 방어)', async () => {
    const result = await ensureTarotReadingRecord({ ...baseArgs(), readingId: 'x'.repeat(200) })
    expect(result).toBe('skipped')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
