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
  const register = vi.fn().mockResolvedValue({})
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistrations, register },
  })
  return { getRegistrations, register }
}

describe('ServiceWorkerStabilityGuard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    // @ts-expect-error cleanup
    delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('프로덕션: 레거시 SW 는 unregister, push-sw.js(통합 SW)는 보존 + 등록', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const legacy = makeReg('https://app.example.com/sw.js')
    const push = makeReg('https://app.example.com/push-sw.js')
    const { register } = installSwMock([legacy, push])

    render(<ServiceWorkerStabilityGuard />)

    await waitFor(() => expect(legacy.unregister).toHaveBeenCalledTimes(1))
    // push-sw.js 는 unregister 하지 않는다.
    expect(push.unregister).not.toHaveBeenCalled()
    // 통합 SW 를 (멱등) 등록해 오프라인 폴백을 보장한다.
    await waitFor(() => expect(register).toHaveBeenCalledWith('/push-sw.js', { scope: '/' }))
  })

  it('프로덕션: 레거시가 없어도 통합 SW 를 등록한다(오프라인 폴백)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const push = makeReg('https://app.example.com/push-sw.js')
    const { register } = installSwMock([push])

    render(<ServiceWorkerStabilityGuard />)

    await waitFor(() => expect(register).toHaveBeenCalledWith('/push-sw.js', { scope: '/' }))
    expect(push.unregister).not.toHaveBeenCalled()
  })

  it('개발: 모든 SW 를 제거하고 등록하지 않는다', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const a = makeReg('https://app.example.com/sw.js')
    const b = makeReg('https://app.example.com/push-sw.js')
    const { register } = installSwMock([a, b])

    render(<ServiceWorkerStabilityGuard />)

    await waitFor(() => expect(a.unregister).toHaveBeenCalledTimes(1))
    expect(b.unregister).toHaveBeenCalledTimes(1)
    expect(register).not.toHaveBeenCalled()
  })
})
