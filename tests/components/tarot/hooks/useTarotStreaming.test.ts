import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTarotStreaming } from '@/components/tarot/hooks/useTarotStreaming'

const mockApiFetch = vi.fn()
const showDepletedMock = vi.fn()
const parseSSEStreamMock = vi.fn()
const isSSEStreamMock = vi.fn()
const buildContextWithNewCardMock = vi.fn((context) => context)

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}))

vi.mock('@/contexts/CreditModalContext', () => ({
  useCreditModal: () => ({
    showDepleted: showDepletedMock,
  }),
}))

vi.mock('@/components/tarot/utils/streamingParser', () => ({
  parseSSEStream: (...args: unknown[]) => parseSSEStreamMock(...args),
  isSSEStream: (...args: unknown[]) => isSSEStreamMock(...args),
}))

vi.mock('@/components/tarot/utils/contextBuilder', () => ({
  buildContextWithNewCard: (...args: unknown[]) => buildContextWithNewCardMock(...args),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useTarotStreaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    isSSEStreamMock.mockReturnValue(false)
    parseSSEStreamMock.mockResolvedValue('')
  })

  function renderStreamingHook() {
    return renderHook(() => {
      const [messages, setMessages] = React.useState<Array<{ role: string; content: string }>>([])
      const hook = useTarotStreaming({
        messages,
        setMessages,
        buildContext: () => ({
          spread_title: 'Quick Reading',
          category: 'general-insight',
          cards: [],
          overall_message: '',
          guidance: '',
        }),
        language: 'ko',
        categoryName: 'general-insight',
        errorMessage: 'error',
        onLoadingStart: vi.fn(),
        onLoadingStop: vi.fn(),
      })

      return {
        messages,
        ...hook,
      }
    })
  }

  it('stops immediately and shows the modal when card draw returns 401', async () => {
    mockApiFetch.mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))

    const { result } = renderStreamingHook()

    await act(async () => {
      await result.current.handleSend('질문')
    })

    await waitFor(() => {
      expect(showDepletedMock).toHaveBeenCalledTimes(1)
    })
    expect(mockApiFetch).toHaveBeenCalledTimes(1)
    expect(result.current.messages).toEqual([{ role: 'user', content: '질문' }])
  })

  it('does not fall back to chat when stream access is blocked', async () => {
    mockApiFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            drawnCards: [
              {
                card: { name: 'The Fool' },
                isReversed: false,
              },
            ],
          },
          200
        )
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'Unauthorized' }, 401))

    const { result } = renderStreamingHook()

    await act(async () => {
      await result.current.handleSend('다음 질문')
    })

    await waitFor(() => {
      expect(showDepletedMock).toHaveBeenCalledTimes(1)
    })
    expect(mockApiFetch).toHaveBeenCalledTimes(2)
    expect(result.current.messages).toEqual([{ role: 'user', content: '다음 질문' }])
  })

  it('keeps the newly drawn card in the non-streaming fallback context', async () => {
    buildContextWithNewCardMock.mockReturnValueOnce({
      spread_title: 'Quick Reading',
      category: 'general-insight',
      cards: [{ position: 'Follow-up', name: 'The Fool', is_reversed: false }],
      overall_message: 'new overall',
      guidance: 'new guidance',
    })

    mockApiFetch
      .mockResolvedValueOnce(
        jsonResponse(
          {
            drawnCards: [
              {
                card: { name: 'The Fool' },
                isReversed: false,
              },
            ],
          },
          200
        )
      )
      .mockResolvedValueOnce(jsonResponse({ error: 'stream failed' }, 500))
      .mockResolvedValueOnce(jsonResponse({ reply: 'fallback reply' }, 200))

    const { result } = renderStreamingHook()

    await act(async () => {
      await result.current.handleSend('추가 질문')
    })

    await waitFor(() => {
      expect(result.current.messages).toEqual([
        { role: 'user', content: '추가 질문' },
        { role: 'assistant', content: 'fallback reply' },
      ])
    })

    const fallbackCall = mockApiFetch.mock.calls[2]
    expect(fallbackCall?.[0]).toBe('/api/tarot/chat')
    const fallbackBody = JSON.parse(String((fallbackCall?.[1] as RequestInit).body))
    expect(fallbackBody.context.cards).toEqual([
      { position: 'Follow-up', name: 'The Fool', is_reversed: false },
    ])
    expect(fallbackBody.context.overall_message).toBe('new overall')
  })
})
