import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const notFoundMock = vi.fn(() => {
  throw new Error('NOT_FOUND')
})

vi.mock('next/navigation', () => ({
  notFound: () => notFoundMock(),
}))

import {
  apiRequireDemoTokenOr404,
  hasDemoTokenConfigured,
  isValidDemoToken,
  requireDemoTokenOr404,
} from '@/lib/demo/requireDemoToken'

describe('requireDemoToken', () => {
  const originalToken = process.env.DEMO_TOKEN

  beforeEach(() => {
    notFoundMock.mockClear()
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalToken
  })

  it('treats all tokens as invalid when DEMO_TOKEN is unset', () => {
    delete process.env.DEMO_TOKEN
    expect(hasDemoTokenConfigured()).toBe(false)
    expect(isValidDemoToken('anything')).toBe(false)

    const req = new NextRequest('http://localhost:3000/api/demo/icp?token=anything')
    const res = apiRequireDemoTokenOr404(req)
    expect(res?.status).toBe(503)
  })

  it('accepts exact token match and rejects mismatches', () => {
    process.env.DEMO_TOKEN = 'demo-test-token'
    expect(hasDemoTokenConfigured()).toBe(true)
    expect(isValidDemoToken('demo-test-token')).toBe(true)
    expect(isValidDemoToken('wrong')).toBe(false)
  })

  it('requireDemoTokenOr404 triggers 404 behavior on mismatch', () => {
    process.env.DEMO_TOKEN = 'demo-test-token'

    expect(() => requireDemoTokenOr404('wrong')).toThrow('NOT_FOUND')
    expect(notFoundMock).toHaveBeenCalledTimes(1)
  })

  it('apiRequireDemoTokenOr404 returns null when valid', () => {
    process.env.DEMO_TOKEN = 'demo-test-token'
    const req = new NextRequest('http://localhost:3000/api/demo/icp', {
      headers: { 'x-demo-token': 'demo-test-token' },
    })

    const res = apiRequireDemoTokenOr404(req)
    expect(res).toBeNull()
  })

  it('apiRequireDemoTokenOr404 accepts dp_demo cookie without token', () => {
    process.env.DEMO_TOKEN = 'demo-test-token'
    const req = new NextRequest('http://localhost:3000/api/demo/icp')
    req.cookies.set('dp_demo', '1')

    const res = apiRequireDemoTokenOr404(req)
    expect(res).toBeNull()
  })
})
