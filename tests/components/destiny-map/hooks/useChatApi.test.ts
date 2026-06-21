/**
 * useChatApi Hook Tests
 * 운명 상담사 채팅 API 어댑터 훅 테스트.
 *
 * useChatApi delegates the streaming/idempotency/recovery skeleton to the
 * shared useCounselorChat. We mock that shared hook so we can (a) capture the
 * destiny-specific config it is given and drive those callbacks directly, and
 * (b) assert the values useChatApi maps back onto its own return surface.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { useChatApi } from '@/components/destiny-map/hooks/useChatApi'
import type { Message } from '@/components/destiny-map/chat-constants'

// --- logger -------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}))

// --- credit modal context ----------------------------------------------
const mockShowDepleted = vi.fn()
vi.mock('@/contexts/CreditModalContext', () => ({
  useCreditModal: () => ({ showDepleted: mockShowDepleted }),
}))

// --- apiFetch (warm call + request) ------------------------------------
const mockApiFetch = vi.fn()
vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

// --- response contract / followups -------------------------------------
vi.mock('@/lib/counselor/responseContract', () => ({
  normalizeCounselorResponse: (raw: string) => `norm:${raw}`,
}))

// --- shared counselor chat hook ----------------------------------------
// Capture the config object so tests can invoke the destiny-specific callbacks.
let capturedConfig: any = null
const mockSendMessage = vi.fn()
const mockRetryLastAnswer = vi.fn()
const mockQueueResumeText = vi.fn()
const mockSetFollowUpQuestions = vi.fn()
let counselorReturn: any

vi.mock('@/lib/counselor/useCounselorChat', () => ({
  useCounselorChat: (config: any) => {
    capturedConfig = config
    return counselorReturn
  },
  requestCounselorStream: vi.fn(async () => ({ ok: true })),
  mergeCounselorFollowUps: vi.fn((args: any) => [`merged:${args.userText}`]),
}))

import {
  requestCounselorStream as mockRequestCounselorStream,
  mergeCounselorFollowUps as mockMergeCounselorFollowUps,
} from '@/lib/counselor/useCounselorChat'

const baseProfile = {
  name: 'Test User',
  birthDate: '1990-01-01',
  birthTime: '12:00',
  gender: 'female',
  city: 'Seoul',
  latitude: 37.5,
  longitude: 127,
}

function makeOptions(overrides: Record<string, unknown> = {}) {
  const sessionIdRef = { current: 'sid-123' } as React.MutableRefObject<string>
  const messagesEndRef = {
    current: { scrollIntoView: vi.fn() },
  } as unknown as React.RefObject<HTMLDivElement | null>
  return {
    sessionIdRef,
    messages: [] as Message[],
    setMessages: vi.fn(),
    profile: baseProfile,
    lang: 'en' as const,
    cvText: '',
    autoScroll: true,
    messagesEndRef,
    setNotice: vi.fn(),
    onSaveMessage: vi.fn(),
    ...overrides,
  } as any
}

beforeEach(() => {
  vi.clearAllMocks()
  capturedConfig = null
  mockApiFetch.mockResolvedValue({ ok: true })
  counselorReturn = {
    loading: false,
    followUpQuestions: ['q1'],
    setFollowUpQuestions: mockSetFollowUpQuestions,
    sendMessage: mockSendMessage,
    retryLastAnswer: mockRetryLastAnswer,
    queueResumeText: mockQueueResumeText,
    outerSendRef: { current: null },
  }
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useChatApi', () => {
  describe('return surface mapping', () => {
    it('maps the shared hook outputs onto its own return shape', () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))

      expect(result.current.loading).toBe(false)
      expect(result.current.followUpQuestions).toEqual(['q1'])
      expect(result.current.setFollowUpQuestions).toBe(mockSetFollowUpQuestions)
      expect(result.current.handleSend).toBe(mockSendMessage)
      expect(result.current.retryLastAnswer).toBe(mockRetryLastAnswer)
      expect(result.current.queueResumeText).toBe(mockQueueResumeText)
      expect(result.current.connectionStatus).toBe('online')
      expect(result.current.usedFallback).toBe(false)
      expect(result.current.showCrisisModal).toBe(false)
    })

    it('reflects loading=true from the shared hook', () => {
      counselorReturn.loading = true
      const { result } = renderHook(() => useChatApi(makeOptions()))
      expect(result.current.loading).toBe(true)
    })

    it('configures the destiny namespace and draft session source', () => {
      renderHook(() => useChatApi(makeOptions({ chatSessionId: 'server-1' })))
      expect(capturedConfig.namespace).toBe('destiny')
      expect(capturedConfig.draft.hasServerSession).toBe(true)
    })
  })

  describe('context cache warming', () => {
    it('fires a warm request to /api/counselor/warm on mount', async () => {
      renderHook(() => useChatApi(makeOptions()))

      await waitFor(() => {
        expect(mockApiFetch).toHaveBeenCalledWith(
          '/api/counselor/warm',
          expect.objectContaining({ method: 'POST', suppressAuthModal: true })
        )
      })
      const body = JSON.parse(mockApiFetch.mock.calls[0][1].body)
      expect(body.birthDate).toBe('1990-01-01')
      expect(body.gender).toBe('female')
      expect(body.latitude).toBe(37.5)
    })

    it('does not warm when there is no birthDate', () => {
      renderHook(() =>
        useChatApi(makeOptions({ profile: { ...baseProfile, birthDate: undefined } }))
      )
      expect(mockApiFetch).not.toHaveBeenCalled()
    })

    it('warms only once for the same input fingerprint across re-renders', async () => {
      const opts = makeOptions()
      const { rerender } = renderHook(() => useChatApi(opts))
      await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(1))
      rerender()
      rerender()
      expect(mockApiFetch).toHaveBeenCalledTimes(1)
    })

    it('aborts the warm request on unmount without throwing', () => {
      const { unmount } = renderHook(() => useChatApi(makeOptions()))
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('beforeSend — crisis detection', () => {
    it('opens the crisis modal when the text matches a crisis keyword', () => {
      const { result } = renderHook(() => useChatApi(makeOptions({ lang: 'en' })))

      act(() => {
        capturedConfig.beforeSend('I want to die')
      })

      expect(result.current.showCrisisModal).toBe(true)
    })

    it('does not open the crisis modal for ordinary text', () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))
      act(() => {
        capturedConfig.beforeSend('What does my year look like?')
      })
      expect(result.current.showCrisisModal).toBe(false)
    })
  })

  describe('message factories', () => {
    it('makeUserMessage / makeAssistantMessage produce role-tagged messages with ids', () => {
      renderHook(() => useChatApi(makeOptions()))

      const user = capturedConfig.makeUserMessage('hello')
      expect(user.role).toBe('user')
      expect(user.content).toBe('hello')
      expect(user.id).toMatch(/^user-/)

      const asst = capturedConfig.makeAssistantMessage()
      expect(asst.role).toBe('assistant')
      expect(asst.content).toBe('')
      expect(asst.streaming).toBe(true)
      expect(asst.id).toMatch(/^assistant-/)
    })

    it('prepareText clamps very long input to 8000 chars', () => {
      renderHook(() => useChatApi(makeOptions()))
      const clamped = capturedConfig.prepareText('a'.repeat(9000))
      expect(clamped.length).toBe(8000)
      // short text passes through unchanged
      expect(capturedConfig.prepareText('short')).toBe('short')
    })

    it('applyUserMessage replaces messages with baseHistory + userMessage', () => {
      renderHook(() => useChatApi(makeOptions()))
      const set = vi.fn()
      capturedConfig.applyUserMessage({
        setMessages: set,
        userMessage: { role: 'user', content: 'hi' },
        baseHistory: [{ role: 'system', content: 'ctx' }],
      })
      expect(set).toHaveBeenCalledWith([
        { role: 'system', content: 'ctx' },
        { role: 'user', content: 'hi' },
      ])
    })
  })

  describe('onSendStart / onResponse', () => {
    it('onSendStart clears the notice and resets fallback', () => {
      const setNotice = vi.fn()
      const { result } = renderHook(() => useChatApi(makeOptions({ setNotice })))

      act(() => capturedConfig.onSendStart())
      expect(setNotice).toHaveBeenCalledWith(null)
      expect(result.current.usedFallback).toBe(false)
    })

    it('onResponse flags fallback + notice when x-fallback header is set', () => {
      const setNotice = vi.fn()
      const { result } = renderHook(() => useChatApi(makeOptions({ setNotice })))

      const res = { headers: new Headers({ 'x-fallback': '1' }) } as Response
      act(() => capturedConfig.onResponse(res))

      expect(result.current.usedFallback).toBe(true)
      expect(setNotice).toHaveBeenCalledWith('Using backup response temporarily.')
    })

    it('onResponse leaves fallback off when header is absent', () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))
      const res = { headers: new Headers() } as Response
      act(() => capturedConfig.onResponse(res))
      expect(result.current.usedFallback).toBe(false)
    })
  })

  describe('performRequest', () => {
    it('builds a payload and calls requestCounselorStream', async () => {
      renderHook(() => useChatApi(makeOptions({ ragSessionId: 'rag-1', cvText: 'my cv' })))

      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'idem-1', turnId: 'turn-1', text: 'hi', isRetry: false },
          history: [{ role: 'user', content: 'hi' }],
          registerController: vi.fn(),
        })
      })

      expect(mockRequestCounselorStream).toHaveBeenCalledTimes(1)
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      // exercise doFetch to assert endpoint + idempotency header wiring
      await arg.doFetch(undefined)
      expect(mockApiFetch).toHaveBeenCalledWith(
        '/api/counselor/realtime',
        expect.objectContaining({ method: 'POST' })
      )
      const callArgs = mockApiFetch.mock.calls.find((c) => c[0] === '/api/counselor/realtime')
      expect(callArgs[1].headers['x-session-id']).toBe('rag-1')
      expect(callArgs[1].headers['x-idempotency-key']).toBe('idem-1')
      const body = JSON.parse(callArgs[1].body)
      expect(body.cvText).toBe('my cv')
      expect(body.idempotencyKey).toBe('idem-1')
      expect(body.turnId).toBe('turn-1')
    })

    it('doFetch falls back to sessionIdRef when ragSessionId is absent', async () => {
      renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: '', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      await arg.doFetch(undefined)
      const callArgs = mockApiFetch.mock.calls.find((c) => c[0] === '/api/counselor/realtime')
      expect(callArgs[1].headers['x-session-id']).toBe('sid-123')
      // no idempotency key → header omitted
      expect(callArgs[1].headers['x-idempotency-key']).toBeUndefined()
    })

    it('onResponse callback maps elapsed time to connection status (slow)', async () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      act(() => {
        arg.onResponse({} as Response, 9000)
      })
      expect(result.current.connectionStatus).toBe('slow')
    })

    it('afterOk throws when the response has no body', async () => {
      renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      expect(() => arg.afterOk({ body: null } as Response)).toThrow('No response body')
      expect(() => arg.afterOk({ body: {} } as unknown as Response)).not.toThrow()
    })

    it('onNotOk shows the credit modal and throws on 402', async () => {
      renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      const res = {
        status: 402,
        headers: new Headers({ 'content-type': 'application/json' }),
        clone: () => ({ json: async () => ({ code: 'NO_CREDITS', message: 'depleted' }) }),
      } as unknown as Response

      await expect(arg.onNotOk(res, 0, false)).rejects.toThrow('INSUFFICIENT_CREDITS')
      expect(mockShowDepleted).toHaveBeenCalled()
    })

    it('onNotOk returns "retry" when canRetry is true', async () => {
      renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      const res = {
        status: 503,
        headers: new Headers({ 'content-type': 'text/plain' }),
        clone: () => ({ text: async () => 'unavailable' }),
      } as unknown as Response

      await expect(arg.onNotOk(res, 0, true)).resolves.toBe('retry')
    })

    it('onNotOk throws API_ERROR when retries are exhausted', async () => {
      renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      const res = {
        status: 500,
        headers: new Headers({ 'content-type': 'text/plain' }),
        clone: () => ({ text: async () => 'server boom' }),
      } as unknown as Response

      await expect(arg.onNotOk(res, 1, false)).rejects.toThrow(/API_ERROR:500/)
    })

    it('onTimeoutLike / onRetryScheduled update connection + retry state', async () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))
      await act(async () => {
        await capturedConfig.performRequest({
          turn: { idempotencyKey: 'k', turnId: 't', text: 'x', isRetry: false },
          history: [],
          registerController: vi.fn(),
        })
      })
      const arg = (mockRequestCounselorStream as any).mock.calls[0][0]
      act(() => arg.onTimeoutLike())
      expect(result.current.connectionStatus).toBe('slow')

      act(() => arg.onRetryScheduled(2, 'timeout'))
      expect(result.current.retryCount).toBe(2)

      expect(arg.mapExhaustedTimeout()).toBeInstanceOf(Error)
    })
  })

  describe('renderChunk', () => {
    it('throttled auto-scroll fires on the first chunk', () => {
      const scrollIntoView = vi.fn()
      const messagesEndRef = { current: { scrollIntoView } } as any
      renderHook(() => useChatApi(makeOptions({ messagesEndRef, autoScroll: true })))

      act(() => capturedConfig.renderChunk('Hello.'))
      expect(scrollIntoView).toHaveBeenCalled()
    })

    it('does not auto-scroll when autoScroll is off', () => {
      const scrollIntoView = vi.fn()
      const messagesEndRef = { current: { scrollIntoView } } as any
      renderHook(() => useChatApi(makeOptions({ messagesEndRef, autoScroll: false })))

      act(() => capturedConfig.renderChunk('Hello.'))
      expect(scrollIntoView).not.toHaveBeenCalled()
    })
  })

  describe('onStreamError', () => {
    it('sets the localized error notice', () => {
      const setNotice = vi.fn()
      renderHook(() => useChatApi(makeOptions({ setNotice })))
      act(() => capturedConfig.onStreamError(new Error('x')))
      expect(setNotice).toHaveBeenCalledWith('An error occurred. Please try again.')
    })
  })

  describe('completeTurn', () => {
    function makeHelpers() {
      return {
        markRecoverable: vi.fn(),
        kickRecover: vi.fn(),
        finishTurnClean: vi.fn(),
        setFollowUpQuestions: vi.fn(),
      }
    }

    it('on clean completion: saves message, merges follow-ups, finishes clean', () => {
      const onSaveMessage = vi.fn()
      const setMessages = vi.fn()
      renderHook(() => useChatApi(makeOptions({ onSaveMessage, setMessages })))
      const helpers = makeHelpers()

      act(() => {
        capturedConfig.completeTurn(
          {
            result: { content: 'Answer body', success: true, truncated: false, followUps: ['f'] },
            turn: { text: 'my question' },
            assistantMsgId: 'a1',
          },
          helpers
        )
      })

      expect(onSaveMessage).toHaveBeenCalledWith('my question', 'norm:Answer body')
      expect(mockMergeCounselorFollowUps).toHaveBeenCalled()
      expect(helpers.setFollowUpQuestions).toHaveBeenCalledWith(['merged:my question'])
      expect(helpers.finishTurnClean).toHaveBeenCalled()
      expect(helpers.markRecoverable).not.toHaveBeenCalled()
    })

    it('on empty content: flushes the no-response copy and marks recoverable', () => {
      const onSaveMessage = vi.fn()
      renderHook(() => useChatApi(makeOptions({ onSaveMessage })))
      const helpers = makeHelpers()

      act(() => {
        capturedConfig.completeTurn(
          {
            result: { content: '', success: true, truncated: false },
            turn: { text: 'q' },
            assistantMsgId: 'a1',
          },
          helpers
        )
      })

      // empty content path does not save and is treated as not-clean
      expect(onSaveMessage).not.toHaveBeenCalled()
      expect(helpers.markRecoverable).toHaveBeenCalledWith('a1')
      expect(helpers.kickRecover).toHaveBeenCalled()
      expect(helpers.finishTurnClean).not.toHaveBeenCalled()
    })

    it('on truncated content: marks incomplete + recoverable', () => {
      renderHook(() => useChatApi(makeOptions()))
      const helpers = makeHelpers()

      act(() => {
        capturedConfig.completeTurn(
          {
            result: { content: 'partial', success: false, truncated: true, followUps: [] },
            turn: { text: 'q' },
            assistantMsgId: 'a1',
          },
          helpers
        )
      })

      expect(helpers.markRecoverable).toHaveBeenCalled()
      expect(helpers.finishTurnClean).not.toHaveBeenCalled()
    })
  })

  describe('onSendFailure', () => {
    it('goes offline for a plain network error', () => {
      const setNotice = vi.fn()
      const { result } = renderHook(() => useChatApi(makeOptions({ setNotice })))

      act(() => capturedConfig.onSendFailure(new Error('Network unreachable')))

      expect(result.current.connectionStatus).toBe('offline')
      expect(setNotice).toHaveBeenCalled()
    })

    it('stays online for an HTTP error (API_ERROR / INSUFFICIENT_CREDITS)', () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))

      act(() => capturedConfig.onSendFailure(new Error('API_ERROR:500')))
      expect(result.current.connectionStatus).toBe('online')

      act(() => capturedConfig.onSendFailure(new Error('INSUFFICIENT_CREDITS')))
      expect(result.current.connectionStatus).toBe('online')
    })
  })

  describe('onUnmountCleanup', () => {
    it('persists the buffered partial via onSaveMessage when a turn was in flight', () => {
      const onSaveMessage = vi.fn()
      renderHook(() => useChatApi(makeOptions({ onSaveMessage })))

      // buffer some streamed content via renderChunk so pendingContentRef is set
      act(() => capturedConfig.renderChunk('partial buffered text'))

      act(() => {
        capturedConfig.onUnmountCleanup({ inFlightUserText: 'the question' })
      })

      expect(onSaveMessage).toHaveBeenCalledWith('the question', 'partial buffered text')
    })

    it('does not save when there was no in-flight user text', () => {
      const onSaveMessage = vi.fn()
      renderHook(() => useChatApi(makeOptions({ onSaveMessage })))
      act(() => capturedConfig.renderChunk('buffered'))

      act(() => {
        capturedConfig.onUnmountCleanup({ inFlightUserText: null })
      })

      expect(onSaveMessage).not.toHaveBeenCalled()
    })
  })

  describe('applyRecovered', () => {
    it('normalizes content, updates messages, merges follow-ups, saves', () => {
      const onSaveMessage = vi.fn()
      const setMessages = vi.fn()
      renderHook(() => useChatApi(makeOptions({ onSaveMessage, setMessages })))
      const recoverHelpers = { setFollowUpQuestions: vi.fn() }

      act(() => {
        capturedConfig.applyRecovered(
          {
            turnId: 't1',
            userText: 'q',
            assistantMsgId: 'a1',
            cleanContent: 'recovered body',
            followUps: ['f'],
          },
          recoverHelpers
        )
      })

      expect(setMessages).toHaveBeenCalled()
      expect(recoverHelpers.setFollowUpQuestions).toHaveBeenCalledWith(['merged:q'])
      expect(onSaveMessage).toHaveBeenCalledWith('q', 'norm:recovered body')
    })
  })

  describe('isRecoverableLastMessage', () => {
    it('is true only for an incomplete assistant message', () => {
      renderHook(() => useChatApi(makeOptions()))
      expect(
        capturedConfig.isRecoverableLastMessage({
          role: 'assistant',
          content: '',
          incomplete: true,
        })
      ).toBe(true)
      expect(
        capturedConfig.isRecoverableLastMessage({ role: 'assistant', content: 'x' })
      ).toBeFalsy()
      expect(
        capturedConfig.isRecoverableLastMessage({ role: 'user', content: 'x', incomplete: true })
      ).toBe(false)
    })
  })

  describe('draft.build', () => {
    it('returns user/assistant messages only, or null when empty', () => {
      renderHook(() => useChatApi(makeOptions()))
      expect(
        capturedConfig.draft.build([
          { role: 'system', content: 's' },
          { role: 'user', content: 'u' },
          { role: 'assistant', content: 'a' },
        ])
      ).toEqual({
        messages: [
          { role: 'user', content: 'u' },
          { role: 'assistant', content: 'a' },
        ],
      })

      expect(capturedConfig.draft.build([{ role: 'system', content: 's' }])).toBeNull()
    })
  })

  describe('resultEndpoint', () => {
    it('encodes the turnId into the result polling URL', () => {
      renderHook(() => useChatApi(makeOptions()))
      expect(capturedConfig.resultEndpoint('a b')).toBe(
        '/api/counselor/realtime/result?turnId=a%20b'
      )
    })
  })

  describe('setShowCrisisModal', () => {
    it('toggles the crisis modal flag', () => {
      const { result } = renderHook(() => useChatApi(makeOptions()))
      act(() => result.current.setShowCrisisModal(true))
      expect(result.current.showCrisisModal).toBe(true)
      act(() => result.current.setShowCrisisModal(false))
      expect(result.current.showCrisisModal).toBe(false)
    })
  })
})
