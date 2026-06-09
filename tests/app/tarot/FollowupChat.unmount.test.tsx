// tests/app/tarot/FollowupChat.unmount.test.tsx
// Regression: sendQuestionText in FollowupChat had no AbortController,
// so setHistory / setSubmitting fired after `await apiFetch` even when
// the component had unmounted. The fix wires an AbortController +
// mounted ref so both the request is cancelled and the post-await
// setStates are skipped.

import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

let abortedSignals = 0
let resolveFetch: ((value: unknown) => void) | null = null

vi.mock('@/lib/api', () => ({
  apiFetch: vi.fn((_url: string, init?: RequestInit) => {
    const signal = init?.signal
    return new Promise((resolve, reject) => {
      resolveFetch = resolve as (value: unknown) => void
      if (signal) {
        signal.addEventListener('abort', () => {
          abortedSignals += 1
          const err = new Error('aborted')
          ;(err as Error & { name: string }).name = 'AbortError'
          reject(err)
        })
      }
    })
  }),
}))

vi.mock('@/lib/logger', () => ({
  tarotLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/contexts/CreditModalContext', () => ({
  useCreditModal: () => ({
    showDepleted: vi.fn(),
    showLowCredits: vi.fn(),
    checkAndShowModal: vi.fn(),
  }),
}))

// 로그인 모달 컨텍스트 — Provider 없이 렌더하므로 hook 들을 stub.
vi.mock('@/contexts/LoginModalContext', () => ({
  useLoginModal: () => ({ showLogin: vi.fn(), hideLogin: vi.fn() }),
  useRequireLogin: () => () => true,
  LoginModalProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// useClarifierCard is heavy and not relevant to the unmount path under
// test — stub a tiny shape that matches what FollowupChat consumes.
vi.mock('@/hooks/useClarifierCard', () => ({
  useClarifierCard: () => ({
    isLocked: false,
    buttonProps: { onClick: vi.fn(), disabled: false },
    buttonLabel: 'Draw',
    modalProps: {},
    reset: vi.fn(),
  }),
}))

// useChatAutoScroll just returns endRef; stub to a plain ref.
vi.mock('@/hooks/useChatAutoScroll', () => ({
  useChatAutoScroll: () => ({ endRef: { current: null } }),
}))

// ChatBubbleContent rendering details don't matter here.
vi.mock('@/components/chat/ChatBubbleContent', () => ({
  default: ({ content }: { content: string }) => <div data-testid="bubble">{content}</div>,
}))

// FollowupChat reads the restoreKey via useSearchParams and (login) gating —
// stub both so the component renders without router / login providers.
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
}))

vi.mock('@/contexts/LoginModalContext', () => ({
  useRequireLogin: () => () => true,
}))

// Restore-payload persistence is a side effect irrelevant to unmount safety.
vi.mock('@/lib/tarot/tarot-storage', () => ({
  updateRestorePayloadFollowup: vi.fn(),
}))

import { FollowupChat } from '@/app/tarot/[categoryName]/[spreadId]/components/stages/ResultsStage/FollowupChat'

const readingResult = {
  spread: {
    title: 'Three Card',
    positions: [{ title: 'Past' }, { title: 'Present' }, { title: 'Future' }],
  },
  drawnCards: [],
} as never

describe('FollowupChat — unmount safety', () => {
  beforeEach(() => {
    abortedSignals = 0
    resolveFetch = null
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('aborts the in-flight followup fetch on unmount', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { container, unmount } = render(
      <FollowupChat
        readingResult={readingResult}
        interpretation={null}
        userTopic="hi"
        language="ko"
        readingId="r-1"
      />
    )

    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const form = container.querySelector('form') as HTMLFormElement
    expect(textarea).toBeTruthy()
    expect(form).toBeTruthy()

    await act(async () => {
      fireEvent.change(textarea, { target: { value: 'follow up question' } })
    })

    await act(async () => {
      fireEvent.submit(form)
      // Let the awaited apiFetch register the controller.
      await Promise.resolve()
      await Promise.resolve()
    })

    // Request is in-flight.
    expect(typeof resolveFetch).toBe('function')

    // Tear down — should fire abort on the signal.
    unmount()
    expect(abortedSignals).toBeGreaterThanOrEqual(1)

    // No setState-after-unmount warnings.
    const stateUpdateWarnings = errorSpy.mock.calls.filter((call) => {
      const msg = String(call[0] || '')
      return msg.includes("Can't perform a React state update") || msg.includes('unmounted')
    })
    expect(stateUpdateWarnings).toEqual([])

    errorSpy.mockRestore()
  })
})
