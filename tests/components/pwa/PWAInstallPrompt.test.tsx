import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}))

const pwaState = vi.hoisted(() => ({ standalone: false, birthDate: '1990-01-01' as string | null }))

vi.mock('@/lib/auth/detectPWA', () => ({
  isStandalonePWA: () => pwaState.standalone,
}))

vi.mock('@/app/(main)/birthInfoStorage', () => ({
  getStoredBirthInfo: () =>
    pwaState.birthDate
      ? { birthDate: pwaState.birthDate, birthTime: '08:00', gender: 'male' }
      : null,
}))

import PWAInstallPrompt from '@/components/pwa/PWAInstallPrompt'

const CHROME_UA =
  'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36'
const IOS_SAFARI_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'

function setUA(ua: string) {
  Object.defineProperty(window.navigator, 'userAgent', { value: ua, configurable: true })
}

function fireBeforeInstallPrompt() {
  const event = new Event('beforeinstallprompt') as any
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome: 'accepted' })
  act(() => {
    window.dispatchEvent(event)
  })
  return event
}

describe('PWAInstallPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    pwaState.standalone = false
    pwaState.birthDate = '1990-01-01'
    setUA(CHROME_UA)
  })

  it('renders nothing initially before any install event', () => {
    const { container } = render(<PWAInstallPrompt locale="en" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when already running as a standalone PWA', () => {
    pwaState.standalone = true
    const { container } = render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when permanently dismissed', () => {
    localStorage.setItem('destinypal:pwa:dismissed', '1')
    const { container } = render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when the user has no stored birth date', () => {
    pwaState.birthDate = null
    const { container } = render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    expect(container.firstChild).toBeNull()
  })

  it('shows the install banner after a beforeinstallprompt event', async () => {
    render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Install' })).toBeInTheDocument()
  })

  it('shows the iOS guide variant (no install button) on iOS Safari', async () => {
    setUA(IOS_SAFARI_UA)
    render(<PWAInstallPrompt locale="en" />)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install' })).not.toBeInTheDocument()
  })

  it('calls the deferred prompt and dismisses when the user accepts install', async () => {
    render(<PWAInstallPrompt locale="en" />)
    const event = fireBeforeInstallPrompt()
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    await waitFor(() => expect(event.prompt).toHaveBeenCalled())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(localStorage.getItem('destinypal:pwa:dismissed')).toBe('1')
  })

  it('keeps the banner visible (no dismiss flag) when install is declined', async () => {
    render(<PWAInstallPrompt locale="en" />)
    const event = new Event('beforeinstallprompt') as any
    event.prompt = vi.fn().mockResolvedValue(undefined)
    event.userChoice = Promise.resolve({ outcome: 'dismissed' })
    act(() => {
      window.dispatchEvent(event)
    })
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Install' }))
    await waitFor(() => expect(event.prompt).toHaveBeenCalled())
    expect(localStorage.getItem('destinypal:pwa:dismissed')).toBeNull()
  })

  it('dismisses via the "Later" button and persists the flag', async () => {
    render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('destinypal:pwa:dismissed')).toBe('1')
  })

  it('dismisses via the close (✕) button', async () => {
    render(<PWAInstallPrompt locale="en" />)
    fireBeforeInstallPrompt()
    await screen.findByRole('dialog')

    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('destinypal:pwa:dismissed')).toBe('1')
  })
})
