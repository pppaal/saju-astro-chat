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

  // 게스트 폐지 후: 모든 401(비로그인)은 로그인 유도 신호('guest')를 쏜다.
  // (이전엔 X-Guest-Limit-Reached 헤더가 있는 401 만 신호했음.)
  it('dispatches a "guest" signal on any 401 (login required)', async () => {
    mockFetchOnce(401)
    const spy = vi.fn()
    window.addEventListener(CREDIT_MODAL_EVENT, spy)
    await apiFetch('/api/anything', { method: 'POST' })
    expect(spy).toHaveBeenCalledOnce()
    expect((spy.mock.calls[0][0] as CustomEvent).detail.kind).toBe('guest')
    window.removeEventListener(CREDIT_MODAL_EVENT, spy)
  })

  it('does NOT dispatch on a 200', async () => {
    const spy = vi.fn()
    window.addEventListener(CREDIT_MODAL_EVENT, spy)

    mockFetchOnce(200)
    await apiFetch('/api/ok')

    expect(spy).not.toHaveBeenCalled()
    window.removeEventListener(CREDIT_MODAL_EVENT, spy)
  })
})
