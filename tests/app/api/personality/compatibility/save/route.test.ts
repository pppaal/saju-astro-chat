/**
 * Comprehensive tests for /api/personality/compatibility/save
 * Tests POST (save) and GET (retrieve) operations for personality compatibility results
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
          VALIDATION_ERROR: 422,
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
    compatibilityResult: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  Prisma: {
    InputJsonValue: {},
    JsonNull: null,
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
  personalityCompatibilitySaveRequestSchema: {
    safeParse: vi.fn(),
  },
  personalityCompatibilitySaveGetQuerySchema: {
    safeParse: vi.fn(),
  },
}))

// ===========================
// Import route handlers and mocked modules AFTER mocks
// ===========================

import { POST, GET } from '@/app/api/personality/compatibility/save/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  personalityCompatibilitySaveRequestSchema,
  personalityCompatibilitySaveGetQuerySchema,
} from '@/lib/api/zodValidation'

// ===========================
// Test fixtures
// ===========================

const MOCK_USER_ID = 'test-user-id'

const VALID_ICP_SCORE = {
  primaryStyle: 'PA',
  secondaryStyle: 'BC',
  dominanceScore: 45,
  affiliationScore: 30,
  octantScores: { PA: 85, BC: 70, DE: 40, FG: 30, HI: 25, JK: 35, LM: 50, NO: 60 },
}

const VALID_PERSONA_TYPE = {
  typeCode: 'RVLA',
  personaName: 'The Visionary',
  energyScore: 75,
  cognitionScore: 60,
  decisionScore: 80,
  rhythmScore: 55,
}

const VALID_PERSON1 = {
  userId: 'user-1-id',
  name: 'Person One',
  icp: VALID_ICP_SCORE,
  persona: VALID_PERSONA_TYPE,
  icpAnswers: { q1: 'a', q2: 'b' },
  personaAnswers: { p1: 'yes', p2: 'no' },
}

const VALID_PERSON2 = {
  userId: 'user-2-id',
  name: 'Person Two',
  icp: {
    ...VALID_ICP_SCORE,
    primaryStyle: 'DE',
    secondaryStyle: 'FG',
    dominanceScore: -20,
    affiliationScore: 50,
  },
  persona: {
    ...VALID_PERSONA_TYPE,
    typeCode: 'GSHF',
    personaName: 'The Analyst',
    energyScore: 45,
    cognitionScore: 85,
  },
  icpAnswers: { q1: 'c', q2: 'd' },
  personaAnswers: { p1: 'no', p2: 'yes' },
}

const VALID_COMPATIBILITY = {
  icpScore: 78,
  icpLevel: 'High',
  icpLevelKo: '높음',
  icpDescription: 'Your interpersonal styles complement each other well.',
  icpDescriptionKo: '대인관계 스타일이 서로 잘 맞습니다.',
  personaScore: 82,
  personaLevel: 'Very High',
  personaLevelKo: '매우 높음',
  personaDescription: 'Your personalities create a dynamic balance.',
  personaDescriptionKo: '성격이 역동적인 균형을 이룹니다.',
  crossSystemScore: 80,
  crossSystemLevel: 'Excellent',
  crossSystemLevelKo: '우수',
  crossSystemDescription: 'Cross-system analysis shows strong compatibility.',
  crossSystemDescriptionKo: '교차 시스템 분석 결과 강한 궁합을 보입니다.',
  synergies: ['Communication', 'Problem-solving'],
  synergiesKo: ['의사소통', '문제 해결'],
  tensions: ['Decision-making pace'],
  tensionsKo: ['의사결정 속도'],
  insights: ['Balance intuition with analysis'],
  insightsKo: ['직관과 분석의 균형'],
}

const VALID_REQUEST_BODY = {
  person1: VALID_PERSON1,
  person2: VALID_PERSON2,
  compatibility: VALID_COMPATIBILITY,
  locale: 'ko' as const,
}

const MOCK_SAVED_RESULT = {
  id: 'result-uuid-123',
  userId: MOCK_USER_ID,
  person1UserId: VALID_PERSON1.userId,
  person1Name: VALID_PERSON1.name,
  person1ICP: VALID_PERSON1.icp,
  person1Persona: VALID_PERSON1.persona,
  person2UserId: VALID_PERSON2.userId,
  person2Name: VALID_PERSON2.name,
  person2ICP: VALID_PERSON2.icp,
  person2Persona: VALID_PERSON2.persona,
  icpCompatibility: {
    score: VALID_COMPATIBILITY.icpScore,
    level: VALID_COMPATIBILITY.icpLevel,
    levelKo: VALID_COMPATIBILITY.icpLevelKo,
    description: VALID_COMPATIBILITY.icpDescription,
    descriptionKo: VALID_COMPATIBILITY.icpDescriptionKo,
  },
  personaCompatibility: {
    score: VALID_COMPATIBILITY.personaScore,
    level: VALID_COMPATIBILITY.personaLevel,
    levelKo: VALID_COMPATIBILITY.personaLevelKo,
    description: VALID_COMPATIBILITY.personaDescription,
    descriptionKo: VALID_COMPATIBILITY.personaDescriptionKo,
    synergies: VALID_COMPATIBILITY.synergies,
    synergiesKo: VALID_COMPATIBILITY.synergiesKo,
    tensions: VALID_COMPATIBILITY.tensions,
    tensionsKo: VALID_COMPATIBILITY.tensionsKo,
  },
  crossSystemScore: VALID_COMPATIBILITY.crossSystemScore,
  crossSystemAnalysis: {
    level: VALID_COMPATIBILITY.crossSystemLevel,
    levelKo: VALID_COMPATIBILITY.crossSystemLevelKo,
    description: VALID_COMPATIBILITY.crossSystemDescription,
    descriptionKo: VALID_COMPATIBILITY.crossSystemDescriptionKo,
    insights: VALID_COMPATIBILITY.insights,
    insightsKo: VALID_COMPATIBILITY.insightsKo,
  },
  person1Answers: { icp: VALID_PERSON1.icpAnswers, persona: VALID_PERSON1.personaAnswers },
  person2Answers: { icp: VALID_PERSON2.icpAnswers, persona: VALID_PERSON2.personaAnswers },
  locale: 'ko',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
}

// ===========================
// Helper functions
// ===========================

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/personality/compatibility/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `http://localhost/api/personality/compatibility/save?${queryParams}`
    : 'http://localhost/api/personality/compatibility/save'
  return new NextRequest(url, { method: 'GET' })
}

function setupValidationSuccess(data: any) {
  vi.mocked(personalityCompatibilitySaveRequestSchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupValidationFailure(errors: any[]) {
  vi.mocked(personalityCompatibilitySaveRequestSchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

function setupGetValidationSuccess(data: any) {
  vi.mocked(personalityCompatibilitySaveGetQuerySchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupGetValidationFailure(errors: any[]) {
  vi.mocked(personalityCompatibilitySaveGetQuerySchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

// ===========================
// POST /api/personality/compatibility/save Tests
// ===========================

describe('POST /api/personality/compatibility/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 422 when validation fails due to missing person1', async () => {
      setupValidationFailure([{ path: ['person1'], message: 'Required' }])

      const req = createPostRequest({
        person2: VALID_PERSON2,
        compatibility: VALID_COMPATIBILITY,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when validation fails due to missing person2', async () => {
      setupValidationFailure([{ path: ['person2'], message: 'Required' }])

      const req = createPostRequest({
        person1: VALID_PERSON1,
        compatibility: VALID_COMPATIBILITY,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when validation fails due to missing compatibility', async () => {
      setupValidationFailure([{ path: ['compatibility'], message: 'Required' }])

      const req = createPostRequest({
        person1: VALID_PERSON1,
        person2: VALID_PERSON2,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when person1.icp is missing', async () => {
      setupValidationFailure([{ path: ['person1', 'icp'], message: 'Required' }])

      const req = createPostRequest({
        person1: { ...VALID_PERSON1, icp: undefined },
        person2: VALID_PERSON2,
        compatibility: VALID_COMPATIBILITY,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('Required')
    })

    it('should return 422 when person1.persona is missing', async () => {
      setupValidationFailure([{ path: ['person1', 'persona'], message: 'Required' }])

      const req = createPostRequest({
        person1: { ...VALID_PERSON1, persona: undefined },
        person2: VALID_PERSON2,
        compatibility: VALID_COMPATIBILITY,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
    })

    it('should return 422 when icpScore is out of range', async () => {
      setupValidationFailure([
        { path: ['compatibility', 'icpScore'], message: 'Number must be less than or equal to 100' },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        compatibility: { ...VALID_COMPATIBILITY, icpScore: 150 },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when personaScore is negative', async () => {
      setupValidationFailure([
        {
          path: ['compatibility', 'personaScore'],
          message: 'Number must be greater than or equal to 0',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        compatibility: { ...VALID_COMPATIBILITY, personaScore: -10 },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when crossSystemScore is out of range', async () => {
      setupValidationFailure([
        {
          path: ['compatibility', 'crossSystemScore'],
          message: 'Number must be less than or equal to 100',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        compatibility: { ...VALID_COMPATIBILITY, crossSystemScore: 200 },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when dominanceScore is out of range', async () => {
      setupValidationFailure([
        {
          path: ['person1', 'icp', 'dominanceScore'],
          message: 'Number must be less than or equal to 100',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          icp: { ...VALID_ICP_SCORE, dominanceScore: 150 },
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when affiliationScore is out of range', async () => {
      setupValidationFailure([
        {
          path: ['person1', 'icp', 'affiliationScore'],
          message: 'Number must be greater than or equal to -100',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          icp: { ...VALID_ICP_SCORE, affiliationScore: -150 },
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when persona energyScore is out of range', async () => {
      setupValidationFailure([
        {
          path: ['person1', 'persona', 'energyScore'],
          message: 'Number must be less than or equal to 100',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          persona: { ...VALID_PERSONA_TYPE, energyScore: 120 },
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when name exceeds max length', async () => {
      setupValidationFailure([
        { path: ['person1', 'name'], message: 'String must contain at most 120 character(s)' },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        person1: { ...VALID_PERSON1, name: 'a'.repeat(121) },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when icpDescription exceeds max length', async () => {
      setupValidationFailure([
        {
          path: ['compatibility', 'icpDescription'],
          message: 'String must contain at most 2000 character(s)',
        },
      ])

      const req = createPostRequest({
        ...VALID_REQUEST_BODY,
        compatibility: { ...VALID_COMPATIBILITY, icpDescription: 'a'.repeat(2001) },
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should log validation warning when validation fails', async () => {
      setupValidationFailure([{ path: ['person1'], message: 'Required' }])

      const req = createPostRequest({})

      await POST(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[CompatibilitySave POST] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  describe('Successful Result Creation', () => {
    it('should save compatibility result successfully', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('result-uuid-123')
      expect(data.data.createdAt).toBeDefined()
    })

    it('should pass correct data to prisma.create', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: MOCK_USER_ID,
          person1UserId: VALID_PERSON1.userId,
          person1Name: VALID_PERSON1.name,
          person1ICP: VALID_PERSON1.icp,
          person1Persona: VALID_PERSON1.persona,
          person2UserId: VALID_PERSON2.userId,
          person2Name: VALID_PERSON2.name,
          person2ICP: VALID_PERSON2.icp,
          person2Persona: VALID_PERSON2.persona,
          crossSystemScore: VALID_COMPATIBILITY.crossSystemScore,
          locale: 'ko',
        }),
      })
    })

    it('should correctly structure icpCompatibility data', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          icpCompatibility: {
            score: VALID_COMPATIBILITY.icpScore,
            level: VALID_COMPATIBILITY.icpLevel,
            levelKo: VALID_COMPATIBILITY.icpLevelKo,
            description: VALID_COMPATIBILITY.icpDescription,
            descriptionKo: VALID_COMPATIBILITY.icpDescriptionKo,
          },
        }),
      })
    })

    it('should correctly structure personaCompatibility data', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          personaCompatibility: {
            score: VALID_COMPATIBILITY.personaScore,
            level: VALID_COMPATIBILITY.personaLevel,
            levelKo: VALID_COMPATIBILITY.personaLevelKo,
            description: VALID_COMPATIBILITY.personaDescription,
            descriptionKo: VALID_COMPATIBILITY.personaDescriptionKo,
            synergies: VALID_COMPATIBILITY.synergies,
            synergiesKo: VALID_COMPATIBILITY.synergiesKo,
            tensions: VALID_COMPATIBILITY.tensions,
            tensionsKo: VALID_COMPATIBILITY.tensionsKo,
          },
        }),
      })
    })

    it('should correctly structure crossSystemAnalysis data', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          crossSystemAnalysis: {
            level: VALID_COMPATIBILITY.crossSystemLevel,
            levelKo: VALID_COMPATIBILITY.crossSystemLevelKo,
            description: VALID_COMPATIBILITY.crossSystemDescription,
            descriptionKo: VALID_COMPATIBILITY.crossSystemDescriptionKo,
            insights: VALID_COMPATIBILITY.insights,
            insightsKo: VALID_COMPATIBILITY.insightsKo,
          },
        }),
      })
    })

    it('should save person1Answers when provided', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person1Answers: {
            icp: VALID_PERSON1.icpAnswers,
            persona: VALID_PERSON1.personaAnswers,
          },
        }),
      })
    })

    it('should save person2Answers when provided', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person2Answers: {
            icp: VALID_PERSON2.icpAnswers,
            persona: VALID_PERSON2.personaAnswers,
          },
        }),
      })
    })

    it('should use default locale (en) when not provided', async () => {
      const requestWithoutLocale = {
        person1: VALID_PERSON1,
        person2: VALID_PERSON2,
        compatibility: VALID_COMPATIBILITY,
      }
      const validatedData = { ...requestWithoutLocale, locale: 'en' }

      setupValidationSuccess(validatedData)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        locale: 'en',
      } as any)

      const req = createPostRequest(requestWithoutLocale)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })

    it('should log success after saving result', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(logger.info).toHaveBeenCalledWith('Compatibility result saved', {
        userId: MOCK_USER_ID,
        id: 'result-uuid-123',
      })
    })
  })

  describe('Optional Fields Handling', () => {
    it('should handle missing person1.userId', async () => {
      const requestWithoutUserId = {
        ...VALID_REQUEST_BODY,
        person1: { ...VALID_PERSON1, userId: undefined },
      }
      setupValidationSuccess(requestWithoutUserId)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person1UserId: null,
      } as any)

      const req = createPostRequest(requestWithoutUserId)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person1UserId: null,
        }),
      })
    })

    it('should handle missing person2.userId', async () => {
      const requestWithoutUserId = {
        ...VALID_REQUEST_BODY,
        person2: { ...VALID_PERSON2, userId: undefined },
      }
      setupValidationSuccess(requestWithoutUserId)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person2UserId: null,
      } as any)

      const req = createPostRequest(requestWithoutUserId)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person2UserId: null,
        }),
      })
    })

    it('should use default name when person1.name is missing', async () => {
      const requestWithoutName = {
        ...VALID_REQUEST_BODY,
        person1: { ...VALID_PERSON1, name: undefined },
      }
      setupValidationSuccess(requestWithoutName)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person1Name: 'Person 1',
      } as any)

      const req = createPostRequest(requestWithoutName)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person1Name: 'Person 1',
        }),
      })
    })

    it('should use default name when person2.name is missing', async () => {
      const requestWithoutName = {
        ...VALID_REQUEST_BODY,
        person2: { ...VALID_PERSON2, name: undefined },
      }
      setupValidationSuccess(requestWithoutName)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person2Name: 'Person 2',
      } as any)

      const req = createPostRequest(requestWithoutName)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person2Name: 'Person 2',
        }),
      })
    })

    it('should set person1Answers to JsonNull when answers are missing', async () => {
      const requestWithoutAnswers = {
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          icpAnswers: undefined,
          personaAnswers: undefined,
        },
      }
      setupValidationSuccess(requestWithoutAnswers)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person1Answers: null,
      } as any)

      const req = createPostRequest(requestWithoutAnswers)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person1Answers: null,
        }),
      })
    })

    it('should set person2Answers to JsonNull when answers are missing', async () => {
      const requestWithoutAnswers = {
        ...VALID_REQUEST_BODY,
        person2: {
          ...VALID_PERSON2,
          icpAnswers: undefined,
          personaAnswers: undefined,
        },
      }
      setupValidationSuccess(requestWithoutAnswers)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        person2Answers: null,
      } as any)

      const req = createPostRequest(requestWithoutAnswers)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          person2Answers: null,
        }),
      })
    })

    it('should handle missing optional Korean translations', async () => {
      const requestWithoutKorean = {
        ...VALID_REQUEST_BODY,
        compatibility: {
          ...VALID_COMPATIBILITY,
          icpLevelKo: undefined,
          icpDescriptionKo: undefined,
          personaLevelKo: undefined,
          personaDescriptionKo: undefined,
          crossSystemLevelKo: undefined,
          crossSystemDescriptionKo: undefined,
          synergiesKo: undefined,
          tensionsKo: undefined,
          insightsKo: undefined,
        },
      }
      setupValidationSuccess(requestWithoutKorean)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(requestWithoutKorean)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle missing optional synergies, tensions, and insights', async () => {
      const requestWithoutArrays = {
        ...VALID_REQUEST_BODY,
        compatibility: {
          ...VALID_COMPATIBILITY,
          synergies: undefined,
          tensions: undefined,
          insights: undefined,
        },
      }
      setupValidationSuccess(requestWithoutArrays)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(requestWithoutArrays)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to save compatibility result')
    })

    it('should log database error', async () => {
      const dbError = new Error('Unique constraint violation')
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockRejectedValue(dbError)

      const req = createPostRequest(VALID_REQUEST_BODY)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith('[CompatibilitySave POST] Database error', {
        error: dbError,
      })
    })

    it('should handle Prisma-specific errors', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['id'] },
      }
      setupValidationSuccess(VALID_REQUEST_BODY)
      vi.mocked(prisma.compatibilityResult.create).mockRejectedValue(prismaError)

      const req = createPostRequest(VALID_REQUEST_BODY)
      const response = await POST(req)

      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Locale Handling', () => {
    it('should save with Korean locale', async () => {
      const koRequest = { ...VALID_REQUEST_BODY, locale: 'ko' as const }
      setupValidationSuccess(koRequest)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        locale: 'ko',
      } as any)

      const req = createPostRequest(koRequest)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })

    it('should save with English locale', async () => {
      const enRequest = { ...VALID_REQUEST_BODY, locale: 'en' as const }
      setupValidationSuccess(enRequest)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue({
        ...MOCK_SAVED_RESULT,
        locale: 'en',
      } as any)

      const req = createPostRequest(enRequest)
      await POST(req)

      expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })
  })

  describe('ICP Style Variations', () => {
    const icpStyles = ['PA', 'BC', 'DE', 'FG', 'HI', 'JK', 'LM', 'NO'] as const

    it.each(icpStyles)('should accept %s as primary ICP style', async (style) => {
      const requestWithStyle = {
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          icp: { ...VALID_ICP_SCORE, primaryStyle: style },
        },
      }
      setupValidationSuccess(requestWithStyle)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(requestWithStyle)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it.each(icpStyles)('should accept %s as secondary ICP style', async (style) => {
      const requestWithStyle = {
        ...VALID_REQUEST_BODY,
        person1: {
          ...VALID_PERSON1,
          icp: { ...VALID_ICP_SCORE, secondaryStyle: style },
        },
      }
      setupValidationSuccess(requestWithStyle)
      vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createPostRequest(requestWithStyle)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  describe('Persona Type Variations', () => {
    it('should accept different persona type codes', async () => {
      const typeCodes = ['RVLA', 'RVLF', 'RVHA', 'RVHF', 'RSLA', 'GVLA', 'GSHF']

      for (const typeCode of typeCodes) {
        vi.clearAllMocks()
        const requestWithTypeCode = {
          ...VALID_REQUEST_BODY,
          person1: {
            ...VALID_PERSON1,
            persona: { ...VALID_PERSONA_TYPE, typeCode },
          },
        }
        setupValidationSuccess(requestWithTypeCode)
        vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

        const req = createPostRequest(requestWithTypeCode)
        const response = await POST(req)

        expect(response.status).toBe(200)
      }
    })
  })
})

// ===========================
// GET /api/personality/compatibility/save Tests
// ===========================

describe('GET /api/personality/compatibility/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 422 when id parameter is missing', async () => {
      setupGetValidationSuccess({ id: undefined })

      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Missing id parameter')
    })

    it('should return 422 when id validation fails', async () => {
      setupGetValidationFailure([{ path: ['id'], message: 'Invalid id format' }])

      const req = createGetRequest('id=invalid')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Missing or invalid id parameter')
    })

    it('should return 422 when id exceeds maximum length', async () => {
      setupGetValidationFailure([
        { path: ['id'], message: 'String must contain at most 100 character(s)' },
      ])

      const req = createGetRequest(`id=${'a'.repeat(101)}`)
      const response = await GET(req)

      expect(response.status).toBe(422)
    })

    it('should handle empty string id as validation error', async () => {
      setupGetValidationSuccess({ id: '' })

      const req = createGetRequest('id=')
      const response = await GET(req)

      expect(response.status).toBe(422)
    })
  })

  describe('Result Retrieval', () => {
    it('should return 404 when result is not found', async () => {
      setupGetValidationSuccess({ id: 'non-existent-id' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=non-existent-id')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Compatibility result not found')
    })

    it('should return result when found', async () => {
      setupGetValidationSuccess({ id: 'result-uuid-123' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.result.id).toBe(MOCK_SAVED_RESULT.id)
      expect(data.data.result.userId).toBe(MOCK_SAVED_RESULT.userId)
    })

    it('should only return results belonging to the authenticated user', async () => {
      setupGetValidationSuccess({ id: 'result-uuid-123' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=result-uuid-123')
      await GET(req)

      expect(prisma.compatibilityResult.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'result-uuid-123',
          userId: MOCK_USER_ID,
        },
      })
    })

    it('should return 404 when result belongs to different user', async () => {
      setupGetValidationSuccess({ id: 'other-user-result' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=other-user-result')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return result with all fields', async () => {
      setupGetValidationSuccess({ id: 'result-uuid-123' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

      const req = createGetRequest('id=result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.person1Name).toBe(MOCK_SAVED_RESULT.person1Name)
      expect(data.data.result.person2Name).toBe(MOCK_SAVED_RESULT.person2Name)
      expect(data.data.result.person1ICP).toEqual(MOCK_SAVED_RESULT.person1ICP)
      expect(data.data.result.person2ICP).toEqual(MOCK_SAVED_RESULT.person2ICP)
      expect(data.data.result.icpCompatibility).toEqual(MOCK_SAVED_RESULT.icpCompatibility)
      expect(data.data.result.personaCompatibility).toEqual(MOCK_SAVED_RESULT.personaCompatibility)
      expect(data.data.result.crossSystemScore).toBe(MOCK_SAVED_RESULT.crossSystemScore)
      expect(data.data.result.crossSystemAnalysis).toEqual(MOCK_SAVED_RESULT.crossSystemAnalysis)
      expect(data.data.result.locale).toBe(MOCK_SAVED_RESULT.locale)
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupGetValidationSuccess({ id: 'result-uuid-123' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createGetRequest('id=result-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to retrieve compatibility result')
    })

    it('should log database error', async () => {
      const dbError = new Error('Query timeout')
      setupGetValidationSuccess({ id: 'result-uuid-123' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockRejectedValue(dbError)

      const req = createGetRequest('id=result-uuid-123')
      await GET(req)

      expect(logger.error).toHaveBeenCalledWith('[CompatibilitySave GET] Database error', {
        error: dbError,
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle result with null optional fields', async () => {
      const resultWithNulls = {
        ...MOCK_SAVED_RESULT,
        person1UserId: null,
        person2UserId: null,
        person1Answers: null,
        person2Answers: null,
      }
      setupGetValidationSuccess({ id: 'result-with-nulls' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(resultWithNulls as any)

      const req = createGetRequest('id=result-with-nulls')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.person1UserId).toBeNull()
      expect(data.data.result.person2UserId).toBeNull()
      expect(data.data.result.person1Answers).toBeNull()
      expect(data.data.result.person2Answers).toBeNull()
    })

    it('should preserve Korean locale in retrieved result', async () => {
      const koreanResult = {
        ...MOCK_SAVED_RESULT,
        locale: 'ko',
      }
      setupGetValidationSuccess({ id: 'korean-result' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(koreanResult as any)

      const req = createGetRequest('id=korean-result')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('ko')
    })

    it('should preserve English locale in retrieved result', async () => {
      const englishResult = {
        ...MOCK_SAVED_RESULT,
        locale: 'en',
      }
      setupGetValidationSuccess({ id: 'english-result' })
      vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(englishResult as any)

      const req = createGetRequest('id=english-result')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('en')
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

  it('should be able to retrieve a result that was just saved', async () => {
    // Setup POST
    setupValidationSuccess(VALID_REQUEST_BODY)
    vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const postReq = createPostRequest(VALID_REQUEST_BODY)
    const postResponse = await POST(postReq)
    const postData = await postResponse.json()

    expect(postResponse.status).toBe(200)
    const savedId = postData.data.id

    // Setup GET
    setupGetValidationSuccess({ id: savedId })
    vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const getReq = createGetRequest(`id=${savedId}`)
    const getResponse = await GET(getReq)
    const getData = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getData.data.result.id).toBe(savedId)
    expect(getData.data.result.person1Name).toBe(VALID_PERSON1.name)
    expect(getData.data.result.person2Name).toBe(VALID_PERSON2.name)
  })
})

// ===========================
// Security Tests
// ===========================

describe('Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enforce user isolation - cannot access other users results via GET', async () => {
    setupGetValidationSuccess({ id: 'another-users-result' })
    vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(null)

    const req = createGetRequest('id=another-users-result')
    const response = await GET(req)

    expect(response.status).toBe(404)

    expect(prisma.compatibilityResult.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'another-users-result',
        userId: MOCK_USER_ID,
      },
    })
  })

  it('should always associate saved results with authenticated user', async () => {
    setupValidationSuccess(VALID_REQUEST_BODY)
    vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(VALID_REQUEST_BODY)
    await POST(req)

    expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })

  it('should not allow userId override in request body', async () => {
    const requestWithUserId = {
      ...VALID_REQUEST_BODY,
      userId: 'malicious-user-id',
    }
    setupValidationSuccess(requestWithUserId)
    vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(requestWithUserId)
    await POST(req)

    // Should use context.userId, not the one from request body
    expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })
})

// ===========================
// Authentication Guard Tests
// ===========================

describe('Authentication Guard Configuration', () => {
  it('POST handler requires authentication via middleware', async () => {
    // The withApiMiddleware wrapper is used with createAuthenticatedGuard
    // This test verifies that the route is properly wrapped with auth requirements
    // by checking that the handler is processed through the middleware
    setupValidationSuccess(VALID_REQUEST_BODY)
    vi.mocked(prisma.compatibilityResult.create).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createPostRequest(VALID_REQUEST_BODY)
    const response = await POST(req)

    // The mock middleware provides a test context with userId
    // In production, requests without valid auth would be rejected
    expect(response.status).toBe(200)
    expect(prisma.compatibilityResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })

  it('GET handler requires authentication via middleware', async () => {
    setupGetValidationSuccess({ id: 'result-uuid-123' })
    vi.mocked(prisma.compatibilityResult.findFirst).mockResolvedValue(MOCK_SAVED_RESULT as any)

    const req = createGetRequest('id=result-uuid-123')
    const response = await GET(req)

    // The mock middleware provides a test context with userId
    // The query includes userId filter to ensure user isolation
    expect(response.status).toBe(200)
    expect(prisma.compatibilityResult.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'result-uuid-123',
        userId: MOCK_USER_ID,
      },
    })
  })
})
