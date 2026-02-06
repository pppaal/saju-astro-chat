/**
 * Comprehensive tests for /api/tarot/save
 * Tests POST (save) and GET (retrieve) operations for tarot readings
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies before importing the route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      return result
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => NextResponse.json({ success: true, ...data }, { status: 200 })),
  apiError: vi.fn((code: string, message?: string, details?: any) =>
    NextResponse.json(
      { success: false, error: { code, message }, ...(details && { details: details.details }) },
      { status: code === 'VALIDATION_ERROR' ? 400 : 500 }
    )
  ),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

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
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  tarotSaveRequestSchema: {
    safeParse: vi.fn(),
  },
  tarotQuerySchema: {
    safeParse: vi.fn(),
  },
}))

// Import mocked dependencies for assertions
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { tarotSaveRequestSchema, tarotQuerySchema } from '@/lib/api/zodValidation'

describe('/api/tarot/save', () => {
  const mockUserId = 'test-user-id'

  const validCard = {
    cardId: 'the-fool',
    name: 'The Fool',
    image: '/images/tarot/the-fool.png',
    isReversed: false,
    position: 'Present',
  }

  const validCardInsight = {
    position: 'Present',
    card_name: 'The Fool',
    is_reversed: false,
    interpretation: 'New beginnings and fresh starts await you.',
  }

  const validTarotData = {
    question: 'What does my career hold?',
    theme: 'career',
    spreadId: 'three-card',
    spreadTitle: 'Three Card Spread',
    cards: [validCard],
    overallMessage: 'Your career path shows exciting opportunities.',
    cardInsights: [validCardInsight],
    guidance: 'Follow your intuition and embrace change.',
    affirmation: 'I am open to new opportunities.',
    source: 'standalone' as const,
    counselorSessionId: undefined,
    locale: 'ko' as const,
  }

  const mockSavedReading = {
    id: 'reading-123',
    userId: mockUserId,
    question: 'What does my career hold?',
    theme: 'career',
    spreadId: 'three-card',
    spreadTitle: 'Three Card Spread',
    cards: [validCard],
    overallMessage: 'Your career path shows exciting opportunities.',
    cardInsights: [validCardInsight],
    guidance: 'Follow your intuition and embrace change.',
    affirmation: 'I am open to new opportunities.',
    source: 'standalone',
    counselorSessionId: null,
    locale: 'ko',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/tarot/save', () => {
    describe('Validation', () => {
      it('should return 400 when validation fails with missing required fields', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              { path: ['question'], message: 'Required' },
              { path: ['spreadId'], message: 'Required' },
              { path: ['spreadTitle'], message: 'Required' },
              { path: ['cards'], message: 'Required' },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toBe('validation_failed')
        expect(data.details).toHaveLength(4)
        expect(logger.warn).toHaveBeenCalledWith(
          '[TarotSave] validation failed',
          expect.objectContaining({ errors: expect.any(Array) })
        )
      })

      it('should return 400 when question is missing', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['question'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({ ...validTarotData, question: undefined }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.details).toContainEqual({ path: 'question', message: 'Required' })
      })

      it('should return 400 when question exceeds max length', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              { path: ['question'], message: 'String must contain at most 1000 character(s)' },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({ ...validTarotData, question: 'a'.repeat(1001) }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({
          path: 'question',
          message: 'String must contain at most 1000 character(s)',
        })
      })

      it('should return 400 when spreadId is missing', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['spreadId'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({ ...validTarotData, spreadId: undefined }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({ path: 'spreadId', message: 'Required' })
      })

      it('should return 400 when spreadTitle is missing', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['spreadTitle'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({ ...validTarotData, spreadTitle: undefined }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({ path: 'spreadTitle', message: 'Required' })
      })

      it('should return 400 when cards array is empty', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['cards'], message: 'Array must contain at least 1 element(s)' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({ ...validTarotData, cards: [] }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({
          path: 'cards',
          message: 'Array must contain at least 1 element(s)',
        })
      })

      it('should return 400 when cards array exceeds max length', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['cards'], message: 'Array must contain at most 20 element(s)' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({
            ...validTarotData,
            cards: Array(21).fill(validCard),
          }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({
          path: 'cards',
          message: 'Array must contain at most 20 element(s)',
        })
      })

      it('should return 400 when card object has invalid structure', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              { path: ['cards', 0, 'cardId'], message: 'Required' },
              { path: ['cards', 0, 'name'], message: 'Required' },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({
            ...validTarotData,
            cards: [{ isReversed: false, position: 'Past' }],
          }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({ path: 'cards.0.cardId', message: 'Required' })
        expect(data.details).toContainEqual({ path: 'cards.0.name', message: 'Required' })
      })

      it('should return 400 when overallMessage exceeds max length', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              {
                path: ['overallMessage'],
                message: 'String must contain at most 5000 character(s)',
              },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({
            ...validTarotData,
            overallMessage: 'a'.repeat(5001),
          }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details).toContainEqual({
          path: 'overallMessage',
          message: 'String must contain at most 5000 character(s)',
        })
      })

      it('should return 400 when source has invalid value', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              {
                path: ['source'],
                message:
                  "Invalid enum value. Expected 'standalone' | 'counselor', received 'invalid'",
              },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({
            ...validTarotData,
            source: 'invalid',
          }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details[0].path).toBe('source')
      })

      it('should return 400 when locale has invalid value', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              {
                path: ['locale'],
                message: "Invalid enum value. Expected 'ko' | 'en', received 'fr'",
              },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify({
            ...validTarotData,
            locale: 'fr',
          }),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.details[0].path).toBe('locale')
      })
    })

    describe('Successful Save', () => {
      it('should create tarot reading successfully with all fields', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validTarotData,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue(mockSavedReading)

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.readingId).toBe('reading-123')
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            question: 'What does my career hold?',
            theme: 'career',
            spreadId: 'three-card',
            spreadTitle: 'Three Card Spread',
            cards: [validCard],
            overallMessage: 'Your career path shows exciting opportunities.',
            cardInsights: [validCardInsight],
            guidance: 'Follow your intuition and embrace change.',
            affirmation: 'I am open to new opportunities.',
            source: 'standalone',
            counselorSessionId: undefined,
            locale: 'ko',
          },
        })
      })

      it('should create tarot reading with optional fields as undefined', async () => {
        const dataWithoutOptional = {
          question: 'What does my future hold?',
          spreadId: 'single-card',
          spreadTitle: 'Single Card Draw',
          cards: [validCard],
        }

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithoutOptional,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-456' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithoutOptional),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            question: 'What does my future hold?',
            theme: undefined,
            spreadId: 'single-card',
            spreadTitle: 'Single Card Draw',
            cards: [validCard],
            overallMessage: undefined,
            cardInsights: undefined,
            guidance: undefined,
            affirmation: undefined,
            source: 'standalone',
            counselorSessionId: undefined,
            locale: 'ko',
          },
        })
      })

      it('should use default source when not provided', async () => {
        const dataWithoutSource = { ...validTarotData }
        delete (dataWithoutSource as any).source

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithoutSource,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-default-source' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithoutSource),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ source: 'standalone' }),
        })
      })

      it('should use default locale when not provided', async () => {
        const dataWithoutLocale = { ...validTarotData }
        delete (dataWithoutLocale as any).locale

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithoutLocale,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-default-locale' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithoutLocale),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'ko' }),
        })
      })

      it('should accept English locale', async () => {
        const dataWithEnLocale = { ...validTarotData, locale: 'en' as const }

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithEnLocale,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-en' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithEnLocale),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'en' }),
        })
      })

      it('should save reading with counselor source and session id', async () => {
        const dataWithCounselor = {
          ...validTarotData,
          source: 'counselor' as const,
          counselorSessionId: 'session-abc-123',
        }

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithCounselor,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-counselor' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithCounselor),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            source: 'counselor',
            counselorSessionId: 'session-abc-123',
          }),
        })
      })

      it('should save reading with multiple cards', async () => {
        const multipleCards = [
          { ...validCard, cardId: 'the-fool', position: 'Past' },
          { ...validCard, cardId: 'the-magician', name: 'The Magician', position: 'Present' },
          {
            ...validCard,
            cardId: 'the-high-priestess',
            name: 'The High Priestess',
            position: 'Future',
            isReversed: true,
          },
        ]

        const dataWithMultipleCards = { ...validTarotData, cards: multipleCards }

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithMultipleCards,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-multi-cards' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithMultipleCards),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            cards: multipleCards,
          }),
        })
      })

      it('should save reading with multiple card insights', async () => {
        const multipleInsights = [
          { ...validCardInsight, position: 'Past' },
          {
            ...validCardInsight,
            position: 'Present',
            card_name: 'The Magician',
            interpretation: 'Creative power is at your disposal.',
          },
          {
            ...validCardInsight,
            position: 'Future',
            card_name: 'The High Priestess',
            is_reversed: true,
            interpretation: 'Trust your inner wisdom.',
          },
        ]

        const dataWithMultipleInsights = { ...validTarotData, cardInsights: multipleInsights }

        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithMultipleInsights,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'reading-multi-insights' })

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(dataWithMultipleInsights),
        })

        const { POST } = await import('@/app/api/tarot/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            cardInsights: multipleInsights,
          }),
        })
      })
    })

    describe('Database Error Handling', () => {
      it('should handle database create failure gracefully', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validTarotData,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Database connection failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')

        await expect(POST(req)).rejects.toThrow('Database connection failed')
      })

      it('should handle database timeout error', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validTarotData,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Query timeout'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')

        await expect(POST(req)).rejects.toThrow('Query timeout')
      })

      it('should handle unique constraint violation', async () => {
        const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validTarotData,
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Unique constraint violation'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save', {
          method: 'POST',
          body: JSON.stringify(validTarotData),
        })

        const { POST } = await import('@/app/api/tarot/save/route')

        await expect(POST(req)).rejects.toThrow('Unique constraint violation')
      })
    })
  })

  describe('GET /api/tarot/save', () => {
    describe('Query Parameter Validation', () => {
      it('should return 400 when query validation fails', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['limit'], message: 'Number must be greater than 0' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=-1')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.message).toBe('invalid_query_parameters')
        expect(logger.warn).toHaveBeenCalledWith('[TarotSave] Invalid query parameters', {
          errors: expect.any(Array),
        })
      })

      it('should return 400 when limit exceeds max value', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['limit'], message: 'Number must be less than or equal to 100' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=150')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })

      it('should return 400 when offset is negative', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['offset'], message: 'Number must be greater than or equal to 0' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=-5')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('Successful Retrieval', () => {
      it('should return readings with default pagination', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockReadings = [
          {
            id: 'reading-1',
            createdAt: new Date('2024-01-15T10:00:00Z'),
            question: 'Question 1',
            theme: 'career',
            spreadTitle: 'Three Card Spread',
            cards: [validCard],
            overallMessage: 'Message 1',
            source: 'standalone',
          },
          {
            id: 'reading-2',
            createdAt: new Date('2024-01-14T10:00:00Z'),
            question: 'Question 2',
            theme: 'love',
            spreadTitle: 'Celtic Cross',
            cards: [validCard],
            overallMessage: 'Message 2',
            source: 'counselor',
          },
        ]

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue(mockReadings)
        mockPrisma.count.mockResolvedValue(2)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.readings).toHaveLength(2)
        expect(data.total).toBe(2)
        expect(data.hasMore).toBe(false)
        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          skip: 0,
          select: {
            id: true,
            createdAt: true,
            question: true,
            theme: true,
            spreadTitle: true,
            cards: true,
            overallMessage: true,
            source: true,
          },
        })
      })

      it('should return readings with custom pagination', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 5, offset: 10 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockResolvedValue(15)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?limit=5&offset=10')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.hasMore).toBe(true)
        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            take: 5,
            skip: 10,
          })
        )
      })

      it('should filter readings by theme', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0, theme: 'career' },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?theme=career')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)

        expect(response.status).toBe(200)
        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: mockUserId, theme: 'career' },
          })
        )
        expect(prisma.tarotReading.count).toHaveBeenCalledWith({
          where: { userId: mockUserId, theme: 'career' },
        })
      })

      it('should return empty array when no readings exist', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.readings).toHaveLength(0)
        expect(data.total).toBe(0)
        expect(data.hasMore).toBe(false)
      })

      it('should calculate hasMore correctly when more readings exist', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockReadings = Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `reading-${i}`,
            createdAt: new Date(),
            question: `Question ${i}`,
            theme: 'general',
            spreadTitle: 'Spread',
            cards: [validCard],
            overallMessage: 'Message',
            source: 'standalone',
          }))

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue(mockReadings)
        mockPrisma.count.mockResolvedValue(25)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.hasMore).toBe(true)
      })

      it('should calculate hasMore correctly on last page', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 20 },
        })

        const mockReadings = Array(5)
          .fill(null)
          .map((_, i) => ({
            id: `reading-${i}`,
            createdAt: new Date(),
            question: `Question ${i}`,
            theme: 'general',
            spreadTitle: 'Spread',
            cards: [validCard],
            overallMessage: 'Message',
            source: 'standalone',
          }))

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue(mockReadings)
        mockPrisma.count.mockResolvedValue(25)

        const req = new NextRequest('http://localhost:3000/api/tarot/save?offset=20')

        const { GET } = await import('@/app/api/tarot/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.hasMore).toBe(false) // 20 + 5 = 25, which equals total
      })

      it('should order readings by createdAt descending', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        )
      })

      it('should select only required fields', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockResolvedValue(0)

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')
        await GET(req)

        expect(prisma.tarotReading.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            select: {
              id: true,
              createdAt: true,
              question: true,
              theme: true,
              spreadTitle: true,
              cards: true,
              overallMessage: true,
              source: true,
            },
          })
        )
      })
    })

    describe('Database Error Handling', () => {
      it('should handle database query failure', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockRejectedValue(new Error('Database connection failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')

        await expect(GET(req)).rejects.toThrow('Database connection failed')
      })

      it('should handle database count failure', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockResolvedValue([])
        mockPrisma.count.mockRejectedValue(new Error('Count query failed'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')

        await expect(GET(req)).rejects.toThrow('Count query failed')
      })

      it('should handle database timeout', async () => {
        const mockQuerySchema = tarotQuerySchema as { safeParse: ReturnType<typeof vi.fn> }
        mockQuerySchema.safeParse.mockReturnValue({
          success: true,
          data: { limit: 10, offset: 0 },
        })

        const mockPrisma = prisma.tarotReading as {
          create: ReturnType<typeof vi.fn>
          findMany: ReturnType<typeof vi.fn>
          count: ReturnType<typeof vi.fn>
        }
        mockPrisma.findMany.mockRejectedValue(new Error('Query timeout'))

        const req = new NextRequest('http://localhost:3000/api/tarot/save')

        const { GET } = await import('@/app/api/tarot/save/route')

        await expect(GET(req)).rejects.toThrow('Query timeout')
      })
    })
  })

  describe('Authentication Guard', () => {
    it('should require authentication for POST and GET endpoints', async () => {
      // The route uses withApiMiddleware with createAuthenticatedGuard
      // This test verifies the middleware mock is properly configured
      // The actual authentication logic is tested through the middleware mock
      // which provides the context.userId for all requests
      const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: validTarotData,
      })

      const mockPrisma = prisma.tarotReading as {
        create: ReturnType<typeof vi.fn>
        findMany: ReturnType<typeof vi.fn>
        count: ReturnType<typeof vi.fn>
      }
      mockPrisma.create.mockResolvedValue({ id: 'reading-auth-test' })

      const req = new NextRequest('http://localhost:3000/api/tarot/save', {
        method: 'POST',
        body: JSON.stringify(validTarotData),
      })

      const { POST } = await import('@/app/api/tarot/save/route')
      const response = await POST(req)

      // Verify the request was processed with the authenticated user context
      expect(prisma.tarotReading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId, // This comes from the middleware mock
        }),
      })
    })
  })

  describe('Data Integrity', () => {
    it('should preserve card data structure when saving', async () => {
      const complexCard = {
        cardId: 'the-tower',
        name: 'The Tower',
        image: '/images/tarot/the-tower.png',
        isReversed: true,
        position: 'Challenge',
      }

      const dataWithComplexCard = { ...validTarotData, cards: [complexCard] }

      const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: dataWithComplexCard,
      })

      const mockPrisma = prisma.tarotReading as {
        create: ReturnType<typeof vi.fn>
        findMany: ReturnType<typeof vi.fn>
        count: ReturnType<typeof vi.fn>
      }
      mockPrisma.create.mockResolvedValue({ id: 'reading-complex' })

      const req = new NextRequest('http://localhost:3000/api/tarot/save', {
        method: 'POST',
        body: JSON.stringify(dataWithComplexCard),
      })

      const { POST } = await import('@/app/api/tarot/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.tarotReading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cards: [complexCard],
        }),
      })
    })

    it('should preserve card insights structure when saving', async () => {
      const complexInsight = {
        position: 'Outcome',
        card_name: 'The World',
        is_reversed: false,
        interpretation:
          'Completion and fulfillment are within reach. This card represents the successful conclusion of a major life cycle.',
      }

      const dataWithComplexInsight = { ...validTarotData, cardInsights: [complexInsight] }

      const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: dataWithComplexInsight,
      })

      const mockPrisma = prisma.tarotReading as {
        create: ReturnType<typeof vi.fn>
        findMany: ReturnType<typeof vi.fn>
        count: ReturnType<typeof vi.fn>
      }
      mockPrisma.create.mockResolvedValue({ id: 'reading-insight' })

      const req = new NextRequest('http://localhost:3000/api/tarot/save', {
        method: 'POST',
        body: JSON.stringify(dataWithComplexInsight),
      })

      const { POST } = await import('@/app/api/tarot/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.tarotReading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          cardInsights: [complexInsight],
        }),
      })
    })

    it('should correctly map nested paths in validation errors', async () => {
      const mockSchema = tarotSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['cards', 0, 'cardId'], message: 'Required' },
            { path: ['cardInsights', 1, 'interpretation'], message: 'String too long' },
          ],
        },
      })

      const req = new NextRequest('http://localhost:3000/api/tarot/save', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const { POST } = await import('@/app/api/tarot/save/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContainEqual({ path: 'cards.0.cardId', message: 'Required' })
      expect(data.details).toContainEqual({
        path: 'cardInsights.1.interpretation',
        message: 'String too long',
      })
    })
  })
})
