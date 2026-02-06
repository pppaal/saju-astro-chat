/**
 * Comprehensive tests for /api/past-life/save
 * Tests POST (save) and GET (retrieve) operations for past life results
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
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pastLifeResult: {
      create: vi.fn(),
      findFirst: vi.fn(),
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
  pastLifeSaveRequestSchema: {
    safeParse: vi.fn(),
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    SERVER_ERROR: 500,
  },
}))

// Import mocked dependencies for assertions
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { pastLifeSaveRequestSchema } from '@/lib/api/zodValidation'

describe('/api/past-life/save', () => {
  const mockUserId = 'test-user-id'

  const validPastLifeData = {
    birthDate: '1990-05-15',
    birthTime: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    timezone: 'Asia/Seoul',
    karmaScore: 75,
    analysisData: {
      soulPattern: { type: 'explorer', description: 'A soul that seeks knowledge' },
      pastLife: { era: 'medieval', role: 'scholar' },
      soulJourney: { stage: 3, lessons: ['patience', 'compassion'] },
      karmicDebts: [{ type: 'relationship', intensity: 'medium' }],
      thisLifeMission: { primary: 'teaching', secondary: 'healing' },
      talentsCarried: ['intuition', 'creativity'],
      saturnLesson: { theme: 'discipline', area: 'career' },
    },
    locale: 'ko',
  }

  const mockSavedResult = {
    id: 'result-123',
    userId: mockUserId,
    birthDate: '1990-05-15',
    birthTime: '14:30',
    karmaScore: 75,
    analysisData: validPastLifeData.analysisData,
    locale: 'ko',
    createdAt: new Date('2024-01-15T10:00:00Z'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/past-life/save', () => {
    describe('Request Body Parsing', () => {
      it('should return 400 when request body is invalid JSON', async () => {
        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: 'not valid json',
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request body')
      })

      it('should return 400 when request body is empty', async () => {
        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: '',
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request body')
      })

      it('should return 400 when body parsing throws error', async () => {
        // Create a request with a body that causes JSON parsing to fail
        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: '{malformed: json}',
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('Invalid request body')
      })
    })

    describe('Validation', () => {
      it('should return 400 when validation fails with missing birthDate', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['birthDate'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify({ ...validPastLifeData, birthDate: undefined }),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('validation_failed')
        expect(data.details).toEqual([{ path: 'birthDate', message: 'Required' }])
        expect(logger.warn).toHaveBeenCalledWith(
          '[Past Life save] validation failed',
          expect.objectContaining({ errors: expect.any(Array) })
        )
      })

      it('should return 400 when validation fails with missing karmaScore', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['karmaScore'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify({ ...validPastLifeData, karmaScore: undefined }),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('validation_failed')
        expect(data.details).toContainEqual({ path: 'karmaScore', message: 'Required' })
      })

      it('should return 400 when validation fails with missing analysisData', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['analysisData'], message: 'Required' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify({ birthDate: '1990-05-15', karmaScore: 75 }),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('validation_failed')
        expect(data.details).toContainEqual({ path: 'analysisData', message: 'Required' })
      })

      it('should return 400 when karmaScore is out of range', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [{ path: ['karmaScore'], message: 'Number must be less than or equal to 100' }],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify({ ...validPastLifeData, karmaScore: 150 }),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('validation_failed')
      })

      it('should return 400 when multiple validation errors occur', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: false,
          error: {
            issues: [
              { path: ['birthDate'], message: 'Required' },
              { path: ['karmaScore'], message: 'Required' },
              { path: ['analysisData', 'soulPattern'], message: 'Required' },
            ],
          },
        })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify({}),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.error).toBe('validation_failed')
        expect(data.details).toHaveLength(3)
        expect(data.details).toContainEqual({ path: 'birthDate', message: 'Required' })
        expect(data.details).toContainEqual({ path: 'karmaScore', message: 'Required' })
        expect(data.details).toContainEqual({
          path: 'analysisData.soulPattern',
          message: 'Required',
        })
      })
    })

    describe('Successful Save', () => {
      it('should create result successfully with all fields', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validPastLifeData,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue(mockSavedResult)

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(validPastLifeData),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.id).toBe('result-123')
        expect(data.message).toBe('Past life result saved successfully')
        expect(prisma.pastLifeResult.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            birthDate: '1990-05-15',
            birthTime: '14:30',
            latitude: 37.5665,
            longitude: 126.978,
            timezone: 'Asia/Seoul',
            karmaScore: 75,
            analysisData: validPastLifeData.analysisData,
            locale: 'ko',
          },
        })
        expect(logger.info).toHaveBeenCalledWith(
          '[PastLife Save] Saved successfully',
          expect.objectContaining({
            userId: mockUserId,
            resultId: 'result-123',
            karmaScore: 75,
          })
        )
      })

      it('should create result with optional fields as null', async () => {
        const dataWithoutOptional = {
          birthDate: '1990-05-15',
          karmaScore: 50,
          analysisData: validPastLifeData.analysisData,
        }

        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithoutOptional,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'result-456' })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(dataWithoutOptional),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(prisma.pastLifeResult.create).toHaveBeenCalledWith({
          data: {
            userId: mockUserId,
            birthDate: '1990-05-15',
            birthTime: null,
            latitude: null,
            longitude: null,
            timezone: null,
            karmaScore: 50,
            analysisData: validPastLifeData.analysisData,
            locale: 'ko',
          },
        })
      })

      it('should use default locale when not provided', async () => {
        const dataWithoutLocale = { ...validPastLifeData }
        delete (dataWithoutLocale as any).locale

        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithoutLocale,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'result-789' })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(dataWithoutLocale),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.pastLifeResult.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'ko' }),
        })
      })

      it('should accept English locale', async () => {
        const dataWithEnLocale = { ...validPastLifeData, locale: 'en' }

        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: dataWithEnLocale,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockResolvedValue({ id: 'result-en' })

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(dataWithEnLocale),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)

        expect(response.status).toBe(200)
        expect(prisma.pastLifeResult.create).toHaveBeenCalledWith({
          data: expect.objectContaining({ locale: 'en' }),
        })
      })
    })

    describe('Database Error Handling', () => {
      it('should return 500 when database create fails', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validPastLifeData,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Database connection failed'))

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(validPastLifeData),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error).toBe('Failed to save past life result')
        expect(logger.error).toHaveBeenCalledWith(
          '[PastLife Save] Failed to save:',
          expect.any(Error)
        )
      })

      it('should return 500 when database throws unique constraint error', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validPastLifeData,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Unique constraint violation'))

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(validPastLifeData),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)

        expect(response.status).toBe(500)
        expect(logger.error).toHaveBeenCalled()
      })

      it('should return 500 when database throws timeout error', async () => {
        const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
        mockSchema.safeParse.mockReturnValue({
          success: true,
          data: validPastLifeData,
        })

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.create.mockRejectedValue(new Error('Query timeout'))

        const req = new NextRequest('http://localhost:3000/api/past-life/save', {
          method: 'POST',
          body: JSON.stringify(validPastLifeData),
        })

        const { POST } = await import('@/app/api/past-life/save/route')
        const response = await POST(req)

        expect(response.status).toBe(500)
        expect(logger.error).toHaveBeenCalled()
      })
    })
  })

  describe('GET /api/past-life/save', () => {
    describe('No Results Found', () => {
      it('should return saved: false when no results exist for user', async () => {
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockResolvedValue(null)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.saved).toBe(false)
        expect(data.result).toBeUndefined()
        expect(prisma.pastLifeResult.findFirst).toHaveBeenCalledWith({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            birthDate: true,
            birthTime: true,
            karmaScore: true,
            analysisData: true,
            locale: true,
            createdAt: true,
          },
        })
      })
    })

    describe('Results Found', () => {
      it('should return latest result when exists', async () => {
        const mockResult = {
          id: 'result-123',
          birthDate: '1990-05-15',
          birthTime: '14:30',
          karmaScore: 75,
          analysisData: validPastLifeData.analysisData,
          locale: 'ko',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockResolvedValue(mockResult)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.saved).toBe(true)
        expect(data.result.id).toBe('result-123')
        expect(data.result.birthDate).toBe('1990-05-15')
        expect(data.result.birthTime).toBe('14:30')
        expect(data.result.karmaScore).toBe(75)
        expect(data.result.locale).toBe('ko')
        expect(data.result.createdAt).toBe('2024-01-15T10:00:00.000Z')
        expect(data.result.analysisData).toEqual(validPastLifeData.analysisData)
      })

      it('should return result with correct select fields', async () => {
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockResolvedValue(mockSavedResult)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        await GET(req)

        expect(prisma.pastLifeResult.findFirst).toHaveBeenCalledWith({
          where: { userId: mockUserId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            birthDate: true,
            birthTime: true,
            karmaScore: true,
            analysisData: true,
            locale: true,
            createdAt: true,
          },
        })
      })

      it('should return result with null birthTime when not set', async () => {
        const mockResultWithoutTime = {
          id: 'result-no-time',
          birthDate: '1990-05-15',
          birthTime: null,
          karmaScore: 60,
          analysisData: validPastLifeData.analysisData,
          locale: 'ko',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        }

        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockResolvedValue(mockResultWithoutTime)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.saved).toBe(true)
        expect(data.result.birthTime).toBeNull()
      })

      it('should order results by createdAt descending', async () => {
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockResolvedValue(mockSavedResult)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        await GET(req)

        expect(prisma.pastLifeResult.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { createdAt: 'desc' },
          })
        )
      })
    })

    describe('Database Error Handling', () => {
      it('should return 500 with saved: false when database query fails', async () => {
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockRejectedValue(new Error('Database connection failed'))

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.saved).toBe(false)
        expect(data.error).toBe('Failed to fetch result')
        expect(logger.error).toHaveBeenCalledWith(
          '[PastLife Save] Failed to fetch:',
          expect.any(Error)
        )
      })

      it('should return 500 when database throws timeout error', async () => {
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockRejectedValue(new Error('Query timeout'))

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        const response = await GET(req)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.saved).toBe(false)
        expect(data.error).toBe('Failed to fetch result')
      })

      it('should log error with proper message when query fails', async () => {
        const dbError = new Error('Connection pool exhausted')
        const mockPrisma = prisma.pastLifeResult as {
          create: ReturnType<typeof vi.fn>
          findFirst: ReturnType<typeof vi.fn>
        }
        mockPrisma.findFirst.mockRejectedValue(dbError)

        const req = new NextRequest('http://localhost:3000/api/past-life/save')

        const { GET } = await import('@/app/api/past-life/save/route')
        await GET(req)

        expect(logger.error).toHaveBeenCalledWith('[PastLife Save] Failed to fetch:', dbError)
      })
    })
  })

  describe('Data Integrity', () => {
    it('should correctly map nested analysisData paths in validation errors', async () => {
      const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['analysisData', 'karmicDebts', 0, 'type'], message: 'Invalid type' },
          ],
        },
      })

      const req = new NextRequest('http://localhost:3000/api/past-life/save', {
        method: 'POST',
        body: JSON.stringify({
          ...validPastLifeData,
          analysisData: { ...validPastLifeData.analysisData, karmicDebts: [{ type: 123 }] },
        }),
      })

      const { POST } = await import('@/app/api/past-life/save/route')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toContainEqual({
        path: 'analysisData.karmicDebts.0.type',
        message: 'Invalid type',
      })
    })

    it('should store analysisData as JSON correctly', async () => {
      const complexAnalysisData = {
        soulPattern: { type: 'healer', levels: [1, 2, 3], metadata: { deep: { nested: true } } },
        pastLife: { era: 'ancient', roles: ['warrior', 'priest'] },
        soulJourney: { stage: 5, transitions: [] },
        karmicDebts: [],
        thisLifeMission: { goals: ['enlightenment'] },
        talentsCarried: [],
        saturnLesson: {},
      }

      const mockSchema = pastLifeSaveRequestSchema as { safeParse: ReturnType<typeof vi.fn> }
      mockSchema.safeParse.mockReturnValue({
        success: true,
        data: { ...validPastLifeData, analysisData: complexAnalysisData },
      })

      const mockPrisma = prisma.pastLifeResult as {
        create: ReturnType<typeof vi.fn>
        findFirst: ReturnType<typeof vi.fn>
      }
      mockPrisma.create.mockResolvedValue({ id: 'result-complex' })

      const req = new NextRequest('http://localhost:3000/api/past-life/save', {
        method: 'POST',
        body: JSON.stringify({ ...validPastLifeData, analysisData: complexAnalysisData }),
      })

      const { POST } = await import('@/app/api/past-life/save/route')
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.pastLifeResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          analysisData: complexAnalysisData,
        }),
      })
    })
  })
})
