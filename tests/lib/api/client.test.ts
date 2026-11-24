/**
 * src/lib/api/client.ts — apiFetch, the client-side wrapper for internal routes.
 * (The credit-modal signal on 401/402 is covered by apiFetch.creditModal.test.ts.)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiFetch, CREDIT_UPDATE_EVENT } from '@/lib/api/client'
import { CHARGING_ROUTES } from '@/lib/credits/chargingRoutes'

const mockFetch = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_API_TOKEN
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockResolvedValue(new Response('', { status: 200 }))
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.NEXT_PUBLIC_API_TOKEN
})

describe('apiFetch', () => {
  it('passes URL and options through and sends cookies', async () => {
    await apiFetch('/api/test', { method: 'GET' })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    )
  })

  it('works without options', async () => {
    await apiFetch('/test')
    expect(mockFetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({ credentials: 'include' })
    )
  })

  it('preserves custom headers', async () => {
    await apiFetch('/api/test', { headers: { 'Custom-Header': 'custom-value' } })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Custom-Header': 'custom-value' }),
      })
    )
  })

  it('adds x-api-token only when NEXT_PUBLIC_API_TOKEN is set', async () => {
    await apiFetch('/api/a')
    expect(mockFetch.mock.calls[0][1].headers).not.toHaveProperty('x-api-token')

    process.env.NEXT_PUBLIC_API_TOKEN = 'public-token'
    await apiFetch('/api/b')
    expect(mockFetch.mock.calls[1][1].headers).toMatchObject({ 'x-api-token': 'public-token' })
  })

  it('does not forward suppressAuthModal to fetch', async () => {
    await apiFetch('/api/test', { method: 'POST', suppressAuthModal: true })
    expect(mockFetch.mock.calls[0][1]).not.toHaveProperty('suppressAuthModal')
  })
})

describe('apiFetch → balance refresh signal (CREDIT_UPDATE_EVENT)', () => {
  function listen() {
    const spy = vi.fn()
    window.addEventListener(CREDIT_UPDATE_EVENT, spy)
    return { spy, stop: () => window.removeEventListener(CREDIT_UPDATE_EVENT, spy) }
  }

  it.each(CHARGING_ROUTES.map((r) => r.apiPath))('fires after a POST to %s', async (path) => {
    const { spy, stop } = listen()
    await apiFetch(`${path}?x=1`, { method: 'POST' })
    stop()
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not fire for GET on a charging route or POST elsewhere', async () => {
    const { spy, stop } = listen()
    await apiFetch(CHARGING_ROUTES[0].apiPath)
    await apiFetch('/api/tarot/history', { method: 'POST' })
    stop()
    expect(spy).not.toHaveBeenCalled()
  })
})
