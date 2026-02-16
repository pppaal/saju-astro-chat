import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as getDemoDebug } from '@/app/api/demo/debug/route'

describe('/api/demo/debug route', () => {
  const originalToken = process.env.DEMO_TOKEN
  const originalEnabled = process.env.DEMO_ENABLED

  beforeEach(() => {
    process.env.DEMO_TOKEN = 'YOUR_TOKEN'
    process.env.DEMO_ENABLED = '1'
  })

  afterEach(() => {
    process.env.DEMO_TOKEN = originalToken
    process.env.DEMO_ENABLED = originalEnabled
  })

  it('returns masked token diagnostics and match true for valid query token', async () => {
    const req = new NextRequest('http://localhost:3000/api/demo/debug?demo_token=YOUR_TOKEN')
    const res = await getDemoDebug(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.demoEnabled).toBe('1')
    expect(json.envTokenLen).toBe(10)
    expect(json.envTokenPrefix).toBe('YOUR_T')
    expect(json.providedTokenLen).toBe(10)
    expect(json.providedTokenPrefix).toBe('YOUR_T')
    expect(json.match).toBe(true)
  })
})
