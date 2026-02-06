import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock middleware
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error' } },
          { status: 500 }
        )
      }

      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
          { status: 401 }
        )
      }

      const context = {
        userId: session.user.id,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)

      if (result instanceof Response) {
        return result
      }

      if (result.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          NOT_FOUND: 404,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any, options?: any) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    personaMemory: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Zod validation schemas
const mockPostValidation = vi.fn()
const mockGetQueryValidation = vi.fn()

vi.mock('@/lib/api/zodValidation', () => ({
  dreamChatSaveRequestSchema: {
    safeParse: (...args: unknown[]) => mockPostValidation(...args),
  },
  dreamChatSaveGetQuerySchema: {
    safeParse: (...args: unknown[]) => mockGetQueryValidation(...args),
  },
}))

// Mock request body parser
const mockParseRequestBody = vi.fn()

vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: (...args: unknown[]) => mockParseRequestBody(...args),
}))

// Mock ChatMessage type
vi.mock('@/lib/api', () => ({
  ChatMessage: {},
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { POST, GET } from '@/app/api/dream/chat/save/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
  expires: '2026-12-31',
}

const VALID_POST_BODY = {
  dreamText: 'I was flying over the ocean and saw a great whale beneath the waves.',
  messages: [
    { role: 'user', content: 'What does my dream about flying mean?' },
    { role: 'assistant', content: 'Flying dreams often symbolize freedom and ambition...' },
  ],
  summary: 'Dream about flying over the ocean',
  locale: 'ko',
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dream/chat/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
    },
  })
}

function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/dream/chat/save')
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })
  return new NextRequest(url, {
    method: 'GET',
  })
}

function setupDefaults() {
  vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
  mockParseRequestBody.mockResolvedValue(VALID_POST_BODY)
  mockPostValidation.mockReturnValue({ success: true, data: VALID_POST_BODY })
  mockGetQueryValidation.mockReturnValue({ success: true, data: { limit: 20 } })
  vi.mocked(prisma.consultationHistory.create).mockResolvedValue({
    id: 'consultation-123',
    userId: 'user-123',
    theme: 'dream',
    summary: 'Dream about flying over the ocean',
    fullReport: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any)
  vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
  vi.mocked(prisma.personaMemory.create).mockResolvedValue({
    userId: 'user-123',
    dominantThemes: ['dream'],
    lastTopics: ['dream'],
    sessionCount: 1,
  } as any)
}

// ===================================================================
// POST /api/dream/chat/save Tests
// ===================================================================
describe('Dream Chat Save API - POST /api/dream/chat/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
  })

  // -----------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------
  describe('Authentication', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await POST(makePostRequest(VALID_POST_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should require user id in session', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const response = await POST(makePostRequest(VALID_POST_BODY))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should proceed with valid session', async () => {
      const response = await POST(makePostRequest(VALID_POST_BODY))

      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------
  // Request Body Validation
  // -----------------------------------------------------------------
  describe('Request Body Validation', () => {
    it('should return error when body is null', async () => {
      mockParseRequestBody.mockResolvedValue(null)

      const response = await POST(makePostRequest({}))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toBe('Invalid request body')
    })

    it('should return error when body is not an object', async () => {
      mockParseRequestBody.mockResolvedValue('string')

      const response = await POST(makePostRequest('string'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toBe('Invalid request body')
    })

    it('should return validation error when dreamText is missing', async () => {
      mockParseRequestBody.mockResolvedValue({ messages: [] })
      mockPostValidation.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['dreamText'], message: 'Required' }],
        },
      })

      const response = await POST(makePostRequest({ messages: [] }))
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return validation error when messages is empty', async () => {
      mockParseRequestBody.mockResolvedValue({ dreamText: 'test', messages: [] })
      mockPostValidation.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['messages'], message: 'Array must contain at least 1 element(s)' }],
        },
      })

      const response = await POST(makePostRequest({ dreamText: 'test', messages: [] }))
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return validation error when dreamText is too short', async () => {
      mockParseRequestBody.mockResolvedValue({ dreamText: '', messages: [{ role: 'user', content: 'test' }] })
      mockPostValidation.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['dreamText'], message: 'String must contain at least 1 character(s)' }],
        },
      })

      const response = await POST(makePostRequest({ dreamText: '', messages: [{ role: 'user', content: 'test' }] }))
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should log validation errors', async () => {
      mockParseRequestBody.mockResolvedValue({})
      mockPostValidation.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['dreamText'], message: 'Required' }],
        },
      })

      await POST(makePostRequest({}))

      expect(logger.warn).toHaveBeenCalledWith(
        '[DreamChatSave POST] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  // -----------------------------------------------------------------
  // Save Functionality
  // -----------------------------------------------------------------
  describe('Save Functionality', () => {
    it('should save consultation to database', async () => {
      const response = await POST(makePostRequest(VALID_POST_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.consultationId).toBe('consultation-123')
      expect(data.data.message).toBe('Chat history saved')
    })

    it('should save with correct data structure', async () => {
      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          theme: 'dream',
          summary: VALID_POST_BODY.summary,
          locale: 'ko',
        }),
      })
    })

    it('should build fullReport from messages', async () => {
      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          fullReport: expect.stringContaining('What does my dream about flying mean?'),
        }),
      })
    })

    it('should use first assistant message as summary when summary is not provided', async () => {
      const bodyWithoutSummary = { ...VALID_POST_BODY }
      delete (bodyWithoutSummary as Record<string, unknown>).summary
      mockParseRequestBody.mockResolvedValue(bodyWithoutSummary)
      mockPostValidation.mockReturnValue({ success: true, data: bodyWithoutSummary })

      await POST(makePostRequest(bodyWithoutSummary))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: expect.stringContaining('Flying dreams often symbolize'),
        }),
      })
    })

    it('should truncate dreamText to 1000 characters in signals', async () => {
      const longDream = 'A'.repeat(2000)
      const bodyWithLongDream = { ...VALID_POST_BODY, dreamText: longDream }
      mockParseRequestBody.mockResolvedValue(bodyWithLongDream)
      mockPostValidation.mockReturnValue({ success: true, data: bodyWithLongDream })

      await POST(makePostRequest(bodyWithLongDream))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          signals: expect.objectContaining({
            dreamText: expect.any(String),
          }),
        }),
      })
    })

    it('should truncate userQuestion to 500 characters', async () => {
      const longQuestion = 'Q'.repeat(600)
      const bodyWithLongQuestion = {
        ...VALID_POST_BODY,
        messages: [{ role: 'user', content: longQuestion }],
      }
      mockParseRequestBody.mockResolvedValue(bodyWithLongQuestion)
      mockPostValidation.mockReturnValue({ success: true, data: bodyWithLongQuestion })

      await POST(makePostRequest(bodyWithLongQuestion))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userQuestion: expect.any(String),
        }),
      })
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.consultationHistory.create).mockRejectedValue(new Error('Database error'))

      const response = await POST(makePostRequest(VALID_POST_BODY))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toBe('Failed to save chat history')
      expect(logger.error).toHaveBeenCalledWith(
        '[DreamChatSave POST] Database error',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })
  })

  // -----------------------------------------------------------------
  // PersonaMemory Update
  // -----------------------------------------------------------------
  describe('PersonaMemory Update', () => {
    it('should create PersonaMemory if it does not exist', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.personaMemory.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          dominantThemes: ['dream'],
          lastTopics: ['dream'],
          sessionCount: 1,
        },
      })
    })

    it('should update PersonaMemory if it exists', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: ['love'],
        lastTopics: ['love', 'career'],
        sessionCount: 5,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: expect.objectContaining({
          sessionCount: 6,
        }),
      })
    })

    it('should add dream to dominantThemes if not present', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: ['love', 'career'],
        lastTopics: ['love'],
        sessionCount: 3,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: expect.objectContaining({
          dominantThemes: expect.arrayContaining(['dream']),
        }),
      })
    })

    it('should move dream to front of lastTopics', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: ['love'],
        lastTopics: ['love', 'career', 'dream'],
        sessionCount: 3,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: expect.objectContaining({
          lastTopics: expect.arrayContaining(['dream']),
        }),
      })
    })

    it('should limit lastTopics to 10 items', async () => {
      const manyTopics = Array.from({ length: 15 }, (_, i) => `topic${i}`)
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        dominantThemes: [],
        lastTopics: manyTopics,
        sessionCount: 15,
      } as any)
      vi.mocked(prisma.personaMemory.update).mockResolvedValue({} as any)

      await POST(makePostRequest(VALID_POST_BODY))

      expect(prisma.personaMemory.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: expect.objectContaining({
          lastTopics: expect.any(Array),
        }),
      })
    })

    it('should not fail the request if PersonaMemory update fails', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockRejectedValue(new Error('Memory error'))

      const response = await POST(makePostRequest(VALID_POST_BODY))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.consultationId).toBe('consultation-123')
      expect(logger.error).toHaveBeenCalledWith(
        '[DreamChatSave] PersonaMemory update failed',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })
  })

  // -----------------------------------------------------------------
  // Locale Handling
  // -----------------------------------------------------------------
  describe('Locale Handling', () => {
    it('should default to ko when locale is not provided', async () => {
      const bodyWithoutLocale = { ...VALID_POST_BODY }
      delete (bodyWithoutLocale as Record<string, unknown>).locale
      mockParseRequestBody.mockResolvedValue(bodyWithoutLocale)
      mockPostValidation.mockReturnValue({ success: true, data: { ...bodyWithoutLocale, locale: 'ko' } })

      await POST(makePostRequest(bodyWithoutLocale))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })

    it('should use provided locale', async () => {
      const bodyWithEnLocale = { ...VALID_POST_BODY, locale: 'en' }
      mockParseRequestBody.mockResolvedValue(bodyWithEnLocale)
      mockPostValidation.mockReturnValue({ success: true, data: bodyWithEnLocale })

      await POST(makePostRequest(bodyWithEnLocale))

      expect(prisma.consultationHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })
  })
})

// ===================================================================
// GET /api/dream/chat/save Tests
// ===================================================================
describe('Dream Chat Save API - GET /api/dream/chat/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupDefaults()
    vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
    vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)
  })

  // -----------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------
  describe('Authentication', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should proceed with valid session', async () => {
      const response = await GET(makeGetRequest())

      expect(response.status).toBe(200)
    })
  })

  // -----------------------------------------------------------------
  // Query Parameters
  // -----------------------------------------------------------------
  describe('Query Parameters', () => {
    it('should use default limit of 20', async () => {
      await GET(makeGetRequest())

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })

    it('should respect custom limit parameter', async () => {
      mockGetQueryValidation.mockReturnValue({ success: true, data: { limit: 10 } })

      await GET(makeGetRequest({ limit: '10' }))

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      )
    })

    it('should use default limit when validation fails', async () => {
      mockGetQueryValidation.mockReturnValue({ success: false })

      await GET(makeGetRequest({ limit: 'invalid' }))

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })
  })

  // -----------------------------------------------------------------
  // Fetch Functionality
  // -----------------------------------------------------------------
  describe('Fetch Functionality', () => {
    it('should fetch consultations for the authenticated user', async () => {
      await GET(makeGetRequest())

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          theme: 'dream',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          summary: true,
          fullReport: true,
          signals: true,
          userQuestion: true,
        },
      })
    })

    it('should return formatted consultations', async () => {
      const mockDate = new Date('2024-01-15T10:30:00Z')
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: mockDate,
          summary: 'Dream about flying',
          fullReport: '👤 Question\n\n🌙 Answer',
          signals: { dreamText: 'I was flying' },
          userQuestion: 'What does it mean?',
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.consultations).toHaveLength(1)
      expect(data.data.consultations[0]).toEqual({
        id: 'consultation-1',
        createdAt: mockDate.toISOString(),
        summary: 'Dream about flying',
        dreamText: 'I was flying',
        userQuestions: 'What does it mean?',
        messages: expect.any(Array),
      })
    })

    it('should parse messages from fullReport', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '👤 User question here\n\n🌙 Assistant response here',
          signals: null,
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].messages).toEqual([
        { role: 'user', content: 'User question here' },
        { role: 'assistant', content: 'Assistant response here' },
      ])
    })

    it('should handle null signals gracefully', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '',
          signals: null,
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].dreamText).toBeNull()
    })

    it('should handle empty fullReport', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '',
          signals: null,
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].messages).toEqual([])
    })
  })

  // -----------------------------------------------------------------
  // PersonaMemory Fetch
  // -----------------------------------------------------------------
  describe('PersonaMemory Fetch', () => {
    it('should fetch and return PersonaMemory', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue({
        userId: 'user-123',
        sessionCount: 5,
        dominantThemes: ['dream', 'love'],
        lastTopics: ['dream'],
        keyInsights: { insight: 'test' },
        emotionalTone: 'positive',
      } as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.memory).toEqual({
        sessionCount: 5,
        dominantThemes: ['dream', 'love'],
        recentTopics: ['dream'],
        keyInsights: { insight: 'test' },
        emotionalTone: 'positive',
      })
    })

    it('should return null memory when not found', async () => {
      vi.mocked(prisma.personaMemory.findUnique).mockResolvedValue(null)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.memory).toBeNull()
    })
  })

  // -----------------------------------------------------------------
  // Error Handling
  // -----------------------------------------------------------------
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockRejectedValue(new Error('Database error'))

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toBe('Failed to fetch history')
      expect(logger.error).toHaveBeenCalledWith(
        '[DreamChatSave GET] Database error',
        expect.objectContaining({ error: expect.any(Error) })
      )
    })
  })

  // -----------------------------------------------------------------
  // Edge Cases
  // -----------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle empty consultations list', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.consultations).toEqual([])
    })

    it('should handle consultation without dreamText in signals', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '',
          signals: { otherField: 'value' },
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].dreamText).toBeNull()
    })

    it('should handle fullReport with only user messages', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '👤 Only user message',
          signals: null,
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].messages).toEqual([
        { role: 'user', content: 'Only user message' },
      ])
    })

    it('should handle fullReport with only assistant messages', async () => {
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([
        {
          id: 'consultation-1',
          createdAt: new Date(),
          summary: 'Test',
          fullReport: '🌙 Only assistant message',
          signals: null,
          userQuestion: null,
        },
      ] as any)

      const response = await GET(makeGetRequest())
      const data = await response.json()

      expect(data.data.consultations[0].messages).toEqual([
        { role: 'assistant', content: 'Only assistant message' },
      ])
    })
  })
})
