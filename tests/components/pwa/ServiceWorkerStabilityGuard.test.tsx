// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import ServiceWorkerStabilityGuard from '@/components/pwa/ServiceWorkerStabilityGuard'

type FakeReg = { scriptURL: string; unregister: ReturnType<typeof vi.fn> }

function makeReg(scriptURL: string): FakeReg {
  return { scriptURL, unregister: vi.fn().mockResolvedValue(true) }
}

function installSwMock(regs: FakeReg[]) {
  const getRegistrations = vi
    .fn()
    .mockResolvedValue(
      regs.map((r) => ({ active: { scriptURL: r.scriptURL }, unregister: r.unregister }))
    )
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations },
  })
  return getRegistrations
}

function installCachesMock(keys: string[]) {
  const del = vi.fn().mockResolvedValue(true)
  ;(globalThis as unknown as { caches: unknown }).caches = {
    keys: vi.fn().mockResolvedValue(keys),
    delete: del,
  }
  return del
}

describe('ServiceWorkerStabilityGuard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    // @ts-expect-error cleanup
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
    // @ts-expect-error cleanup
    delete (globalThis as unknown as { caches?: unknown }).caches
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('프로덕션: 레거시 워크박스 SW 를 unregister + precache 캐시 삭제, push-sw.js 는 보존', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const legacy = makeReg('https://app.example.com/sw.js')
    const push = makeReg('https://app.example.com/push-sw.js')
    installSwMock([legacy, push])
    const cacheDelete = installCachesMock(['workbox-precache-v1', 'next-pwa-runtime'])

    render(<ServiceWorkerStabilityGuard />)

    await waitFor(() => expect(legacy.unregister).toHaveBeenCalledTimes(1))
    // push-sw.js 는 건드리지 않는다.
    expect(push.unregister).not.toHaveBeenCalled()
    // 레거시를 발견했으니 남은 precache 캐시도 비운다.
    await waitFor(() => expect(cacheDelete).toHaveBeenCalledTimes(2))
  })

  it('프로덕션: push-sw.js 만 있으면 아무것도 정리하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const push = makeReg('https://app.example.com/push-sw.js')
    installSwMock([push])
    const cacheDelete = installCachesMock(['some-cache'])

    render(<ServiceWorkerStabilityGuard />)

    // 마이크로태스크가 돌 시간을 준 뒤에도 push 는 보존, 캐시 미삭제.
    await new Promise((r) => setTimeout(r, 0))
    expect(push.unregister).not.toHaveBeenCalled()
    expect(cacheDelete).not.toHaveBeenCalled()
  })
})
