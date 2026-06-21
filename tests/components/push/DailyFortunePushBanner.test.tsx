import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/i18n/I18nProvider', () => ({
  useI18n: () => ({ t: (_k: string, fallback?: string) => fallback ?? _k }),
}))

const push = vi.hoisted(() => ({
  configured: true,
  supported: true,
  existing: null as unknown,
  subscribeResult: { status: 'subscribed' as string },
}))

vi.mock('@/lib/push/subscribe', () => ({
  isPushConfigured: () => push.configured,
  isPushSupported: () => push.supported,
  getExistingPushSubscription: vi.fn(async () => push.existing),
  subscribeToDailyFortunePush: vi.fn(async () => push.subscribeResult),
  unsubscribeFromDailyFortunePush: vi.fn(async () => ({ status: 'unsubscribed' })),
}))

import DailyFortunePushBanner from '@/components/push/DailyFortunePushBanner'
import { subscribeToDailyFortunePush, unsubscribeFromDailyFortunePush } from '@/lib/push/subscribe'

function setNotificationPermission(value: NotificationPermission) {
  ;(global as any).Notification = { permission: value }
}

describe('DailyFortunePushBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    push.configured = true
    push.supported = true
    push.existing = null
    push.subscribeResult = { status: 'subscribed' }
    setNotificationPermission('default')
  })

  it('renders nothing when push is not configured', () => {
    push.configured = false
    const { container } = render(<DailyFortunePushBanner locale="en" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when push is unsupported', () => {
    push.supported = false
    const { container } = render(<DailyFortunePushBanner locale="en" />)
    expect(container.firstChild).toBeNull()
  })

  it('renders nothing when permanently dismissed', () => {
    localStorage.setItem('destinypal:push:daily-fortune:dismissed', '1')
    const { container } = render(<DailyFortunePushBanner locale="en" />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the opt-in banner with a Turn on button when there is no subscription', async () => {
    render(<DailyFortunePushBanner locale="en" />)
    expect(await screen.findByRole('button', { name: 'Turn on' })).toBeInTheDocument()
  })

  it('stays hidden when permission is already denied and no subscription', async () => {
    setNotificationPermission('denied')
    const { container } = render(<DailyFortunePushBanner locale="en" />)
    // getExistingPushSubscription resolves async; wait a tick.
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('shows the subscribed state (Turn off) when already subscribed', async () => {
    push.existing = { endpoint: 'https://x', unsubscribe: vi.fn() }
    render(<DailyFortunePushBanner locale="en" />)
    expect(await screen.findByRole('button', { name: 'Turn off' })).toBeInTheDocument()
    expect(screen.getByText('Daily fortune notifications are on.')).toBeInTheDocument()
  })

  it('subscribes when Turn on is clicked and switches to subscribed state', async () => {
    push.subscribeResult = { status: 'subscribed' }
    render(<DailyFortunePushBanner locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on' }))
    await waitFor(() => expect(subscribeToDailyFortunePush).toHaveBeenCalledWith('en'))
    expect(await screen.findByRole('button', { name: 'Turn off' })).toBeInTheDocument()
  })

  it('shows the denied message when subscribe returns denied', async () => {
    push.subscribeResult = { status: 'denied' }
    render(<DailyFortunePushBanner locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on' }))
    await waitFor(() => expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument())
  })

  it('hides the banner when subscribe returns unsupported', async () => {
    push.subscribeResult = { status: 'unsupported' }
    const { container } = render(<DailyFortunePushBanner locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on' }))
    await waitFor(() => expect(container.firstChild).toBeNull())
  })

  it('keeps the opt-in state when subscribe returns an error (retry possible)', async () => {
    push.subscribeResult = { status: 'error' }
    render(<DailyFortunePushBanner locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn on' }))
    // After error the Turn on button remains.
    await waitFor(() => expect(subscribeToDailyFortunePush).toHaveBeenCalled())
    expect(screen.getByRole('button', { name: 'Turn on' })).toBeInTheDocument()
  })

  it('unsubscribes and returns to opt-in when Turn off is clicked', async () => {
    push.existing = { endpoint: 'https://x', unsubscribe: vi.fn() }
    render(<DailyFortunePushBanner locale="en" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }))
    await waitFor(() => expect(unsubscribeFromDailyFortunePush).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'Turn on' })).toBeInTheDocument()
  })

  it('dismisses via the Later button and persists the flag', async () => {
    render(<DailyFortunePushBanner locale="en" />)
    await screen.findByRole('button', { name: 'Turn on' })
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('destinypal:push:daily-fortune:dismissed')).toBe('1')
  })

  it('dismisses via the close (✕) button', async () => {
    render(<DailyFortunePushBanner locale="en" />)
    await screen.findByRole('button', { name: 'Turn on' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(localStorage.getItem('destinypal:push:daily-fortune:dismissed')).toBe('1')
  })
})
