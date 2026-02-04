/**
 * Accessibility Tests for Chat Components
 * Tests MessagesPanel, ChatInputArea, and tarot ChatInput for WCAG compliance
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, cleanup, screen } from '@testing-library/react'
import { axe } from './axe-helper'
import React from 'react'

// Shared mock styles
const mockStyles = new Proxy({}, { get: (_, prop) => String(prop) }) as Record<string, string>

describe('Accessibility: MessagesPanel', () => {
  // Dynamic import to avoid module-level mock conflicts
  let MessagesPanel: typeof import('@/components/destiny-map/chat-panels/MessagesPanel').MessagesPanel

  beforeAll(async () => {
    const mod = await import('@/components/destiny-map/chat-panels/MessagesPanel')
    MessagesPanel = mod.MessagesPanel
  })

  const defaultProps = {
    visibleMessages: [],
    loading: false,
    retryCount: 0,
    notice: null,
    showSuggestions: false,
    suggestedQs: [],
    followUpQuestions: [],
    showTarotPrompt: false,
    feedback: {},
    effectiveLang: 'ko' as const,
    tr: {
      empty: 'No messages yet',
      thinking: 'Thinking...',
      tarotPrompt: 'Try Tarot',
      tarotDesc: 'Get a tarot reading',
      tarotButton: 'Go to Tarot',
    } as Record<string, string>,
    messagesEndRef: React.createRef<HTMLDivElement>(),
    onSuggestion: vi.fn(),
    onFeedback: vi.fn().mockResolvedValue(undefined),
    onFollowUp: vi.fn(),
    onGoToTarot: vi.fn(),
    styles: mockStyles,
  }

  beforeEach(() => {
    cleanup()
  })

  it('should have role="log" on messages container', () => {
    // @ts-expect-error - MessagesPanel props are complex
    const { container } = render(<MessagesPanel {...defaultProps} />)

    const logRegion = container.querySelector('[role="log"]')
    expect(logRegion).toBeInTheDocument()
  })

  it('should have aria-live="polite" on messages container', () => {
    // @ts-expect-error - MessagesPanel props are complex
    const { container } = render(<MessagesPanel {...defaultProps} />)

    const logRegion = container.querySelector('[role="log"]')
    expect(logRegion).toHaveAttribute('aria-live', 'polite')
  })

  it('should have aria-label on messages container', () => {
    // @ts-expect-error - MessagesPanel props are complex
    const { container } = render(<MessagesPanel {...defaultProps} />)

    const logRegion = container.querySelector('[role="log"]')
    expect(logRegion).toHaveAttribute('aria-label', 'Chat messages')
  })

  it('should have no accessibility violations with empty state', async () => {
    // @ts-expect-error - MessagesPanel props are complex
    const { container } = render(<MessagesPanel {...defaultProps} />)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have no accessibility violations during loading', async () => {
    // @ts-expect-error - MessagesPanel props are complex
    const { container } = render(<MessagesPanel {...defaultProps} loading={true} />)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })
})

describe('Accessibility: ChatInputArea', () => {
  let ChatInputArea: typeof import('@/components/destiny-map/chat-panels/ChatInputArea').ChatInputArea

  beforeAll(async () => {
    const mod = await import('@/components/destiny-map/chat-panels/ChatInputArea')
    ChatInputArea = mod.ChatInputArea
  })

  const defaultTr = {
    placeholder: 'Type your message...',
    send: 'Send',
    uploadCv: 'Upload file',
    parsingPdf: 'Parsing PDF...',
    attached: 'Attached:',
    fallbackNote: 'Using fallback mode',
  } as Record<string, string>

  const defaultProps = {
    input: '',
    loading: false,
    cvName: '',
    parsingPdf: false,
    usedFallback: false,
    tr: defaultTr,
    onInputChange: vi.fn(),
    onKeyDown: vi.fn(),
    onSend: vi.fn(),
    onFileUpload: vi.fn().mockResolvedValue(undefined),
    styles: mockStyles,
  }

  beforeEach(() => {
    cleanup()
  })

  it('should have accessible textarea with aria-label', () => {
    // @ts-expect-error - ChatInputArea props are complex
    const { container } = render(<ChatInputArea {...defaultProps} />)

    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('aria-label', 'Type your message...')
  })

  it('should have no accessibility violations', async () => {
    // @ts-expect-error - ChatInputArea props are complex
    const { container } = render(<ChatInputArea {...defaultProps} />)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have accessible send button', () => {
    // @ts-expect-error - ChatInputArea props are complex
    render(<ChatInputArea {...defaultProps} />)

    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeInTheDocument()
    expect(sendButton.textContent).toContain('Send')
  })

  it('should disable send button when input is empty', () => {
    // @ts-expect-error - ChatInputArea props are complex
    render(<ChatInputArea {...defaultProps} input="" />)

    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeDisabled()
  })

  it('should have accessible file upload with label', () => {
    // @ts-expect-error - ChatInputArea props are complex
    const { container } = render(<ChatInputArea {...defaultProps} />)

    const fileInput = container.querySelector('input[type="file"]')
    expect(fileInput).toBeInTheDocument()

    // File input should be wrapped in a label
    const label = fileInput?.closest('label')
    expect(label).toBeInTheDocument()
  })
})

describe('Accessibility: Tarot ChatInput', () => {
  let ChatInput: typeof import('@/components/tarot/components/ChatInput').ChatInput

  beforeAll(async () => {
    const mod = await import('@/components/tarot/components/ChatInput')
    ChatInput = mod.ChatInput
  })

  const defaultTr = {
    placeholder: 'Ask a question...',
    send: 'Send',
  } as Record<string, string>

  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onKeyDown: vi.fn(),
    onSend: vi.fn(),
    disabled: false,
    tr: defaultTr,
    styles: mockStyles,
  }

  beforeEach(() => {
    cleanup()
  })

  it('should have accessible textarea with aria-label', () => {
    // @ts-expect-error - ChatInput props use specific type
    const { container } = render(<ChatInput {...defaultProps} />)

    const textarea = container.querySelector('textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('aria-label', 'Ask a question...')
  })

  it('should have no accessibility violations', async () => {
    // @ts-expect-error - ChatInput props use specific type
    const { container } = render(<ChatInput {...defaultProps} />)

    const results = await axe(container)
    expect(results.violations).toHaveLength(0)
  })

  it('should have accessible send button', () => {
    // @ts-expect-error - ChatInput props use specific type
    render(<ChatInput {...defaultProps} />)

    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeInTheDocument()
    expect(sendButton.textContent).toContain('Send')
  })

  it('should disable send button when disabled prop is true', () => {
    // @ts-expect-error - ChatInput props use specific type
    render(<ChatInput {...defaultProps} disabled={true} />)

    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeDisabled()
  })

  it('should disable send button when value is empty', () => {
    // @ts-expect-error - ChatInput props use specific type
    render(<ChatInput {...defaultProps} value="" />)

    const sendButton = screen.getByRole('button')
    expect(sendButton).toBeDisabled()
  })
})
