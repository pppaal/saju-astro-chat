/**
 * useCompatCounselorChat hook tests
 *
 * 이 훅은 공용 채팅 오케스트레이터(@/lib/counselor/useCounselorChat)에 궁합
 * 전용 동작만 주입하는 *얇은 어댑터*다. 스트리밍/재시도/복원 골격은 공용 훅이
 * 소유하므로, 여기서는 useCounselorChat 를 mock 으로 갈아끼워 어댑터가 넘기는
 * config 콜백(beforeSend / makeUserMessage / completeTurn / onSendFailure /
 * applyRecovered / draft.build / isRecoverableLastMessage / performRequest …)
 * 을 직접 호출하며 궁합 고유 로직을 검증한다.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { ChatMessage, PersonData } from '@/app/compatibility/counselor/types'

// --- mock: 공용 오케스트레이터 -----------------------------------------------
// useCounselorChat 호출 시 받은 config 를 캡처해 테스트에서 콜백을 직접 친다.
let capturedConfig: any = null
const mockUseCounselorChat = vi.fn((config: any) => {
  capturedConfig = config
  // 어댑터의 반환 타입(UseCounselorChatReturn)을 흉내내는 최소 객체.
  return { __isReturn: true } as any
})
const mockRequestCounselorStream = vi.fn(() => Promise.resolve({} as any))
const mockMergeCounselorFollowUps = vi.fn(() => ['q1', 'q2'])

vi.mock('@/lib/counselor/useCounselorChat', () => ({
  useCounselorChat: (config: any) => mockUseCounselorChat(config),
  requestCounselorStream: (opts: any) => mockRequestCounselorStream(opts),
  mergeCounselorFollowUps: (args: any) => mockMergeCounselorFollowUps(args),
}))

// --- mock: 컨텍스트 훅 -------------------------------------------------------
const mockShowDepleted = vi.fn()
const mockRequireLogin = vi.fn(() => true)
vi.mock('@/contexts/CreditModalContext', () => ({
  useCreditModal: () => ({ showDepleted: mockShowDepleted }),
}))
vi.mock('@/contexts/LoginModalContext', () => ({
  useRequireLogin: () => mockRequireLogin,
}))

// --- mock: 사이드 이펙트 유틸 -------------------------------------------------
const mockSavePendingChat = vi.fn()
vi.mock('@/lib/chat/pendingChat', () => ({
  savePendingChat: (...a: any[]) => mockSavePendingChat(...a),
}))

const mockApiFetch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...a: any[]) => mockApiFetch(...a),
}))

const mockGetErrorMessage = vi.fn(() => 'localized-error')
vi.mock('@/lib/counselor/errorMessage', () => ({
  getErrorMessage: (...a: any[]) => mockGetErrorMessage(...a),
}))

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

import { useCompatCounselorChat } from '@/app/compatibility/counselor/useCompatCounselorChat'

// --- 테스트 헬퍼: 표준 args 생성 --------------------------------------------
function makePersons(n = 2): PersonData[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `P${i}`,
    date: '1990-01-01',
    time: '12:00',
    city: 'Seoul',
  }))
}

function makeArgs(overrides: Partial<any> = {}) {
  return {
    locale: 'ko' as const,
    isKo: true,
    persons: makePersons(2),
    person1Saju: { a: 1 },
    person2Saju: { b: 2 },
    person1Astro: { c: 3 },
    person2Astro: { d: 4 },
    chatSessionId: undefined as string | undefined,
    setChatSessionId: vi.fn(),
    chatTitle: 'My Chat',
    cvText: '',
    isInitializing: false,
    mountedRef: { current: true },
    setError: vi.fn(),
    ...overrides,
  }
}

// 응답 헤더 흉내 — get(name) 으로 값을 돌려준다.
function makeResponse(headers: Record<string, string> = {}) {
  return {
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
  } as unknown as Response
}

// completeTurn / applyRecovered 가 받는 helpers stub.
function makeHelpers() {
  return {
    markRecoverable: vi.fn(),
    kickRecover: vi.fn(),
    finishTurnClean: vi.fn(),
    setFollowUpQuestions: vi.fn(),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedConfig = null
  mockRequireLogin.mockReturnValue(true)
  mockMergeCounselorFollowUps.mockReturnValue(['q1', 'q2'])
  // apiFetch 기본: 저장 성공 응답.
  mockApiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, session: { id: 'srv-session' } }),
  })
})

function setup(overrides: Partial<any> = {}) {
  const args = makeArgs(overrides)
  renderHook(() => useCompatCounselorChat(args))
  return { args, config: capturedConfig }
}

describe('useCompatCounselorChat — wiring', () => {
  it('passes compat namespace and core config to useCounselorChat', () => {
    const { config } = setup()
    expect(config.namespace).toBe('compat')
    expect(config.chunkIdleTimeoutMs).toBe(45_000)
    expect(config.rearmIdleOnActivity).toBe(false)
    expect(config.haltOnUnmount).toBe(true)
    expect(config.retryUsesHistoryOverride).toBe(true)
    expect(typeof config.resultEndpoint).toBe('function')
  })

  it('builds the result endpoint with an encoded turnId', () => {
    const { config } = setup()
    expect(config.resultEndpoint('turn 1&2')).toBe(
      '/api/compatibility/counselor/result?turnId=turn%201%262'
    )
  })

  it('makeUserMessage / makeAssistantMessage shape messages', () => {
    const { config } = setup()
    expect(config.makeUserMessage('hi')).toEqual({ role: 'user', content: 'hi' })
    expect(config.makeAssistantMessage()).toEqual({ role: 'assistant', content: '' })
  })

  it('onSendStart clears the error', () => {
    const { args, config } = setup()
    config.onSendStart()
    expect(args.setError).toHaveBeenCalledWith(null)
  })
})

describe('beforeSend (login gate)', () => {
  it('allows send when logged in (returns undefined)', () => {
    mockRequireLogin.mockReturnValue(true)
    const { config } = setup()
    expect(config.beforeSend('question')).toBeUndefined()
    expect(mockSavePendingChat).not.toHaveBeenCalled()
  })

  it('blocks send and saves a draft when not logged in (>=2 persons)', () => {
    mockRequireLogin.mockReturnValue(false)
    const { config } = setup()
    const result = config.beforeSend('blocked question')
    expect(result).toBe(false)
    expect(mockSavePendingChat).toHaveBeenCalledWith(
      'compat',
      expect.objectContaining({
        persons: expect.any(Array),
        messages: [{ role: 'user', content: 'blocked question' }],
        chatTitle: 'My Chat',
      })
    )
  })

  it('blocks send without saving a draft when fewer than 2 persons', () => {
    mockRequireLogin.mockReturnValue(false)
    const { config } = setup({ persons: makePersons(1) })
    expect(config.beforeSend('q')).toBe(false)
    expect(mockSavePendingChat).not.toHaveBeenCalled()
  })
})

describe('performRequest', () => {
  it('sends recent history + snapshots and idempotency/session headers', () => {
    const { args, config } = setup({ chatSessionId: 'sess-1', cvText: 'cv' })
    const longHistory = Array.from({ length: 15 }, (_, i) => ({
      role: 'user',
      content: `m${i}`,
    }))
    config.performRequest({
      turn: { turnId: 'tid', idempotencyKey: 'idem' },
      history: longHistory,
      registerController: vi.fn(),
    })

    expect(mockRequestCounselorStream).toHaveBeenCalledTimes(1)
    const opts = mockRequestCounselorStream.mock.calls[0][0] as any
    expect(opts.headerTimeoutMs).toBe(30_000)
    expect(opts.maxRetryAttempts).toBe(2)

    // doFetch 를 실행하면 apiFetch 가 올바른 엔드포인트/헤더/body 로 불린다.
    opts.doFetch('signal-token')
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/compatibility/counselor',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-idempotency-key': 'idem',
          'x-session-id': 'sess-1',
        }),
        signal: 'signal-token',
      })
    )
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect(body.turnId).toBe('tid')
    expect(body.cvText).toBe('cv')
    expect(body.useRag).toBe(true)
    // history.slice(-10) — 마지막 10턴만 전송.
    expect(body.messages).toHaveLength(10)
    expect(body.messages[0].content).toBe('m5')
    void args
  })

  it('omits cvText from the body when empty', () => {
    const { config } = setup({ cvText: '' })
    config.performRequest({
      turn: { turnId: 't', idempotencyKey: 'i' },
      history: [],
      registerController: vi.fn(),
    })
    const opts = mockRequestCounselorStream.mock.calls[0][0] as any
    opts.doFetch('sig')
    const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
    expect('cvText' in body).toBe(false)
  })

  it('sends an empty x-session-id header when no session yet', () => {
    const { config } = setup({ chatSessionId: undefined })
    config.performRequest({
      turn: { turnId: 't', idempotencyKey: 'i' },
      history: [],
      registerController: vi.fn(),
    })
    const opts = mockRequestCounselorStream.mock.calls[0][0] as any
    opts.doFetch('sig')
    expect(mockApiFetch.mock.calls[0][1].headers['x-session-id']).toBe('')
  })

  describe('onNotOk branches', () => {
    function getOnNotOk(config: any) {
      config.performRequest({
        turn: { turnId: 't', idempotencyKey: 'i' },
        history: [],
        registerController: vi.fn(),
      })
      return (mockRequestCounselorStream.mock.calls[0][0] as any).onNotOk
    }

    it("returns 'retry' when retry is allowed", async () => {
      const { config } = setup()
      const onNotOk = getOnNotOk(config)
      await expect(onNotOk({ status: 500 }, 0, true)).resolves.toBe('retry')
    })

    it('throws login_required on 401', async () => {
      const { config } = setup()
      const onNotOk = getOnNotOk(config)
      await expect(onNotOk({ status: 401 }, 0, false)).rejects.toThrow('login_required')
    })

    it('throws payment_required on 402', async () => {
      const { config } = setup()
      const onNotOk = getOnNotOk(config)
      await expect(onNotOk({ status: 402 }, 0, false)).rejects.toThrow('payment_required')
    })

    it('includes the errorTag from the JSON body for other errors', async () => {
      const { config } = setup()
      const onNotOk = getOnNotOk(config)
      const res = {
        status: 500,
        clone: () => ({ json: async () => ({ errorTag: 'rate_limited' }) }),
      }
      await expect(onNotOk(res, 0, false)).rejects.toThrow('Failed (500): rate_limited')
    })

    it('falls back to plain status when body is not JSON', async () => {
      const { config } = setup()
      const onNotOk = getOnNotOk(config)
      const res = {
        status: 503,
        clone: () => ({
          json: async () => {
            throw new Error('not json')
          },
        }),
      }
      await expect(onNotOk(res, 0, false)).rejects.toThrow('Failed (503)')
    })
  })
})

describe('renderChunk', () => {
  it('does nothing when unmounted', () => {
    const mountedRef = { current: false }
    const { config } = setup({ mountedRef })
    // mountedRef.current=false → 조용히 bail. 던지지 않으면 충분.
    expect(() => config.renderChunk('partial')).not.toThrow()
  })

  it('does not throw while mounted', () => {
    const { config } = setup()
    expect(() => config.renderChunk('streamed content')).not.toThrow()
  })
})

describe('completeTurn', () => {
  it('marks recoverable and kicks recover when truncated', () => {
    const { config } = setup()
    const helpers = makeHelpers()
    config.completeTurn(
      {
        result: { success: false, truncated: true, followUps: [] },
        finalContent: 'partial answer',
        response: makeResponse(),
        turn: { text: 'q' },
      },
      helpers
    )
    expect(helpers.markRecoverable).toHaveBeenCalled()
    expect(helpers.kickRecover).toHaveBeenCalled()
    expect(helpers.finishTurnClean).not.toHaveBeenCalled()
    // truncated 턴은 chat-history 저장을 건너뛴다.
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('treats x-counselor-fallback responses as complete (not truncated)', () => {
    const { config } = setup()
    const helpers = makeHelpers()
    config.completeTurn(
      {
        result: { success: false, truncated: true, followUps: [] },
        finalContent: 'fallback answer',
        response: makeResponse({ 'x-counselor-fallback': '1' }),
        turn: { text: 'q' },
      },
      helpers
    )
    // 서버 폴백 = 완결 → finishTurnClean, 복원 안 함.
    expect(helpers.finishTurnClean).toHaveBeenCalled()
    expect(helpers.markRecoverable).not.toHaveBeenCalled()
    // 완결이므로 chat-history 저장도 일어난다.
    expect(mockApiFetch).toHaveBeenCalledWith(
      '/api/counselor/chat-history',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('saves the exchange with meta on first successful turn and syncs session id', () => {
    const setChatSessionId = vi.fn()
    const { config } = setup({ chatSessionId: undefined, setChatSessionId })
    const helpers = makeHelpers()
    config.completeTurn(
      {
        result: { success: true, truncated: false, followUps: ['raw'] },
        finalContent: 'full answer',
        response: makeResponse({ 'x-session-id': 'server-sid' }),
        turn: { text: 'user question' },
      },
      helpers
    )
    expect(helpers.finishTurnClean).toHaveBeenCalled()
    expect(helpers.setFollowUpQuestions).toHaveBeenCalledWith(['q1', 'q2'])
    // 서버 헤더의 세션 id 로 동기화.
    expect(setChatSessionId).toHaveBeenCalledWith('server-sid')
    // chat-history 저장 body 에 meta 가 실린다(첫 저장).
    const saveCall = mockApiFetch.mock.calls.find((c) => c[0] === '/api/counselor/chat-history')
    expect(saveCall).toBeDefined()
    const body = JSON.parse(saveCall![1].body)
    expect(body.type).toBe('compat')
    expect(body.userMessage).toBe('user question')
    expect(body.assistantMessage).toBe('full answer')
    expect(body.meta).toBeDefined()
    expect(body.meta.persons).toHaveLength(2)
  })

  it('does not save anything when finalContent is empty', () => {
    const { config } = setup()
    const helpers = makeHelpers()
    config.completeTurn(
      {
        result: { success: true, truncated: false, followUps: [] },
        finalContent: '',
        response: makeResponse(),
        turn: { text: 'q' },
      },
      helpers
    )
    expect(helpers.finishTurnClean).not.toHaveBeenCalled()
    expect(mockApiFetch).not.toHaveBeenCalledWith('/api/counselor/chat-history', expect.anything())
  })
})

describe('onSendFailure', () => {
  it('silently bails on AbortError', () => {
    const { args, config } = setup()
    const err = Object.assign(new Error('aborted'), { name: 'AbortError' })
    config.onSendFailure(err)
    expect(args.setError).not.toHaveBeenCalled()
    expect(mockShowDepleted).not.toHaveBeenCalled()
  })

  it('silently bails when unmounted', () => {
    const mountedRef = { current: false }
    const { args, config } = setup({ mountedRef })
    config.onSendFailure(new Error('whatever'))
    expect(args.setError).not.toHaveBeenCalled()
  })

  it('shows a login-required message on login_required', () => {
    const { args, config } = setup({ isKo: true })
    config.onSendFailure(new Error('login_required'))
    expect(args.setError).toHaveBeenCalledWith('로그인이 필요한 프리미엄 기능입니다.')
  })

  it('shows the English login message when not Korean', () => {
    const { args, config } = setup({ isKo: false })
    config.onSendFailure(new Error('login_required'))
    expect(args.setError).toHaveBeenCalledWith('Login required for this premium feature.')
  })

  it('opens the credit modal on payment_required', () => {
    const { args, config } = setup()
    config.onSendFailure(new Error('payment_required'))
    expect(mockShowDepleted).toHaveBeenCalled()
    expect(args.setError).not.toHaveBeenCalled()
  })

  it('uses the shared localizer for generic errors', () => {
    const { args, config } = setup()
    config.onSendFailure(new Error('Failed (500): boom'))
    expect(mockGetErrorMessage).toHaveBeenCalled()
    expect(args.setError).toHaveBeenCalledWith('localized-error')
  })
})

describe('applyRecovered', () => {
  it('returns false / bails when unmounted', () => {
    const mountedRef = { current: false }
    const { config } = setup({ mountedRef })
    const result = config.applyRecovered(
      { userText: 'u', cleanContent: 'full', followUps: [] },
      makeHelpers()
    )
    expect(result).toBe(false)
    expect(mockApiFetch).not.toHaveBeenCalled()
  })

  it('replaces the last assistant message and saves the recovered exchange', () => {
    const { args, config } = setup({ chatSessionId: 'sess-x' })
    const recoverHelpers = makeHelpers()
    config.applyRecovered(
      { userText: 'recovered q', cleanContent: 'recovered answer', followUps: ['x'] },
      recoverHelpers
    )
    expect(recoverHelpers.setFollowUpQuestions).toHaveBeenCalledWith(['q1', 'q2'])
    const saveCall = mockApiFetch.mock.calls.find((c) => c[0] === '/api/counselor/chat-history')
    expect(saveCall).toBeDefined()
    const body = JSON.parse(saveCall![1].body)
    expect(body.sessionId).toBe('sess-x')
    expect(body.userMessage).toBe('recovered q')
    expect(body.assistantMessage).toBe('recovered answer')
    // 복원은 단독 저장자라 meta 도 첨부(아직 안 실렸으면).
    expect(body.meta).toBeDefined()
    expect(args.setError).toHaveBeenCalledWith(null)
  })
})

describe('isRecoverableLastMessage', () => {
  it('is recoverable when last assistant message is incomplete', () => {
    const { config } = setup()
    expect(
      config.isRecoverableLastMessage({ role: 'assistant', content: 'partial', incomplete: true })
    ).toBe(true)
  })

  it('is recoverable when last assistant message is empty', () => {
    const { config } = setup()
    expect(config.isRecoverableLastMessage({ role: 'assistant', content: '' })).toBe(true)
  })

  it('is not recoverable for a complete assistant message', () => {
    const { config } = setup()
    expect(config.isRecoverableLastMessage({ role: 'assistant', content: 'done' })).toBeFalsy()
  })

  it('is not recoverable for a user message', () => {
    const { config } = setup()
    expect(config.isRecoverableLastMessage({ role: 'user', content: 'hi' })).toBe(false)
  })
})

describe('draft config', () => {
  it('suspends drafts while initializing', () => {
    const { config } = setup({ isInitializing: true })
    expect(config.draft.suspended).toBe(true)
    expect(config.draft.hasServerSession).toBe(false)
  })

  it('reflects an existing server session', () => {
    const { config } = setup({ chatSessionId: 'has-one' })
    expect(config.draft.hasServerSession).toBe(true)
  })

  it('build() returns a snapshot when there are >=2 persons and messages', () => {
    const { config } = setup()
    const msgs: ChatMessage[] = [{ role: 'user', content: 'hi' }]
    const draft = config.draft.build(msgs)
    expect(draft).toMatchObject({
      messages: msgs,
      chatTitle: 'My Chat',
      persons: expect.any(Array),
    })
  })

  it('build() returns null with no messages', () => {
    const { config } = setup()
    expect(config.draft.build([])).toBeNull()
  })

  it('build() returns null with fewer than 2 persons', () => {
    const { config } = setup({ persons: makePersons(1) })
    expect(config.draft.build([{ role: 'user', content: 'hi' }])).toBeNull()
  })
})

describe('applyUserMessage', () => {
  it('appends the user message via the provided setter', () => {
    const { config } = setup()
    const set = vi.fn()
    config.applyUserMessage({ setMessages: set, userMessage: { role: 'user', content: 'hi' } })
    expect(set).toHaveBeenCalledTimes(1)
    // setter 콜백을 직접 실행해 append 동작 확인.
    const updater = set.mock.calls[0][0]
    expect(updater([{ role: 'assistant', content: 'a' }])).toEqual([
      { role: 'assistant', content: 'a' },
      { role: 'user', content: 'hi' },
    ])
  })
})

describe('onStreamError', () => {
  it('does not throw', () => {
    const { config } = setup()
    expect(() => config.onStreamError(new Error('stream'))).not.toThrow()
  })
})
