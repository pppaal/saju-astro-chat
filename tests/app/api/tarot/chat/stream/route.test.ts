/**
 * Comprehensive Test Suite for /api/tarot/chat/stream/route.ts
 *
 * Tests the Tarot Chat Streaming API endpoint including:
 * - Public token authentication with createPublicStreamGuard
 * - Rate limiting (30 requests per 60 seconds)
 * - Credit consumption (followUp type)
 * - Input validation via Zod schema
 * - Message normalization and sanitization
 * - Card context sanitization
 * - Personality data integration (Nova Persona)
 * - SSE streaming with backend proxy
 * - Fallback responses on backend failure
 * - Korean/English language support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============ Mock Dependencies ============

// Mock middleware first before importing the route
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createPublicStreamGuard: vi.fn(),
}))

vi.mock('@/lib/streaming', () => ({
  createSSEStreamProxy: vi.fn(),
  createFallbackSSEStream: vi.fn(),
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    postSSEStream: vi.fn(),
  },
}))

vi.mock('@/lib/http', () => ({
  enforceBodySize: vi.fn(() => null),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/constants/api-limits', () => ({
  MESSAGE_LIMITS: {
    MAX_MESSAGES: 20,
    MAX_MESSAGE_LENGTH: 3000,
  },
  TEXT_LIMITS: {
    MAX_CARD_TEXT: 500,
    MAX_TITLE: 200,
    MAX_GUIDANCE: 2000,
  },
  LIST_LIMITS: {
    MAX_CARDS: 15,
  },
}))

vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  tarotChatStreamRequestSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    personalityResult: {
      findUnique: vi.fn(),
    },
  },
}))

// The route uses normalizeMessagesBase renamed to normalizeMessages internally
// We mock it to return properly formatted messages
vi.mock('@/lib/api', () => ({
  cleanStringArray: vi.fn((arr: unknown) => {
    if (!Array.isArray(arr)) return []
    return arr.filter((item): item is string => typeof item === 'string')
  }),
  normalizeMessages: vi.fn((raw: unknown, _config?: unknown) => {
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (m: unknown) =>
          m &&
          typeof m === 'object' &&
          'role' in m &&
          'content' in m &&
          typeof (m as Record<string, unknown>).content === 'string' &&
          (m as Record<string, unknown>).content !== '' &&
          ['user', 'assistant', 'system'].includes((m as { role: string }).role)
      )
      .slice(0, 20) // Match MAX_MESSAGES limit
      .map((m: unknown) => ({
        role: (m as { role: string }).role,
        content: String((m as { content: string }).content).slice(0, 3000),
      }))
  }),
}))

// Import mocked modules
import { initializeApiContext, createPublicStreamGuard } from '@/lib/api/middleware'
import { createSSEStreamProxy, createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { enforceBodySize } from '@/lib/http'
import { logger } from '@/lib/logger'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { parseRequestBody } from '@/lib/api/requestParser'
import { tarotChatStreamRequestSchema } from '@/lib/api/zodValidation'
import { normalizeMessages } from '@/lib/api'

// Import the route under test after mocks are set up
import { POST } from '@/app/api/tarot/chat/stream/route'

// Helper to get the mocked functions
const mockZodSafeParse = vi.mocked(tarotChatStreamRequestSchema.safeParse)
const mockNormalizeMessages = vi.mocked(normalizeMessages)

// ============ Test Fixtures ============

function createNextRequest(
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest('http://localhost:3000/api/tarot/chat/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  })
}

function createValidTarotContext() {
  return {
    spread_title: 'Three Card Spread',
    category: 'general',
    cards: [
      {
        position: 'Past',
        name: 'The Fool',
        is_reversed: false,
        meaning: 'New beginnings',
        keywords: ['adventure', 'innocence'],
      },
      {
        position: 'Present',
        name: 'The Magician',
        is_reversed: false,
        meaning: 'Manifestation',
        keywords: ['power', 'skill'],
      },
      {
        position: 'Future',
        name: 'The World',
        is_reversed: false,
        meaning: 'Completion',
        keywords: ['fulfillment', 'achievement'],
      },
    ],
    overall_message: 'Your journey is progressing well',
    guidance: 'Continue on your current path',
  }
}

function createValidRequest(overrides?: Record<string, unknown>) {
  return {
    messages: [{ role: 'user', content: 'What does this card mean for my future?' }],
    context: createValidTarotContext(),
    language: 'ko',
    ...overrides,
  }
}

function createMockPersonalityData() {
  return {
    typeCode: 'RAVL',
    personaName: 'Radiant Visionary',
    energyScore: 75,
    cognitionScore: 65,
    decisionScore: 45,
    rhythmScore: 55,
    analysisData: {
      summary: 'Creative and energetic personality',
      keyMotivations: ['growth', 'connection'],
      strengths: ['leadership', 'creativity'],
      challenges: ['patience', 'focus'],
    },
  }
}

function setupDefaultMocks() {
  vi.mocked(enforceBodySize).mockReturnValue(null)
  vi.mocked(createPublicStreamGuard).mockReturnValue({
    route: 'tarot-chat-stream',
    requireToken: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
    credits: { type: 'followUp', amount: 1 },
  } as unknown as ReturnType<typeof createPublicStreamGuard>)
  vi.mocked(initializeApiContext).mockResolvedValue({
    context: {
      userId: 'test-user-123',
      locale: 'ko',
      ip: '127.0.0.1',
      session: null,
      isAuthenticated: false,
      isPremium: false,
    },
    error: null,
  } as unknown as Awaited<ReturnType<typeof initializeApiContext>>)
  vi.mocked(getServerSession).mockResolvedValue(null)
  vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

  // Default parseRequestBody mock
  vi.mocked(parseRequestBody).mockImplementation(async (req) => {
    try {
      const body = await (req as NextRequest).clone().json()
      return body
    } catch {
      return null
    }
  })

  // Default Zod validation mock - success
  mockZodSafeParse.mockImplementation((data: Record<string, unknown>) => {
    const messages = data.messages as Array<{ role: string; content: string }> | undefined
    const context = data.context as Record<string, unknown> | undefined

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        success: false,
        error: { issues: [{ path: ['messages'], message: 'Messages required' }] },
      }
    }

    if (!context || typeof context !== 'object') {
      return {
        success: false,
        error: { issues: [{ path: ['context'], message: 'Context required' }] },
      }
    }

    if (data.language && !['ko', 'en'].includes(data.language as string)) {
      return {
        success: false,
        error: { issues: [{ path: ['language'], message: 'Invalid language' }] },
      }
    }

    return {
      success: true,
      data: {
        messages: data.messages,
        context: data.context,
        language: data.language || 'ko',
        counselor_id: data.counselor_id,
        counselor_style: data.counselor_style,
      },
    }
  })

  // Reset the normalizeMessages mock to a working default
  // The route uses its own wrapper that calls normalizeMessagesBase from @/lib/api
  mockNormalizeMessages.mockImplementation((raw: unknown) => {
    if (!Array.isArray(raw)) return []
    return raw
      .filter(
        (m: unknown) =>
          m &&
          typeof m === 'object' &&
          'role' in m &&
          'content' in m &&
          typeof (m as Record<string, unknown>).content === 'string' &&
          (m as Record<string, unknown>).content !== '' &&
          ['user', 'assistant', 'system'].includes((m as { role: string }).role)
      )
      .slice(0, 20)
      .map((m: unknown) => ({
        role: (m as { role: string }).role,
        content: String((m as { content: string }).content).slice(0, 3000),
      }))
  })

  vi.mocked(apiClient.postSSEStream).mockResolvedValue({
    ok: true,
    status: 200,
    response: {
      body: new ReadableStream(),
      headers: new Headers(),
    } as unknown as Response,
  } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)
  vi.mocked(createSSEStreamProxy).mockReturnValue(new Response('', { status: 200 }))
  vi.mocked(createFallbackSSEStream).mockReturnValue(new Response('', { status: 200 }))
}

// ============ Test Suites ============

describe('/api/tarot/chat/stream POST - Middleware & Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should apply createPublicStreamGuard with correct options', async () => {
    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(createPublicStreamGuard).toHaveBeenCalledWith({
      route: 'tarot-chat-stream',
      limit: 30,
      windowSeconds: 60,
      requireCredits: true,
      creditType: 'followUp',
      creditAmount: 1,
    })
  })

  it('should return error when middleware authentication fails', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    } as unknown as Awaited<ReturnType<typeof initializeApiContext>>)

    const req = createNextRequest(createValidRequest())
    const response = await POST(req)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should proceed when authentication succeeds', async () => {
    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should return 413 when body size limit exceeded', async () => {
    vi.mocked(enforceBodySize).mockReturnValue(new Response('Body too large', { status: 413 }))

    const req = createNextRequest(createValidRequest())
    const response = await POST(req)

    expect(response.status).toBe(413)
  })
})

describe('/api/tarot/chat/stream POST - Input Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should reject requests with null body', async () => {
    vi.mocked(parseRequestBody).mockResolvedValue(null)

    const req = createNextRequest({})
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_body')
  })

  it('should reject requests with non-object body', async () => {
    vi.mocked(parseRequestBody).mockResolvedValue('not an object')

    const req = createNextRequest({})
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_body')
  })

  it('should reject requests with empty messages array', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      messages: [],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject requests with missing messages', async () => {
    mockZodSafeParse.mockReturnValue({
      success: false,
      error: { issues: [{ path: ['messages'], message: 'Messages required' }] },
    })

    const req = createNextRequest({
      context: createValidTarotContext(),
      language: 'ko',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject requests with missing context', async () => {
    mockZodSafeParse.mockReturnValue({
      success: false,
      error: { issues: [{ path: ['context'], message: 'Context required' }] },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      language: 'ko',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject requests with invalid language', async () => {
    mockZodSafeParse.mockReturnValue({
      success: false,
      error: { issues: [{ path: ['language'], message: 'Invalid language' }] },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'fr',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should accept valid Korean language', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      language: 'ko',
    })

    await POST(req)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should accept valid English language', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      language: 'en',
    })

    await POST(req)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should default to locale from context when language not provided', async () => {
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: { userId: 'test-user-123', locale: 'en' },
      error: null,
    } as unknown as Awaited<ReturnType<typeof initializeApiContext>>)

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context: createValidTarotContext(),
        language: undefined, // Not provided
      },
    })

    const requestData = createValidRequest()
    delete requestData.language
    const req = createNextRequest(requestData)

    await POST(req)

    // Should use 'en' from context.locale
    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        language: 'en',
      })
    )
  })
})

describe('/api/tarot/chat/stream POST - Message Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should reject when normalized messages are empty', async () => {
    // Mock normalizeMessages to return empty array
    const { normalizeMessages } = await import('@/lib/api')
    vi.mocked(normalizeMessages).mockReturnValue([])

    const req = createNextRequest(createValidRequest())
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing messages')
  })

  it('should accept multiple valid messages', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      messages: [
        { role: 'user', content: 'Tell me about The Fool' },
        { role: 'assistant', content: 'The Fool represents new beginnings...' },
        { role: 'user', content: 'What about the reversed meaning?' },
      ],
    })

    await POST(req)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should pass messages with system instruction to backend', async () => {
    const req = createNextRequest(createValidRequest())

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
      })
    )
  })
})

describe('/api/tarot/chat/stream POST - Context Sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should reject invalid tarot context (missing spread_title)', async () => {
    // The route's sanitizeContext returns null for invalid context
    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: '', // Empty spread_title
        category: 'general',
        cards: [
          {
            position: 'Past',
            name: 'The Fool',
            is_reversed: false,
            meaning: 'New beginnings',
          },
        ],
        overall_message: 'Test',
        guidance: 'Test',
      },
      language: 'ko',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid tarot context')
  })

  it('should reject context with empty cards array', async () => {
    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'Three Card Spread',
        category: 'general',
        cards: [],
        overall_message: 'Test',
        guidance: 'Test',
      },
      language: 'ko',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid tarot context')
  })

  it('should accept context with valid cards using is_reversed', async () => {
    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'Celtic Cross',
        category: 'love',
        cards: [
          {
            position: 'Current Situation',
            name: 'The Tower',
            is_reversed: true,
            meaning: 'Delayed upheaval',
          },
        ],
        overall_message: 'Changes are coming',
        guidance: 'Prepare for transformation',
      },
      language: 'ko',
    })

    await POST(req)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should accept context with valid cards using isReversed (camelCase)', async () => {
    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'One Card Draw',
        category: 'career',
        cards: [
          {
            position: 'Outcome',
            name: 'The Empress',
            isReversed: true,
            meaning: 'Creative block',
          },
        ],
        overall_message: 'Focus on creativity',
        guidance: 'Overcome obstacles',
      },
      language: 'ko',
    })

    await POST(req)
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })

  it('should filter out invalid cards (missing position) but accept if at least one valid', async () => {
    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'Test',
        category: 'general',
        cards: [
          { position: '', name: 'Invalid', meaning: 'Test', is_reversed: false }, // Invalid
          { position: 'Valid', name: 'The Sun', meaning: 'Joy', is_reversed: false }, // Valid
        ],
        overall_message: 'Test',
        guidance: 'Test',
      },
      language: 'ko',
    })

    await POST(req)
    // Should succeed because at least one valid card exists
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/tarot/chat/stream POST - Counselor Options', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should pass counselor_id to backend', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        counselor_id: 'mystic_luna',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      counselor_id: 'mystic_luna',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        counselor_id: 'mystic_luna',
      })
    )
  })

  it('should pass counselor_style to backend', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        counselor_style: 'mystical',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      counselor_style: 'mystical',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        counselor_style: 'mystical',
      })
    )
  })

  it('should pass both counselor_id and counselor_style to backend', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        counselor_id: 'sage_wisdom',
        counselor_style: 'practical',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      counselor_id: 'sage_wisdom',
      counselor_style: 'practical',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        counselor_id: 'sage_wisdom',
        counselor_style: 'practical',
      })
    )
  })
})

describe('/api/tarot/chat/stream POST - Personality Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should fetch personality data for authenticated users', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
    } as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(
      createMockPersonalityData() as Awaited<
        ReturnType<typeof prisma.personalityResult.findUnique>
      >
    )

    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(prisma.personalityResult.findUnique).toHaveBeenCalledWith({
      where: { userId: 'user-123' },
      select: expect.objectContaining({
        typeCode: true,
        personaName: true,
        energyScore: true,
      }),
    })
  })

  it('should not fetch personality data for unauthenticated users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(prisma.personalityResult.findUnique).not.toHaveBeenCalled()
  })

  it('should include personality context in Korean system instruction', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    } as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(
      createMockPersonalityData() as Awaited<
        ReturnType<typeof prisma.personalityResult.findUnique>
      >
    )

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'ko',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('Nova Persona')
    expect(systemMsg?.content).toContain('Radiant Visionary')
  })

  it('should include personality context in English system instruction', async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123' },
    } as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(
      createMockPersonalityData() as Awaited<
        ReturnType<typeof prisma.personalityResult.findUnique>
      >
    )

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        language: 'en',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'en',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('Nova Persona')
    expect(systemMsg?.content).toContain('Personalize advice')
  })

  it('should handle personality fetch errors gracefully', async () => {
    // Set up authenticated session
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2099-01-01',
    } as Awaited<ReturnType<typeof getServerSession>>)

    // Simulate database error
    vi.mocked(prisma.personalityResult.findUnique).mockRejectedValue(
      new Error('Database error')
    )

    const req = createNextRequest(createValidRequest())
    await POST(req)

    // Should still proceed with backend call despite personality fetch error
    // The route catches the error internally and returns null for personality
    expect(apiClient.postSSEStream).toHaveBeenCalled()
  })
})

describe('/api/tarot/chat/stream POST - System Instruction Generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should include card details in Korean system instruction', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      language: 'ko',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('타로 상담사')
    expect(systemMsg?.content).toContain('Three Card Spread')
    expect(systemMsg?.content).toContain('The Fool')
    expect(systemMsg?.content).toContain('Past')
    expect(systemMsg?.content).toContain('정위')
  })

  it('should include card details in English system instruction', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        language: 'en',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'en',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('tarot counselor')
    expect(systemMsg?.content).toContain('Three Card Spread')
    expect(systemMsg?.content).toContain('The Fool')
    expect(systemMsg?.content).toContain('Past')
    expect(systemMsg?.content).toContain('upright')
  })

  it('should mark reversed cards in Korean system instruction', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context: {
          spread_title: 'Test',
          category: 'test',
          cards: [
            {
              position: 'Main',
              name: 'The Hanged Man',
              is_reversed: true,
              meaning: 'Resistance to change',
            },
          ],
          overall_message: 'Test',
          guidance: 'Test',
        },
        language: 'ko',
      },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'Test',
        category: 'test',
        cards: [
          {
            position: 'Main',
            name: 'The Hanged Man',
            is_reversed: true,
            meaning: 'Resistance to change',
          },
        ],
        overall_message: 'Test',
        guidance: 'Test',
      },
      language: 'ko',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('역위')
  })

  it('should mark reversed cards in English system instruction', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context: {
          spread_title: 'Test',
          category: 'test',
          cards: [
            {
              position: 'Main',
              name: 'The Hanged Man',
              is_reversed: true,
              meaning: 'Resistance to change',
            },
          ],
          overall_message: 'Test',
          guidance: 'Test',
        },
        language: 'en',
      },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: {
        spread_title: 'Test',
        category: 'test',
        cards: [
          {
            position: 'Main',
            name: 'The Hanged Man',
            is_reversed: true,
            meaning: 'Resistance to change',
          },
        ],
        overall_message: 'Test',
        guidance: 'Test',
      },
      language: 'en',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('reversed')
  })

  it('should include output format guidelines in Korean', async () => {
    const req = createNextRequest({
      ...createValidRequest(),
      language: 'ko',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('핵심 메시지')
    expect(systemMsg?.content).toContain('카드 해석')
    expect(systemMsg?.content).toContain('실행 가능한 조언')
  })

  it('should include output format guidelines in English', async () => {
    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        language: 'en',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'en',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('Core Message')
    expect(systemMsg?.content).toContain('Card Interpretation')
    expect(systemMsg?.content).toContain('Actionable Steps')
  })
})

describe('/api/tarot/chat/stream POST - SSE Streaming', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should call backend SSE stream endpoint', async () => {
    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        messages: expect.any(Array),
        context: expect.any(Object),
        language: 'ko',
      })
    )
  })

  it('should proxy SSE stream with correct options', async () => {
    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(createSSEStreamProxy).toHaveBeenCalledWith({
      source: expect.anything(),
      route: 'TarotChatStream',
      additionalHeaders: expect.objectContaining({
        'X-Fallback': '0',
      }),
    })
  })

  it('should include X-Fallback: 0 header on success', async () => {
    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(createSSEStreamProxy).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalHeaders: expect.objectContaining({
          'X-Fallback': '0',
        }),
      })
    )
  })
})

describe('/api/tarot/chat/stream POST - Fallback Responses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should return fallback stream on backend error', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(createFallbackSSEStream).toHaveBeenCalledWith({
      content: expect.any(String),
      done: true,
      'X-Fallback': '1',
    })
  })

  it('should generate Korean fallback message on backend failure', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'ko',
    })

    await POST(req)

    expect(createFallbackSSEStream).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('리딩'),
      })
    )
  })

  it('should generate English fallback message on backend failure', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        language: 'en',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      language: 'en',
    })

    await POST(req)

    expect(createFallbackSSEStream).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.stringContaining('reading'),
      })
    )
  })

  it('should include card summary in fallback message', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    const fallbackCall = vi.mocked(createFallbackSSEStream).mock.calls[0][0]
    expect(fallbackCall.content).toContain('The Fool')
  })

  it('should include overall_message in fallback', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Backend error',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    const context = createValidTarotContext()
    context.overall_message = 'Trust your inner wisdom'

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context,
        language: 'ko',
      },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context,
      language: 'ko',
    })

    await POST(req)

    const fallbackCall = vi.mocked(createFallbackSSEStream).mock.calls[0][0]
    expect(fallbackCall.content).toContain('Trust your inner wisdom')
  })

  it('should log backend error details', async () => {
    vi.mocked(apiClient.postSSEStream).mockResolvedValue({
      ok: false,
      status: 503,
      error: 'Service unavailable',
    } as unknown as Awaited<ReturnType<typeof apiClient.postSSEStream>>)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(logger.error).toHaveBeenCalledWith(
      '[TarotChatStream] Backend error:',
      expect.objectContaining({
        status: 503,
        error: 'Service unavailable',
      })
    )
  })
})

describe('/api/tarot/chat/stream POST - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should handle unexpected errors', async () => {
    vi.mocked(apiClient.postSSEStream).mockRejectedValue(new Error('Unexpected error'))

    const req = createNextRequest(createValidRequest())
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Server error')
  })

  it('should handle non-Error exceptions', async () => {
    vi.mocked(apiClient.postSSEStream).mockRejectedValue('String error')

    const req = createNextRequest(createValidRequest())
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Server error')
  })

  it('should log errors properly', async () => {
    const testError = new Error('Test error')
    vi.mocked(apiClient.postSSEStream).mockRejectedValue(testError)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    expect(logger.error).toHaveBeenCalledWith('Tarot chat stream error:', testError)
  })
})

describe('/api/tarot/chat/stream POST - Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaultMocks()
  })

  it('should complete full chat stream flow for authenticated user', async () => {
    // Set up authenticated session with proper structure
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'user-123', email: 'test@example.com' },
      expires: '2099-01-01',
    } as Awaited<ReturnType<typeof getServerSession>>)

    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(
      createMockPersonalityData() as Awaited<
        ReturnType<typeof prisma.personalityResult.findUnique>
      >
    )

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        ...createValidRequest(),
        counselor_id: 'mystic_luna',
        counselor_style: 'mystical',
      },
    })

    const req = createNextRequest({
      ...createValidRequest(),
      counselor_id: 'mystic_luna',
      counselor_style: 'mystical',
    })

    await POST(req)

    // Verify key components were called
    expect(createPublicStreamGuard).toHaveBeenCalled()
    expect(initializeApiContext).toHaveBeenCalled()
    expect(enforceBodySize).toHaveBeenCalled()
    expect(getServerSession).toHaveBeenCalled()
    // Personality fetch is called when session has user.id
    expect(apiClient.postSSEStream).toHaveBeenCalled()
    expect(createSSEStreamProxy).toHaveBeenCalled()
  })

  it('should complete full chat stream flow for unauthenticated user', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null)

    const req = createNextRequest(createValidRequest())
    await POST(req)

    // Should not fetch personality
    expect(prisma.personalityResult.findUnique).not.toHaveBeenCalled()

    // Should still complete the flow
    expect(apiClient.postSSEStream).toHaveBeenCalled()
    expect(createSSEStreamProxy).toHaveBeenCalled()
  })

  it('should handle all card positions and orientations', async () => {
    const multiCardContext = {
      spread_title: 'Celtic Cross',
      category: 'comprehensive',
      cards: [
        { position: 'Present', name: 'The Sun', is_reversed: false, meaning: 'Joy' },
        { position: 'Challenge', name: 'The Tower', is_reversed: true, meaning: 'Change' },
        { position: 'Past', name: 'The Moon', isReversed: false, meaning: 'Intuition' },
        { position: 'Future', name: 'The Star', is_reversed: false, meaning: 'Hope' },
      ],
      overall_message: 'A journey of transformation',
      guidance: 'Trust the process',
    }

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context: multiCardContext,
        language: 'ko',
      },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: multiCardContext,
      language: 'ko',
    })

    await POST(req)

    const postCall = vi.mocked(apiClient.postSSEStream).mock.calls[0]
    const messages = postCall[1].messages as Array<{ role: string; content: string }>
    const systemMsg = messages.find((m) => m.role === 'system')

    expect(systemMsg?.content).toContain('The Sun')
    expect(systemMsg?.content).toContain('The Tower')
    expect(systemMsg?.content).toContain('The Moon')
    expect(systemMsg?.content).toContain('The Star')
  })

  it('should pass context to backend with sanitized cards', async () => {
    const simpleContext = {
      spread_title: 'Simple Spread',
      category: 'daily',
      cards: [
        {
          position: 'Today',
          name: 'The Wheel of Fortune',
          is_reversed: false,
          meaning: 'Change and cycles',
          keywords: ['luck', 'karma'],
        },
      ],
      overall_message: 'Embrace change',
      guidance: 'Go with the flow',
    }

    mockZodSafeParse.mockReturnValue({
      success: true,
      data: {
        messages: [{ role: 'user', content: 'Test' }],
        context: simpleContext,
        language: 'ko',
      },
    })

    const req = createNextRequest({
      messages: [{ role: 'user', content: 'Test' }],
      context: simpleContext,
      language: 'ko',
    })

    await POST(req)

    expect(apiClient.postSSEStream).toHaveBeenCalledWith(
      '/api/tarot/chat-stream',
      expect.objectContaining({
        context: expect.objectContaining({
          spread_title: 'Simple Spread',
          category: 'daily',
          cards: expect.arrayContaining([
            expect.objectContaining({
              position: 'Today',
              name: 'The Wheel of Fortune',
            }),
          ]),
        }),
      })
    )
  })
})
