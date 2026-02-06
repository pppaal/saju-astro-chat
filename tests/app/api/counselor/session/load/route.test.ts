/**
 * Comprehensive tests for /api/counselor/session/load
 * Tests GET operations, authentication, validation, session loading, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock functions that we can control per test
// ---------------------------------------------------------------------------
const mockFindFirst = vi.fn()
const mockSafeParse = vi.fn()

// ---------------------------------------------------------------------------
// Mock withApiMiddleware to pass through with test context
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        return NextResponse.json(
          { error: 'internal_error', message: 'Internal Server Error' },
          { status: 500 }
        )
      }

      if (!session?.user) {
        return NextResponse.json(
          { error: 'not_authenticated', message: 'Authentication required' },
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

      const result = await handler(req, context)

      if (result instanceof Response) {
        return result
      }

      return NextResponse.json(result, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
}))

// ---------------------------------------------------------------------------
// Mock next-auth
// ---------------------------------------------------------------------------
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findFirst: (...args: any[]) => mockFindFirst(...args),
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Zod validation schema
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/zodValidation', () => ({
  counselorSessionLoadQuerySchema: {
    safeParse: (data: any) => mockSafeParse(data),
  },
}))

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock HTTP status constants
// ---------------------------------------------------------------------------
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
}))

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------
import { GET } from '@/app/api/counselor/session/load/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const mockSession = {
  user: { id: 'test-user-id', email: 'test@example.com' },
  expires: '2025-12-31',
}

/** Create a valid Zod safeParse implementation */
function createValidSafeParse() {
  return (data: any) => {
    const errors: any[] = []

    // Validate theme - optional, max 50 characters
    if (data.theme !== undefined && typeof data.theme === 'string' && data.theme.length > 50) {
      errors.push({ path: ['theme'], message: 'theme must be at most 50 characters' })
    }

    // Validate sessionId - optional, max 100 characters
    if (
      data.sessionId !== undefined &&
      typeof data.sessionId === 'string' &&
      data.sessionId.length > 100
    ) {
      errors.push({ path: ['sessionId'], message: 'sessionId must be at most 100 characters' })
    }

    if (errors.length > 0) {
      return {
        success: false,
        error: { issues: errors },
      }
    }

    return {
      success: true,
      data: {
        theme: data.theme || 'chat',
        sessionId: data.sessionId,
      },
    }
  }
}

/** Shorthand to build a NextRequest for the load endpoint */
function makeRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/counselor/session/load')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, { method: 'GET' })
}

// ===========================================================================
// Tests
// ===========================================================================
describe('/api/counselor/session/load', () => {
  const mockUserId = 'test-user-id'

  beforeEach(() => {
    vi.clearAllMocks()
    // Set up default mock implementations
    mockSafeParse.mockImplementation(createValidSafeParse())
  })

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------
  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: null } as any)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
    })

    it('should return 500 when getServerSession throws', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('session error'))

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('internal_error')
    })

    it('should proceed when user is authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // Query Parameter Validation
  // -------------------------------------------------------------------------
  describe('Query Parameter Validation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should accept request with no query params (defaults theme to "chat")', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest())
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'chat',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should accept valid theme parameter', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'career' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'career',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should accept valid sessionId parameter', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: 'session-123' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-123',
          userId: mockUserId,
        },
      })
    })

    it('should return 400 when validation fails', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['theme'], message: 'Invalid theme' }] },
      })

      const response = await GET(makeRequest({ theme: 'a'.repeat(51) }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toBeDefined()
    })

    it('should reject theme exceeding 50 characters', async () => {
      const response = await GET(makeRequest({ theme: 'a'.repeat(51) }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should reject sessionId exceeding 100 characters', async () => {
      const response = await GET(makeRequest({ sessionId: 'a'.repeat(101) }))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should accept theme at exactly 50 characters', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'a'.repeat(50) }))

      expect(response.status).toBe(200)
    })

    it('should accept sessionId at exactly 100 characters', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: 'a'.repeat(100) }))

      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Session Loading - By Session ID
  // -------------------------------------------------------------------------
  describe('Load Session by Session ID', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should load specific session when sessionId is provided', async () => {
      const mockChatSession = {
        id: 'session-123',
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        summary: 'Test conversation summary',
        keyTopics: ['greeting', 'introduction'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-123' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('session-123')
      expect(data.messages).toEqual(mockChatSession.messages)
      expect(data.summary).toBe('Test conversation summary')
      expect(data.keyTopics).toEqual(['greeting', 'introduction'])
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-123',
          userId: mockUserId,
        },
      })
    })

    it('should return empty messages array when session not found by ID', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: 'nonexistent-session' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toEqual([])
      expect(data.sessionId).toBeUndefined()
    })

    it('should not return session if it belongs to another user', async () => {
      // Session exists but belongs to different user - findFirst won't find it
      // due to userId constraint
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: 'other-user-session' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toEqual([])
    })

    it('should prioritize sessionId over theme when both are provided', async () => {
      const mockChatSession = {
        id: 'session-456',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Test' }],
        summary: null,
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-456', theme: 'career' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('session-456')
      // Should query by sessionId, not theme
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-456',
          userId: mockUserId,
        },
      })
    })
  })

  // -------------------------------------------------------------------------
  // Session Loading - By Theme (Most Recent)
  // -------------------------------------------------------------------------
  describe('Load Session by Theme', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should load most recent session for theme when sessionId is not provided', async () => {
      const mockChatSession = {
        id: 'recent-session',
        userId: mockUserId,
        theme: 'love',
        messages: [
          { role: 'user', content: 'Tell me about love' },
          { role: 'assistant', content: 'Love is...' },
        ],
        summary: 'Love discussion',
        keyTopics: ['relationships'],
        updatedAt: new Date('2025-01-15'),
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ theme: 'love' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('recent-session')
      expect(data.messages).toEqual(mockChatSession.messages)
      expect(data.summary).toBe('Love discussion')
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'love',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should use default theme "chat" when no theme provided', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest())

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'chat',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should return empty messages when no session exists for theme', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'nonexistent-theme' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toEqual([])
      expect(data.sessionId).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Response Format
  // -------------------------------------------------------------------------
  describe('Response Format', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return full session data when session exists', async () => {
      const mockChatSession = {
        id: 'session-full',
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'Question 1', timestamp: 1234567890 },
          { role: 'assistant', content: 'Answer 1', timestamp: 1234567891 },
          { role: 'user', content: 'Question 2', timestamp: 1234567892 },
          { role: 'assistant', content: 'Answer 2', timestamp: 1234567893 },
        ],
        summary: 'A conversation about various topics',
        keyTopics: ['topic1', 'topic2', 'topic3'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-full' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        sessionId: 'session-full',
        messages: mockChatSession.messages,
        summary: 'A conversation about various topics',
        keyTopics: ['topic1', 'topic2', 'topic3'],
      })
    })

    it('should return only messages array when session not found', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'any' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ messages: [] })
      expect(Object.keys(data)).toHaveLength(1)
    })

    it('should handle session with null summary', async () => {
      const mockChatSession = {
        id: 'session-no-summary',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Hello' }],
        summary: null,
        keyTopics: ['greeting'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-no-summary' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toBeNull()
    })

    it('should handle session with null keyTopics', async () => {
      const mockChatSession = {
        id: 'session-no-topics',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Hello' }],
        summary: 'Brief chat',
        keyTopics: null,
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-no-topics' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keyTopics).toBeNull()
    })

    it('should handle session with empty messages array', async () => {
      const mockChatSession = {
        id: 'session-empty-messages',
        userId: mockUserId,
        messages: [],
        summary: null,
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-empty-messages' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessionId).toBe('session-empty-messages')
      expect(data.messages).toEqual([])
    })
  })

  // -------------------------------------------------------------------------
  // Different Themes
  // -------------------------------------------------------------------------
  describe('Different Themes', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    const themes = ['career', 'love', 'health', 'money', 'family', 'general', 'chat']

    themes.forEach((theme) => {
      it(`should accept theme "${theme}"`, async () => {
        mockFindFirst.mockResolvedValue(null)

        const response = await GET(makeRequest({ theme }))

        expect(response.status).toBe(200)
        expect(mockFindFirst).toHaveBeenCalledWith({
          where: {
            userId: mockUserId,
            theme,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        })
      })
    })

    it('should accept custom theme names', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'custom-user-theme' }))

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'custom-user-theme',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })
  })

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle database errors gracefully', async () => {
      mockFindFirst.mockRejectedValue(new Error('Database connection failed'))

      await expect(GET(makeRequest({ sessionId: 'any' }))).rejects.toThrow(
        'Database connection failed'
      )
    })

    it('should handle Prisma query errors', async () => {
      const prismaError = new Error('Invalid query')
      ;(prismaError as any).code = 'P2025'
      mockFindFirst.mockRejectedValue(prismaError)

      await expect(GET(makeRequest({ theme: 'career' }))).rejects.toThrow('Invalid query')
    })

    it('should handle timeout errors', async () => {
      mockFindFirst.mockRejectedValue(new Error('Query timeout'))

      await expect(GET(makeRequest())).rejects.toThrow('Query timeout')
    })
  })

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle sessionId with special characters', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: 'session-123_abc-def' }))

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-123_abc-def',
          userId: mockUserId,
        },
      })
    })

    it('should handle UUID-format sessionId', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ sessionId: uuid }))

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: uuid,
          userId: mockUserId,
        },
      })
    })

    it('should handle theme with hyphens', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'love-relationship' }))

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'love-relationship',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should handle theme with underscores', async () => {
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: 'focus_career' }))

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          theme: 'focus_career',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })

    it('should handle session with large message array', async () => {
      const largeMessages = Array.from({ length: 200 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i + 1}`,
        timestamp: Date.now() + i,
      }))

      const mockChatSession = {
        id: 'session-large',
        userId: mockUserId,
        messages: largeMessages,
        summary: 'A very long conversation',
        keyTopics: ['topic1', 'topic2', 'topic3', 'topic4', 'topic5'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-large' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toHaveLength(200)
    })

    it('should handle session with very long summary', async () => {
      const mockChatSession = {
        id: 'session-long-summary',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Hello' }],
        summary: 'A'.repeat(5000),
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-long-summary' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.summary).toHaveLength(5000)
    })

    it('should handle empty theme parameter', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { theme: 'chat', sessionId: undefined },
      })
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: '' }))

      expect(response.status).toBe(200)
    })

    it('should handle whitespace-only theme parameter', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { theme: 'chat', sessionId: undefined },
      })
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: '   ' }))

      expect(response.status).toBe(200)
    })

    it('should handle Korean theme names', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { theme: '연애운', sessionId: undefined },
      })
      mockFindFirst.mockResolvedValue(null)

      const response = await GET(makeRequest({ theme: '연애운' }))

      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Session with Different Message Roles
  // -------------------------------------------------------------------------
  describe('Message Roles', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle session with system messages', async () => {
      const mockChatSession = {
        id: 'session-with-system',
        userId: mockUserId,
        messages: [
          { role: 'system', content: 'You are a helpful counselor' },
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
        ],
        summary: null,
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-with-system' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toHaveLength(3)
      expect(data.messages[0].role).toBe('system')
    })

    it('should handle session with only user messages', async () => {
      const mockChatSession = {
        id: 'session-user-only',
        userId: mockUserId,
        messages: [
          { role: 'user', content: 'Message 1' },
          { role: 'user', content: 'Message 2' },
        ],
        summary: null,
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-user-only' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages.every((m: any) => m.role === 'user')).toBe(true)
    })

    it('should handle session with only assistant messages', async () => {
      const mockChatSession = {
        id: 'session-assistant-only',
        userId: mockUserId,
        messages: [
          { role: 'assistant', content: 'Welcome message' },
          { role: 'assistant', content: 'Follow-up message' },
        ],
        summary: null,
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-assistant-only' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages.every((m: any) => m.role === 'assistant')).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Key Topics Variations
  // -------------------------------------------------------------------------
  describe('Key Topics Variations', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle session with empty keyTopics array', async () => {
      const mockChatSession = {
        id: 'session-empty-topics',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Hello' }],
        summary: 'Brief chat',
        keyTopics: [],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-empty-topics' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keyTopics).toEqual([])
    })

    it('should handle session with many keyTopics', async () => {
      const manyTopics = Array.from({ length: 20 }, (_, i) => `topic-${i + 1}`)
      const mockChatSession = {
        id: 'session-many-topics',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'Hello' }],
        summary: 'Discussion',
        keyTopics: manyTopics,
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-many-topics' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keyTopics).toHaveLength(20)
    })

    it('should handle session with Korean keyTopics', async () => {
      const mockChatSession = {
        id: 'session-korean-topics',
        userId: mockUserId,
        messages: [{ role: 'user', content: '안녕하세요' }],
        summary: '상담 내용',
        keyTopics: ['연애', '직장', '건강'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'session-korean-topics' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.keyTopics).toEqual(['연애', '직장', '건강'])
    })
  })

  // -------------------------------------------------------------------------
  // Concurrent User Sessions
  // -------------------------------------------------------------------------
  describe('User Session Isolation', () => {
    it('should only return sessions for the authenticated user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockChatSession = {
        id: 'user-specific-session',
        userId: mockUserId,
        messages: [{ role: 'user', content: 'My message' }],
        summary: 'My summary',
        keyTopics: ['my-topic'],
      }
      mockFindFirst.mockResolvedValue(mockChatSession)

      const response = await GET(makeRequest({ sessionId: 'user-specific-session' }))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'user-specific-session',
          userId: mockUserId,
        },
      })
    })

    it('should use userId from session context', async () => {
      const differentUserSession = {
        user: { id: 'different-user-123', email: 'different@example.com' },
        expires: '2025-12-31',
      }
      vi.mocked(getServerSession).mockResolvedValue(differentUserSession as any)
      mockFindFirst.mockResolvedValue(null)

      await GET(makeRequest({ theme: 'career' }))

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          userId: 'different-user-123',
          theme: 'career',
        },
        orderBy: {
          updatedAt: 'desc',
        },
      })
    })
  })
})
