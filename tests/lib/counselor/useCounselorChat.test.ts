// tests/lib/counselor/useCounselorChat.test.ts
//
// useCounselorChat — 운명/궁합 상담사 공용 채팅 오케스트레이션 훅.
// 큰 표면적(전송 파이프라인, 스트림 소비, 재시도, 끊긴 턴 복원, 드래프트 저장,
// 로그인 후 resume)을 분기별로 커버한다. 또한 동일 모듈에서 export 되는 순수
// 헬퍼 requestCounselorStream / mergeCounselorFollowUps 도 직접 검증한다.
//
// 의존성 모킹 전략:
//   - @/lib/streaming        : streamProcessor.process / extractFollowUpQuestions
//   - @/lib/chat/pendingTurn : read/write/clear + TTL 상수 (in-memory store)
//   - @/lib/chat/pendingChat : save/clear (호출 spy)
//   - next-auth/react        : tests/setup.ts 가 전역 mock (기본 unauthenticated)
//   - useRecoverOnResume / chat-followups : 실제 모듈 그대로 사용

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

// ---- mocks ---------------------------------------------------------------
const mockProcess = vi.fn()
const mockExtract = vi.fn((text: string) => ({ cleanContent: text, followUps: [] as string[] }))
vi.mock('@/lib/streaming', () => ({
  streamProcessor: {
    process: (...args: unknown[]) => mockProcess(...args),
    extractFollowUpQuestions: (text: string) => mockExtract(text),
  },
}))

// pendingTurn — in-memory store so read/write/clear interplay is observable.
const turnStore: Record<string, { turnId: string; userText: string; ts: number }> = {}
const readPendingTurn = vi.fn((kind: string) => turnStore[kind] ?? null)
const writePendingTurn = vi.fn(
  (kind: string, t: { turnId: string; userText: string; ts: number }) => {
    turnStore[kind] = t
  }
)
const clearPendingTurn = vi.fn((kind: string) => {
  delete turnStore[kind]
})
vi.mock('@/lib/chat/pendingTurn', () => ({
  readPendingTurn: (kind: string) => readPendingTurn(kind),
  writePendingTurn: (kind: string, t: { turnId: string; userText: string; ts: number }) =>
    writePendingTurn(kind, t),
  clearPendingTurn: (kind: string) => clearPendingTurn(kind),
  PENDING_TURN_TTL_MS: 10 * 60 * 1000,
}))

const savePendingChat = vi.fn()
const clearPendingChat = vi.fn()
vi.mock('@/lib/chat/pendingChat', () => ({
  savePendingChat: (...a: unknown[]) => savePendingChat(...a),
  clearPendingChat: (...a: unknown[]) => clearPendingChat(...a),
}))

import {
  useCounselorChat,
  requestCounselorStream,
  mergeCounselorFollowUps,
  type UseCounselorChatConfig,
  type CounselorChatMessageBase,
} from '@/lib/counselor/useCounselorChat'
import { useSession } from 'next-auth/react'

// next-auth/react is globally mocked in tests/setup.ts (default unauthenticated).
// Toggle the return value per-test via this typed handle.
const mockUseSession = useSession as unknown as ReturnType<typeof vi.fn>
const setAuthStatus = (status: 'loading' | 'authenticated' | 'unauthenticated') => {
  mockUseSession.mockReturnValue({
    status,
    data: status === 'authenticated' ? { user: {} } : null,
    update: vi.fn(),
  })
}

// ---- test message type + config factory ----------------------------------
import React from 'react'
interface TMsg extends CounselorChatMessageBase {}

let idCounter = 0

type Spies = {
  prepareText: ReturnType<typeof vi.fn>
  beforeSend: ReturnType<typeof vi.fn>
  makeUserMessage: ReturnType<typeof vi.fn>
  makeAssistantMessage: ReturnType<typeof vi.fn>
  applyUserMessage: ReturnType<typeof vi.fn>
  onSendStart: ReturnType<typeof vi.fn>
  performRequest: ReturnType<typeof vi.fn>
  onResponse: ReturnType<typeof vi.fn>
  renderChunk: ReturnType<typeof vi.fn>
  onStreamError: ReturnType<typeof vi.fn>
  completeTurn: ReturnType<typeof vi.fn>
  onSendFailure: ReturnType<typeof vi.fn>
  onUnmountCleanup: ReturnType<typeof vi.fn>
  applyRecovered: ReturnType<typeof vi.fn>
  isRecoverableLastMessage: ReturnType<typeof vi.fn>
}

function makeSpies(): Spies {
  return {
    prepareText: vi.fn((t: string) => t),
    beforeSend: vi.fn(() => undefined as boolean | void),
    makeUserMessage: vi.fn((text: string) => ({ role: 'user', content: text }) as TMsg),
    makeAssistantMessage: vi.fn(
      () => ({ role: 'assistant', content: '', id: `a${++idCounter}`, streaming: true }) as TMsg
    ),
    applyUserMessage: vi.fn(
      (a: {
        setMessages: React.Dispatch<React.SetStateAction<TMsg[]>>
        userMessage: TMsg
        baseHistory: TMsg[]
      }) => {
        a.setMessages([...a.baseHistory, a.userMessage])
      }
    ),
    onSendStart: vi.fn(),
    performRequest: vi.fn(async (args: { registerController: (c: AbortController) => void }) => {
      const controller = new AbortController()
      args.registerController(controller)
      return { res: { ok: true, headers: new Headers() } as unknown as Response, controller }
    }),
    onResponse: vi.fn(),
    renderChunk: vi.fn(),
    onStreamError: vi.fn(),
    completeTurn: vi.fn(),
    onSendFailure: vi.fn(),
    onUnmountCleanup: vi.fn(),
    applyRecovered: vi.fn(() => true as boolean | void),
    isRecoverableLastMessage: vi.fn(() => false),
  }
}

/**
 * Render the hook with a REAL React-owned messages state so the hook re-renders
 * (and re-syncs its internal messagesRef) whenever setMessages is called — this
 * mirrors how the real consumers own the [state, setState] pair. configOver is a
 * partial of non-messagesState config fields.
 */
function renderChat(
  opts: {
    initialMessages?: TMsg[]
    configOver?: Partial<Omit<UseCounselorChatConfig<TMsg>, 'messagesState'>>
    spies?: Spies
  } = {}
) {
  const spies = opts.spies ?? makeSpies()
  // expose the latest messages snapshot to the test
  const ref: { messages: TMsg[] } = { messages: opts.initialMessages ?? [] }
  const { result, unmount, rerender } = renderHook(() => {
    const messagesState = React.useState<TMsg[]>(opts.initialMessages ?? [])
    ref.messages = messagesState[0]
    const config: UseCounselorChatConfig<TMsg> = {
      namespace: 'destiny',
      messagesState,
      prepareText: spies.prepareText,
      beforeSend: spies.beforeSend,
      makeUserMessage: spies.makeUserMessage,
      makeAssistantMessage: spies.makeAssistantMessage,
      applyUserMessage: spies.applyUserMessage,
      onSendStart: spies.onSendStart,
      performRequest: spies.performRequest,
      onResponse: spies.onResponse,
      chunkIdleTimeoutMs: 100000,
      rearmIdleOnActivity: true,
      renderChunk: spies.renderChunk,
      onStreamError: spies.onStreamError,
      completeTurn: spies.completeTurn,
      onSendFailure: spies.onSendFailure,
      haltOnUnmount: false,
      onUnmountCleanup: spies.onUnmountCleanup,
      resultEndpoint: (turnId: string) => `/api/result/${turnId}`,
      applyRecovered: spies.applyRecovered,
      isRecoverableLastMessage: spies.isRecoverableLastMessage,
      retryUsesHistoryOverride: false,
      ...opts.configOver,
    }
    return useCounselorChat(config)
  })
  return { result, unmount, rerender, spies, ref }
}

// default stream: produce one chunk then resolve a complete result.
function defaultStream(content = 'hello world') {
  mockProcess.mockImplementation(async (_res: Response, opts: Record<string, unknown>) => {
    const onChunk = opts.onChunk as (acc: string, cleaned: string) => void
    onChunk?.(content, content)
    return { complete: true, content } as unknown
  })
}

describe('mergeCounselorFollowUps', () => {
  it('keeps good AI follow-ups up to count', () => {
    const out = mergeCounselorFollowUps({
      aiFollowUps: ['What about my career path next year?', 'How does Saturn affect me?'],
      userText: 'q',
      assistantContent: 'a',
      lang: 'en',
      count: 2,
    })
    expect(out).toHaveLength(2)
  })

  it('backfills with generated questions when AI follow-ups are insufficient', () => {
    const out = mergeCounselorFollowUps({
      aiFollowUps: [],
      userText: 'Tell me about my love life',
      assistantContent: 'Your relationships look promising',
      lang: 'en',
      count: 2,
    })
    expect(out.length).toBeGreaterThan(0)
    expect(out.length).toBeLessThanOrEqual(2)
  })

  it('defaults count to 2', () => {
    const out = mergeCounselorFollowUps({
      aiFollowUps: [],
      userText: 'love',
      assistantContent: 'x',
      lang: 'ko',
    })
    expect(out.length).toBeLessThanOrEqual(2)
  })
})

describe('requestCounselorStream', () => {
  beforeEach(() => vi.useRealTimers())

  it('returns immediately on an ok response', async () => {
    const res = { ok: true } as Response
    const doFetch = vi.fn(async () => res)
    const afterOk = vi.fn()
    const out = await requestCounselorStream({
      doFetch,
      headerTimeoutMs: 1000,
      maxRetryAttempts: 2,
      retryBaseDelayMs: 1,
      afterOk,
      onNotOk: () => {
        throw new Error('should not reach')
      },
    })
    expect(out.res).toBe(res)
    expect(afterOk).toHaveBeenCalledWith(res)
    expect(doFetch).toHaveBeenCalledTimes(1)
  })

  it('retries 5xx then succeeds when onNotOk returns retry', async () => {
    const okRes = { ok: true, status: 200 } as Response
    const badRes = { ok: false, status: 503 } as Response
    let call = 0
    const doFetch = vi.fn(async () => (++call === 1 ? badRes : okRes))
    const onNotOk = vi.fn(() => 'retry' as const)
    const onRetryScheduled = vi.fn()
    const out = await requestCounselorStream({
      doFetch,
      headerTimeoutMs: 1000,
      maxRetryAttempts: 2,
      retryBaseDelayMs: 1,
      onNotOk,
      onRetryScheduled,
    })
    expect(out.res).toBe(okRes)
    expect(doFetch).toHaveBeenCalledTimes(2)
    expect(onRetryScheduled).toHaveBeenCalledWith(1, 'status')
  })

  it('throws when onNotOk throws (4xx user error)', async () => {
    const badRes = { ok: false, status: 401 } as Response
    const doFetch = vi.fn(async () => badRes)
    await expect(
      requestCounselorStream({
        doFetch,
        headerTimeoutMs: 1000,
        maxRetryAttempts: 2,
        retryBaseDelayMs: 1,
        onNotOk: () => {
          throw new Error('unauthorized')
        },
      })
    ).rejects.toThrow('unauthorized')
    expect(doFetch).toHaveBeenCalledTimes(1)
  })

  it('throws defensive guard error when onNotOk returns retry but cannot retry', async () => {
    const badRes = { ok: false, status: 500 } as Response
    const doFetch = vi.fn(async () => badRes)
    await expect(
      requestCounselorStream({
        doFetch,
        headerTimeoutMs: 1000,
        maxRetryAttempts: 0, // canRetry false
        retryBaseDelayMs: 1,
        onNotOk: () => 'retry' as const,
      })
    ).rejects.toThrow('Failed (500)')
  })

  it('retries on AbortError/timeout then rethrows when exhausted', async () => {
    const abortErr = Object.assign(new Error('aborted'), { name: 'AbortError' })
    const doFetch = vi.fn(async () => {
      throw abortErr
    })
    const onTimeoutLike = vi.fn()
    const onRetryScheduled = vi.fn()
    await expect(
      requestCounselorStream({
        doFetch,
        headerTimeoutMs: 1000,
        maxRetryAttempts: 1,
        retryBaseDelayMs: 1,
        onNotOk: () => {
          throw new Error('x')
        },
        onTimeoutLike,
        onRetryScheduled,
      })
    ).rejects.toThrow('aborted')
    expect(doFetch).toHaveBeenCalledTimes(2) // initial + 1 retry
    expect(onTimeoutLike).toHaveBeenCalledTimes(2)
    expect(onRetryScheduled).toHaveBeenCalledWith(1, 'timeout')
  })

  it('maps exhausted timeout error via mapExhaustedTimeout', async () => {
    const timeoutErr = Object.assign(new Error('to'), { name: 'TimeoutError' })
    const doFetch = vi.fn(async () => {
      throw timeoutErr
    })
    await expect(
      requestCounselorStream({
        doFetch,
        headerTimeoutMs: 1000,
        maxRetryAttempts: 0,
        retryBaseDelayMs: 1,
        onNotOk: () => {
          throw new Error('x')
        },
        mapExhaustedTimeout: () => new Error('mapped-timeout'),
      })
    ).rejects.toThrow('mapped-timeout')
  })

  it('rethrows non-abort errors immediately', async () => {
    const doFetch = vi.fn(async () => {
      throw new TypeError('network down')
    })
    await expect(
      requestCounselorStream({
        doFetch,
        headerTimeoutMs: 1000,
        maxRetryAttempts: 3,
        retryBaseDelayMs: 1,
        onNotOk: () => 'retry' as const,
      })
    ).rejects.toThrow('network down')
    expect(doFetch).toHaveBeenCalledTimes(1)
  })

  it('invokes onResponse and registerController per attempt', async () => {
    const res = { ok: true } as Response
    const doFetch = vi.fn(async () => res)
    const onResponse = vi.fn()
    const registerController = vi.fn()
    const onAttemptStart = vi.fn()
    await requestCounselorStream({
      doFetch,
      headerTimeoutMs: 1000,
      maxRetryAttempts: 0,
      retryBaseDelayMs: 1,
      onNotOk: () => {
        throw new Error('x')
      },
      onResponse,
      registerController,
      onAttemptStart,
    })
    expect(onResponse).toHaveBeenCalled()
    expect(registerController).toHaveBeenCalled()
    expect(onAttemptStart).toHaveBeenCalledWith(0)
  })
})

describe('useCounselorChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    for (const k of Object.keys(turnStore)) delete turnStore[k]
    idCounter = 0
    mockExtract.mockImplementation((text: string) => ({ cleanContent: text, followUps: [] }))
    ;(global.fetch as ReturnType<typeof vi.fn>).mockReset?.()
    setAuthStatus('unauthenticated')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('exposes empty defaults', () => {
      const { result, ref } = renderChat()
      expect(result.current.input).toBe('')
      expect(result.current.loading).toBe(false)
      expect(result.current.followUpQuestions).toEqual([])
      expect(result.current.messages).toBe(ref.messages)
      expect(typeof result.current.sendMessage).toBe('function')
      expect(result.current.outerSendRef.current).toBeNull()
    })

    it('updates input via setInput', () => {
      const { result } = renderChat()
      act(() => result.current.setInput('hi'))
      expect(result.current.input).toBe('hi')
    })

    it('updates followUpQuestions via setter', () => {
      const { result } = renderChat()
      act(() => result.current.setFollowUpQuestions(['q1']))
      expect(result.current.followUpQuestions).toEqual(['q1'])
    })
  })

  describe('sendMessage guards', () => {
    it('returns early for empty/whitespace text', async () => {
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('   ')
      })
      expect(spies.makeUserMessage).not.toHaveBeenCalled()
      expect(spies.performRequest).not.toHaveBeenCalled()
    })

    it('applies prepareText before the empty check', async () => {
      const spies = makeSpies()
      spies.prepareText = vi.fn(() => '')
      defaultStream()
      const { result } = renderChat({ spies })
      await act(async () => {
        await result.current.sendMessage('something')
      })
      expect(spies.prepareText).toHaveBeenCalledWith('something')
      expect(spies.performRequest).not.toHaveBeenCalled()
    })

    it('aborts when beforeSend returns false', async () => {
      const spies = makeSpies()
      spies.beforeSend = vi.fn(() => false)
      const { result } = renderChat({ spies })
      await act(async () => {
        await result.current.sendMessage('hello')
      })
      expect(spies.beforeSend).toHaveBeenCalledWith('hello', undefined)
      expect(spies.makeUserMessage).not.toHaveBeenCalled()
    })

    it('does not send a second message while loading', async () => {
      let resolveReq: (v: { res: Response; controller: AbortController }) => void = () => {}
      const spies = makeSpies()
      spies.performRequest = vi.fn(
        () =>
          new Promise<{ res: Response; controller: AbortController }>((r) => {
            resolveReq = r
          })
      )
      const { result } = renderChat({ spies })
      act(() => {
        void result.current.sendMessage('first')
      })
      await waitFor(() => expect(result.current.loading).toBe(true))
      await act(async () => {
        await result.current.sendMessage('second')
      })
      expect(spies.performRequest).toHaveBeenCalledTimes(1)
      const c = new AbortController()
      resolveReq({
        res: { ok: true, headers: new Headers() } as unknown as Response,
        controller: c,
      })
    })
  })

  describe('sendMessage happy path', () => {
    it('runs the full pipeline: user message, request, stream, completeTurn', async () => {
      defaultStream('the answer')
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('a question')
      })
      expect(spies.onSendStart).toHaveBeenCalledWith('a question')
      expect(spies.makeUserMessage).toHaveBeenCalledWith('a question')
      expect(spies.applyUserMessage).toHaveBeenCalled()
      expect(spies.performRequest).toHaveBeenCalledTimes(1)
      expect(spies.onResponse).toHaveBeenCalled()
      expect(spies.makeAssistantMessage).toHaveBeenCalled()
      expect(spies.renderChunk).toHaveBeenCalledWith('the answer')
      expect(spies.completeTurn).toHaveBeenCalled()
      const outcome = spies.completeTurn.mock.calls[0][0]
      expect(outcome.finalContent).toBe('the answer')
      expect(outcome.turn.text).toBe('a question')
      expect(outcome.turn.isRetry).toBe(false)
      expect(typeof outcome.turn.idempotencyKey).toBe('string')
      expect(result.current.loading).toBe(false)
      expect(writePendingTurn).toHaveBeenCalled()
    })

    it('clears input only when sending from the input box (no override)', async () => {
      defaultStream()
      const { result } = renderChat()
      act(() => result.current.setInput('typed text'))
      await act(async () => {
        await result.current.sendMessage()
      })
      expect(result.current.input).toBe('')
    })

    it('keeps input when sending via textOverride', async () => {
      defaultStream()
      const { result } = renderChat()
      act(() => result.current.setInput('kept'))
      await act(async () => {
        await result.current.sendMessage('override text')
      })
      expect(result.current.input).toBe('kept')
    })

    it('passes the helpers and reaches completeTurn even with empty follow-ups', async () => {
      defaultStream()
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('q')
      })
      const helpers = spies.completeTurn.mock.calls[0][1]
      expect(typeof helpers.markRecoverable).toBe('function')
      expect(typeof helpers.kickRecover).toBe('function')
      expect(typeof helpers.finishTurnClean).toBe('function')
      act(() => helpers.finishTurnClean())
      expect(clearPendingTurn).toHaveBeenCalledWith('destiny')
    })
  })

  describe('helpers from completeTurn', () => {
    it('markRecoverable persists a pendingTurn', async () => {
      defaultStream()
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('q')
      })
      const helpers = spies.completeTurn.mock.calls[0][1]
      writePendingTurn.mockClear()
      act(() => helpers.markRecoverable('a-id'))
      expect(writePendingTurn).toHaveBeenCalledWith(
        'destiny',
        expect.objectContaining({ userText: 'q' })
      )
    })

    it('kickRecover is callable and does not throw', async () => {
      defaultStream()
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('q')
      })
      const helpers = spies.completeTurn.mock.calls[0][1]
      expect(() => act(() => helpers.kickRecover())).not.toThrow()
    })
  })

  describe('error handling', () => {
    it('routes request failure to onSendFailure and clears loading', async () => {
      const spies = makeSpies()
      spies.performRequest = vi.fn(async () => {
        throw new Error('boom')
      })
      const { result } = renderChat({ spies })
      await act(async () => {
        await result.current.sendMessage('q')
      })
      expect(spies.onSendFailure).toHaveBeenCalledWith(expect.any(Error))
      expect(spies.completeTurn).not.toHaveBeenCalled()
      expect(result.current.loading).toBe(false)
    })

    it('forwards stream onError to onStreamError', async () => {
      mockProcess.mockImplementation(async (_res: Response, opts: Record<string, unknown>) => {
        const onError = opts.onError as (e: Error) => void
        onError?.(new Error('stream-bad'))
        return { complete: false, content: '' } as unknown
      })
      const { result, spies } = renderChat()
      await act(async () => {
        await result.current.sendMessage('q')
      })
      expect(spies.onStreamError).toHaveBeenCalledWith(expect.any(Error))
      expect(spies.completeTurn).toHaveBeenCalled()
    })
  })

  describe('haltOnUnmount', () => {
    it('does not push placeholder / completeTurn after unmount when haltOnUnmount=true', async () => {
      let resolveReq: (v: { res: Response; controller: AbortController }) => void = () => {}
      const spies = makeSpies()
      spies.performRequest = vi.fn(
        () =>
          new Promise<{ res: Response; controller: AbortController }>((r) => {
            resolveReq = r
          })
      )
      const { result, unmount } = renderChat({ spies, configOver: { haltOnUnmount: true } })
      let sendPromise: Promise<void>
      act(() => {
        sendPromise = result.current.sendMessage('q')
      })
      await waitFor(() => expect(spies.performRequest).toHaveBeenCalled())
      unmount()
      const c = new AbortController()
      await act(async () => {
        resolveReq({
          res: { ok: true, headers: new Headers() } as unknown as Response,
          controller: c,
        })
        await sendPromise!
      })
      expect(spies.makeAssistantMessage).not.toHaveBeenCalled()
      expect(spies.completeTurn).not.toHaveBeenCalled()
    })

    it('calls onUnmountCleanup on unmount', () => {
      const { unmount, spies } = renderChat()
      unmount()
      expect(spies.onUnmountCleanup).toHaveBeenCalledWith({ inFlightUserText: null })
    })

    it('aborts the in-flight controller on unmount', async () => {
      let captured: AbortController | null = null
      const spies = makeSpies()
      spies.performRequest = vi.fn(
        (args: { registerController: (c: AbortController) => void }) =>
          new Promise<{ res: Response; controller: AbortController }>(() => {
            const c = new AbortController()
            captured = c
            args.registerController(c)
          })
      )
      const { result, unmount } = renderChat({ spies })
      act(() => {
        void result.current.sendMessage('q')
      })
      await waitFor(() => expect(spies.performRequest).toHaveBeenCalled())
      unmount()
      expect(captured!.signal.aborted).toBe(true)
    })
  })

  describe('retryLastAnswer', () => {
    it('no-ops when fewer than 2 messages', () => {
      const { result, spies } = renderChat()
      act(() => result.current.retryLastAnswer())
      expect(spies.makeUserMessage).not.toHaveBeenCalled()
    })

    it('no-ops when last message is not assistant', () => {
      const initial: TMsg[] = [
        { role: 'user', content: 'u1' },
        { role: 'user', content: 'u2' },
      ]
      const { result, spies } = renderChat({ initialMessages: initial })
      act(() => result.current.retryLastAnswer())
      expect(spies.performRequest).not.toHaveBeenCalled()
    })

    it('no-ops when loading', async () => {
      const spies = makeSpies()
      spies.performRequest = vi.fn(
        () => new Promise<{ res: Response; controller: AbortController }>(() => {})
      )
      const initial: TMsg[] = [
        { role: 'user', content: 'u' },
        { role: 'assistant', content: 'a', id: 'a1' },
      ]
      const { result } = renderChat({ spies, initialMessages: initial })
      act(() => {
        void result.current.sendMessage('new')
      })
      await waitFor(() => expect(result.current.loading).toBe(true))
      spies.makeUserMessage.mockClear()
      act(() => result.current.retryLastAnswer())
      // loading guard: retry must not start another send
      expect(spies.makeUserMessage).not.toHaveBeenCalled()
    })

    it('pops last two messages and re-sends with isRetry reusing the idempotency key', async () => {
      defaultStream('first answer')
      const { result, spies, ref } = renderChat()
      await act(async () => {
        await result.current.sendMessage('original q')
      })
      const firstKey = spies.completeTurn.mock.calls[0][0].turn.idempotencyKey
      expect(ref.messages.some((m) => m.role === 'assistant')).toBe(true)
      spies.completeTurn.mockClear()
      spies.performRequest.mockClear()
      defaultStream('retry answer')
      await act(async () => {
        result.current.retryLastAnswer()
      })
      await waitFor(() => expect(spies.completeTurn).toHaveBeenCalled())
      const retryOutcome = spies.completeTurn.mock.calls[0][0]
      expect(retryOutcome.turn.isRetry).toBe(true)
      expect(retryOutcome.turn.idempotencyKey).toBe(firstKey)
    })

    it('routes retry through outerSendRef when set', async () => {
      const initial: TMsg[] = [
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a', id: 'a1' },
      ]
      const { result } = renderChat({ initialMessages: initial })
      const outer = vi.fn()
      act(() => {
        result.current.outerSendRef.current = outer
      })
      act(() => result.current.retryLastAnswer())
      expect(outer).toHaveBeenCalledWith('q', { isRetry: true })
    })

    it('passes historyOverride when retryUsesHistoryOverride=true', async () => {
      const initial: TMsg[] = [
        { role: 'user', content: 'older' },
        { role: 'assistant', content: 'older-a', id: 'a0' },
        { role: 'user', content: 'q' },
        { role: 'assistant', content: 'a', id: 'a1' },
      ]
      const { result } = renderChat({
        initialMessages: initial,
        configOver: { retryUsesHistoryOverride: true },
      })
      const outer = vi.fn()
      act(() => {
        result.current.outerSendRef.current = outer
      })
      act(() => result.current.retryLastAnswer())
      expect(outer).toHaveBeenCalledWith('q', {
        isRetry: true,
        historyOverride: [initial[0], initial[1]],
      })
    })
  })

  describe('queueResumeText', () => {
    it('does not auto-send while unauthenticated', async () => {
      const { result, spies } = renderChat()
      act(() => result.current.queueResumeText('resume me'))
      await act(async () => {
        await Promise.resolve()
      })
      expect(spies.performRequest).not.toHaveBeenCalled()
    })

    it('auto-sends once when authenticated', async () => {
      setAuthStatus('authenticated')
      defaultStream()
      const { result } = renderChat()
      const outer = vi.fn()
      act(() => {
        result.current.outerSendRef.current = outer
      })
      act(() => result.current.queueResumeText('resume text'))
      await waitFor(() => expect(outer).toHaveBeenCalledWith('resume text'))
    })
  })

  describe('draft persistence', () => {
    it('saves a pending chat draft when no server session', async () => {
      const build = vi.fn(() => ({ snapshot: true }))
      renderChat({ configOver: { draft: { hasServerSession: false, build } } })
      await waitFor(() =>
        expect(savePendingChat).toHaveBeenCalledWith('destiny', { snapshot: true })
      )
    })

    it('clears the draft when a server session exists', async () => {
      const build = vi.fn(() => ({ snapshot: true }))
      renderChat({ configOver: { draft: { hasServerSession: true, build } } })
      await waitFor(() => expect(clearPendingChat).toHaveBeenCalledWith('destiny'))
      expect(savePendingChat).not.toHaveBeenCalled()
    })

    it('skips saving while suspended', async () => {
      const build = vi.fn(() => ({ snapshot: true }))
      renderChat({ configOver: { draft: { suspended: true, hasServerSession: false, build } } })
      await act(async () => {
        await Promise.resolve()
      })
      expect(savePendingChat).not.toHaveBeenCalled()
    })

    it('skips saving when build returns null', async () => {
      const build = vi.fn(() => null)
      renderChat({ configOver: { draft: { hasServerSession: false, build } } })
      await act(async () => {
        await Promise.resolve()
      })
      expect(savePendingChat).not.toHaveBeenCalled()
    })
  })

  describe('mount recovery', () => {
    it('clears an expired pendingTurn on mount', async () => {
      turnStore['destiny'] = { turnId: 't-old', userText: 'old', ts: Date.now() - 20 * 60 * 1000 }
      renderChat({ initialMessages: [{ role: 'user', content: 'u' }] })
      await waitFor(() => expect(clearPendingTurn).toHaveBeenCalledWith('destiny'))
    })

    it('marks recovery done with no pendingTurn (no clear call)', async () => {
      const { result } = renderChat({ initialMessages: [{ role: 'user', content: 'u' }] })
      await act(async () => {
        await Promise.resolve()
      })
      // nothing to clear since there was no pendingTurn
      expect(clearPendingTurn).not.toHaveBeenCalled()
      expect(result.current.loading).toBe(false)
    })

    it('clears pendingTurn when last message is not recoverable', async () => {
      turnStore['destiny'] = { turnId: 't1', userText: 'u', ts: Date.now() }
      const spies = makeSpies()
      spies.isRecoverableLastMessage = vi.fn(() => false)
      renderChat({
        spies,
        initialMessages: [{ role: 'assistant', content: 'done', id: 'a1' }],
      })
      await waitFor(() => expect(spies.isRecoverableLastMessage).toHaveBeenCalled())
      expect(clearPendingTurn).toHaveBeenCalledWith('destiny')
    })

    it('triggers recovery + applyRecovered when last message is recoverable and result is ready', async () => {
      turnStore['destiny'] = { turnId: 't-rec', userText: 'pending q', ts: Date.now() }
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ ready: true, content: 'full answer ||FOLLOWUP||x' }),
      }))
      ;(global as unknown as { fetch: unknown }).fetch = fetchMock
      mockExtract.mockReturnValue({ cleanContent: 'full answer', followUps: ['x'] })
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      const spies = makeSpies()
      spies.isRecoverableLastMessage = vi.fn(() => true)
      spies.applyRecovered = vi.fn(() => true)
      renderChat({
        spies,
        initialMessages: [
          { role: 'user', content: 'pending q' },
          { role: 'assistant', content: 'half', id: 'a-half', incomplete: true },
        ],
      })
      await waitFor(() => expect(spies.applyRecovered).toHaveBeenCalled(), { timeout: 3000 })
      const rec = spies.applyRecovered.mock.calls[0][0]
      expect(rec.cleanContent).toBe('full answer')
      expect(rec.followUps).toEqual(['x'])
      expect(rec.userText).toBe('pending q')
      expect(clearPendingTurn).toHaveBeenCalledWith('destiny')
    })

    it('does not clear pendingTurn when applyRecovered returns false', async () => {
      turnStore['destiny'] = { turnId: 't-rec2', userText: 'pq', ts: Date.now() }
      const fetchMock = vi.fn(async () => ({
        ok: true,
        json: async () => ({ ready: true, content: 'done' }),
      }))
      ;(global as unknown as { fetch: unknown }).fetch = fetchMock
      mockExtract.mockReturnValue({ cleanContent: 'done', followUps: [] })
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
      const spies = makeSpies()
      spies.isRecoverableLastMessage = vi.fn(() => true)
      spies.applyRecovered = vi.fn(() => false)
      renderChat({
        spies,
        initialMessages: [
          { role: 'user', content: 'pq' },
          { role: 'assistant', content: 'half', id: 'a-half', incomplete: true },
        ],
      })
      await waitFor(() => expect(spies.applyRecovered).toHaveBeenCalled(), { timeout: 3000 })
      // applyRecovered returned false -> the turnId-specific clear must not run
      expect(clearPendingTurn).not.toHaveBeenCalledWith('destiny')
    })
  })

  describe('attemptRecover', () => {
    it('no-ops when there is no recoverable turn', async () => {
      const fetchMock = vi.fn()
      ;(global as unknown as { fetch: unknown }).fetch = fetchMock
      const { result } = renderChat()
      await act(async () => {
        await result.current.attemptRecover()
      })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('no-ops when document is not visible', async () => {
      turnStore['destiny'] = { turnId: 't-hidden', userText: 'u', ts: Date.now() }
      const fetchMock = vi.fn()
      ;(global as unknown as { fetch: unknown }).fetch = fetchMock
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      const spies = makeSpies()
      spies.isRecoverableLastMessage = vi.fn(() => true)
      const { result } = renderChat({
        spies,
        initialMessages: [
          { role: 'user', content: 'u' },
          { role: 'assistant', content: 'half', id: 'a1', incomplete: true },
        ],
      })
      // mount recovery registers a recoverable turn but visibility gate blocks fetch
      await act(async () => {
        await result.current.attemptRecover()
      })
      expect(fetchMock).not.toHaveBeenCalled()
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    })
  })
})
