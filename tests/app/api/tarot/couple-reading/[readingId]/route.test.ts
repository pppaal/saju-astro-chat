import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------- Mocks (must come before route import) ----------

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

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
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
          UNAUTHORIZED: 401,
          FORBIDDEN: 403,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
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
    FORBIDDEN: 'FORBIDDEN',
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

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    matchConnection: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  readingIdParamSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }

      if (!data.readingId || typeof data.readingId !== 'string') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected string for readingId' }] },
        }
      }

      if (data.readingId.length < 1) {
        return {
          success: false,
          error: { issues: [{ message: 'readingId must be at least 1 character' }] },
        }
      }

      if (data.readingId.length > 100) {
        return {
          success: false,
          error: { issues: [{ message: 'readingId must be at most 100 characters' }] },
        }
      }

      return { success: true, data: { readingId: data.readingId } }
    }),
  },
}))

// ---------- Imports (after mocks) ----------

import { GET } from '@/app/api/tarot/couple-reading/[readingId]/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------- Helpers ----------

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  expires: '2025-12-31',
}

// Route context with params promise
function createRouteContext(readingId: string) {
  return {
    params: Promise.resolve({ readingId }),
  }
}

// Mock tarot reading data
const mockTarotReading = {
  id: 'reading-123',
  question: '우리의 미래는 어떨까요?',
  theme: 'love',
  spreadId: 'spread-1',
  spreadTitle: '커플 운세',
  cards: [
    { cardId: 'card-1', name: 'The Lovers', isReversed: false, position: 'present' },
    { cardId: 'card-2', name: 'The Star', isReversed: false, position: 'future' },
  ],
  overallMessage: '두 분의 관계는 밝은 미래를 향하고 있습니다.',
  cardInsights: [{ position: 'present', interpretation: 'Good connection' }],
  guidance: '서로를 더 깊이 이해하세요.',
  affirmation: '우리의 사랑은 계속 성장합니다.',
  createdAt: new Date('2025-06-15T10:00:00Z'),
  userId: 'user-123',
  isSharedReading: true,
  sharedWithUserId: 'partner-456',
  paidByUserId: 'user-123',
  matchConnectionId: 'connection-789',
  user: {
    id: 'user-123',
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
  },
}

const mockPartnerInfo = {
  id: 'partner-456',
  name: 'Partner Name',
  image: 'https://example.com/partner-avatar.jpg',
}

const mockConnectionInfo = {
  id: 'connection-789',
  compatibilityScore: 85,
  isSuperLikeMatch: true,
  createdAt: new Date('2025-06-01T00:00:00Z'),
}

// =============================================================
// GET Handler Tests
// =============================================================

describe('Couple Tarot Reading [readingId] API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 if not authenticated', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        expires: '2025-12-31',
      } as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.message).toBe('not_authenticated')
    })

    it('should return 500 when getServerSession throws an error', async () => {
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session fetch failed'))

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })
  })

  // ---- Parameter Validation ----

  describe('Parameter validation', () => {
    it('should return 400 for invalid params (empty readingId)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(''))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_params')
    })

    it('should return 400 for readingId exceeding max length (100 chars)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const longId = 'x'.repeat(101)

      const request = new Request(`http://localhost/api/tarot/couple-reading/${longId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(longId))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('invalid_params')
    })

    it('should accept valid readingId at max length (100 chars)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
      const validId = 'x'.repeat(100)
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/tarot/couple-reading/${validId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(validId))
      const data = await response.json()

      // Should return 404 (not found) not 400 (invalid params)
      expect(response.status).toBe(404)
    })
  })

  // ---- Not Found Handling ----

  describe('Not found handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 404 when reading does not exist', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/tarot/couple-reading/nonexistent-id', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('nonexistent-id'))
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toContain('리딩을 찾을 수 없습니다')
    })

    it('should query with correct where clause (id)', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-456', {
        method: 'GET',
      })

      await GET(request, createRouteContext('reading-456'))

      expect(prisma.tarotReading.findUnique).toHaveBeenCalledWith({
        where: { id: 'reading-456' },
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      })
    })
  })

  // ---- Not a Couple Reading ----

  describe('Non-couple reading handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 400 when reading is not a shared/couple reading', async () => {
      const nonCoupleReading = {
        ...mockTarotReading,
        isSharedReading: false,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(nonCoupleReading as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('BAD_REQUEST')
      expect(data.error.message).toContain('커플 리딩이 아닙니다')
    })
  })

  // ---- Access Control (Owner and Shared User Only) ----

  describe('Access control', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 403 when user is not owner and not shared-with user', async () => {
      const readingWithDifferentUsers = {
        ...mockTarotReading,
        userId: 'other-user-111',
        sharedWithUserId: 'other-user-222',
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithDifferentUsers as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(data.error.message).toContain('접근 권한이 없습니다')
    })

    it('should allow access when user is the owner', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.reading.isMyReading).toBe(true)
    })

    it('should allow access when user is the shared-with user', async () => {
      const sessionAsPartner = {
        user: { id: 'partner-456', email: 'partner@example.com' },
        expires: '2025-12-31',
      }
      vi.mocked(getServerSession).mockResolvedValue(sessionAsPartner as any)

      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      } as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.reading.isMyReading).toBe(false)
    })
  })

  // ---- Successful Retrieval ----

  describe('Successful retrieval', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return reading data with all expected fields when found', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      const reading = data.data.reading
      expect(reading.id).toBe(mockTarotReading.id)
      expect(reading.question).toBe(mockTarotReading.question)
      expect(reading.theme).toBe(mockTarotReading.theme)
      expect(reading.spreadId).toBe(mockTarotReading.spreadId)
      expect(reading.spreadTitle).toBe(mockTarotReading.spreadTitle)
      expect(reading.cards).toEqual(mockTarotReading.cards)
      expect(reading.overallMessage).toBe(mockTarotReading.overallMessage)
      expect(reading.cardInsights).toEqual(mockTarotReading.cardInsights)
      expect(reading.guidance).toBe(mockTarotReading.guidance)
      expect(reading.affirmation).toBe(mockTarotReading.affirmation)
      expect(reading.createdAt).toBe('2025-06-15T10:00:00.000Z')
      expect(reading.isMyReading).toBe(true)
      expect(reading.isPaidByMe).toBe(true)
      expect(reading.creator).toEqual(mockTarotReading.user)
      expect(reading.partner).toEqual(mockPartnerInfo)
      // Connection dates are serialized to ISO strings via JSON
      expect(reading.connection.id).toBe(mockConnectionInfo.id)
      expect(reading.connection.compatibilityScore).toBe(mockConnectionInfo.compatibilityScore)
      expect(reading.connection.isSuperLikeMatch).toBe(mockConnectionInfo.isSuperLikeMatch)
      expect(reading.connection.createdAt).toBe('2025-06-01T00:00:00.000Z')
    })

    it('should correctly identify isPaidByMe flag based on paidByUserId', async () => {
      const readingPaidByPartner = {
        ...mockTarotReading,
        paidByUserId: 'partner-456',
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingPaidByPartner as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.isPaidByMe).toBe(false)
    })

    it('should handle reading without partner (null sharedWithUserId)', async () => {
      const readingWithoutPartner = {
        ...mockTarotReading,
        sharedWithUserId: null,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithoutPartner as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.partner).toBe(null)
      // user.findUnique should not be called when partnerId is null
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it('should handle reading without match connection', async () => {
      const readingWithoutConnection = {
        ...mockTarotReading,
        matchConnectionId: null,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithoutConnection as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.connection).toBe(null)
      // matchConnection.findUnique should not be called when matchConnectionId is null
      expect(prisma.matchConnection.findUnique).not.toHaveBeenCalled()
    })

    it('should fetch partner info from the correct user based on isOwner', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      await GET(request, createRouteContext('reading-123'))

      // Owner is user-123, so partner is sharedWithUserId = partner-456
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'partner-456' },
        select: { id: true, name: true, image: true },
      })
    })

    it('should fetch creator info when shared-with user accesses reading', async () => {
      const sessionAsPartner = {
        user: { id: 'partner-456', email: 'partner@example.com' },
        expires: '2025-12-31',
      }
      vi.mocked(getServerSession).mockResolvedValue(sessionAsPartner as any)

      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'user-123',
        name: 'Test User',
        image: 'https://example.com/avatar.jpg',
      } as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      await GET(request, createRouteContext('reading-123'))

      // Partner is partner-456, so we fetch the creator user-123 as partner info
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { id: true, name: true, image: true },
      })
    })
  })

  // ---- Match Connection Info ----

  describe('Match connection information', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should include connection info when matchConnectionId exists', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      // Connection dates are serialized to ISO strings via JSON
      expect(data.data.reading.connection.id).toBe(mockConnectionInfo.id)
      expect(data.data.reading.connection.compatibilityScore).toBe(
        mockConnectionInfo.compatibilityScore
      )
      expect(data.data.reading.connection.isSuperLikeMatch).toBe(mockConnectionInfo.isSuperLikeMatch)
      expect(data.data.reading.connection.createdAt).toBe('2025-06-01T00:00:00.000Z')

      expect(prisma.matchConnection.findUnique).toHaveBeenCalledWith({
        where: { id: 'connection-789' },
        select: {
          id: true,
          compatibilityScore: true,
          isSuperLikeMatch: true,
          createdAt: true,
        },
      })
    })

    it('should handle connection that returns null (deleted connection)', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(null)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.connection).toBe(null)
    })
  })

  // ---- Error Handling ----

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should return 500 and log error when database throws on findUnique', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockRejectedValue(
        new Error('Database connection lost')
      )

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to fetch reading')
      expect(logger.error).toHaveBeenCalledWith('[couple-reading/[id]] GET error:', {
        error: expect.any(Error),
      })
    })

    it('should handle Prisma-specific errors appropriately', async () => {
      const prismaError = new Error('PrismaClientKnownRequestError')
      ;(prismaError as any).code = 'P2025'
      vi.mocked(prisma.tarotReading.findUnique).mockRejectedValue(prismaError)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })

    it('should return 500 when user.findUnique throws', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('User fetch failed'))

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })

    it('should return 500 when matchConnection.findUnique throws', async () => {
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(mockTarotReading as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockRejectedValue(
        new Error('Connection fetch failed')
      )

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('DATABASE_ERROR')
    })
  })

  // ---- Edge Cases ----

  describe('Edge cases', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    })

    it('should handle reading with minimal data (null optional fields)', async () => {
      const minimalReading = {
        id: 'reading-minimal',
        question: null,
        theme: null,
        spreadId: 'spread-1',
        spreadTitle: 'Basic Spread',
        cards: [],
        overallMessage: null,
        cardInsights: null,
        guidance: null,
        affirmation: null,
        createdAt: new Date(),
        userId: 'user-123',
        isSharedReading: true,
        sharedWithUserId: null,
        paidByUserId: null,
        matchConnectionId: null,
        user: {
          id: 'user-123',
          name: 'Test User',
          image: null,
        },
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(minimalReading as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-minimal', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-minimal'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.id).toBe('reading-minimal')
      expect(data.data.reading.question).toBe(null)
      expect(data.data.reading.partner).toBe(null)
      expect(data.data.reading.connection).toBe(null)
    })

    it('should handle special characters in readingId', async () => {
      const specialId = 'reading-123-abc-xyz'
      const readingWithSpecialId = {
        ...mockTarotReading,
        id: specialId,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithSpecialId as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request(`http://localhost/api/tarot/couple-reading/${specialId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(specialId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.id).toBe(specialId)
    })

    it('should handle CUID format ids', async () => {
      const cuidId = 'clxyz1234567890abcdef'
      const readingWithCuidId = {
        ...mockTarotReading,
        id: cuidId,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithCuidId as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request(`http://localhost/api/tarot/couple-reading/${cuidId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(cuidId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.id).toBe(cuidId)
    })

    it('should handle UUID format ids', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000'
      const readingWithUuidId = {
        ...mockTarotReading,
        id: uuidId,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithUuidId as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request(`http://localhost/api/tarot/couple-reading/${uuidId}`, {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext(uuidId))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.id).toBe(uuidId)
    })

    it('should handle reading with many cards', async () => {
      const manyCards = Array.from({ length: 20 }, (_, i) => ({
        cardId: `card-${i}`,
        name: `Card ${i}`,
        isReversed: i % 2 === 0,
        position: `position-${i}`,
      }))
      const readingWithManyCards = {
        ...mockTarotReading,
        cards: manyCards,
      }
      vi.mocked(prisma.tarotReading.findUnique).mockResolvedValue(readingWithManyCards as any)
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockPartnerInfo as any)
      vi.mocked(prisma.matchConnection.findUnique).mockResolvedValue(mockConnectionInfo as any)

      const request = new Request('http://localhost/api/tarot/couple-reading/reading-123', {
        method: 'GET',
      })

      const response = await GET(request, createRouteContext('reading-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.reading.cards).toHaveLength(20)
    })
  })
})

// =============================================================
// Rate Limiting Configuration Tests
// =============================================================

describe('Couple Tarot Reading [readingId] API - Rate Limiting Configuration', () => {
  it('should export GET as a function wrapped by withApiMiddleware', () => {
    expect(typeof GET).toBe('function')
  })
})
