// tests/app/api/tarot/interpret/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/tarot/interpret/route'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/credits/withCredits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true }),
  creditErrorResponse: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
    },
  },
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

describe('POST /api/tarot/interpret', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-openai-key'
    global.fetch = vi.fn()
  })

  it('should return 400 if required fields are missing', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return 400 if cards array is empty', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        cards: [],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return 400 if too many cards', async () => {
    const cards = Array.from({ length: 20 }, (_, i) => ({
      name: `Card ${i}`,
      isReversed: false,
      position: `Position ${i}`,
    }))

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        cards,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return 400 if card is missing required fields', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        cards: [
          {
            name: 'The Fool',
            // missing isReversed
            position: 'Past',
          },
        ],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return 400 if birthdate format is invalid', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
          },
        ],
        birthdate: 'invalid-date',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return 400 if moonPhase is too short', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
          },
        ],
        moonPhase: 'x',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject cards with too many keywords (max 8)', async () => {
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
            keywords: [
              'new',
              'beginning',
              'adventure',
              'extra1',
              'extra2',
              'extra3',
              'extra4',
              'extra5',
              'extra6',
            ],
          },
        ],
      }),
    })

    const response = await POST(req)

    expect(response.status).toBe(400)
  })

  it('should accept cards with valid keywords (max 8)', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'Test overall',
        card_insights: [],
        guidance: 'Test guidance',
      },
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
            keywords: ['new', 'beginning', 'adventure', 'freedom'],
          },
        ],
      }),
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs).toBeDefined()
  })

  it('should use GPT fallback when backend fails', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                overall: 'GPT interpretation',
                cards: [{ position: 'Past', interpretation: 'Card interpretation' }],
                advice: 'GPT advice',
              }),
            },
          },
        ],
      }),
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
          },
        ],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overall_message).toBeDefined()
  })

  it('should recover from loose GPT JSON (code fence + trailing comma)', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: [
                '```json',
                '{',
                '  "overall": "Recovered interpretation",',
                '  "cards": [',
                '    { "position": "Past", "interpretation": "Detailed message about your current flow and next step." },',
                '  ],',
                '  "advice": "Take one practical action today.",',
                '}',
                '```',
              ].join('\n'),
            },
          },
        ],
      }),
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
            meaning: 'New beginning',
          },
        ],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fallback).toBe(false)
    expect(data.overall_message).toBe('Recovered interpretation')
    expect(data.guidance).toBe('Take one practical action today.')
  })

  it('should use simple fallback when GPT also fails', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockRejectedValue(new Error('OpenAI down'))

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            nameKo: '바보',
            isReversed: false,
            position: 'Past',
            meaningKo: '새로운 시작',
          },
        ],
        language: 'ko',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fallback).toBe(true)
    expect(data.overall_message).toContain('바보')
  })

  it('should respect language parameter', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'English interpretation',
        card_insights: [],
        guidance: 'English guidance',
      },
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
          },
        ],
        language: 'en',
      }),
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs[1].language).toBe('en')
  })

  it('should default to Korean language', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'Korean interpretation',
        card_insights: [],
        guidance: 'Korean guidance',
      },
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'love',
        spreadId: 'three-card',
        spreadTitle: 'Love Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
          },
        ],
      }),
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs[1].language).toBe('ko')
  })

  it('should reject strings exceeding max length via Zod validation', async () => {
    const longTitle = 'x'.repeat(200) // Exceeds max(120)

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: longTitle,
        spreadId: 'test',
        spreadTitle: longTitle,
        cards: [
          {
            name: longTitle,
            isReversed: false,
            position: longTitle,
          },
        ],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should accept oversized card meanings by truncating to schema limit', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'Truncated meaning accepted',
        card_insights: [],
        guidance: 'Guidance',
      },
    })

    const veryLongMeaning = 'A'.repeat(2000)
    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general',
        spreadId: 'three-card',
        spreadTitle: 'General Spread',
        cards: [
          {
            name: 'The Fool',
            nameKo: '바보',
            isReversed: false,
            position: 'Past',
            meaning: veryLongMeaning,
            meaningKo: veryLongMeaning,
          },
        ],
        language: 'ko',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overall_message).toBeDefined()
    expect(vi.mocked(apiClient.post)).toHaveBeenCalledTimes(1)
  })
})
