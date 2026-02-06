/**
 * Comprehensive tests for /api/calendar/save
 * Tests POST/GET/DELETE operations, validation, authentication, and data integrity
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
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
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
  calendarSaveRequestSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const errors: { path: string[]; message: string }[] = []

      // Required fields validation
      if (!data.date || typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
        errors.push({ path: ['date'], message: 'Date must be in YYYY-MM-DD format' })
      }
      if (typeof data.grade !== 'number' || data.grade < 1 || data.grade > 5) {
        errors.push({ path: ['grade'], message: 'Grade must be between 1 and 5' })
      }
      if (typeof data.score !== 'number' || data.score < 0 || data.score > 100) {
        errors.push({ path: ['score'], message: 'Score must be between 0 and 100' })
      }
      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push({ path: ['title'], message: 'Title is required' })
      } else if (data.title.length > 200) {
        errors.push({ path: ['title'], message: 'Title must be at most 200 characters' })
      }

      // Optional field length validation
      if (data.description && typeof data.description === 'string' && data.description.length > 2000) {
        errors.push({ path: ['description'], message: 'Description must be at most 2000 characters' })
      }
      if (data.summary && typeof data.summary === 'string' && data.summary.length > 1000) {
        errors.push({ path: ['summary'], message: 'Summary must be at most 1000 characters' })
      }
      if (data.birthPlace && typeof data.birthPlace === 'string' && data.birthPlace.length > 200) {
        errors.push({ path: ['birthPlace'], message: 'Birth place must be at most 200 characters' })
      }

      // Year validation if provided
      if (data.year !== undefined) {
        if (typeof data.year !== 'number' || data.year < 1900 || data.year > 2100) {
          errors.push({ path: ['year'], message: 'Year must be between 1900 and 2100' })
        }
      }

      // Categories validation
      if (data.categories !== undefined && !Array.isArray(data.categories)) {
        errors.push({ path: ['categories'], message: 'Categories must be an array' })
      }

      // BestTimes validation
      if (data.bestTimes !== undefined && !Array.isArray(data.bestTimes)) {
        errors.push({ path: ['bestTimes'], message: 'Best times must be an array' })
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
          date: data.date,
          year: data.year,
          grade: data.grade,
          score: data.score,
          title: typeof data.title === 'string' ? data.title.trim() : data.title,
          description: data.description,
          summary: data.summary,
          categories: data.categories,
          bestTimes: data.bestTimes,
          sajuFactors: data.sajuFactors,
          astroFactors: data.astroFactors,
          recommendations: data.recommendations,
          warnings: data.warnings,
          birthDate: data.birthDate,
          birthTime: data.birthTime,
          birthPlace: data.birthPlace,
          locale: data.locale || 'ko',
        },
      }
    }),
  },
  calendarQuerySchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const errors: { path: string[]; message: string }[] = []

      // Date validation if provided
      if (data.date && (typeof data.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data.date))) {
        errors.push({ path: ['date'], message: 'Invalid date format' })
      }

      // Year validation if provided
      if (data.year && typeof data.year === 'string' && !/^\d{4}$/.test(data.year)) {
        errors.push({ path: ['year'], message: 'Invalid year format' })
      }

      // Limit parsing - cap at boundaries, don't reject
      const limitStr = data.limit || '50'
      let limit = parseInt(limitStr as string)
      if (isNaN(limit)) {
        limit = 50 // default
      }
      // Cap at boundaries like the actual Zod schema does
      limit = Math.min(365, Math.max(1, limit))

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: {
          date: data.date || undefined,
          year: data.year ? parseInt(data.year as string) : undefined,
          limit,
        },
      }
    }),
  },
  dateSchema: {
    safeParse: vi.fn((date: unknown) => {
      if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return {
          success: false,
          error: { issues: [{ path: ['date'], message: 'Invalid date format. Expected YYYY-MM-DD' }] },
        }
      }
      return { success: true, data: date }
    }),
  },
}))

// Mock middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: (req: NextRequest, context: Record<string, unknown>) => Promise<unknown>, _options: unknown) => {
    return async (req: NextRequest, ...args: unknown[]) => {
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth/authOptions')

      let session: { user?: { id: string; name?: string; email?: string } } | null = null
      try {
        session = await (getServerSession as (opts: unknown) => Promise<{ user?: { id: string; name?: string; email?: string } } | null>)(authOptions)
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
        const result = await handler(req, context, ...args) as { data?: unknown; error?: { code: string; message?: string }; status?: number } | Response
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
  }),
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

describe('/api/calendar/save', () => {
  const mockUserId = 'user-123'

  const validCalendarData = {
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
    recommendations: ['Focus on networking', 'Present new ideas'],
    warnings: ['Avoid conflicts', 'Be cautious with contracts'],
    birthDate: '1990-05-20',
    birthTime: '14:30',
    birthPlace: 'Seoul',
    locale: 'ko',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { name: 'Test User', email: 'test@example.com', id: mockUserId },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  describe('POST /api/calendar/save', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(validCalendarData),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })

      it('should reject requests without user id in session', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(validCalendarData),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(401)
      })
    })

    describe('Validation - Required Fields', () => {
      it('should reject missing date', async () => {
        const data = { ...validCalendarData, date: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject invalid date format', async () => {
        const data = { ...validCalendarData, date: '2024/06/15' }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing grade', async () => {
        const data = { ...validCalendarData, grade: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject grade below 1', async () => {
        const data = { ...validCalendarData, grade: 0 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject grade above 5', async () => {
        const data = { ...validCalendarData, grade: 6 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing score', async () => {
        const data = { ...validCalendarData, score: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject score below 0', async () => {
        const data = { ...validCalendarData, score: -10 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject score above 100', async () => {
        const data = { ...validCalendarData, score: 150 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing title', async () => {
        const data = { ...validCalendarData, title: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject empty title', async () => {
        const data = { ...validCalendarData, title: '' }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Validation - Field Length Limits', () => {
      it('should reject title longer than 200 characters', async () => {
        const data = { ...validCalendarData, title: 'a'.repeat(201) }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should accept title at exactly 200 characters', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, title: 'a'.repeat(200) }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should reject description longer than 2000 characters', async () => {
        const data = { ...validCalendarData, description: 'a'.repeat(2001) }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject summary longer than 1000 characters', async () => {
        const data = { ...validCalendarData, summary: 'a'.repeat(1001) }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject birthPlace longer than 200 characters', async () => {
        const data = { ...validCalendarData, birthPlace: 'a'.repeat(201) }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Validation - Year Boundaries', () => {
      it('should reject year below 1900', async () => {
        const data = { ...validCalendarData, year: 1899 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject year above 2100', async () => {
        const data = { ...validCalendarData, year: 2101 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should accept year at boundary 1900', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, year: 1900 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept year at boundary 2100', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, year: 2100 }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })
    })

    describe('Database Operations', () => {
      it('should save calendar date successfully with upsert', async () => {
        const mockSavedDate = {
          id: 'saved-123',
          userId: mockUserId,
          ...validCalendarData,
        }

        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(mockSavedDate)

        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(validCalendarData),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.success).toBe(true)
        expect(data.data.id).toBe('saved-123')
        expect(prisma.savedCalendarDate.upsert).toHaveBeenCalledWith({
          where: {
            userId_date: {
              userId: mockUserId,
              date: validCalendarData.date,
            },
          },
          update: expect.objectContaining({
            grade: validCalendarData.grade,
            score: validCalendarData.score,
            title: validCalendarData.title,
          }),
          create: expect.objectContaining({
            userId: mockUserId,
            date: validCalendarData.date,
            grade: validCalendarData.grade,
            score: validCalendarData.score,
            title: validCalendarData.title,
          }),
        })
      })

      it('should use default locale "ko" when not provided', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, locale: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        await POST(req)

        expect(prisma.savedCalendarDate.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({ locale: 'ko' }),
            update: expect.objectContaining({ locale: 'ko' }),
          })
        )
      })

      it('should derive year from date if not provided', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, year: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        await POST(req)

        expect(prisma.savedCalendarDate.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            create: expect.objectContaining({ year: 2024 }),
            update: expect.objectContaining({ year: 2024 }),
          })
        )
      })

      it('should handle database errors gracefully', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database error')
        )

        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(validCalendarData),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(500)
      })
    })

    describe('Optional Fields', () => {
      it('should accept request without optional description', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, description: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept request without categories', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, categories: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept request without bestTimes', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const data = { ...validCalendarData, bestTimes: undefined }
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept request with minimal required fields only', async () => {
        ;(prisma.savedCalendarDate.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'saved-123',
        })

        const minimalData = {
          date: '2024-06-15',
          grade: 3,
          score: 70,
          title: 'Test day',
        }

        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'POST',
          body: JSON.stringify(minimalData),
        })

        const { POST } = await import('@/app/api/calendar/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })
    })
  })

  describe('GET /api/calendar/save', () => {
    const mockSavedDates = [
      {
        id: 'saved-1',
        date: '2024-06-15',
        year: 2024,
        grade: 4,
        score: 85,
        title: 'Great day',
        summary: 'Excellent energy',
        categories: ['career'],
        createdAt: new Date('2024-06-01'),
      },
      {
        id: 'saved-2',
        date: '2024-06-16',
        year: 2024,
        grade: 3,
        score: 70,
        title: 'Average day',
        summary: 'Normal energy',
        categories: ['health'],
        createdAt: new Date('2024-06-02'),
      },
    ]

    describe('Authentication', () => {
      it('should reject unauthenticated GET requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save')
        const { GET } = await import('@/app/api/calendar/save/route')
        const response = await GET(req)

        expect(response.status).toBe(401)
      })
    })

    describe('Basic Retrieval', () => {
      it('should retrieve saved dates with default parameters', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSavedDates)

        const req = new NextRequest('http://localhost:3000/api/calendar/save')
        const { GET } = await import('@/app/api/calendar/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.savedDates).toBeDefined()
        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId },
            orderBy: { date: 'asc' },
          })
        )
      })

      it('should filter by specific date', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockSavedDates[0]])

        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=2024-06-15')
        const { GET } = await import('@/app/api/calendar/save/route')
        await GET(req)

        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId, date: '2024-06-15' },
          })
        )
      })

      it('should filter by year', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockSavedDates)

        const req = new NextRequest('http://localhost:3000/api/calendar/save?year=2024')
        const { GET } = await import('@/app/api/calendar/save/route')
        await GET(req)

        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId, year: 2024 },
          })
        )
      })
    })

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

        const req = new NextRequest('http://localhost:3000/api/calendar/save?limit=10')
        const { GET } = await import('@/app/api/calendar/save/route')
        await GET(req)

        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 10 })
        )
      })

      it('should cap limit at 365', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

        const req = new NextRequest('http://localhost:3000/api/calendar/save?limit=500')
        const { GET } = await import('@/app/api/calendar/save/route')
        await GET(req)

        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 365 })
        )
      })

      it('should use default limit of 50 when not specified', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

        const req = new NextRequest('http://localhost:3000/api/calendar/save')
        const { GET } = await import('@/app/api/calendar/save/route')
        await GET(req)

        expect(prisma.savedCalendarDate.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 50 })
        )
      })
    })

    describe('Validation', () => {
      it('should reject invalid date format in query', async () => {
        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=invalid-date')
        const { GET } = await import('@/app/api/calendar/save/route')
        const response = await GET(req)

        expect(response.status).toBe(422)
      })

      it('should reject invalid year format in query', async () => {
        const req = new NextRequest('http://localhost:3000/api/calendar/save?year=invalid')
        const { GET } = await import('@/app/api/calendar/save/route')
        const response = await GET(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Error Handling', () => {
      it('should handle database query errors', async () => {
        ;(prisma.savedCalendarDate.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Query failed')
        )

        const req = new NextRequest('http://localhost:3000/api/calendar/save')
        const { GET } = await import('@/app/api/calendar/save/route')
        const response = await GET(req)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('DELETE /api/calendar/save', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated DELETE requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=2024-06-15', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        const response = await DELETE(req)

        expect(response.status).toBe(401)
      })
    })

    describe('Validation', () => {
      it('should reject missing date parameter', async () => {
        const req = new NextRequest('http://localhost:3000/api/calendar/save', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        const response = await DELETE(req)

        expect(response.status).toBe(422)
      })

      it('should reject invalid date format', async () => {
        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=invalid', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        const response = await DELETE(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Access Control', () => {
      it('should only delete calendar dates for the authenticated user', async () => {
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=2024-06-15', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        await DELETE(req)

        expect(prisma.savedCalendarDate.delete).toHaveBeenCalledWith({
          where: {
            userId_date: {
              userId: mockUserId,
              date: '2024-06-15',
            },
          },
        })
      })
    })

    describe('Database Operations', () => {
      it('should delete calendar date successfully', async () => {
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=2024-06-15', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        const response = await DELETE(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.success).toBe(true)
      })

      it('should handle database errors during delete', async () => {
        ;(prisma.savedCalendarDate.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Delete failed')
        )

        const req = new NextRequest('http://localhost:3000/api/calendar/save?date=2024-06-15', {
          method: 'DELETE',
        })
        const { DELETE } = await import('@/app/api/calendar/save/route')
        const response = await DELETE(req)

        expect(response.status).toBe(500)
      })
    })
  })
})
