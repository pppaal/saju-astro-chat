import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock middleware as passthrough - must be before route import
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

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    consultationHistory: {
      findMany: vi.fn(),
      count: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/api/zodValidation', () => ({
  dreamHistoryQuerySchema: {
    safeParse: vi.fn((data: any) => {
      const result: any = {}

      // limit: coerce number, int, min(1), max(100), default(20)
      if (data.limit !== undefined) {
        const num = Number(data.limit)
        if (isNaN(num) || !isFinite(num)) {
          result.limit = 20
        } else {
          result.limit = Math.max(1, Math.min(100, Math.floor(num)))
        }
      } else {
        result.limit = 20
      }

      // offset: coerce number, int, min(0), default(0)
      if (data.offset !== undefined) {
        const num = Number(data.offset)
        if (isNaN(num) || !isFinite(num)) {
          result.offset = 0
        } else {
          result.offset = Math.max(0, Math.floor(num))
        }
      } else {
        result.offset = 0
      }

      return { success: true, data: result }
    }),
  },
  dreamHistoryDeleteQuerySchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.id || typeof data.id !== 'string' || data.id.length === 0) {
        return {
          success: false,
          error: { issues: [{ message: 'Missing id parameter' }] },
        }
      }
      if (data.id.length > 100) {
        return {
          success: false,
          error: { issues: [{ message: 'Id too long' }] },
        }
      }
      return { success: true, data: { id: data.id } }
    }),
  },
}))

import { GET, DELETE } from '@/app/api/dream/history/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

describe('/api/dream/history', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET - Fetch Dream History', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should fetch dream history with default pagination', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: 'Flying dream',
          fullReport: 'Full interpretation...',
          signals: {
            dreamSymbols: [{ label: 'Sky' }, { label: 'Wings' }],
            themes: [{ label: 'Freedom', weight: 0.9 }],
            luckyElements: { luckyNumbers: [7, 14, 21] },
          },
          userQuestion: 'I had a dream about flying',
        },
        {
          id: 'dream-2',
          createdAt: new Date('2024-01-10'),
          summary: 'Water dream',
          fullReport: 'Full interpretation...',
          signals: {
            symbols: ['Ocean', 'Waves'],
            themes: [{ label: 'Emotions', weight: 0.8 }],
          },
          userQuestion: 'Dreamed of ocean',
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(2)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toHaveLength(2)
      expect(data.data.history[0].id).toBe('dream-1')
      expect(data.data.history[0].symbols).toEqual(['Sky', 'Wings'])
      expect(data.data.history[0].themes).toEqual([{ label: 'Freedom', weight: 0.9 }])
      expect(data.data.history[0].luckyNumbers).toEqual([7, 14, 21])
      expect(data.data.pagination.total).toBe(2)
      expect(data.data.pagination.limit).toBe(20)
      expect(data.data.pagination.offset).toBe(0)
      expect(data.data.pagination.hasMore).toBe(false)
    })

    it('should handle custom pagination parameters', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(100)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=10&offset=20')

      const response = await GET(req)
      const data = await response.json()

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', theme: 'dream' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 20,
        select: expect.any(Object),
      })
      expect(data.data.pagination.limit).toBe(10)
      expect(data.data.pagination.offset).toBe(20)
      expect(data.data.pagination.hasMore).toBe(true)
    })

    it('should limit maximum page size to 100', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=200')

      const response = await GET(req)
      const data = await response.json()

      // Zod schema max(100) clamps to 100
      expect(data.data.pagination.limit).toBe(100)
    })

    it('should enforce minimum page size of 1', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=0')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.pagination.limit).toBe(1)
    })

    it('should handle negative offset', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=-10')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.pagination.offset).toBe(0)
    })

    it('should handle invalid limit parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=invalid')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.pagination.limit).toBe(20) // Default
    })

    it('should handle invalid offset parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=NaN')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.pagination.offset).toBe(0) // Default
    })

    it('should filter by dream theme', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      await GET(req)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-123', theme: 'dream' },
        })
      )
    })

    it('should order by createdAt descending', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      await GET(req)

      expect(prisma.consultationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      )
    })

    it('should handle empty history', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history).toEqual([])
      expect(data.data.pagination.total).toBe(0)
      expect(data.data.pagination.hasMore).toBe(false)
    })

    it('should handle null signals gracefully', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: 'Dream summary',
          fullReport: null,
          signals: null,
          userQuestion: 'My dream',
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.history[0].symbols).toBeUndefined()
      expect(data.data.history[0].themes).toBeUndefined()
      expect(data.data.history[0].luckyNumbers).toBeUndefined()
    })

    it('should use default summary when null', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: new Date('2024-01-15'),
          summary: null,
          fullReport: null,
          signals: null,
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.history[0].summary).toBe('꿈 해석')
    })

    it('should handle database errors', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith('Error fetching dream history:', expect.any(Error))
    })

    it('should format createdAt as ISO string', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const mockDate = new Date('2024-01-15T10:30:00Z')
      const mockDreams = [
        {
          id: 'dream-1',
          createdAt: mockDate,
          summary: 'Test',
          fullReport: null,
          signals: null,
          userQuestion: null,
        },
      ]

      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue(mockDreams as any)
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(1)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.history[0].createdAt).toBe(mockDate.toISOString())
    })
  })

  describe('DELETE - Delete Dream History', () => {
    it('should require authentication', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should require id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await DELETE(req)

      // Zod validation fails for missing id -> VALIDATION_ERROR (422)
      expect(response.status).toBe(422)
    })

    it('should reject overly long id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const longId = 'a'.repeat(101)
      const req = new NextRequest(`http://localhost:3000/api/dream/history?id=${longId}`)

      const response = await DELETE(req)

      // Zod validation fails for too-long id
      expect(response.status).toBe(422)
    })

    it('should successfully delete owned dream', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.success).toBe(true)
      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'dream-1',
          userId: 'user-123',
          theme: 'dream',
        },
      })
    })

    it('should return 404 if dream not found', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 0 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=nonexistent')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.message).toBe('Dream not found')
    })

    it('should only delete dreams owned by user', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      await DELETE(req)

      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'dream-1',
          userId: 'user-123',
          theme: 'dream',
        },
      })
    })

    it('should only delete dream theme entries', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockResolvedValue({ count: 1 })

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      await DELETE(req)

      expect(prisma.consultationHistory.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            theme: 'dream',
          }),
        })
      )
    })

    it('should handle database errors on delete', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.deleteMany).mockRejectedValue(
        new Error('Database error')
      )

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=dream-1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.message).toBe('Internal server error')
      expect(logger.error).toHaveBeenCalledWith('Error deleting dream:', expect.any(Error))
    })

    it('should handle empty id parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history?id=')

      const response = await DELETE(req)

      // Empty id fails Zod validation
      expect(response.status).toBe(422)
    })
  })

  describe('Edge Cases', () => {
    it('should handle Infinity limit parameter', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(0)

      const req = new NextRequest('http://localhost:3000/api/dream/history?limit=Infinity')

      const response = await GET(req)
      const data = await response.json()

      expect(data.data.pagination.limit).toBe(20) // Default fallback for non-finite
    })

    it('should handle session without user id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ user: { email: 'test@example.com' } } as any)

      const req = new NextRequest('http://localhost:3000/api/dream/history')

      const response = await GET(req)

      // Session without user.id is treated as unauthenticated
      expect(response.status).toBe(401)
    })

    it('should handle large offset values', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      vi.mocked(prisma.consultationHistory.findMany).mockResolvedValue([])
      vi.mocked(prisma.consultationHistory.count).mockResolvedValue(10)

      const req = new NextRequest('http://localhost:3000/api/dream/history?offset=10000')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.pagination.hasMore).toBe(false)
    })
  })
})
