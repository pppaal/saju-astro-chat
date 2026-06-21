import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// useFocusTrap calls requestAnimationFrame + DOM focus; return a plain ref.
vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => React.useRef(null),
}))

import { EmailCollectionModal } from '@/components/pricing/EmailCollectionModal'

function renderModal(overrides: Partial<React.ComponentProps<typeof EmailCollectionModal>> = {}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const props: React.ComponentProps<typeof EmailCollectionModal> = {
    open: true,
    onClose,
    onSaved,
    locale: 'ko',
    ...overrides,
  }
  const utils = render(<EmailCollectionModal {...props} />)
  return { onClose, onSaved, ...utils }
}

describe('EmailCollectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders nothing when closed', () => {
    const { container } = renderModal({ open: false })
    expect(container.firstChild).toBeNull()
  })

  it('renders the dialog when open (Korean)', () => {
    renderModal()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('영수증을 받을 이메일을 알려주세요')).toBeInTheDocument()
  })

  it('renders English copy when locale=en', () => {
    renderModal({ locale: 'en' })
    expect(screen.getByText('Where should we send your receipt?')).toBeInTheDocument()
  })

  it('disables submit when email is empty or invalid', () => {
    renderModal()
    const submit = screen.getByRole('button', { name: '저장하고 결제 진행' })
    expect(submit).toBeDisabled()

    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'not-an-email' } })
    expect(submit).toBeDisabled()
  })

  it('enables submit once a valid email is entered', () => {
    renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), {
      target: { value: 'a@b.com' },
    })
    expect(screen.getByRole('button', { name: '저장하고 결제 진행' })).not.toBeDisabled()
  })

  it('closes via the X button', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes via the cancel button', () => {
    const { onClose } = renderModal()
    fireEvent.click(screen.getByRole('button', { name: '취소' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('closes on backdrop click but not on inner click', () => {
    const { onClose } = renderModal()
    const dialog = screen.getByRole('dialog')
    fireEvent.click(dialog)
    expect(onClose).toHaveBeenCalledTimes(1)

    // inner sheet click should be stopped
    fireEvent.click(screen.getByText('영수증을 받을 이메일을 알려주세요'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes on Escape key', () => {
    const { onClose } = renderModal()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('submits the email and calls onSaved on success (envelope response)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { email: 'a@b.com' } }),
    })
    const { onSaved } = renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('a@b.com'))
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/me/email',
      expect.objectContaining({ method: 'PATCH' })
    )
  })

  it('falls back to the typed email when response omits data.email', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    const { onSaved } = renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'x@y.io' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith('x@y.io'))
  })

  it('shows the email_in_use error message', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { message: 'email_in_use' } }),
    })
    const { onSaved } = renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/이미 다른 계정에서 사용 중/)
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('shows the invalid_email error message', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { message: 'invalid_email' } }),
    })
    renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/형식이 올바르지 않/)
  })

  it('shows a generic save error for unknown error codes', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { message: 'boom' } }),
    })
    renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/저장에 실패/)
  })

  it('shows a network error when fetch rejects', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('offline'))
    renderModal()
    fireEvent.change(screen.getByLabelText('이메일 주소'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/네트워크 오류/)
  })

  it('clears the error as the user edits the email again', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: { message: 'boom' } }),
    })
    renderModal()
    const input = screen.getByLabelText('이메일 주소')
    fireEvent.change(input, { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: '저장하고 결제 진행' }))
    await screen.findByRole('alert')

    fireEvent.change(input, { target: { value: 'a@b.co' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
