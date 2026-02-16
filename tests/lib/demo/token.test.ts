import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { isValidDemoToken, readDemoTokenFromSearchParams, isDemoEnabled } from '@/lib/demo/token'

describe('demo token utilities', () => {
  const originalDemoToken = process.env.DEMO_TOKEN
  const originalDemoEnabled = process.env.DEMO_ENABLED

  beforeEach(() => {
    process.env.DEMO_TOKEN = 'demo-secret'
    delete process.env.DEMO_ENABLED
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalDemoToken
    process.env.DEMO_ENABLED = originalDemoEnabled
  })

  it('prefers demo_token over token for search params', () => {
    const token = readDemoTokenFromSearchParams({
      demo_token: 'new-token',
      token: 'legacy-token',
    })
    expect(token).toBe('new-token')
  })

  it('validates configured token', () => {
    expect(isValidDemoToken('demo-secret')).toBe(true)
    expect(isValidDemoToken('wrong-token')).toBe(false)
  })

  it('respects demo enabled flag', () => {
    process.env.DEMO_ENABLED = '0'
    expect(isDemoEnabled()).toBe(false)
    expect(isValidDemoToken('demo-secret')).toBe(false)
  })
})
