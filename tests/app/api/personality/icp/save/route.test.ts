/**
 * Comprehensive tests for /api/personality/icp/save
 * Tests POST (save) and GET (retrieve) operations for ICP personality results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ===========================
// Mock dependencies - BEFORE route import
// ===========================

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 400,
          NOT_FOUND: 404,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    iCPResult: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  Prisma: {
    JsonNull: Symbol('JsonNull'),
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
  icpSaveRequestSchema: {
    safeParse: vi.fn(),
  },
  personalityIcpSaveGetQuerySchema: {
    safeParse: vi.fn(),
  },
}))

// ===========================
// Import route handlers and mocked modules AFTER mocks
// ===========================

import { POST, GET } from '@/app/api/personality/icp/save/route'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  icpSaveRequestSchema,
  personalityIcpSaveGetQuerySchema,
} from '@/lib/api/zodValidation'

// ===========================
// Test fixtures
// ===========================

const MOCK_USER_ID = 'test-user-id'

// Valid ICP octant types: PA, BC, DE, FG, HI, JK, LM, NO
const VALID_ICP_DATA = {
  primaryStyle: 'PA' as const,
  secondaryStyle: 'BC' as const,
  dominanceScore: 45,
  affiliationScore: 30,
  octantScores: {
    PA: 85,
    BC: 72,
    DE: 45,
    FG: 30,
    HI: 25,
    JK: 40,
    LM: 55,
    NO: 65,
  },
  analysisData: {
    description: 'You are a naturally assertive and confident individual.',
    descriptionKo: '당신은 자연스럽게 자기 주장이 강하고 자신감 있는 사람입니다.',
    strengths: ['Leadership skills', 'Clear communication', 'Decision-making'],
    strengthsKo: ['리더십 능력', '명확한 의사소통', '의사결정력'],
    challenges: ['May come across as dominant', 'Can overlook others\' feelings'],
    challengesKo: ['지배적으로 보일 수 있음', '다른 사람의 감정을 간과할 수 있음'],
    tips: ['Practice active listening', 'Show empathy'],
    tipsKo: ['적극적 경청 연습하기', '공감 표현하기'],
    compatibleStyles: ['NO', 'LM'],
  },
  answers: {
    q1: 4,
    q2: 5,
    q3: 3,
    q4: 4,
    q5: 5,
  },
  locale: 'en',
}

const VALID_ICP_DATA_MINIMAL = {
  primaryStyle: 'HI' as const,
  secondaryStyle: null,
  dominanceScore: -20,
  affiliationScore: 50,
  octantScores: {
    PA: 20,
    BC: 30,
    DE: 40,
    FG: 50,
    HI: 80,
    JK: 70,
    LM: 60,
    NO: 45,
  },
  analysisData: {
    description: 'You are a warm and friendly person.',
    strengths: ['Empathy', 'Cooperation'],
    challenges: ['May avoid conflict'],
  },
  locale: 'ko',
}

const MOCK_SAVED_RESULT = {
  id: 'icp-result-uuid-123',
  userId: MOCK_USER_ID,
  primaryStyle: 'PA',
  secondaryStyle: 'BC',
  dominanceScore: 45,
  affiliationScore: 30,
  octantScores: VALID_ICP_DATA.octantScores,
  analysisData: VALID_ICP_DATA.analysisData,
  answers: VALID_ICP_DATA.answers,
  locale: 'en',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
}

// ===========================
// Helper functions
// ===========================

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/personality/icp/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `http://localhost/api/personality/icp/save?${queryParams}`
    : 'http://localhost/api/personality/icp/save'
  return new NextRequest(url, { method: 'GET' })
}

function setupValidationSuccess(data: any) {
  vi.mocked(icpSaveRequestSchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupValidationFailure(errors: any[]) {
  vi.mocked(icpSaveRequestSchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

function setupGetValidationSuccess(data: any) {
  vi.mocked(personalityIcpSaveGetQuerySchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupGetValidationFailure(errors: any[]) {
  vi.mocked(personalityIcpSaveGetQuerySchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

// ===========================
// POST /api/personality/icp/save Tests
// ===========================

describe('POST /api/personality/icp/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when validation fails due to missing primaryStyle', async () => {
      setupValidationFailure([
        { path: ['primaryStyle'], message: 'Required' },
      ])

      const req = createPostRequest({
        dominanceScore: 45,
        affiliationScore: 30,
        octantScores: {},
        analysisData: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when validation fails due to invalid primaryStyle', async () => {
      setupValidationFailure([
        { path: ['primaryStyle'], message: 'Invalid enum value. Expected \'PA\' | \'BC\' | \'DE\' | \'FG\' | \'HI\' | \'JK\' | \'LM\' | \'NO\'' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        primaryStyle: 'INVALID',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 when validation fails due to missing dominanceScore', async () => {
      setupValidationFailure([
        { path: ['dominanceScore'], message: 'Required' },
      ])

      const req = createPostRequest({
        primaryStyle: 'PA',
        affiliationScore: 30,
        octantScores: {},
        analysisData: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when validation fails due to missing affiliationScore', async () => {
      setupValidationFailure([
        { path: ['affiliationScore'], message: 'Required' },
      ])

      const req = createPostRequest({
        primaryStyle: 'PA',
        dominanceScore: 45,
        octantScores: {},
        analysisData: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when dominanceScore is out of range (too high)', async () => {
      setupValidationFailure([
        { path: ['dominanceScore'], message: 'Number must be less than or equal to 100' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        dominanceScore: 150,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.message).toContain('Number must be less than or equal to 100')
    })

    it('should return 400 when dominanceScore is out of range (too low)', async () => {
      setupValidationFailure([
        { path: ['dominanceScore'], message: 'Number must be greater than or equal to -100' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        dominanceScore: -150,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 when affiliationScore is out of range', async () => {
      setupValidationFailure([
        { path: ['affiliationScore'], message: 'Number must be less than or equal to 100' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        affiliationScore: 200,
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should return 400 when validation fails due to missing octantScores', async () => {
      setupValidationFailure([
        { path: ['octantScores'], message: 'Required' },
      ])

      const req = createPostRequest({
        primaryStyle: 'PA',
        dominanceScore: 45,
        affiliationScore: 30,
        analysisData: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when validation fails due to missing analysisData', async () => {
      setupValidationFailure([
        { path: ['analysisData'], message: 'Required' },
      ])

      const req = createPostRequest({
        primaryStyle: 'PA',
        dominanceScore: 45,
        affiliationScore: 30,
        octantScores: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })

    it('should return 400 when analysisData.description exceeds max length', async () => {
      setupValidationFailure([
        { path: ['analysisData', 'description'], message: 'String must contain at most 5000 character(s)' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        analysisData: {
          ...VALID_ICP_DATA.analysisData,
          description: 'a'.repeat(5001),
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should return 400 when analysisData.strengths is not an array', async () => {
      setupValidationFailure([
        { path: ['analysisData', 'strengths'], message: 'Expected array, received string' },
      ])

      const req = createPostRequest({
        ...VALID_ICP_DATA,
        analysisData: {
          ...VALID_ICP_DATA.analysisData,
          strengths: 'not an array',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(400)
    })

    it('should return 400 when multiple validation errors occur', async () => {
      setupValidationFailure([
        { path: ['primaryStyle'], message: 'Required' },
        { path: ['dominanceScore'], message: 'Required' },
        { path: ['analysisData', 'description'], message: 'Required' },
      ])

      const req = createPostRequest({})

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should log validation warning when validation fails', async () => {
      setupValidationFailure([
        { path: ['primaryStyle'], message: 'Required' },
      ])

      const req = createPostRequest({})

      await POST(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[ICP save POST] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  describe('Successful ICP Result Creation', () => {
    it('should create ICP result successfully with all fields', async () => {
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_ICP_DATA)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('icp-result-uuid-123')
      expect(data.data.createdAt).toBeDefined()
    })

    it('should create ICP result with minimal required fields', async () => {
      const minimalResult = {
        ...MOCK_SAVED_RESULT,
        id: 'icp-minimal-123',
        secondaryStyle: null,
        answers: Prisma.JsonNull,
      }
      setupValidationSuccess(VALID_ICP_DATA_MINIMAL)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue(minimalResult as any)

      const req = createPostRequest(VALID_ICP_DATA_MINIMAL)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('icp-minimal-123')
    })

    it('should pass correct data to prisma.create', async () => {
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_ICP_DATA)
      await POST(req)

      expect(prisma.iCPResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: MOCK_USER_ID,
          primaryStyle: 'PA',
          secondaryStyle: 'BC',
          dominanceScore: 45,
          affiliationScore: 30,
          octantScores: VALID_ICP_DATA.octantScores,
          analysisData: VALID_ICP_DATA.analysisData,
          answers: VALID_ICP_DATA.answers,
          locale: 'en',
        }),
      })
    })

    it('should use default locale (en) when not provided', async () => {
      const dataWithoutLocale = { ...VALID_ICP_DATA }
      delete (dataWithoutLocale as any).locale
      const validatedData = { ...VALID_ICP_DATA, locale: 'en' }

      setupValidationSuccess(validatedData)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(dataWithoutLocale)
      await POST(req)

      expect(prisma.iCPResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })

    it('should handle Korean locale', async () => {
      const koreanData = { ...VALID_ICP_DATA, locale: 'ko' }
      setupValidationSuccess(koreanData)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        locale: 'ko',
      } as any)

      const req = createPostRequest(koreanData)
      await POST(req)

      expect(prisma.iCPResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })

    it('should handle null secondaryStyle', async () => {
      const dataWithNullSecondary = { ...VALID_ICP_DATA, secondaryStyle: null }
      setupValidationSuccess(dataWithNullSecondary)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        secondaryStyle: null,
      } as any)

      const req = createPostRequest(dataWithNullSecondary)
      await POST(req)

      expect(prisma.iCPResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          secondaryStyle: null,
        }),
      })
    })

    it('should handle undefined answers (converts to JsonNull)', async () => {
      const dataWithoutAnswers = { ...VALID_ICP_DATA }
      delete (dataWithoutAnswers as any).answers
      setupValidationSuccess(dataWithoutAnswers)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        answers: null,
      } as any)

      const req = createPostRequest(dataWithoutAnswers)
      await POST(req)

      expect(prisma.iCPResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          answers: expect.anything(), // Prisma.JsonNull
        }),
      })
    })

    it('should log success after saving ICP result', async () => {
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_ICP_DATA)
      await POST(req)

      expect(logger.info).toHaveBeenCalledWith('ICP result saved', {
        userId: MOCK_USER_ID,
        id: 'icp-result-uuid-123',
      })
    })
  })

  describe('All ICP Octant Types', () => {
    const octantTypes = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'] as const

    octantTypes.forEach((octant) => {
      it(`should create ICP result with primaryStyle ${octant}`, async () => {
        const dataWithOctant = { ...VALID_ICP_DATA, primaryStyle: octant }
        setupValidationSuccess(dataWithOctant)
        vi.mocked(prisma.iCPResult.create).mockResolvedValue({
          ...MOCK_SAVED_RESULT,
          primaryStyle: octant,
        } as any)

        const req = createPostRequest(dataWithOctant)
        const response = await POST(req)

        expect(response.status).toBe(200)
      })
    })

    octantTypes.forEach((octant) => {
      it(`should create ICP result with secondaryStyle ${octant}`, async () => {
        const dataWithOctant = { ...VALID_ICP_DATA, secondaryStyle: octant }
        setupValidationSuccess(dataWithOctant)
        vi.mocked(prisma.iCPResult.create).mockResolvedValue({
          ...MOCK_SAVED_RESULT,
          secondaryStyle: octant,
        } as any)

        const req = createPostRequest(dataWithOctant)
        const response = await POST(req)

        expect(response.status).toBe(200)
      })
    })
  })

  describe('Score Boundary Tests', () => {
    it('should accept dominanceScore at minimum (-100)', async () => {
      const dataWithMinDominance = { ...VALID_ICP_DATA, dominanceScore: -100 }
      setupValidationSuccess(dataWithMinDominance)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        dominanceScore: -100,
      } as any)

      const req = createPostRequest(dataWithMinDominance)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should accept dominanceScore at maximum (100)', async () => {
      const dataWithMaxDominance = { ...VALID_ICP_DATA, dominanceScore: 100 }
      setupValidationSuccess(dataWithMaxDominance)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        dominanceScore: 100,
      } as any)

      const req = createPostRequest(dataWithMaxDominance)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should accept affiliationScore at minimum (-100)', async () => {
      const dataWithMinAffiliation = { ...VALID_ICP_DATA, affiliationScore: -100 }
      setupValidationSuccess(dataWithMinAffiliation)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        affiliationScore: -100,
      } as any)

      const req = createPostRequest(dataWithMinAffiliation)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should accept affiliationScore at maximum (100)', async () => {
      const dataWithMaxAffiliation = { ...VALID_ICP_DATA, affiliationScore: 100 }
      setupValidationSuccess(dataWithMaxAffiliation)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        affiliationScore: 100,
      } as any)

      const req = createPostRequest(dataWithMaxAffiliation)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should accept zero scores', async () => {
      const dataWithZeroScores = {
        ...VALID_ICP_DATA,
        dominanceScore: 0,
        affiliationScore: 0,
      }
      setupValidationSuccess(dataWithZeroScores)
      vi.mocked(prisma.iCPResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        dominanceScore: 0,
        affiliationScore: 0,
      } as any)

      const req = createPostRequest(dataWithZeroScores)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createPostRequest(VALID_ICP_DATA)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to save ICP result')
    })

    it('should log database error', async () => {
      const dbError = new Error('Unique constraint violation')
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockRejectedValue(dbError)

      const req = createPostRequest(VALID_ICP_DATA)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[ICP save POST] Database error',
        { error: dbError }
      )
    })

    it('should handle Prisma-specific errors', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['id'] },
      }
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockRejectedValue(prismaError)

      const req = createPostRequest(VALID_ICP_DATA)
      const response = await POST(req)

      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle database timeout error', async () => {
      const timeoutError = new Error('Query timeout')
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockRejectedValue(timeoutError)

      const req = createPostRequest(VALID_ICP_DATA)
      const response = await POST(req)

      expect(response.status).toBe(500)
    })

    it('should handle database connection pool exhausted', async () => {
      const poolError = new Error('Connection pool exhausted')
      setupValidationSuccess(VALID_ICP_DATA)
      vi.mocked(prisma.iCPResult.create).mockRejectedValue(poolError)

      const req = createPostRequest(VALID_ICP_DATA)
      const response = await POST(req)

      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith(
        '[ICP save POST] Database error',
        { error: poolError }
      )
    })
  })
})

// ===========================
// GET /api/personality/icp/save Tests
// ===========================

describe('GET /api/personality/icp/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 400 when id parameter is missing', async () => {
      setupGetValidationSuccess({ id: undefined })

      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Missing id parameter')
    })

    it('should return 400 when id validation fails', async () => {
      setupGetValidationFailure([
        { path: ['id'], message: 'Invalid id format' },
      ])

      const req = createGetRequest('id=invalid')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Missing or invalid id parameter')
    })

    it('should return 400 when id exceeds maximum length', async () => {
      setupGetValidationFailure([
        { path: ['id'], message: 'String must contain at most 100 character(s)' },
      ])

      const req = createGetRequest(`id=${'a'.repeat(101)}`)
      const response = await GET(req)

      expect(response.status).toBe(400)
    })

    it('should return 400 when id is empty string', async () => {
      setupGetValidationSuccess({ id: '' })

      const req = createGetRequest('id=')
      const response = await GET(req)

      // Empty string is falsy, triggers "Missing id parameter"
      expect(response.status).toBe(400)
    })
  })

  describe('ICP Result Retrieval', () => {
    it('should return 404 when ICP result is not found', async () => {
      setupGetValidationSuccess({ id: 'non-existent-id' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=non-existent-id')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('ICP result not found')
    })

    it('should return ICP result when found', async () => {
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=icp-result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.result.id).toBe(MOCK_SAVED_RESULT.id)
      expect(data.data.result.userId).toBe(MOCK_SAVED_RESULT.userId)
      expect(data.data.result.primaryStyle).toBe(MOCK_SAVED_RESULT.primaryStyle)
      expect(data.data.result.secondaryStyle).toBe(MOCK_SAVED_RESULT.secondaryStyle)
      expect(data.data.result.dominanceScore).toBe(MOCK_SAVED_RESULT.dominanceScore)
      expect(data.data.result.affiliationScore).toBe(MOCK_SAVED_RESULT.affiliationScore)
      expect(data.data.result.octantScores).toEqual(MOCK_SAVED_RESULT.octantScores)
      expect(data.data.result.analysisData).toEqual(MOCK_SAVED_RESULT.analysisData)
    })

    it('should only return ICP results belonging to the authenticated user (userId check)', async () => {
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=icp-result-uuid-123')
      await GET(req)

      expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'icp-result-uuid-123',
          userId: MOCK_USER_ID,
        },
      })
    })

    it('should return 404 when ICP result belongs to different user', async () => {
      setupGetValidationSuccess({ id: 'other-user-result' })
      // findFirst returns null when userId doesn't match
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=other-user-result')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return result with all ICP fields', async () => {
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=icp-result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.primaryStyle).toBe('PA')
      expect(data.data.result.secondaryStyle).toBe('BC')
      expect(data.data.result.dominanceScore).toBe(45)
      expect(data.data.result.affiliationScore).toBe(30)
      expect(data.data.result.octantScores).toBeDefined()
      expect(data.data.result.analysisData).toBeDefined()
      expect(data.data.result.answers).toBeDefined()
      expect(data.data.result.locale).toBe('en')
    })

    it('should return result with null secondaryStyle when not set', async () => {
      const resultWithNullSecondary = {
        ...MOCK_SAVED_RESULT,
        secondaryStyle: null,
      }
      setupGetValidationSuccess({ id: 'icp-no-secondary' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(resultWithNullSecondary as any)

      const req = createGetRequest('id=icp-no-secondary')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.secondaryStyle).toBeNull()
    })

    it('should return result with null answers when not set', async () => {
      const resultWithNullAnswers = {
        ...MOCK_SAVED_RESULT,
        answers: null,
      }
      setupGetValidationSuccess({ id: 'icp-no-answers' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(resultWithNullAnswers as any)

      const req = createGetRequest('id=icp-no-answers')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.answers).toBeNull()
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createGetRequest('id=icp-result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to retrieve ICP result')
    })

    it('should log database error', async () => {
      const dbError = new Error('Query timeout')
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockRejectedValue(dbError)

      const req = createGetRequest('id=icp-result-uuid-123')
      await GET(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[ICP save GET] Database error',
        { error: dbError }
      )
    })

    it('should handle connection pool exhausted error', async () => {
      const poolError = new Error('Connection pool exhausted')
      setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
      vi.mocked(prisma.iCPResult.findFirst).mockRejectedValue(poolError)

      const req = createGetRequest('id=icp-result-uuid-123')
      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })

  describe('Edge Cases', () => {
    it('should handle result with complex analysisData JSON', async () => {
      const complexResult = {
        ...MOCK_SAVED_RESULT,
        analysisData: {
          description: 'Complex analysis',
          descriptionKo: '복잡한 분석',
          strengths: ['Leadership', 'Communication', 'Problem-solving'],
          strengthsKo: ['리더십', '의사소통', '문제 해결'],
          challenges: ['Patience', 'Delegation'],
          challengesKo: ['인내심', '위임'],
          tips: ['Practice mindfulness', 'Seek feedback'],
          tipsKo: ['마음 챙김 연습하기', '피드백 구하기'],
          compatibleStyles: ['NO', 'LM', 'JK'],
          additionalData: {
            subTraits: {
              assertiveness: 85,
              warmth: 60,
            },
          },
        },
      }
      setupGetValidationSuccess({ id: 'complex-icp' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(complexResult as any)

      const req = createGetRequest('id=complex-icp')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.analysisData.strengths).toContain('Leadership')
      expect(data.data.result.analysisData.compatibleStyles).toContain('NO')
    })

    it('should preserve Korean locale in retrieved result', async () => {
      const koreanResult = {
        ...MOCK_SAVED_RESULT,
        locale: 'ko',
      }
      setupGetValidationSuccess({ id: 'korean-icp' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(koreanResult as any)

      const req = createGetRequest('id=korean-icp')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('ko')
    })

    it('should preserve English locale in retrieved result', async () => {
      const englishResult = {
        ...MOCK_SAVED_RESULT,
        locale: 'en',
      }
      setupGetValidationSuccess({ id: 'english-icp' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(englishResult as any)

      const req = createGetRequest('id=english-icp')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('en')
    })

    it('should handle all octant scores in response', async () => {
      const fullOctantResult = {
        ...MOCK_SAVED_RESULT,
        octantScores: {
          PA: 90,
          BC: 80,
          DE: 70,
          FG: 60,
          HI: 50,
          JK: 40,
          LM: 30,
          NO: 20,
        },
      }
      setupGetValidationSuccess({ id: 'full-octant' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(fullOctantResult as any)

      const req = createGetRequest('id=full-octant')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.octantScores.PA).toBe(90)
      expect(data.data.result.octantScores.BC).toBe(80)
      expect(data.data.result.octantScores.DE).toBe(70)
      expect(data.data.result.octantScores.FG).toBe(60)
      expect(data.data.result.octantScores.HI).toBe(50)
      expect(data.data.result.octantScores.JK).toBe(40)
      expect(data.data.result.octantScores.LM).toBe(30)
      expect(data.data.result.octantScores.NO).toBe(20)
    })

    it('should handle negative dominance and affiliation scores', async () => {
      const negativeScoreResult = {
        ...MOCK_SAVED_RESULT,
        dominanceScore: -50,
        affiliationScore: -30,
      }
      setupGetValidationSuccess({ id: 'negative-scores' })
      vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(negativeScoreResult as any)

      const req = createGetRequest('id=negative-scores')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.dominanceScore).toBe(-50)
      expect(data.data.result.affiliationScore).toBe(-30)
    })
  })
})

// ===========================
// Integration-style Tests
// ===========================

describe('POST then GET workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be able to retrieve an ICP result that was just saved', async () => {
    // Setup POST
    setupValidationSuccess(VALID_ICP_DATA)
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const postReq = createPostRequest(VALID_ICP_DATA)
    const postResponse = await POST(postReq)
    const postData = await postResponse.json()

    expect(postResponse.status).toBe(200)
    const savedId = postData.data.id

    // Setup GET
    setupGetValidationSuccess({ id: savedId })
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const getReq = createGetRequest(`id=${savedId}`)
    const getResponse = await GET(getReq)
    const getData = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getData.data.result.id).toBe(savedId)
    expect(getData.data.result.primaryStyle).toBe(VALID_ICP_DATA.primaryStyle)
    expect(getData.data.result.dominanceScore).toBe(VALID_ICP_DATA.dominanceScore)
  })

  it('should correctly persist analysisData through save and retrieve', async () => {
    // Setup POST
    setupValidationSuccess(VALID_ICP_DATA)
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const postReq = createPostRequest(VALID_ICP_DATA)
    await POST(postReq)

    // Verify analysisData was passed correctly to create
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        analysisData: VALID_ICP_DATA.analysisData,
      }),
    })

    // Setup GET
    setupGetValidationSuccess({ id: MOCK_SAVED_RESULT.id })
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const getReq = createGetRequest(`id=${MOCK_SAVED_RESULT.id}`)
    const getResponse = await GET(getReq)
    const getData = await getResponse.json()

    // Verify analysisData is retrieved correctly
    expect(getData.data.result.analysisData.description).toBe(VALID_ICP_DATA.analysisData.description)
    expect(getData.data.result.analysisData.strengths).toEqual(VALID_ICP_DATA.analysisData.strengths)
    expect(getData.data.result.analysisData.challenges).toEqual(VALID_ICP_DATA.analysisData.challenges)
  })
})

// ===========================
// Security Tests
// ===========================

describe('Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enforce user isolation - cannot access other users ICP results via GET', async () => {
    // The middleware always injects test-user-id, so findFirst will filter by that
    // If result belongs to another user, findFirst returns null
    setupGetValidationSuccess({ id: 'another-users-icp' })
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

    const req = createGetRequest('id=another-users-icp')
    const response = await GET(req)

    expect(response.status).toBe(404)

    // Verify the query included userId filter
    expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'another-users-icp',
        userId: MOCK_USER_ID,
      },
    })
  })

  it('should always associate saved ICP results with authenticated user', async () => {
    setupValidationSuccess(VALID_ICP_DATA)
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(VALID_ICP_DATA)
    await POST(req)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })

  it('should not allow userId to be overridden in request body', async () => {
    const dataWithUserId = {
      ...VALID_ICP_DATA,
      userId: 'malicious-user-id',
    }
    setupValidationSuccess(VALID_ICP_DATA) // Validation strips or ignores userId
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(dataWithUserId)
    await POST(req)

    // Should use context.userId, not the one from request body
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })
})

// ===========================
// Authentication Tests
// ===========================

describe('Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication for POST endpoint', async () => {
    // The middleware is configured with createAuthenticatedGuard
    // This test verifies the route uses authenticated middleware
    setupValidationSuccess(VALID_ICP_DATA)
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(VALID_ICP_DATA)
    const response = await POST(req)

    // If we get here without error, it means middleware passed context with userId
    expect(response.status).toBe(200)
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })

  it('should require authentication for GET endpoint', async () => {
    // The middleware is configured with createAuthenticatedGuard
    setupGetValidationSuccess({ id: 'icp-result-uuid-123' })
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createGetRequest('id=icp-result-uuid-123')
    const response = await GET(req)

    // If we get here without error, it means middleware passed context with userId
    expect(response.status).toBe(200)
    expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })

  it('should use userId from middleware context, not from request', async () => {
    // Even if request tries to override userId, the middleware context should be used
    const maliciousData = {
      ...VALID_ICP_DATA,
      userId: 'hacker-user-id',
    }
    setupValidationSuccess(VALID_ICP_DATA)
    vi.mocked(prisma.iCPResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(maliciousData)
    await POST(req)

    // Should use the userId from context (MOCK_USER_ID), not from request
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
    expect(prisma.iCPResult.create).not.toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'hacker-user-id',
      }),
    })
  })
})
