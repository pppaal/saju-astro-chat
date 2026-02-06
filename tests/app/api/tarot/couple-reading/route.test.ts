/**
 * Comprehensive tests for /api/tarot/couple-reading
 * Tests GET/POST/DELETE operations, validation, authentication, and error handling
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

// Mock Prisma client
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    userCredits: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    matchConnection: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
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

vi.mock('@/lib/notifications/pushService', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}))

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  coupleTarotReadingPostSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      // Required fields
      if (!data.connectionId || typeof data.connectionId !== 'string' || data.connectionId.trim().length === 0) {
        errors.push({ path: ['connectionId'], message: 'connectionId is required' })
      } else if (data.connectionId.length > 200) {
        errors.push({ path: ['connectionId'], message: 'connectionId too long' })
      }

      if (!data.spreadId || typeof data.spreadId !== 'string' || data.spreadId.trim().length === 0) {
        errors.push({ path: ['spreadId'], message: 'spreadId is required' })
      } else if (data.spreadId.length > 120) {
        errors.push({ path: ['spreadId'], message: 'spreadId too long' })
      }

      if (!data.cards || !Array.isArray(data.cards)) {
        errors.push({ path: ['cards'], message: 'cards is required' })
      }

      // Optional field validation
      if (data.spreadTitle && typeof data.spreadTitle === 'string' && data.spreadTitle.length > 120) {
        errors.push({ path: ['spreadTitle'], message: 'spreadTitle too long' })
      }

      if (data.question && typeof data.question === 'string' && data.question.length > 600) {
        errors.push({ path: ['question'], message: 'question too long' })
      }

      if (data.theme && typeof data.theme === 'string' && data.theme.length > 100) {
        errors.push({ path: ['theme'], message: 'theme too long' })
      }

      if (data.overallMessage && typeof data.overallMessage === 'string' && data.overallMessage.length > 10000) {
        errors.push({ path: ['overallMessage'], message: 'overallMessage too long' })
      }

      if (data.guidance && typeof data.guidance === 'string' && data.guidance.length > 5000) {
        errors.push({ path: ['guidance'], message: 'guidance too long' })
      }

      if (data.affirmation && typeof data.affirmation === 'string' && data.affirmation.length > 500) {
        errors.push({ path: ['affirmation'], message: 'affirmation too long' })
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
          connectionId: data.connectionId.trim(),
          spreadId: data.spreadId.trim(),
          spreadTitle: data.spreadTitle?.trim(),
          cards: data.cards,
          question: data.question?.trim(),
          theme: data.theme?.trim(),
          overallMessage: data.overallMessage,
          cardInsights: data.cardInsights,
          guidance: data.guidance,
          affirmation: data.affirmation,
        },
      }
    }),
  },
  coupleTarotReadingDeleteSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      if (!data.readingId || typeof data.readingId !== 'string' || data.readingId.trim().length === 0) {
        errors.push({ path: ['readingId'], message: 'readingId is required' })
      } else if (data.readingId.length > 200) {
        errors.push({ path: ['readingId'], message: 'readingId too long' })
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
          readingId: data.readingId.trim(),
        },
      }
    }),
  },
  coupleTarotReadingQuerySchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      if (data.connectionId && typeof data.connectionId === 'string' && data.connectionId.length > 200) {
        errors.push({ path: ['connectionId'], message: 'connectionId too long' })
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
          connectionId: data.connectionId?.trim() || undefined,
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
            FORBIDDEN: 403,
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
    FORBIDDEN: 'FORBIDDEN',
  },
}))

describe('/api/tarot/couple-reading', () => {
  const mockUserId = 'user-123'
  const mockPartnerId = 'partner-456'
  const mockConnectionId = 'connection-789'

  const validCoupleReadingData = {
    connectionId: mockConnectionId,
    spreadId: 'couple-spread',
    spreadTitle: 'Couple Love Spread',
    cards: [
      {
        cardId: 'major-0',
        name: 'The Lovers',
        image: '/cards/lovers.jpg',
        isReversed: false,
        position: 'Your Energy',
      },
      {
        cardId: 'major-1',
        name: 'Two of Cups',
        image: '/cards/two-cups.jpg',
        isReversed: false,
        position: 'Partner Energy',
      },
    ],
    question: 'What is the future of our relationship?',
    theme: 'love',
    overallMessage: 'Your relationship is blessed with harmony and mutual understanding.',
    cardInsights: [
      {
        position: 'Your Energy',
        card_name: 'The Lovers',
        is_reversed: false,
        interpretation: 'Deep connection and commitment.',
      },
    ],
    guidance: 'Continue to nurture your bond with open communication.',
    affirmation: 'Our love grows stronger each day.',
  }

  const mockMatchConnection = {
    id: mockConnectionId,
    user1Profile: { userId: mockUserId },
    user2Profile: { userId: mockPartnerId },
    lastInteractionAt: new Date(),
  }

  const mockUserCredits = {
    userId: mockUserId,
    compatibilityLimit: 10,
    compatibilityUsed: 3,
    bonusCredits: 5,
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { name: 'Test User', email: 'test@example.com', id: mockUserId },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    const { prisma } = await import('@/lib/db/prisma')
    ;(prisma.matchConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockMatchConnection)
    ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockUserCredits)
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: mockUserId, name: 'Test User' })
    ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (callback: any) => {
      const mockTx = {
        userCredits: {
          update: vi.fn().mockResolvedValue({}),
        },
        tarotReading: {
          create: vi.fn().mockResolvedValue({ id: 'reading-123' }),
        },
        matchConnection: {
          update: vi.fn().mockResolvedValue({}),
        },
      }
      return callback(mockTx)
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests for GET', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
      const { GET } = await import('@/app/api/tarot/couple-reading/route')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject unauthenticated requests for POST', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
        method: 'POST',
        body: JSON.stringify(validCoupleReadingData),
      })

      const { POST } = await import('@/app/api/tarot/couple-reading/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should reject unauthenticated requests for DELETE', async () => {
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
        method: 'DELETE',
        body: JSON.stringify({ readingId: 'reading-123' }),
      })

      const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should accept authenticated requests', async () => {
      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
      const { GET } = await import('@/app/api/tarot/couple-reading/route')
      const response = await GET(req)

      expect(response.status).toBe(200)
    })
  })

  describe('GET /api/tarot/couple-reading', () => {
    describe('Basic Retrieval', () => {
      it('should retrieve couple readings for the user', async () => {
        const mockReadings = [
          {
            id: 'reading-1',
            userId: mockUserId,
            sharedWithUserId: mockPartnerId,
            paidByUserId: mockUserId,
            isSharedReading: true,
            question: 'Test question',
            createdAt: new Date(),
          },
        ]

        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.readings).toBeDefined()
      })

      it('should include partner information in readings', async () => {
        const mockReadings = [
          {
            id: 'reading-1',
            userId: mockUserId,
            sharedWithUserId: mockPartnerId,
            paidByUserId: mockUserId,
            isSharedReading: true,
          },
        ]

        const mockPartners = [
          { id: mockPartnerId, name: 'Partner User', image: '/partner.jpg' },
        ]

        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)
        ;(prisma.user.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockPartners)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.readings[0].partner).toBeDefined()
        expect(data.data.readings[0].partner.name).toBe('Partner User')
      })

      it('should mark isMyReading correctly', async () => {
        const mockReadings = [
          {
            id: 'reading-1',
            userId: mockUserId,
            sharedWithUserId: mockPartnerId,
            paidByUserId: mockUserId,
            isSharedReading: true,
          },
          {
            id: 'reading-2',
            userId: mockPartnerId,
            sharedWithUserId: mockUserId,
            paidByUserId: mockPartnerId,
            isSharedReading: true,
          },
        ]

        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)
        const data = await response.json()

        expect(data.data.readings[0].isMyReading).toBe(true)
        expect(data.data.readings[1].isMyReading).toBe(false)
      })

      it('should mark isPaidByMe correctly', async () => {
        const mockReadings = [
          {
            id: 'reading-1',
            userId: mockUserId,
            sharedWithUserId: mockPartnerId,
            paidByUserId: mockUserId,
            isSharedReading: true,
          },
        ]

        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)
        const data = await response.json()

        expect(data.data.readings[0].isPaidByMe).toBe(true)
      })
    })

    describe('Filtering', () => {
      it('should filter by connectionId when provided', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([])

        const req = new NextRequest(`http://localhost:3000/api/tarot/couple-reading?connectionId=${mockConnectionId}`)
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              matchConnectionId: mockConnectionId,
            }),
          })
        )
      })

      it('should reject connectionId longer than 200 characters', async () => {
        const longConnectionId = 'a'.repeat(201)
        const req = new NextRequest(`http://localhost:3000/api/tarot/couple-reading?connectionId=${longConnectionId}`)
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Database error'))

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
        const { GET } = await import('@/app/api/tarot/couple-reading/route')
        const response = await GET(req)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('POST /api/tarot/couple-reading', () => {
    describe('Validation - Required Fields', () => {
      it('should reject missing connectionId', async () => {
        const data = { ...validCoupleReadingData, connectionId: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject empty connectionId', async () => {
        const data = { ...validCoupleReadingData, connectionId: '' }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing spreadId', async () => {
        const data = { ...validCoupleReadingData, spreadId: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject missing cards', async () => {
        const data = { ...validCoupleReadingData, cards: undefined }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Validation - Field Length Limits', () => {
      it('should reject connectionId longer than 200 characters', async () => {
        const data = { ...validCoupleReadingData, connectionId: 'a'.repeat(201) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject spreadId longer than 120 characters', async () => {
        const data = { ...validCoupleReadingData, spreadId: 'a'.repeat(121) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject spreadTitle longer than 120 characters', async () => {
        const data = { ...validCoupleReadingData, spreadTitle: 'a'.repeat(121) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject question longer than 600 characters', async () => {
        const data = { ...validCoupleReadingData, question: 'a'.repeat(601) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject theme longer than 100 characters', async () => {
        const data = { ...validCoupleReadingData, theme: 'a'.repeat(101) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject overallMessage longer than 10000 characters', async () => {
        const data = { ...validCoupleReadingData, overallMessage: 'a'.repeat(10001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject guidance longer than 5000 characters', async () => {
        const data = { ...validCoupleReadingData, guidance: 'a'.repeat(5001) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })

      it('should reject affirmation longer than 500 characters', async () => {
        const data = { ...validCoupleReadingData, affirmation: 'a'.repeat(501) }
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(data),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Match Connection Validation', () => {
      it('should reject if match connection not found', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.matchConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error.message).toContain('매치를 찾을 수 없습니다')
      })

      it('should reject if user is not part of the match', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.matchConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: mockConnectionId,
          user1Profile: { userId: 'other-user-1' },
          user2Profile: { userId: 'other-user-2' },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.message).toContain('이 매치에 대한 권한이 없습니다')
      })
    })

    describe('Credits Validation', () => {
      it('should reject if user credits not found', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.message).toContain('크레딧 정보를 찾을 수 없습니다')
      })

      it('should reject if insufficient credits', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          userId: mockUserId,
          compatibilityLimit: 10,
          compatibilityUsed: 10,
          bonusCredits: 0,
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.message).toContain('크레딧이 부족합니다')
      })
    })

    describe('Successful Creation', () => {
      it('should create couple reading successfully', async () => {
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.success).toBe(true)
        expect(data.data.readingId).toBe('reading-123')
      })

      it('should send push notification to partner', async () => {
        const { sendPushNotification } = await import('@/lib/notifications/pushService')

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        await POST(req)

        expect(sendPushNotification).toHaveBeenCalledWith(
          mockPartnerId,
          expect.objectContaining({
            title: '커플 타로가 도착했어요!',
            tag: 'couple-tarot',
          })
        )
      })

      it('should use bonus credits when regular credits are exhausted', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          userId: mockUserId,
          compatibilityLimit: 10,
          compatibilityUsed: 10,
          bonusCredits: 5,
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })

      it('should accept optional fields as undefined', async () => {
        const minimalData = {
          connectionId: mockConnectionId,
          spreadId: 'couple-spread',
          cards: validCoupleReadingData.cards,
        }

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(minimalData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
      })
    })

    describe('Error Handling', () => {
      it('should handle database transaction errors', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Transaction failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'POST',
          body: JSON.stringify(validCoupleReadingData),
        })

        const { POST } = await import('@/app/api/tarot/couple-reading/route')
        const response = await POST(req)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('DELETE /api/tarot/couple-reading', () => {
    describe('Validation', () => {
      it('should reject missing readingId', async () => {
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({}),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)

        expect(response.status).toBe(422)
      })

      it('should reject empty readingId', async () => {
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: '' }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)

        expect(response.status).toBe(422)
      })

      it('should reject readingId longer than 200 characters', async () => {
        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: 'a'.repeat(201) }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)

        expect(response.status).toBe(422)
      })
    })

    describe('Authorization', () => {
      it('should reject if reading not found', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: 'reading-123' }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.error.message).toContain('리딩을 찾을 수 없습니다')
      })

      it('should reject if user is not the payer', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
          paidByUserId: 'other-user',
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: 'reading-123' }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)
        const data = await response.json()

        expect(response.status).toBe(403)
        expect(data.error.message).toContain('결제한 사람만 삭제할 수 있습니다')
      })
    })

    describe('Successful Deletion', () => {
      it('should delete reading successfully when user is the payer', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
          paidByUserId: mockUserId,
        })
        ;(prisma.tarotReading.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: 'reading-123' }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.success).toBe(true)
        expect(prisma.tarotReading.delete).toHaveBeenCalledWith({
          where: { id: 'reading-123' },
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors during deletion', async () => {
        const { prisma } = await import('@/lib/db/prisma')
        ;(prisma.tarotReading.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
          id: 'reading-123',
          paidByUserId: mockUserId,
        })
        ;(prisma.tarotReading.delete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Delete failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
          method: 'DELETE',
          body: JSON.stringify({ readingId: 'reading-123' }),
        })

        const { DELETE } = await import('@/app/api/tarot/couple-reading/route')
        const response = await DELETE(req)

        expect(response.status).toBe(500)
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle user as user2 in match connection for POST', async () => {
      // Set up user as user2 in the connection
      const { prisma } = await import('@/lib/db/prisma')
      ;(prisma.matchConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: mockConnectionId,
        user1Profile: { userId: mockPartnerId },
        user2Profile: { userId: mockUserId },
      })

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
        method: 'POST',
        body: JSON.stringify(validCoupleReadingData),
      })

      const { POST } = await import('@/app/api/tarot/couple-reading/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle whitespace-only connectionId', async () => {
      const data = { ...validCoupleReadingData, connectionId: '   ' }
      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
        method: 'POST',
        body: JSON.stringify(data),
      })

      const { POST } = await import('@/app/api/tarot/couple-reading/route')
      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should handle null partner info gracefully in GET', async () => {
      const mockReadings = [
        {
          id: 'reading-1',
          userId: mockUserId,
          sharedWithUserId: null,
          paidByUserId: mockUserId,
          isSharedReading: true,
        },
      ]

      const { prisma } = await import('@/lib/db/prisma')
      ;(prisma.tarotReading.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockReadings)

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading')
      const { GET } = await import('@/app/api/tarot/couple-reading/route')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.readings[0].partner).toBeNull()
    })

    it('should handle failed push notification gracefully', async () => {
      const { sendPushNotification } = await import('@/lib/notifications/pushService')
      ;(sendPushNotification as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Push failed'))

      const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
        method: 'POST',
        body: JSON.stringify(validCoupleReadingData),
      })

      const { POST } = await import('@/app/api/tarot/couple-reading/route')
      const response = await POST(req)

      // Should still succeed even if push notification fails
      expect(response.status).toBe(200)
    })
  })
})
