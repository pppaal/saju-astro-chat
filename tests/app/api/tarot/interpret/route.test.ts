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
      text: async () =>
        JSON.stringify({
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

  it('should use fast backend fallback policy for large spreads', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: false,
      status: 408,
      error: 'Request timeout',
    })

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overall: 'Large spread GPT interpretation',
                  cards: Array.from({ length: 10 }, (_, idx) => ({
                    position: `Position ${idx + 1}`,
                    interpretation: `Interpretation for card ${idx + 1}`,
                  })),
                  advice: 'Practical advice',
                }),
              },
            },
          ],
        }),
    })

    const cards = Array.from({ length: 10 }, (_, i) => ({
      name: `Card ${i + 1}`,
      isReversed: false,
      position: `Position ${i + 1}`,
      meaning: 'A'.repeat(900),
      meaningKo: '가'.repeat(900),
    }))

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general',
        spreadId: 'celtic-cross',
        spreadTitle: 'Celtic Cross',
        cards,
        language: 'ko',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overall_message).toBeDefined()
    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs?.[2]).toMatchObject({ timeout: 12000, retries: 0, retryDelay: 500 })
  })

  it('should use summary-only GPT mode for large spreads and still build per-card insights', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  overall: '대형 스프레드 질문 맞춤 요약입니다.',
                  advice: '1) 오늘: 우선순위 1개를 선택하세요. 2) 이번 주: 결과를 기록하세요.',
                }),
              },
            },
          ],
        }),
    })

    const cards = Array.from({ length: 10 }, (_, i) => ({
      name: `Card ${i + 1}`,
      isReversed: i % 2 === 0,
      position: `Position ${i + 1}`,
      keywords: ['focus', 'timing', 'action'],
    }))

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general',
        spreadId: 'celtic-cross',
        spreadTitle: 'Celtic Cross',
        cards,
        language: 'ko',
        userQuestion: '이번 달 직업운 핵심은?',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data.card_insights)).toBe(true)
    expect(data.card_insights).toHaveLength(cards.length)
    expect(data.card_insights[0].interpretation.length).toBeGreaterThanOrEqual(80)
    expect(data.card_insights[0].interpretation).toMatch(/오늘|이번 주|7일/i)

    const openAiCall = vi
      .mocked(global.fetch)
      .mock.calls.find((call) => String(call[0]).includes('api.openai.com'))
    expect(openAiCall).toBeDefined()

    const openAiPayload = JSON.parse(String(openAiCall?.[1]?.body))
    const userPrompt = String(openAiPayload?.messages?.[1]?.content || '')
    expect(userPrompt).toContain('"overall"')
    expect(userPrompt).not.toContain('"cards": [')
  })

  it('should recover from loose GPT JSON (code fence + trailing comma)', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
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
    expect(typeof data.overall_message).toBe('string')
    expect(data.overall_message.length).toBeGreaterThanOrEqual(90)
    expect(typeof data.guidance).toBe('string')
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
    expect(data.card_insights[0].interpretation.length).toBeGreaterThanOrEqual(80)
    expect(data.card_insights[0].interpretation).toMatch(/오늘|이번 주|7일/i)
  })

  it('should build anchored per-card insights when GPT returns non-JSON text', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend down'))

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [
            {
              message: {
                content: 'Short plain-text guidance without JSON structure.',
              },
            },
          ],
        }),
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'career',
        spreadId: 'three-card',
        spreadTitle: 'Career Spread',
        userQuestion: 'What should I focus on at work this week?',
        language: 'en',
        cards: [
          {
            name: 'The Magician',
            isReversed: false,
            position: 'Present',
            meaning: 'Skillful action and resourcefulness',
          },
        ],
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fallback).toBe(false)
    expect(data.card_insights[0].interpretation.length).toBeGreaterThanOrEqual(80)
    expect(data.card_insights[0].interpretation).toMatch(/today|this week|within 7 days/i)
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

  it('should pass parsed JSON contexts as objects to backend', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'Context-aware interpretation',
        card_insights: [],
        guidance: 'Guidance',
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
        includeSaju: true,
        includeAstrology: true,
        sajuContext: JSON.stringify({ day_master: { element: 'metal', stem: '辛' } }),
        astroContext: JSON.stringify({ sun_sign: 'Aquarius', moon_sign: 'Gemini' }),
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs?.[1]?.saju_context).toEqual({ day_master: { element: 'metal', stem: '辛' } })
    expect(callArgs?.[1]?.astro_context).toEqual({ sun_sign: 'Aquarius', moon_sign: 'Gemini' })
  })

  it('should drop invalid string contexts for backend payload to avoid backend parsing errors', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'Interpretation',
        card_insights: [],
        guidance: 'Guidance',
      },
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general',
        spreadId: 'three-card',
        spreadTitle: 'General Spread',
        cards: [
          {
            name: 'The Magician',
            isReversed: false,
            position: 'Present',
          },
        ],
        includeSaju: true,
        includeAstrology: true,
        sajuContext: 'plain text context, not json',
        astroContext: '{not-valid-json}',
      }),
    })

    const response = await POST(req)
    expect(response.status).toBe(200)

    const callArgs = vi.mocked(apiClient.post).mock.calls[0]
    expect(callArgs?.[1]?.saju_context).toBeUndefined()
    expect(callArgs?.[1]?.astro_context).toBeUndefined()
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

  it('should auto-repair low-quality interpretation payloads', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient')

    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: {
        overall_message: 'ok',
        card_insights: [
          {
            position: 'Past',
            card_name: 'The Fool',
            interpretation: 'short',
          },
        ],
        guidance: 'Listen to the cards.',
      },
    })

    const req = new NextRequest('http://localhost/api/tarot/interpret', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general',
        spreadId: 'three-card',
        spreadTitle: 'General Spread',
        cards: [
          {
            name: 'The Fool',
            isReversed: false,
            position: 'Past',
            meaning: 'New beginning',
          },
        ],
        language: 'en',
        userQuestion: 'Should I contact them this week?',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(typeof data.overall_message).toBe('string')
    expect(data.overall_message.length).toBeGreaterThanOrEqual(90)
    expect(typeof data.guidance).toBe('string')
    expect(data.guidance).toContain('1) Today:')
    expect(data.guidance).toContain('Within 7 days')
    expect(Array.isArray(data.card_insights)).toBe(true)
    expect(data.card_insights[0].interpretation.length).toBeGreaterThanOrEqual(80)
    expect(data.card_insights[0].interpretation).toMatch(/today|this week|within 7 days/i)
  })
})
