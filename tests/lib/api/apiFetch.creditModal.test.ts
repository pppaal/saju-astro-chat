// apiFetch 는 크레딧/게스트 한도 응답을 단일 지점에서 감지해 전역 이벤트를
// 쏜다. 크레딧을 쓰는 모든 호출이 apiFetch 를 거치면 화면마다 따로 모달을
// 붙이지 않아도 동일하게 안내가 뜬다 — 이 동작의 회귀 가드.

import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiFetch, CREDIT_MODAL_EVENT } from '@/lib/api/ApiClient'

function mockFetchOnce(status: number, headers: Record<string, string> = {}) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status, headers })))
}

describe('apiFetch → central credit-modal signal', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('dispatches a "depleted" signal on HTTP 402', async () => {
    mockFetchOnce(402)
    const spy = vi.fn()
    window.addEventListener(CREDIT_MODAL_EVENT, spy)
    await apiFetch('/api/anything', { method: 'POST' })
    expect(spy).toHaveBeenCalledOnce()
    expect((spy.mock.calls[0][0] as CustomEvent).detail.kind).toBe('depleted')
    window.removeEventListener(CREDIT_MODAL_EVENT, spy)
  })

  it('dispatches a "guest" signal on 401 + X-Guest-Limit-Reached', async () => {
    mockFetchOnce(401, { 'X-Guest-Limit-Reached': '1' })
    const spy = vi.fn()
    window.addEventListener(CREDIT_MODAL_EVENT, spy)
    await apiFetch('/api/anything', { method: 'POST' })
    expect(spy).toHaveBeenCalledOnce()
    expect((spy.mock.calls[0][0] as CustomEvent).detail.kind).toBe('guest')
    window.removeEventListener(CREDIT_MODAL_EVENT, spy)
  })

  it('does NOT dispatch on a plain 401 (no guest header) or a 200', async () => {
    const spy = vi.fn()
    window.addEventListener(CREDIT_MODAL_EVENT, spy)

    mockFetchOnce(401) // e.g. an unauthenticated profile fetch — not a guest limit
    await apiFetch('/api/me/profile')

    mockFetchOnce(200)
    await apiFetch('/api/ok')

    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener(CREDIT_MODAL_EVENT, spy)
  })
})
