import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../../middleware'

describe('middleware demo token cookie gating', () => {
  const originalDemoToken = process.env.DEMO_TOKEN
  const originalDemoEnabled = process.env.DEMO_ENABLED

  beforeEach(() => {
    process.env.DEMO_TOKEN = 'demo-test-token'
    process.env.DEMO_ENABLED = '1'
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalDemoToken
    process.env.DEMO_ENABLED = originalDemoEnabled
  })

  it.each(['demo_token', 'token'] as const)(
    'accepts %s query param on /demo/* and redirects to clean URL',
    (paramName) => {
      const request = new NextRequest(
        `http://localhost:3000/demo/calendar?${paramName}=demo-test-token`
      )
      const response = middleware(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost:3000/demo/calendar')
      expect(response.headers.get('set-cookie')).toContain('dp_demo=1')
    }
  )

  it('sets dp_demo cookie and redirects /demo to clean URL when demo token is in query', () => {
    const request = new NextRequest('http://localhost:3000/demo?demo_token=demo-test-token')
    const response = middleware(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/demo')
    expect(response.headers.get('set-cookie')).toContain('dp_demo=1')
  })

  it('allows /demo/calendar without token when dp_demo cookie is present', () => {
    const request = new NextRequest('http://localhost:3000/demo/calendar', {
      headers: { cookie: 'dp_demo=1' },
    })
    const response = middleware(request)

    expect(response.status).toBe(200)
    expect(response.headers.get('location')).toBeNull()
  })
})
