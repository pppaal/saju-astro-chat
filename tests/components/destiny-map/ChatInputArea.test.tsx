import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// framer-motion's AnimatePresence/motion can be heavy in jsdom; render plain
// elements so popover children are synchronously present.
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({ children, ...rest }: any) => <div {...rest}>{children}</div>,
    }
  ),
}))

// Stabilize the typewriter placeholder so the textarea placeholder is empty
// (falls back to labels.placeholder) and tests aren't time-dependent.
vi.mock('@/hooks/useTypewriterPlaceholder', () => ({
  useTypewriterPlaceholder: () => '',
}))

import { ChatInputArea } from '@/components/destiny-map/chat-panels/ChatInputArea'

const baseLabels = {
  placeholder: 'Ask anything',
  send: 'Send',
  uploadCv: 'Upload CV',
  parsingPdf: 'Parsing…',
  fallbackNote: 'Fallback used',
  removeAttachment: 'Remove',
  clearInput: 'Clear',
}

function renderInput(overrides: Partial<React.ComponentProps<typeof ChatInputArea>> = {}) {
  const onInputChange = vi.fn()
  const onSend = vi.fn()
  const onKeyDown = vi.fn()
  const props: React.ComponentProps<typeof ChatInputArea> = {
    input: '',
    loading: false,
    cvName: '',
    parsingPdf: false,
    usedFallback: false,
    labels: baseLabels,
    lang: 'en',
    onInputChange,
    onKeyDown,
    onSend,
    ...overrides,
  }
  const utils = render(<ChatInputArea {...props} />)
  return { onInputChange, onSend, onKeyDown, ...utils }
}

describe('ChatInputArea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders the textarea with fallback placeholder', () => {
    renderInput()
    const ta = screen.getByPlaceholderText('Ask anything')
    expect(ta).toBeInTheDocument()
    expect(ta.tagName).toBe('TEXTAREA')
  })

  it('calls onInputChange when typing', () => {
    const { onInputChange } = renderInput()
    fireEvent.change(screen.getByPlaceholderText('Ask anything'), {
      target: { value: 'hello' },
    })
    expect(onInputChange).toHaveBeenCalledWith('hello')
  })

  it('calls onKeyDown on key presses', () => {
    const { onKeyDown } = renderInput()
    fireEvent.keyDown(screen.getByPlaceholderText('Ask anything'), { key: 'Enter' })
    expect(onKeyDown).toHaveBeenCalled()
  })

  it('disables the send button when input is empty', () => {
    renderInput({ input: '' })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('disables the send button when only whitespace', () => {
    renderInput({ input: '   ' })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
  })

  it('enables the send button with real input and fires onSend', () => {
    const { onSend } = renderInput({ input: 'hi' })
    const send = screen.getByRole('button', { name: 'Send' })
    expect(send).not.toBeDisabled()
    fireEvent.click(send)
    expect(onSend).toHaveBeenCalled()
  })

  it('disables send and the textarea while loading', () => {
    renderInput({ input: 'hi', loading: true })
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled()
    expect(screen.getByLabelText('Ask anything')).toBeDisabled()
  })

  it('shows a clear button when there is input and clears via onInputChange', () => {
    const { onInputChange } = renderInput({ input: 'something' })
    const clear = screen.getByRole('button', { name: 'Clear' })
    fireEvent.click(clear)
    expect(onInputChange).toHaveBeenCalledWith('')
  })

  it('does not show the clear button while loading', () => {
    renderInput({ input: 'something', loading: true })
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it('does not render the tools (kebab) button when no tool handlers are provided', () => {
    renderInput()
    expect(screen.queryByRole('button', { name: 'Tools' })).not.toBeInTheDocument()
  })

  it('renders the tools button when a tool handler is provided and toggles the menu', async () => {
    const onOpenChart = vi.fn()
    renderInput({ onOpenChart })
    const toolsBtn = screen.getByRole('button', { name: 'Tools' })
    expect(toolsBtn).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toolsBtn)
    expect(toolsBtn).toHaveAttribute('aria-expanded', 'true')
    const chartItem = await screen.findByRole('menuitem', { name: 'My destiny chart' })
    fireEvent.click(chartItem)
    expect(onOpenChart).toHaveBeenCalled()
  })

  it('fires tarot and flow handlers from the tools menu', async () => {
    const onOpenTarot = vi.fn()
    const onOpenFlow = vi.fn()
    renderInput({ onOpenTarot, onOpenFlow })
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: /tarot/i }))
    expect(onOpenTarot).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Fortune flow' }))
    expect(onOpenFlow).toHaveBeenCalled()
  })

  it('disables the chart menu item when chartDisabled is true', async () => {
    renderInput({ onOpenChart: vi.fn(), chartDisabled: true })
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
    const chartItem = await screen.findByRole('menuitem', { name: 'My destiny chart' })
    expect(chartItem).toBeDisabled()
  })

  it('shows the first-visit tool hint and dismisses it on tools click, persisting to localStorage', () => {
    renderInput({ onOpenChart: vi.fn() })
    expect(screen.getByText('Tap to try')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
    expect(screen.queryByText('Tap to try')).not.toBeInTheDocument()
    expect(localStorage.getItem('destinypal.counselor.toolHint.seen')).toBe('1')
  })

  it('does not show the tool hint when it was already seen', () => {
    localStorage.setItem('destinypal.counselor.toolHint.seen', '1')
    renderInput({ onOpenChart: vi.fn() })
    expect(screen.queryByText('Tap to try')).not.toBeInTheDocument()
  })

  it('shows the parsing spinner label when parsingPdf is true', () => {
    renderInput({ parsingPdf: true })
    expect(screen.getByText('Parsing…')).toBeInTheDocument()
  })

  it('shows the attached file name and remove button, firing onClearFile', () => {
    const onClearFile = vi.fn()
    renderInput({ cvName: 'resume.pdf', onClearFile })
    expect(screen.getByText('resume.pdf')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(onClearFile).toHaveBeenCalled()
  })

  it('shows the fallback note when usedFallback is true', () => {
    renderInput({ usedFallback: true })
    expect(screen.getByText('Fallback used')).toBeInTheDocument()
  })

  it('fires onFileUpload from the file menu item', async () => {
    const onFileUpload = vi.fn()
    const { container } = renderInput({ onFileUpload })
    fireEvent.click(screen.getByRole('button', { name: 'Tools' }))
    await screen.findByRole('menuitem', { name: 'Upload CV' })
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
    fireEvent.change(fileInput, { target: { files: [new File(['x'], 'a.txt')] } })
    expect(onFileUpload).toHaveBeenCalled()
  })

  it('uses Korean tool aria-label when lang=ko', () => {
    renderInput({ lang: 'ko', onOpenChart: vi.fn() })
    expect(screen.getByRole('button', { name: '도구' })).toBeInTheDocument()
  })
})
