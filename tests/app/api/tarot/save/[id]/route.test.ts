/**
 * Comprehensive tests for /api/tarot/save/[id]
 * Tests GET operation for retrieving a saved tarot reading by ID
 * Tests authentication, validation, access control, and error handling
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

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
    tarotReading: {
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
            {
              success: false,
              error: { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 },
            },
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

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

describe('/api/tarot/save/[id]', () => {
  const mockUserId = 'user-123'
  const mockReadingId = 'reading-456'

  const mockTarotReading = {
    id: mockReadingId,
    userId: mockUserId,
    question: 'What does my future hold?',
    theme: 'Future',
    spreadId: 'three-card',
    spreadTitle: 'Three Card Spread',
    cards: [
      {
        cardId: 'major-0',
        name: 'The Fool',
        image: '/cards/fool.jpg',
        isReversed: false,
        position: 'Past',
      },
      {
        cardId: 'major-1',
        name: 'The Magician',
        image: '/cards/magician.jpg',
        isReversed: true,
        position: 'Present',
      },
      {
        cardId: 'major-2',
        name: 'The High Priestess',
        image: '/cards/high-priestess.jpg',
        isReversed: false,
        position: 'Future',
      },
    ],
    overallMessage: 'A journey of transformation awaits you.',
    cardInsights: [
      {
        position: 'Past',
        card_name: 'The Fool',
        is_reversed: false,
        interpretation: 'New beginnings and innocence.',
      },
      {
        position: 'Present',
        card_name: 'The Magician',
        is_reversed: true,
        interpretation: 'Manipulation or untapped potential.',
      },
      {
        position: 'Future',
        card_name: 'The High Priestess',
        is_reversed: false,
        interpretation: 'Intuition and hidden knowledge.',
      },
    ],
    guidance: 'Trust your intuition and embrace new beginnings.',
    affirmation: 'I am open to the wisdom of the universe.',
    source: 'standalone',
    locale: 'ko',
    createdAt: new Date('2024-06-01T10:00:00Z'),
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

  describe('GET /api/tarot/save/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
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

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(401)
      })

      it('should reject requests with empty session user', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: {},
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(401)
      })

      it('should handle session fetch errors', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Session service unavailable')
        )

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Parameter Validation', () => {
      it('should reject empty ID parameter', async () => {
        const req = new Request('http://localhost:3000/api/tarot/save/')
        const routeContext = createRouteContext('')

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(400)
      })

      it('should reject ID longer than 100 characters', async () => {
        const longId = 'a'.repeat(101)
        const req = new Request(`http://localhost:3000/api/tarot/save/${longId}`)
        const routeContext = createRouteContext(longId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(400)
      })

      it('should accept valid ID at exactly 100 characters', async () => {
        const validId = 'a'.repeat(100)
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockTarotReading,
          id: validId,
        })

        const req = new Request(`http://localhost:3000/api/tarot/save/${validId}`)
        const routeContext = createRouteContext(validId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })

      it('should accept CUID format IDs', async () => {
        const cuidId = 'clxyz1234567890abcdef'
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockTarotReading,
          id: cuidId,
        })

        const req = new Request(`http://localhost:3000/api/tarot/save/${cuidId}`)
        const routeContext = createRouteContext(cuidId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })

      it('should accept UUID format IDs', async () => {
        const uuidId = '550e8400-e29b-41d4-a716-446655440000'
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockTarotReading,
          id: uuidId,
        })

        const req = new Request(`http://localhost:3000/api/tarot/save/${uuidId}`)
        const routeContext = createRouteContext(uuidId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })

      it('should handle IDs with special characters (hyphens)', async () => {
        const specialId = 'reading-123-abc-xyz'
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockTarotReading,
          id: specialId,
        })

        const req = new Request(`http://localhost:3000/api/tarot/save/${specialId}`)
        const routeContext = createRouteContext(specialId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })
    })

    describe('Access Control', () => {
      it('should return 404 when reading does not exist', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/tarot/save/nonexistent-id')
        const routeContext = createRouteContext('nonexistent-id')

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when accessing another users reading', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/tarot/save/other-user-reading')
        const routeContext = createRouteContext('other-user-reading')

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.tarotReading.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'other-user-reading',
            userId: mockUserId,
          },
        })
      })

      it('should only query for readings belonging to authenticated user', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        await GET(req, routeContext)

        expect(prisma.tarotReading.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockReadingId,
            userId: mockUserId,
          },
        })
      })

      it('should filter by both id AND userId in query', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/tarot/save/reading-789')
        const routeContext = createRouteContext('reading-789')

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        await GET(req, routeContext)

        expect(prisma.tarotReading.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'reading-789',
            userId: mockUserId,
          },
        })
      })
    })

    describe('Successful Retrieval', () => {
      it('should return full reading details', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.success).toBe(true)
        expect(result.data.reading).toBeDefined()
        expect(result.data.reading.id).toBe(mockReadingId)
        expect(result.data.reading.question).toBe('What does my future hold?')
        expect(result.data.reading.theme).toBe('Future')
        expect(result.data.reading.spreadId).toBe('three-card')
        expect(result.data.reading.spreadTitle).toBe('Three Card Spread')
      })

      it('should return all card data', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.reading.cards).toBeDefined()
        expect(result.data.reading.cards).toHaveLength(3)
        expect(result.data.reading.cards[0].name).toBe('The Fool')
        expect(result.data.reading.cards[1].name).toBe('The Magician')
        expect(result.data.reading.cards[2].name).toBe('The High Priestess')
      })

      it('should return interpretation data', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.reading.overallMessage).toBe('A journey of transformation awaits you.')
        expect(result.data.reading.cardInsights).toBeDefined()
        expect(result.data.reading.guidance).toBe(
          'Trust your intuition and embrace new beginnings.'
        )
        expect(result.data.reading.affirmation).toBe('I am open to the wisdom of the universe.')
      })

      it('should return metadata fields', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.reading.source).toBe('standalone')
        expect(result.data.reading.locale).toBe('ko')
        expect(result.data.reading.createdAt).toBeDefined()
      })

      it('should return reading with minimal fields', async () => {
        const minimalReading = {
          id: 'minimal-id',
          userId: mockUserId,
          question: 'Simple question',
          theme: null,
          spreadId: 'single-card',
          spreadTitle: 'Single Card',
          cards: [{ cardId: 'major-0', name: 'The Fool', isReversed: false }],
          overallMessage: null,
          cardInsights: null,
          guidance: null,
          affirmation: null,
          source: 'standalone',
          locale: 'ko',
          createdAt: new Date('2024-06-01'),
        }

        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(minimalReading)

        const req = new Request('http://localhost:3000/api/tarot/save/minimal-id')
        const routeContext = createRouteContext('minimal-id')

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.reading.id).toBe('minimal-id')
        expect(result.data.reading.question).toBe('Simple question')
      })

      it('should return reading from counselor source', async () => {
        const counselorReading = {
          ...mockTarotReading,
          source: 'counselor',
          counselorSessionId: 'session-123',
        }

        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(counselorReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.reading.source).toBe('counselor')
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error.code).toBe('DATABASE_ERROR')
      })

      it('should log errors when database throws', async () => {
        const dbError = new Error('Database connection lost')
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(dbError)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        await GET(req, routeContext)

        expect(logger.error).toHaveBeenCalledWith('[Tarot Get Error]:', expect.any(Error))
      })

      it('should handle Prisma-specific errors', async () => {
        const prismaError = new Error('PrismaClientKnownRequestError') as Error & { code?: string }
        prismaError.code = 'P2025'
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle network timeout errors', async () => {
        const timeoutError = new Error('Connection timeout')
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(timeoutError)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Response Format', () => {
      it('should return success: true in response body', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.success).toBe(true)
      })

      it('should serialize Date objects correctly', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        // Date should be serialized as ISO string
        expect(typeof result.data.reading.createdAt).toBe('string')
        expect(result.data.reading.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}/)
      })

      it('should include reading nested under data key', async () => {
        ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockTarotReading)

        const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
        const routeContext = createRouteContext(mockReadingId)

        const { GET } = await import('@/app/api/tarot/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result).toHaveProperty('data')
        expect(result.data).toHaveProperty('reading')
      })
    })
  })

  describe('Multi-User Isolation', () => {
    it('should isolate data between different users', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const readingId = 'shared-reading-id'

      // User 1 has access to their reading
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockTarotReading,
        id: readingId,
        userId: user1Id,
      })

      const { GET } = await import('@/app/api/tarot/save/[id]/route')

      const req1 = new Request(`http://localhost:3000/api/tarot/save/${readingId}`)
      const routeContext1 = createRouteContext(readingId)
      const response1 = await GET(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 does not have access to the same reading
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req2 = new Request(`http://localhost:3000/api/tarot/save/${readingId}`)
      const routeContext2 = createRouteContext(readingId)
      const response2 = await GET(req2, routeContext2)
      expect(response2.status).toBe(404)
    })

    it('should query with correct userId for each authenticated user', async () => {
      const userA = 'user-a'
      const userB = 'user-b'

      // User A makes request
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: userA },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')

      const reqA = new Request('http://localhost:3000/api/tarot/save/reading-1')
      await GET(reqA, createRouteContext('reading-1'))

      expect(prisma.tarotReading.findFirst).toHaveBeenLastCalledWith({
        where: {
          id: 'reading-1',
          userId: userA,
        },
      })

      // User B makes request
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: userB },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const reqB = new Request('http://localhost:3000/api/tarot/save/reading-2')
      await GET(reqB, createRouteContext('reading-2'))

      expect(prisma.tarotReading.findFirst).toHaveBeenLastCalledWith({
        where: {
          id: 'reading-2',
          userId: userB,
        },
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle reading with empty cards array gracefully', async () => {
      const readingWithEmptyCards = {
        ...mockTarotReading,
        cards: [],
      }

      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        readingWithEmptyCards
      )

      const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.reading.cards).toEqual([])
    })

    it('should handle reading with null optional fields', async () => {
      const readingWithNulls = {
        ...mockTarotReading,
        theme: null,
        overallMessage: null,
        cardInsights: null,
        guidance: null,
        affirmation: null,
      }

      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(readingWithNulls)

      const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.reading.theme).toBeNull()
      expect(result.data.reading.overallMessage).toBeNull()
    })

    it('should handle reading with very long content', async () => {
      const readingWithLongContent = {
        ...mockTarotReading,
        question: 'a'.repeat(1000),
        overallMessage: 'b'.repeat(5000),
        guidance: 'c'.repeat(2000),
      }

      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        readingWithLongContent
      )

      const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.reading.question.length).toBe(1000)
      expect(result.data.reading.overallMessage.length).toBe(5000)
    })

    it('should handle reading with unicode characters', async () => {
      const readingWithUnicode = {
        ...mockTarotReading,
        question: '미래에 대해 알고 싶습니다 🔮',
        overallMessage: '변화의 여정이 당신을 기다리고 있습니다 ✨',
      }

      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        readingWithUnicode
      )

      const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.reading.question).toContain('미래에 대해')
      expect(result.data.reading.overallMessage).toContain('변화의 여정')
    })

    it('should handle reading with complex cardInsights structure', async () => {
      const readingWithComplexInsights = {
        ...mockTarotReading,
        cardInsights: [
          {
            position: 'Past',
            card_name: 'The Fool',
            is_reversed: false,
            interpretation: 'New beginnings.',
            additional_data: { keywords: ['innocence', 'freedom'] },
          },
        ],
      }

      ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        readingWithComplexInsights
      )

      const req = new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`)
      const routeContext = createRouteContext(mockReadingId)

      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      const response = await GET(req, routeContext)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.data.reading.cardInsights).toBeDefined()
    })
  })

  describe('Route Configuration', () => {
    it('should export GET as a function', async () => {
      const { GET } = await import('@/app/api/tarot/save/[id]/route')
      expect(typeof GET).toBe('function')
    })
  })
})
