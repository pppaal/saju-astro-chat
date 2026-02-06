/**
 * Comprehensive tests for /api/counselor/session/list
 * Tests GET endpoint for session listing with pagination/filtering
 * Tests DELETE endpoint for session deletion with ownership verification
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock functions that we can control per test
const mockFindMany = vi.fn()
const mockFindFirst = vi.fn()
const mockDelete = vi.fn()
const mockListSafeParse = vi.fn()
const mockDeleteSafeParse = vi.fn()

// Track whether handler was called with authenticated context
let handlerCalledWithAuth = false

// Mock withApiMiddleware to pass through with test context
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      handlerCalledWithAuth = true
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return NextResponse.json(result, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    counselorChatSession: {
      findMany: (...args: any[]) => mockFindMany(...args),
      findFirst: (...args: any[]) => mockFindFirst(...args),
      delete: (...args: any[]) => mockDelete(...args),
    },
  },
}))

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  counselorSessionListQuerySchema: {
    safeParse: (data: any) => mockListSafeParse(data),
  },
  counselorSessionDeleteQuerySchema: {
    safeParse: (data: any) => mockDeleteSafeParse(data),
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock HTTP status constants
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

// Helper function to create a valid list query safeParse implementation
function createValidListSafeParse() {
  return (data: any) => {
    const errors: any[] = []

    // Validate theme - optional, max 50 characters
    if (data.theme !== undefined && typeof data.theme === 'string' && data.theme.length > 50) {
      errors.push({ path: ['theme'], message: 'theme must be at most 50 characters' })
    }

    // Validate limit - optional, coerced number, min 1, max 50, default 20
    let limit = 20
    if (data.limit !== undefined) {
      const parsedLimit = parseInt(data.limit, 10)
      if (isNaN(parsedLimit)) {
        errors.push({ path: ['limit'], message: 'limit must be a number' })
      } else if (parsedLimit < 1 || parsedLimit > 50) {
        errors.push({ path: ['limit'], message: 'limit must be between 1 and 50' })
      } else {
        limit = parsedLimit
      }
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
        theme: data.theme,
        limit,
      },
    }
  }
}

// Helper function to create a valid delete query safeParse implementation
function createValidDeleteSafeParse() {
  return (data: any) => {
    const errors: any[] = []

    // Validate sessionId - required, string, min 1, max 100
    if (
      !data.sessionId ||
      typeof data.sessionId !== 'string' ||
      data.sessionId.trim().length === 0
    ) {
      errors.push({ path: ['sessionId'], message: 'sessionId is required' })
    } else if (data.sessionId.length > 100) {
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
        sessionId: data.sessionId.trim(),
      },
    }
  }
}

describe('/api/counselor/session/list', () => {
  const mockUserId = 'test-user-id'

  const mockSessionData = [
    {
      id: 'session-1',
      theme: 'career',
      locale: 'ko',
      messageCount: 5,
      summary: 'Career counseling session',
      keyTopics: ['job', 'interview'],
      createdAt: new Date('2024-01-15T10:00:00Z'),
      updatedAt: new Date('2024-01-15T12:00:00Z'),
      lastMessageAt: new Date('2024-01-15T11:30:00Z'),
    },
    {
      id: 'session-2',
      theme: 'love',
      locale: 'en',
      messageCount: 10,
      summary: 'Relationship advice',
      keyTopics: ['dating', 'communication'],
      createdAt: new Date('2024-01-14T08:00:00Z'),
      updatedAt: new Date('2024-01-14T10:00:00Z'),
      lastMessageAt: new Date('2024-01-14T09:45:00Z'),
    },
    {
      id: 'session-3',
      theme: 'career',
      locale: 'ko',
      messageCount: 3,
      summary: 'Salary negotiation tips',
      keyTopics: ['salary', 'negotiation'],
      createdAt: new Date('2024-01-13T14:00:00Z'),
      updatedAt: new Date('2024-01-13T15:00:00Z'),
      lastMessageAt: new Date('2024-01-13T14:50:00Z'),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    handlerCalledWithAuth = false
    // Set up default mock implementations
    mockListSafeParse.mockImplementation(createValidListSafeParse())
    mockDeleteSafeParse.mockImplementation(createValidDeleteSafeParse())
  })

  describe('GET - Authentication Requirements', () => {
    it('should require authentication via middleware', async () => {
      mockFindMany.mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      expect(handlerCalledWithAuth).toBe(true)
    })

    it('should pass authenticated user context to handler', async () => {
      mockFindMany.mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      // Verify the handler receives the userId and can use it for queries
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      )
    })
  })

  describe('GET - Query Parameter Validation', () => {
    it('should return 400 when theme exceeds 50 characters', async () => {
      const longTheme = 'a'.repeat(51)
      const req = new NextRequest(
        `http://localhost:3000/api/counselor/session/list?theme=${longTheme}`,
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
      expect(result.details).toBeDefined()
    })

    it('should return 400 when limit is not a valid number', async () => {
      mockListSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['limit'], message: 'limit must be a number' }] },
      })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?limit=invalid',
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })

    it('should return 400 when limit is less than 1', async () => {
      mockListSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['limit'], message: 'limit must be between 1 and 50' }] },
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=0', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })

    it('should return 400 when limit exceeds 50', async () => {
      mockListSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['limit'], message: 'limit must be between 1 and 50' }] },
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=51', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })

    it('should accept valid theme parameter', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0], mockSessionData[2]])

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?theme=career',
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            theme: 'career',
          }),
        })
      )
    })

    it('should accept valid limit parameter', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0]])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=5', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      )
    })
  })

  describe('GET - Session Listing', () => {
    it('should return empty array when user has no sessions', async () => {
      mockFindMany.mockResolvedValue([])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.sessions).toEqual([])
    })

    it('should return all sessions for user without filters', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.sessions).toHaveLength(3)
      expect(result.sessions[0].id).toBe('session-1')
    })

    it('should filter sessions by theme', async () => {
      const careerSessions = mockSessionData.filter((s) => s.theme === 'career')
      mockFindMany.mockResolvedValue(careerSessions)

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?theme=career',
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.sessions).toHaveLength(2)
      expect(result.sessions.every((s: any) => s.theme === 'career')).toBe(true)
    })

    it('should order sessions by updatedAt descending', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        })
      )
    })

    it('should use default limit of 20 when not specified', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      )
    })

    it('should select correct fields in response', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: {
            id: true,
            theme: true,
            locale: true,
            messageCount: true,
            summary: true,
            keyTopics: true,
            createdAt: true,
            updatedAt: true,
            lastMessageAt: true,
          },
        })
      )
    })

    it('should only return sessions owned by the authenticated user', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
          }),
        })
      )
    })
  })

  describe('GET - Pagination', () => {
    it('should respect limit parameter when specified', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0], mockSessionData[1]])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=2', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 2,
        })
      )
    })

    it('should accept minimum limit of 1', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0]])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=1', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1,
        })
      )
    })

    it('should accept maximum limit of 50', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list?limit=50', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      )
    })
  })

  describe('GET - Combined Filtering', () => {
    it('should apply both theme and limit filters', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0]])

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?theme=career&limit=1',
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            theme: 'career',
          }),
          take: 1,
        })
      )
    })
  })

  describe('GET - Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockFindMany.mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')

      await expect(GET(req)).rejects.toThrow('Database connection failed')
    })
  })

  describe('DELETE - Authentication Requirements', () => {
    it('should require authentication via middleware', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-1', userId: mockUserId })
      mockDelete.mockResolvedValue({ id: 'session-1' })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      await DELETE(req)

      expect(handlerCalledWithAuth).toBe(true)
    })

    it('should pass authenticated user context to DELETE handler', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-1', userId: mockUserId })
      mockDelete.mockResolvedValue({ id: 'session-1' })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      await DELETE(req)

      // Verify the handler receives the userId and uses it for ownership verification
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          userId: mockUserId,
        },
      })
    })
  })

  describe('DELETE - Query Parameter Validation', () => {
    it('should return 400 when sessionId is missing', async () => {
      mockDeleteSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['sessionId'], message: 'sessionId is required' }] },
      })

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'DELETE',
      })

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })

    it('should return 400 when sessionId is empty string', async () => {
      mockDeleteSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['sessionId'], message: 'sessionId is required' }] },
      })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })

    it('should return 400 when sessionId exceeds 100 characters', async () => {
      mockDeleteSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['sessionId'], message: 'sessionId must be at most 100 characters' }],
        },
      })

      const longSessionId = 'a'.repeat(101)
      const req = new NextRequest(
        `http://localhost:3000/api/counselor/session/list?sessionId=${longSessionId}`,
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toBe('validation_failed')
    })
  })

  describe('DELETE - Session Ownership Verification', () => {
    it('should return 404 when session does not exist', async () => {
      mockFindFirst.mockResolvedValue(null)

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=non-existent',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('session_not_found')
    })

    it('should return 404 when session belongs to another user', async () => {
      // When findFirst queries with userId, it returns null for mismatched ownership
      mockFindFirst.mockResolvedValue(null)

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=other-user-session',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.error).toBe('session_not_found')
    })

    it('should verify ownership with correct query parameters', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-1', userId: mockUserId })
      mockDelete.mockResolvedValue({ id: 'session-1' })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      await DELETE(req)

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'session-1',
          userId: mockUserId,
        },
      })
    })
  })

  describe('DELETE - Session Deletion', () => {
    it('should delete session when owned by user', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-1', userId: mockUserId })
      mockDelete.mockResolvedValue({ id: 'session-1' })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(mockDelete).toHaveBeenCalledWith({
        where: { id: 'session-1' },
      })
    })

    it('should return success true on successful deletion', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-2', userId: mockUserId })
      mockDelete.mockResolvedValue({ id: 'session-2' })

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-2',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toEqual({ success: true })
    })
  })

  describe('DELETE - Error Handling', () => {
    it('should handle database errors during ownership check', async () => {
      mockFindFirst.mockRejectedValue(new Error('Database connection failed'))

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')

      await expect(DELETE(req)).rejects.toThrow('Database connection failed')
    })

    it('should handle database errors during deletion', async () => {
      mockFindFirst.mockResolvedValue({ id: 'session-1', userId: mockUserId })
      mockDelete.mockRejectedValue(new Error('Delete operation failed'))

      const req = new NextRequest(
        'http://localhost:3000/api/counselor/session/list?sessionId=session-1',
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')

      await expect(DELETE(req)).rejects.toThrow('Delete operation failed')
    })
  })

  describe('DELETE - Edge Cases', () => {
    it('should handle sessionId with exactly 100 characters', async () => {
      const sessionId = 'a'.repeat(100)
      mockFindFirst.mockResolvedValue({ id: sessionId, userId: mockUserId })
      mockDelete.mockResolvedValue({ id: sessionId })

      const req = new NextRequest(
        `http://localhost:3000/api/counselor/session/list?sessionId=${sessionId}`,
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)

      expect(response.status).toBe(200)
    })

    it('should handle sessionId with special characters', async () => {
      const sessionId = 'session-with-special_chars.123'
      mockFindFirst.mockResolvedValue({ id: sessionId, userId: mockUserId })
      mockDelete.mockResolvedValue({ id: sessionId })

      const req = new NextRequest(
        `http://localhost:3000/api/counselor/session/list?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' }
      )

      const { DELETE } = await import('@/app/api/counselor/session/list/route')
      const response = await DELETE(req)

      expect(response.status).toBe(200)
    })
  })

  describe('GET - Response Structure', () => {
    it('should return sessions with all expected fields', async () => {
      mockFindMany.mockResolvedValue([mockSessionData[0]])

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.sessions[0]).toHaveProperty('id')
      expect(result.sessions[0]).toHaveProperty('theme')
      expect(result.sessions[0]).toHaveProperty('locale')
      expect(result.sessions[0]).toHaveProperty('messageCount')
      expect(result.sessions[0]).toHaveProperty('summary')
      expect(result.sessions[0]).toHaveProperty('keyTopics')
      expect(result.sessions[0]).toHaveProperty('createdAt')
      expect(result.sessions[0]).toHaveProperty('updatedAt')
      expect(result.sessions[0]).toHaveProperty('lastMessageAt')
    })

    it('should return sessions in wrapper object', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)
      const result = await response.json()

      expect(result).toHaveProperty('sessions')
      expect(Array.isArray(result.sessions)).toBe(true)
    })
  })

  describe('GET - Theme Filtering Edge Cases', () => {
    it('should not filter by theme when undefined', async () => {
      mockFindMany.mockResolvedValue(mockSessionData)

      const req = new NextRequest('http://localhost:3000/api/counselor/session/list', {
        method: 'GET',
      })

      const { GET } = await import('@/app/api/counselor/session/list/route')
      await GET(req)

      // When theme is undefined, it should not be included in where clause
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: mockUserId,
          },
        })
      )
    })

    it('should accept valid theme at maximum length (50 chars)', async () => {
      const maxTheme = 'a'.repeat(50)
      mockFindMany.mockResolvedValue([])

      const req = new NextRequest(
        `http://localhost:3000/api/counselor/session/list?theme=${maxTheme}`,
        { method: 'GET' }
      )

      const { GET } = await import('@/app/api/counselor/session/list/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
    })

    it('should handle different theme values', async () => {
      const themes = ['career', 'love', 'health', 'money', 'family', 'chat']

      for (const theme of themes) {
        mockFindMany.mockResolvedValue([])

        const req = new NextRequest(
          `http://localhost:3000/api/counselor/session/list?theme=${theme}`,
          { method: 'GET' }
        )

        const { GET } = await import('@/app/api/counselor/session/list/route')
        const response = await GET(req)

        expect(response.status).toBe(200)
      }
    })
  })
})
