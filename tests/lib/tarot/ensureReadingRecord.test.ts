/**
 * ensureTarotReadingRecord — 타로 차감-기록 불일치 방지 안전망 단위 테스트.
 *
 * 보장 불변식: 리딩이 생성되어 과금이 확정된 턴은 클라 tarot/save 가 끝내
 * 도착하지 않아도 TarotReading 행이 반드시 남는다(해석은 클라가 채움).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()
const mockExecuteRaw = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    $executeRaw: (...args: unknown[]) => mockExecuteRaw(...args),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ensureTarotReadingRecord, appendTarotFollowupTurns } from '@/lib/tarot/ensureReadingRecord'

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

describe('appendTarotFollowupTurns', () => {
  const turns = [
    { role: 'user' as const, content: '이 카드 더 설명해줘' },
    { role: 'assistant' as const, content: '바보 카드는 새 시작을 뜻해요.' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockExecuteRaw.mockResolvedValue(1)
  })

  it('원자적 jsonb concat 으로 새 turn 을 이어 붙인다 (lost-update 경쟁 제거)', async () => {
    await appendTarotFollowupTurns('tr_abcdef0123456789abcdef01', 'user-1', turns)

    // $executeRaw 는 tagged template — (strings, ...values) 로 호출된다. 단일
    // UPDATE(read-modify-write 없음)이고 값 순서는 turnsJson, readingId, userId.
    expect(mockExecuteRaw).toHaveBeenCalledTimes(1)
    const values = mockExecuteRaw.mock.calls[0].slice(1)
    expect(values).toEqual([JSON.stringify(turns), 'tr_abcdef0123456789abcdef01', 'user-1'])
  })

  it('소유권은 WHERE "userId" 로 강제된다 (쿼리 파라미터에 userId 포함)', async () => {
    await appendTarotFollowupTurns('tr_x', 'user-1', turns)
    const values = mockExecuteRaw.mock.calls[0].slice(1)
    expect(values).toContain('user-1')
  })

  it('빈 turn 배열 / readingId·userId 없음은 쿼리조차 안 친다', async () => {
    await appendTarotFollowupTurns('tr_x', 'user-1', [])
    await appendTarotFollowupTurns('', 'user-1', turns)
    await appendTarotFollowupTurns('tr_x', '', turns)
    expect(mockExecuteRaw).not.toHaveBeenCalled()
  })

  it('비정상적으로 긴 readingId 는 거부한다', async () => {
    await appendTarotFollowupTurns('x'.repeat(200), 'user-1', turns)
    expect(mockExecuteRaw).not.toHaveBeenCalled()
  })

  it('DB 오류(컬럼 누락 등)는 삼킨다 — 답변 응답 경로를 깨지 않는다', async () => {
    mockExecuteRaw.mockRejectedValue({ code: 'P2022' })
    await expect(appendTarotFollowupTurns('tr_x', 'user-1', turns)).resolves.toBeUndefined()
  })
})
