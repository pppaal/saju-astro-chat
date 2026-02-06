import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

// Mock heavy deps before importing route handlers
vi.mock('@/lib/destiny-map/astrologyengine', () => ({
  computeDestinyMap: vi.fn(async () => ({
    saju: {},
    astrology: {},
    summary: 'mock summary',
  })),
}))

vi.mock('@/lib/backend-health', () => ({
  callBackendWithFallback: vi.fn(async () => ({
    success: false,
    data: { fusion_layer: 'fallback reply' },
  })),
}))

vi.mock('@/lib/apiGuard', () => ({
  apiGuard: vi.fn(async () => null),
}))

vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(async () => ({ context: {}, error: null })),
  createAuthenticatedGuard: vi.fn(() => ({})),
  createSimpleGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'en'),
}))

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(async () => null),
}))

// Make sure authOptions import does not throw
vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

import { POST as ChatPost } from '@/app/api/destiny-map/chat/route'

describe('destiny-map chat API smoke', () => {
  const originalEnv = process.env.NODE_ENV
  beforeAll(() => {
    process.env.NODE_ENV = 'development' // skip auth in chat route
  })
  afterAll(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('rejects missing required fields with 400', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ birthDate: '', birthTime: '' }),
    })
    const res = await ChatPost(req)
    expect(res.status).toBe(400)
  })

  it('returns fallback reply and flag when backend is unavailable', async () => {
    const req = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice',
        birthDate: '1990-01-01',
        birthTime: '12:00',
        gender: 'female',
        latitude: 37.5,
        longitude: 127.0,
        lang: 'en',
        messages: [{ role: 'user', content: 'hello' }],
      }),
    })
    const res = await ChatPost(req)
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Fallback')).toBe('1')
    const json = await res.json()
    expect(json.fallback).toBe(true)
    expect(json.backendAvailable).toBe(false)
    expect(typeof json.reply).toBe('string')
  })
})
