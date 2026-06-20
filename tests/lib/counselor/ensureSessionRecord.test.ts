/**
 * ensureCounselorSessionRecord — 차감-기록 불일치 방지 안전망 단위 테스트.
 *
 * 보장 불변식: 답변이 생성되어 과금이 확정된 턴은(=onComplete 호출) 클라
 * 자동 저장이 끝내 도착하지 않아도 CounselorChatSession 행이 반드시 남는다.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockFindUnique = vi.fn()
const mockCreate = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { ensureCounselorSessionRecord } from '@/lib/counselor/ensureSessionRecord'

const baseArgs = () => ({
  sessionId: 'chat_1718800000000_abcdefg',
  userId: 'user-1',
  messages: [
    { role: 'user' as const, content: '올해 이직해도 될까요?' },
    { role: 'assistant' as const, content: '흐름상 하반기가 더 유리해 보여요.' },
  ],
  locale: 'ko',
})

describe('ensureCounselorSessionRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockResolvedValue({})
  })

  it('행이 없으면 생성한다 (차감됐는데 기록 0 인 케이스를 메움)', async () => {
    const result = await ensureCounselorSessionRecord(baseArgs())

    expect(result).toBe('created')
    expect(mockCreate).toHaveBeenCalledTimes(1)
    const data = mockCreate.mock.calls[0][0].data
    expect(data.id).toBe('chat_1718800000000_abcdefg')
    expect(data.userId).toBe('user-1')
    expect(data.messageCount).toBe(2)
    expect(data.type).toBe('destiny')
    // 첫 user 질문에서 제목을 도출
    expect(data.title).toBe('올해 이직해도 될까요?')
    // chat-history 와 동일한 {role, content, timestamp} shape
    expect(data.messages[0]).toMatchObject({ role: 'user', content: '올해 이직해도 될까요?' })
    expect(typeof data.messages[0].timestamp).toBe('string')
  })

  it('행이 이미 있으면 건드리지 않는다 (클라 자동 저장이 갱신 권한을 가짐)', async () => {
    mockFindUnique.mockResolvedValue({ id: 'chat_1718800000000_abcdefg' })

    const result = await ensureCounselorSessionRecord(baseArgs())

    expect(result).toBe('exists')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('find/create 사이 race(P2002)는 "이미 존재"로 처리한다', async () => {
    mockFindUnique.mockResolvedValue(null)
    mockCreate.mockRejectedValue({ code: 'P2002' })

    const result = await ensureCounselorSessionRecord(baseArgs())

    expect(result).toBe('exists')
  })

  it('DB 일시 오류는 삼키고 skipped — 스트림/과금 경로를 깨지 않는다', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))

    const result = await ensureCounselorSessionRecord(baseArgs())

    expect(result).toBe('skipped')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('sessionId 가 없으면 skipped (x-session-id 미전송 클라 폴백)', async () => {
    const result = await ensureCounselorSessionRecord({ ...baseArgs(), sessionId: '' })
    expect(result).toBe('skipped')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('빈/시스템 메시지만 있으면 skipped (저장할 실내용 없음)', async () => {
    const result = await ensureCounselorSessionRecord({
      ...baseArgs(),
      messages: [
        { role: 'user' as const, content: '   ' },
        // system 등 비 user/assistant 는 helper 가 걸러낸다
        { role: 'system' as unknown as 'assistant', content: 'ctx' },
      ],
    })
    expect(result).toBe('skipped')
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('비정상적으로 긴 sessionId 는 거부한다(헤더 변조 방어)', async () => {
    const result = await ensureCounselorSessionRecord({
      ...baseArgs(),
      sessionId: 'x'.repeat(200),
    })
    expect(result).toBe('skipped')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  describe('existenceOnly 모드 (궁합 — 메시지는 클라 append 가 채움)', () => {
    it('메시지를 비운 채 제목만 가진 존재 보장 행을 만든다', async () => {
      const result = await ensureCounselorSessionRecord({
        sessionId: 'compat_1718800000000_abcdefg',
        userId: 'user-1',
        messages: [],
        existenceOnly: true,
        title: '우리 둘 잘 맞을까요?',
        locale: 'ko',
        type: 'compat',
      })

      expect(result).toBe('created')
      const data = mockCreate.mock.calls[0][0].data
      expect(data.type).toBe('compat')
      // 메시지는 비어 있어야 한다 — 클라 append 와 합쳐져 중복되면 안 되므로.
      expect(data.messages).toEqual([])
      expect(data.messageCount).toBe(0)
      // 제목은 메시지가 아니라 중복 위험이 없어 질문에서 뽑는다.
      expect(data.title).toBe('우리 둘 잘 맞을까요?')
    })

    it('제목이 없어도(질문 비어도) 행은 만든다 — 존재 자체가 목적', async () => {
      const result = await ensureCounselorSessionRecord({
        sessionId: 'compat_1718800000000_zzzzzzz',
        userId: 'user-1',
        messages: [],
        existenceOnly: true,
        title: '   ',
        type: 'compat',
      })
      expect(result).toBe('created')
      const data = mockCreate.mock.calls[0][0].data
      expect(data.messages).toEqual([])
      expect(data.title).toBeUndefined()
    })

    it('이미 있으면 건드리지 않는다', async () => {
      mockFindUnique.mockResolvedValue({ id: 'compat_1718800000000_abcdefg' })
      const result = await ensureCounselorSessionRecord({
        sessionId: 'compat_1718800000000_abcdefg',
        userId: 'user-1',
        messages: [],
        existenceOnly: true,
        title: 'q',
        type: 'compat',
      })
      expect(result).toBe('exists')
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })
})
