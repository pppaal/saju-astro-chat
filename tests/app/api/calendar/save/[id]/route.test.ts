/**
 * Comprehensive tests for /api/calendar/save/[id]
 * Tests GET/DELETE operations by ID, validation, authentication, and access control
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
    savedCalendarDate: {
      findFirst: vi.fn(),
      delete: vi.fn(),
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
  createValidationErrorResponse: vi.fn(
    (
      error: { issues: Array<{ path: string[]; message: string }> },
      options?: { route?: string }
    ) => {
      const { NextResponse } = require('next/server')
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            status: 400,
            details: error.issues.map((issue: { path: string[]; message: string }) => ({
              path: issue.path,
              message: issue.message,
            })),
          },
        },
        { status: 400 }
      )
    }
  ),
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
  apiSuccess: vi.fn(
    (data: unknown, options?: { status?: number; meta?: Record<string, unknown> }) => ({
      data,
      status: options?.status,
      meta: options?.meta,
    })
  ),
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

describe('/api/calendar/save/[id]', () => {
  const mockUserId = 'user-123'
  const mockSavedDateId = 'saved-date-456'
  const mockOtherUserId = 'other-user-789'

  const mockSavedDate = {
    id: mockSavedDateId,
    userId: mockUserId,
    date: '2024-06-15',
    year: 2024,
    grade: 4,
    score: 85,
    title: 'Great day for career advancement',
    description: 'Today is favorable for career-related activities',
    summary: 'Excellent energy for professional growth',
    categories: ['career', 'finance'],
    bestTimes: ['09:00-11:00', '14:00-16:00'],
    sajuFactors: { dayMaster: 'wood', element: 'fire' },
    astroFactors: { moon: 'Sagittarius', sun: 'Gemini' },
    recommendations: 'Focus on networking',
    warnings: 'Avoid conflicts',
    birthDate: '1990-05-20',
    birthTime: '14:30',
    birthPlace: 'Seoul',
    locale: 'ko',
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

  describe('GET /api/calendar/save/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/calendar/save/saved-date-456')
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
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

        const req = new Request('http://localhost:3000/api/calendar/save/saved-date-456')
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should reject empty ID parameter', async () => {
        const req = new Request('http://localhost:3000/api/calendar/save/')
        const routeContext = createRouteContext('')

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(400)
      })

      it('should reject ID longer than 100 characters', async () => {
        const longId = 'a'.repeat(101)
        const req = new Request(`http://localhost:3000/api/calendar/save/${longId}`)
        const routeContext = createRouteContext(longId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(400)
      })

      it('should accept valid ID at exactly 100 characters', async () => {
        const validId = 'a'.repeat(100)
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockSavedDate,
          id: validId,
        })

        const req = new Request(`http://localhost:3000/api/calendar/save/${validId}`)
        const routeContext = createRouteContext(validId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })
    })

    describe('Access Control', () => {
      it('should return 404 when calendar date does not exist', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/calendar/save/nonexistent-id')
        const routeContext = createRouteContext('nonexistent-id')

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when accessing another users calendar date', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/calendar/save/other-user-saved-date')
        const routeContext = createRouteContext('other-user-saved-date')

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.savedCalendarDate.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'other-user-saved-date',
            userId: mockUserId,
          },
        })
      })

      it('should only query for calendar dates belonging to authenticated user', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )

        const req = new Request(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`)
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        await GET(req, routeContext)

        expect(prisma.savedCalendarDate.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockSavedDateId,
            userId: mockUserId,
          },
        })
      })
    })

    describe('Successful Retrieval', () => {
      it('should return full calendar date details', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )

        const req = new Request(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`)
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.savedDate).toBeDefined()
        expect(result.data.savedDate.id).toBe(mockSavedDateId)
        expect(result.data.savedDate.date).toBe('2024-06-15')
        expect(result.data.savedDate.grade).toBe(4)
        expect(result.data.savedDate.score).toBe(85)
        expect(result.data.savedDate.title).toBe('Great day for career advancement')
      })

      it('should return all fields including optional ones', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )

        const req = new Request(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`)
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.savedDate.description).toBe(
          'Today is favorable for career-related activities'
        )
        expect(result.data.savedDate.summary).toBe('Excellent energy for professional growth')
        expect(result.data.savedDate.categories).toEqual(['career', 'finance'])
        expect(result.data.savedDate.bestTimes).toEqual(['09:00-11:00', '14:00-16:00'])
        expect(result.data.savedDate.sajuFactors).toEqual({ dayMaster: 'wood', element: 'fire' })
        expect(result.data.savedDate.astroFactors).toEqual({ moon: 'Sagittarius', sun: 'Gemini' })
        expect(result.data.savedDate.birthDate).toBe('1990-05-20')
        expect(result.data.savedDate.birthTime).toBe('14:30')
        expect(result.data.savedDate.birthPlace).toBe('Seoul')
      })

      it('should return calendar date with minimal fields', async () => {
        const minimalSavedDate = {
          id: 'minimal-id',
          userId: mockUserId,
          date: '2024-06-15',
          year: 2024,
          grade: 3,
          score: 70,
          title: 'Test day',
          description: '',
          summary: '',
          categories: [],
          bestTimes: [],
          sajuFactors: {},
          astroFactors: {},
          recommendations: '',
          warnings: '',
          birthDate: '',
          birthTime: '',
          birthPlace: '',
          locale: 'ko',
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-01'),
        }

        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          minimalSavedDate
        )

        const req = new Request('http://localhost:3000/api/calendar/save/minimal-id')
        const routeContext = createRouteContext('minimal-id')

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.savedDate.id).toBe('minimal-id')
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new Request(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`)
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle session fetch errors', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Session service unavailable')
        )

        const req = new Request(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`)
        const routeContext = createRouteContext(mockSavedDateId)

        const { GET } = await import('@/app/api/calendar/save/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('DELETE /api/calendar/save/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated delete requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save/saved-date-456', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })

      it('should reject delete requests without user id in session', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new NextRequest('http://localhost:3000/api/calendar/save/saved-date-456', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should reject empty ID parameter for delete', async () => {
        const req = new NextRequest('http://localhost:3000/api/calendar/save/', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('')

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(400)
      })

      it('should reject ID longer than 100 characters for delete', async () => {
        const longId = 'a'.repeat(101)
        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${longId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(longId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(400)
      })
    })

    describe('Access Control', () => {
      it('should return 404 when trying to delete non-existent calendar date', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save/nonexistent-id', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('nonexistent-id')

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when trying to delete another users calendar date', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest(
          'http://localhost:3000/api/calendar/save/other-user-saved-date',
          {
            method: 'DELETE',
          }
        )
        const routeContext = createRouteContext('other-user-saved-date')

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.savedCalendarDate.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'other-user-saved-date',
            userId: mockUserId,
          },
        })
      })

      it('should verify ownership before deletion', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        await DELETE(req, routeContext)

        // First verify ownership
        expect(prisma.savedCalendarDate.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockSavedDateId,
            userId: mockUserId,
          },
        })
        // Then delete
        expect(prisma.savedCalendarDate.delete).toHaveBeenCalledWith({
          where: { id: mockSavedDateId },
        })
      })

      it('should not call delete if ownership check fails', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save/not-owned', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('not-owned')

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        await DELETE(req, routeContext)

        expect(prisma.savedCalendarDate.delete).not.toHaveBeenCalled()
      })
    })

    describe('Successful Deletion', () => {
      it('should delete calendar date successfully', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.success).toBe(true)
      })

      it('should delete by ID after ownership verification', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        await DELETE(req, routeContext)

        expect(prisma.savedCalendarDate.delete).toHaveBeenCalledWith({
          where: { id: mockSavedDateId },
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors during ownership check', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle database errors during delete', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Delete operation failed')
        )

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle session fetch errors for delete', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Session service unavailable')
        )

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })

      it('should handle Prisma record not found error during delete', async () => {
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockSavedDate
        )
        const prismaError = new Error('Record not found') as Error & { code?: string }
        prismaError.code = 'P2025'
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
          prismaError
        )

        const req = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Idempotency', () => {
      it('should return 404 on second delete of same resource', async () => {
        // First delete succeeds
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          mockSavedDate
        )
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

        const req1 = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext1 = createRouteContext(mockSavedDateId)

        const { DELETE } = await import('@/app/api/calendar/save/[id]/route')
        const response1 = await DELETE(req1, routeContext1)
        expect(response1.status).toBe(200)

        // Second delete returns 404 since record no longer exists
        ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
          null
        )

        const req2 = new NextRequest(`http://localhost:3000/api/calendar/save/${mockSavedDateId}`, {
          method: 'DELETE',
        })
        const routeContext2 = createRouteContext(mockSavedDateId)

        const response2 = await DELETE(req2, routeContext2)
        expect(response2.status).toBe(404)
      })
    })
  })

  describe('Multi-User Isolation', () => {
    it('should isolate data between different users for GET', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const sharedDateId = 'shared-date-id'

      // User 1 has access
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockSavedDate,
        id: sharedDateId,
        userId: user1Id,
      })

      const { GET } = await import('@/app/api/calendar/save/[id]/route')

      const req1 = new Request(`http://localhost:3000/api/calendar/save/${sharedDateId}`)
      const routeContext1 = createRouteContext(sharedDateId)
      const response1 = await GET(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 does not have access to same ID
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req2 = new Request(`http://localhost:3000/api/calendar/save/${sharedDateId}`)
      const routeContext2 = createRouteContext(sharedDateId)
      const response2 = await GET(req2, routeContext2)
      expect(response2.status).toBe(404)
    })

    it('should isolate data between different users for DELETE', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const dateId = 'user1-date-id'

      // User 1 can delete their own data
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockSavedDate,
        id: dateId,
        userId: user1Id,
      })
      ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValueOnce({})

      const { DELETE } = await import('@/app/api/calendar/save/[id]/route')

      const req1 = new NextRequest(`http://localhost:3000/api/calendar/save/${dateId}`, {
        method: 'DELETE',
      })
      const routeContext1 = createRouteContext(dateId)
      const response1 = await DELETE(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 cannot delete User 1's data
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.savedCalendarDate.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req2 = new NextRequest(`http://localhost:3000/api/calendar/save/${dateId}`, {
        method: 'DELETE',
      })
      const routeContext2 = createRouteContext(dateId)
      const response2 = await DELETE(req2, routeContext2)
      expect(response2.status).toBe(404)

      // Verify delete was not called for user 2
      expect(prisma.savedCalendarDate.delete).toHaveBeenCalledTimes(1)
    })
  })
})
