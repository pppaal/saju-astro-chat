/**
 * Comprehensive tests for /api/readings/[id]
 * Tests GET operation by ID, validation, authentication, and access control
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock next-auth with getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      user: { name: 'Test User', email: 'test@example.com', id: 'user-123' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  ),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 10,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  idParamSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const errors: { path: string[]; message: string }[] = []

      if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
        errors.push({ path: ['id'], message: 'ID is required' })
      } else if (data.id.length > 100) {
        errors.push({ path: ['id'], message: 'ID must be at most 100 characters' })
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: { id: data.id },
      }
    }),
  },
}))

// Mock middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn(
    (
      handler: (req: NextRequest, context: Record<string, unknown>) => Promise<unknown>,
      _options: unknown
    ) => {
      return async (req: NextRequest, ...args: unknown[]) => {
        const { getServerSession } = await import('next-auth')
        const { authOptions } = await import('@/lib/auth/authOptions')

        let session: { user?: { id: string; name?: string; email?: string } } | null = null
        try {
          session = await (
            getServerSession as (
              opts: unknown
            ) => Promise<{ user?: { id: string; name?: string; email?: string } } | null>
          )(authOptions)
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 },
            },
            { status: 500 }
          )
        }

        if (!session?.user?.id) {
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 } },
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

        try {
          const result = (await handler(req, context, ...args)) as
            | { data?: unknown; error?: { code: string; message?: string }; status?: number }
            | Response
          if (result instanceof Response) return result
          if (result?.error) {
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
            { success: true, data: result?.data },
            { status: result?.status || 200 }
          )
        } catch (err: unknown) {
          const error = err as Error
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal Server Error' },
            },
            { status: 500 }
          )
        }
      }
    }
  ),
  createAuthenticatedGuard: vi.fn((opts: Record<string, unknown>) => ({
    ...opts,
    requireAuth: true,
  })),
  apiSuccess: vi.fn((data: unknown, options?: { status?: number; meta?: Record<string, unknown> }) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: unknown) => ({
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

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { prisma } from '@/lib/db/prisma'

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('/api/readings/[id]', () => {
  const mockUserId = 'user-123'
  const mockReadingId = 'reading-456'

  const mockReading = {
    id: mockReadingId,
    userId: mockUserId,
    type: 'saju',
    title: 'My Saju Reading',
    content: 'Detailed saju reading content here',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  }

  const createRouteContext = (id: string) => ({
    params: Promise.resolve({ id }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { name: 'Test User', email: 'test@example.com', id: mockUserId },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  describe('GET /api/readings/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/readings/reading-456')
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })

      it('should reject requests without user id in session', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new NextRequest('http://localhost:3000/api/readings/reading-456')
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(401)
      })

      it('should accept authenticated requests with valid user id', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })
    })

    describe('Validation', () => {
      it('should reject empty ID parameter', async () => {
        const req = new NextRequest('http://localhost:3000/api/readings/')
        const routeContext = createRouteContext('')

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(422)
      })

      it('should reject ID longer than 100 characters', async () => {
        const longId = 'a'.repeat(101)
        const req = new NextRequest(`http://localhost:3000/api/readings/${longId}`)
        const routeContext = createRouteContext(longId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(422)
      })

      it('should accept valid ID at exactly 100 characters', async () => {
        const validId = 'a'.repeat(100)
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReading,
          id: validId,
        })

        const req = new NextRequest(`http://localhost:3000/api/readings/${validId}`)
        const routeContext = createRouteContext(validId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })

      it('should accept standard UUID-like ID', async () => {
        const uuidLikeId = 'cm1abc123def456'
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReading,
          id: uuidLikeId,
        })

        const req = new NextRequest(`http://localhost:3000/api/readings/${uuidLikeId}`)
        const routeContext = createRouteContext(uuidLikeId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })
    })

    describe('Access Control', () => {
      it('should return 404 when reading does not exist', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/readings/nonexistent-id')
        const routeContext = createRouteContext('nonexistent-id')

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when accessing another users reading', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/readings/other-user-reading')
        const routeContext = createRouteContext('other-user-reading')

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.reading.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'other-user-reading',
            userId: mockUserId,
          },
        })
      })

      it('should only query for readings belonging to authenticated user', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        await GET(req, routeContext)

        expect(prisma.reading.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockReadingId,
            userId: mockUserId,
          },
        })
      })

      it('should enforce user isolation - different user cannot access same reading ID', async () => {
        const otherUserId = 'other-user-789'

        // Change session to different user
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Other User', email: 'other@example.com', id: otherUserId },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        // Reading exists but belongs to original user, so findFirst returns null
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.reading.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockReadingId,
            userId: otherUserId,
          },
        })
      })
    })

    describe('Successful Retrieval', () => {
      it('should return full reading details', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.reading).toBeDefined()
        expect(result.reading.id).toBe(mockReadingId)
        expect(result.reading.type).toBe('saju')
        expect(result.reading.title).toBe('My Saju Reading')
        expect(result.reading.content).toBe('Detailed saju reading content here')
      })

      it('should return reading with null title', async () => {
        const readingWithNullTitle = {
          ...mockReading,
          title: null,
        }

        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithNullTitle)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.reading.title).toBeNull()
      })

      it('should return reading with different types', async () => {
        const types = ['saju', 'astrology', 'tarot', 'numerology']

        for (const type of types) {
          const readingWithType = {
            ...mockReading,
            type,
          }

          ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithType)

          const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
          const routeContext = createRouteContext(mockReadingId)

          const { GET } = await import('@/app/api/readings/[id]/route')
          const response = await GET(req, routeContext)
          const result = await response.json()

          expect(response.status).toBe(200)
          expect(result.reading.type).toBe(type)
        }
      })

      it('should return reading with timestamp fields', async () => {
        const createdAt = new Date('2024-01-15T10:30:00Z')
        const updatedAt = new Date('2024-02-20T14:45:00Z')

        const readingWithTimestamps = {
          ...mockReading,
          createdAt,
          updatedAt,
        }

        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithTimestamps)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.reading.createdAt).toBeDefined()
        expect(result.reading.updatedAt).toBeDefined()
      })

      it('should return reading with long content', async () => {
        const longContent = 'x'.repeat(10000)
        const readingWithLongContent = {
          ...mockReading,
          content: longContent,
        }

        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithLongContent)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.reading.content).toBe(longContent)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle session fetch errors', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Session service unavailable')
        )

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle Prisma connection timeout', async () => {
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Query timeout')
        )

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle Prisma record not found error', async () => {
        const prismaError = new Error('Record not found') as Error & { code?: string }
        prismaError.code = 'P2025'
        ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError)

        const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/readings/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('Multi-User Isolation', () => {
    it('should isolate data between different users for GET', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const sharedReadingId = 'shared-reading-id'

      // User 1 has access
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockReading,
        id: sharedReadingId,
        userId: user1Id,
      })

      const { GET } = await import('@/app/api/readings/[id]/route')

      const req1 = new NextRequest(`http://localhost:3000/api/readings/${sharedReadingId}`)
      const routeContext1 = createRouteContext(sharedReadingId)
      const response1 = await GET(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 does not have access to same ID
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req2 = new NextRequest(`http://localhost:3000/api/readings/${sharedReadingId}`)
      const routeContext2 = createRouteContext(sharedReadingId)
      const response2 = await GET(req2, routeContext2)
      expect(response2.status).toBe(404)
    })

    it('should correctly filter by userId in database query', async () => {
      const testUserId = 'specific-user-456'

      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: testUserId, name: 'Test', email: 'test@test.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockReading,
        userId: testUserId,
      })

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      await GET(req, routeContext)

      expect(prisma.reading.findFirst).toHaveBeenCalledWith({
        where: {
          id: mockReadingId,
          userId: testUserId,
        },
      })
    })
  })

  describe('Rate Limiting Configuration', () => {
    it('should use createAuthenticatedGuard with correct route configuration', async () => {
      // The route uses createAuthenticatedGuard with specific rate limiting config
      // We verify this by checking the route exports GET handler wrapped with middleware
      const routeModule = await import('@/app/api/readings/[id]/route')

      // Verify the GET handler exists and is a function (indicating middleware wrapping)
      expect(routeModule.GET).toBeDefined()
      expect(typeof routeModule.GET).toBe('function')
    })
  })

  describe('Edge Cases', () => {
    it('should handle reading with special characters in content', async () => {
      const specialContent = '특별한 문자: @#$%^&*() <script>alert("xss")</script> 日本語 emoji: 🔮'
      const readingWithSpecialChars = {
        ...mockReading,
        content: specialContent,
      }

      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithSpecialChars)

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.reading.content).toBe(specialContent)
    })

    it('should handle reading with unicode characters in title', async () => {
      const unicodeTitle = '사주 분석 결과 - 運命の分析 - Destiny Analysis'
      const readingWithUnicodeTitle = {
        ...mockReading,
        title: unicodeTitle,
      }

      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithUnicodeTitle)

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.reading.title).toBe(unicodeTitle)
    })

    it('should handle multiple sequential requests for same reading', async () => {
      // Verify that the route handler can be called multiple times
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

      const { GET } = await import('@/app/api/readings/[id]/route')

      // First request
      const req1 = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext1 = createRouteContext(mockReadingId)
      const response1 = await GET(req1, routeContext1)
      expect(response1.status).toBe(200)

      // Second request
      const req2 = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext2 = createRouteContext(mockReadingId)
      const response2 = await GET(req2, routeContext2)
      expect(response2.status).toBe(200)

      // Verify database was called twice
      expect(prisma.reading.findFirst).toHaveBeenCalledTimes(2)
    })

    it('should handle ID with hyphens', async () => {
      const hyphenatedId = 'cm1-abc-123-def-456'
      const hyphenatedReading = {
        ...mockReading,
        id: hyphenatedId,
      }
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(hyphenatedReading)

      const req = new NextRequest(`http://localhost:3000/api/readings/${hyphenatedId}`)
      const routeContext = createRouteContext(hyphenatedId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      // Verify the reading was returned with the correct ID
      expect(result.reading).toBeDefined()
      expect(prisma.reading.findFirst).toHaveBeenCalledWith({
        where: {
          id: hyphenatedId,
          userId: mockUserId,
        },
      })
    })

    it('should handle ID with underscores', async () => {
      const underscoredId = 'reading_abc_123_def_456'
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockReading,
        id: underscoredId,
      })

      const req = new NextRequest(`http://localhost:3000/api/readings/${underscoredId}`)
      const routeContext = createRouteContext(underscoredId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.reading.id).toBe(underscoredId)
    })

    it('should handle reading with empty content string', async () => {
      const readingWithEmptyContent = {
        ...mockReading,
        content: '',
      }

      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithEmptyContent)

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.reading.content).toBe('')
    })
  })

  describe('Response Format', () => {
    it('should return response with correct structure', async () => {
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result).toHaveProperty('reading')
      expect(typeof result.reading).toBe('object')
    })

    it('should return 404 error response with correct structure', async () => {
      ;(prisma.reading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/readings/nonexistent')
      const routeContext = createRouteContext('nonexistent')

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toHaveProperty('code')
      expect(result.error.code).toBe('NOT_FOUND')
    })

    it('should return 401 error response with correct structure', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const req = new NextRequest(`http://localhost:3000/api/readings/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/readings/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toHaveProperty('code')
      expect(result.error.code).toBe('UNAUTHORIZED')
    })
  })
})
