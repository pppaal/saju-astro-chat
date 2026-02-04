/**
 * Comprehensive tests for /api/tarot/save
 * Tests POST/GET operations, validation, pagination, and data integrity
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'

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
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
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
  tarotSaveRequestSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      // Required string fields
      if (
        !data.question ||
        typeof data.question !== 'string' ||
        data.question.trim().length === 0
      ) {
        errors.push({ path: ['question'], message: 'invalid_question' })
      } else if (data.question.length > 1000) {
        errors.push({ path: ['question'], message: 'invalid_question' })
      }
      if (!data.spreadId || typeof data.spreadId !== 'string' || data.spreadId.length === 0) {
        errors.push({ path: ['spreadId'], message: 'invalid_spreadId' })
      } else if (data.spreadId.length > 100) {
        errors.push({ path: ['spreadId'], message: 'invalid_spreadId' })
      }
      if (
        !data.spreadTitle ||
        typeof data.spreadTitle !== 'string' ||
        data.spreadTitle.length === 0
      ) {
        errors.push({ path: ['spreadTitle'], message: 'invalid_spreadTitle' })
      } else if (data.spreadTitle.length > 200) {
        errors.push({ path: ['spreadTitle'], message: 'invalid_spreadTitle' })
      }
      if (!data.cards || !Array.isArray(data.cards) || data.cards.length === 0) {
        errors.push({ path: ['cards'], message: 'invalid_cards' })
      } else if (data.cards.length > 20) {
        errors.push({ path: ['cards'], message: 'invalid_cards: too many cards' })
      }

      // Optional field length validation
      if (data.theme && typeof data.theme === 'string' && data.theme.length > 100) {
        errors.push({ path: ['theme'], message: 'invalid_theme' })
      }
      if (
        data.overallMessage &&
        typeof data.overallMessage === 'string' &&
        data.overallMessage.length > 5000
      ) {
        errors.push({ path: ['overallMessage'], message: 'invalid_overallMessage' })
      }
      if (data.guidance && typeof data.guidance === 'string' && data.guidance.length > 2000) {
        errors.push({ path: ['guidance'], message: 'invalid_guidance' })
      }
      if (
        data.affirmation &&
        typeof data.affirmation === 'string' &&
        data.affirmation.length > 500
      ) {
        errors.push({ path: ['affirmation'], message: 'invalid_affirmation' })
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
          question: typeof data.question === 'string' ? data.question.trim() : data.question,
          theme: data.theme,
          spreadId: data.spreadId,
          spreadTitle: data.spreadTitle,
          cards: data.cards,
          overallMessage: data.overallMessage,
          cardInsights: data.cardInsights,
          guidance: data.guidance,
          affirmation: data.affirmation,
          source: data.source || 'standalone',
          counselorSessionId: data.counselorSessionId,
          locale: data.locale || 'ko',
        },
      }
    }),
  },
  tarotQuerySchema: {
    safeParse: vi.fn((data: any) => {
      const limit = parseInt(data.limit) || 10
      const offset = parseInt(data.offset) || 0

      // Validate theme length
      if (data.theme && data.theme.length > 100) {
        return {
          success: false,
          error: { issues: [{ path: ['theme'], message: 'invalid_theme' }] },
        }
      }

      return {
        success: true,
        data: {
          limit: Math.max(1, Math.min(100, isNaN(limit) ? 10 : limit)),
          offset: Math.max(0, isNaN(offset) ? 0 : offset),
          theme: data.theme || undefined,
        },
      }
    }),
  },
}))

// Mock middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth/authOptions')

      let session: any = null
      try {
        session = await (getServerSession as any)(authOptions)
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
        const result = await handler(req, context, ...args)
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
          { success: true, data: result.data },
          { status: result.status || 200 }
        )
      } catch (err: any) {
        return NextResponse.json(
          {
            success: false,
            error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal Server Error' },
          },
          { status: 500 }
        )
      }
    }
  }),
  createAuthenticatedGuard: vi.fn((opts: any) => ({
    ...opts,
    requireAuth: true,
  })),
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

describe('/api/tarot/save', () => {
  const mockUserId = 'user-123'

  const validTarotData = {
    question: 'What does the future hold?',
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
    ],
    overallMessage: 'A journey begins with courage and wisdom.',
    cardInsights: [
      {
        position: 'Past',
        card_name: 'The Fool',
        is_reversed: false,
        interpretation: 'New beginnings and innocence.',
      },
    ],
    guidance: 'Trust your intuition.',
    affirmation: 'I am open to new possibilities.',
    source: 'standalone' as const,
    locale: 'ko',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { name: 'Test User', email: 'test@example.com', id: mockUserId },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  describe('POST /api/tarot/save', () => {
    describe('Validation - Required Fields', () => {
      it('should reject missing question', async () => {
        const data = { ...validTarotData, question: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const result = await response.json()

        expect(response.status).toBe(422)
        expect(result.error.message).toContain('validation_failed')
      })

      it('should reject empty question', async () => {
        const data = { ...validTarotData, question: '' }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject non-string question', async () => {
        const data = { ...validTarotData, question: 123 }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing spreadId', async () => {
        const data = { ...validTarotData, spreadId: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject missing spreadTitle', async () => {
        const data = { ...validTarotData, spreadTitle: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject missing cards', async () => {
        const data = { ...validTarotData, cards: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject empty cards array', async () => {
        const data = { ...validTarotData, cards: [] }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Validation - Field Length Limits', () => {
      it('should reject question longer than 1000 characters', async () => {
        const data = { ...validTarotData, question: 'a'.repeat(1001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should accept question at exactly 1000 characters', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, question: 'a'.repeat(1000) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should reject spreadId longer than 100 characters', async () => {
        const data = { ...validTarotData, spreadId: 'a'.repeat(101) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject spreadTitle longer than 200 characters', async () => {
        const data = { ...validTarotData, spreadTitle: 'a'.repeat(201) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject theme longer than 100 characters', async () => {
        const data = { ...validTarotData, theme: 'a'.repeat(101) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject overallMessage longer than 5000 characters', async () => {
        const data = { ...validTarotData, overallMessage: 'a'.repeat(5001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject guidance longer than 2000 characters', async () => {
        const data = { ...validTarotData, guidance: 'a'.repeat(2001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject affirmation longer than 500 characters', async () => {
        const data = { ...validTarotData, affirmation: 'a'.repeat(501) }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
        expect((await response.json()).error.message).toContain('validation_failed')
      })

      it('should reject more than 20 cards', async () => {
        const cards = Array(21).fill(validTarotData.cards[0])
        const data = { ...validTarotData, cards }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Validation - Optional Fields', () => {
      it('should accept request without theme', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, theme: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept request without overallMessage', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, overallMessage: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept request without cardInsights', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, cardInsights: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should use default source "standalone"', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, source: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        await POST(req)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ source: 'standalone' }),
        })
      })

      it('should use default locale "ko"', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const data = { ...validTarotData, locale: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        await POST(req)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'ko' }),
        })
      })
    })

    describe('Database Operations', () => {
      it('should save tarot reading successfully', async () => {
        const mockReading = {
          id: 'reading-123',
          userId: mockUserId,
          ...validTarotData,
        }

        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockReading)

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.success).toBe(true)
        expect(data.data.readingId).toBe('reading-123')
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            userId: mockUserId,
            question: validTarotData.question,
            spreadId: validTarotData.spreadId,
          }),
        })
      })

      it('should save counselor session data', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
        })

        const counselorData = {
          ...validTarotData,
          source: 'counselor' as const,
          counselorSessionId: 'session-456',
        }

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(counselorData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        await POST(req)

        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            source: 'counselor',
            counselorSessionId: 'session-456',
          }),
        })
      })

      it('should handle database errors', async () => {
        ;(prisma.tarotReading.create as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database error')
        )

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('GET /api/tarot/save', () => {
    const mockReadings = [
      {
        id: 'reading-1',
        createdAt: new Date('2024-01-01'),
        question: 'Question 1',
        theme: 'Love',
        spreadTitle: 'Three Card',
        cards: [],
        overallMessage: 'Message 1',
        source: 'standalone',
      },
      {
        id: 'reading-2',
        createdAt: new Date('2024-01-02'),
        question: 'Question 2',
        theme: 'Career',
        spreadTitle: 'Celtic Cross',
        cards: [],
        overallMessage: 'Message 2',
        source: 'counselor',
      },
    ]

    describe('Basic Retrieval', () => {
      it('should retrieve user readings with default pagination', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(2)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.success).toBe(true)
        expect(data.data.readings).toBeDefined()
        expect(data.data.total).toBe(2)
        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId },
            orderBy: { createdAt: 'desc' },
            take: 10,
            skip: 0,
          })
        )
      })

      it('should return correct hasMore flag', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(
          mockReadings.slice(0, 1)
        )
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(10)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(data.data.hasMore).toBe(true)
      })

      it('should return hasMore false when no more readings', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(2)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(data.data.hasMore).toBe(false)
      })
    })

    describe('Pagination', () => {
      it('should respect limit parameter', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=5')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        )
      })

      it('should respect offset parameter', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=20')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 20 })
        )
      })

      it('should clamp limit to maximum of 100', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=500')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 100 })
        )
      })

      it('should clamp limit to minimum of 1', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        // Note: The route does `searchParams.get('limit') || '10'`, so '0' is falsy
        // and defaults to '10'. This tests that the default applies when limit is 0.
        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=0')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 10 })
        )
      })

      it('should handle negative offset', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=-10')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0 })
        )
      })

      it('should parse invalid limit as default', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=invalid')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 10 })
        )
      })
    })

    describe('Filtering', () => {
      it('should filter by theme', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?theme=Love')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId, theme: 'Love' },
          })
        )
        expect(prisma.tarotReading.count).toHaveBeenCalledWith({
          where: { userId: mockUserId, theme: 'Love' },
        })
      })

      it('should reject theme longer than 100 characters', async () => {
        const longTheme = 'a'.repeat(101)
        const req = new NextRequest(`http://localhost:3000/api/tarot/save?theme=${longTheme}`)
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)

        expect(response.status).toBe(422)
      })

      it('should handle empty theme parameter', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?theme=')
        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId },
          })
        )
      })
    })

    describe('Error Handling', () => {
      it('should handle database query errors', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Query failed')
        )

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)

        expect(response.status).toBe(500)
      })

      it('should handle database count errors', async () => {
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
        ;(prisma.tarotReading.count as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Count failed')
        )

        const req = new NextRequest('http://localhost:3000/api/tarot/save')
        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)

        expect(response.status).toBe(500)
      })
    })
  })
})
