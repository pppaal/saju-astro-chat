import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { useSession } from 'next-auth/react'

vi.mock('@/hooks/useFocusTrap', () => ({
  useFocusTrap: () => React.useRef(null),
}))

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ locale: 'ko', setLocale: vi.fn(), t: (k: string, f?: string) => f ?? k }),
}))

vi.mock('next/link', () => ({
  default: ({ children, ...rest }: any) => <a {...rest}>{children}</a>,
}))

import LegalConsentModal from '@/components/legal/LegalConsentModal'

const mockUseSession = useSession as ReturnType<typeof vi.fn>

function setStatus(status: 'loading' | 'authenticated' | 'unauthenticated') {
  mockUseSession.mockReturnValue({ status, data: null, update: vi.fn() } as any)
}

async function renderNeedingConsent() {
  setStatus('authenticated')
  ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ data: { needsConsent: true } }),
  })
  const utils = render(<LegalConsentModal />)
  await screen.findByRole('dialog')
  return utils
}

describe('LegalConsentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders nothing for unauthenticated users', () => {
    setStatus('unauthenticated')
    const { container } = render(<LegalConsentModal />)
    expect(container.firstChild).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('renders nothing when the server reports consent is not needed', async () => {
    setStatus('authenticated')
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ data: { needsConsent: false } }),
    })
    const { container } = render(<LegalConsentModal />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/me/legal-consent'))
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the consent status fetch fails', async () => {
    setStatus('authenticated')
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('net'))
    const { container } = render(<LegalConsentModal />)
    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(container.firstChild).toBeNull()
  })

  it('shows the dialog with three required checkboxes when consent is needed', async () => {
    await renderNeedingConsent()
    expect(screen.getByText('이용 전 동의가 필요해요')).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('keeps the submit disabled until all three checkboxes are ticked', async () => {
    await renderNeedingConsent()
    const submit = screen.getByRole('button', { name: '동의하고 계속하기' })
    expect(submit).toBeDisabled()

    const [terms, privacy, age] = screen.getAllByRole('checkbox')
    fireEvent.click(terms)
    fireEvent.click(privacy)
    expect(submit).toBeDisabled()
    fireEvent.click(age)
    expect(submit).not.toBeDisabled()
  })

  it('submits consent and hides the modal on success', async () => {
    await renderNeedingConsent()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true })

    screen.getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(global.fetch).toHaveBeenLastCalledWith(
      '/api/me/legal-consent',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('shows an error and keeps the modal open when submit fails', async () => {
    await renderNeedingConsent()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: false, status: 500 })

    screen.getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb))
    fireEvent.click(screen.getByRole('button', { name: '동의하고 계속하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/동의 처리에 실패/)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('renders the terms and privacy policy links', async () => {
    await renderNeedingConsent()
    expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/policy/terms')
    expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
      'href',
      '/policy/privacy'
    )
  })
})
