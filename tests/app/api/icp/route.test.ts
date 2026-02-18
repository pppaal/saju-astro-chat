import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      return handler(req, context)
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'ko'),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    iCPResult: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
  Prisma: { JsonObject: {} },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: { BAD_REQUEST: 400, SERVER_ERROR: 500 },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  icpSaveSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.primaryStyle) {
        return {
          success: false,
          error: {
            issues: [{ message: 'Missing required fields', path: ['primaryStyle'] }],
          },
        }
      }
      return { success: true, data }
    }),
  },
  createValidationErrorResponse: vi.fn((zodError: any) => {
    const { NextResponse } = require('next/server')
    const details = (zodError.issues || []).map((e: any) => ({
      path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
      message: e.message,
    }))
    return NextResponse.json({ error: 'validation_failed', details }, { status: 400 })
  }),
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER mocks are registered
// ---------------------------------------------------------------------------

import { GET, POST } from '@/app/api/icp/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { icpSaveSchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Test data factories
// ---------------------------------------------------------------------------

const MOCK_USER_ID = 'test-user-id'

function createSavedICPResult(overrides: Record<string, unknown> = {}) {
  return {
    id: 'icp-result-1',
    primaryStyle: 'PA',
    secondaryStyle: 'NO',
    dominanceScore: 72.5,
    affiliationScore: 45.3,
    octantScores: {
      PA: 72.5,
      BC: 30.0,
      DE: 15.0,
      FG: 10.0,
      HI: 20.0,
      JK: 50.0,
      LM: 60.0,
      NO: 65.0,
    },
    analysisData: { summary: 'Dominant-Assured interpersonal style' },
    locale: 'ko',
    createdAt: new Date('2025-06-01T00:00:00.000Z'),
    ...overrides,
  }
}

function createICPSavePayload(overrides: Record<string, unknown> = {}) {
  return {
    primaryStyle: 'PA',
    secondaryStyle: 'NO',
    dominanceScore: 72.5,
    affiliationScore: 45.3,
    octantScores: {
      PA: 72.5,
      BC: 30.0,
      DE: 15.0,
      FG: 10.0,
      HI: 20.0,
      JK: 50.0,
      LM: 60.0,
      NO: 65.0,
    },
    analysisData: { summary: 'Dominant-Assured interpersonal style' },
    answers: { q1: 4, q2: 3, q3: 5 },
    locale: 'ko',
    ...overrides,
  }
}

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/icp', { method: 'GET' })
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/icp', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ICP API Route - GET /api/icp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return saved ICP result when one exists', async () => {
    const mockResult = createSavedICPResult()
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(mockResult as any)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.saved).toBe(true)
    expect(data.result).toBeDefined()
    expect(data.result.id).toBe('icp-result-1')
    expect(data.result.primaryStyle).toBe('PA')
    expect(data.result.secondaryStyle).toBe('NO')
    expect(data.result.dominanceScore).toBe(72.5)
    expect(data.result.affiliationScore).toBe(45.3)
  })

  it('should return { saved: false } when no result exists', async () => {
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.saved).toBe(false)
    expect(data.result).toBeUndefined()
  })

  it('should call findFirst with the correct userId and ordering', async () => {
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

    const request = makeGetRequest()
    await GET(request)

    expect(prisma.iCPResult.findFirst).toHaveBeenCalledTimes(1)
    expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: MOCK_USER_ID },
        orderBy: { createdAt: 'desc' },
        select: expect.objectContaining({
          id: true,
          testVersion: true,
          resultId: true,
          primaryStyle: true,
          secondaryStyle: true,
          dominanceScore: true,
          affiliationScore: true,
          confidence: true,
          axes: true,
          completionSeconds: true,
          missingAnswerCount: true,
          octantScores: true,
          analysisData: true,
          answers: true,
          locale: true,
          createdAt: true,
        }),
      })
    )
  })

  it('should include all selected fields in the result', async () => {
    const mockResult = createSavedICPResult()
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(mockResult as any)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    const result = data.result
    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('primaryStyle')
    expect(result).toHaveProperty('secondaryStyle')
    expect(result).toHaveProperty('dominanceScore')
    expect(result).toHaveProperty('affiliationScore')
    expect(result).toHaveProperty('octantScores')
    expect(result).toHaveProperty('analysisData')
    expect(result).toHaveProperty('locale')
    expect(result).toHaveProperty('createdAt')
  })

  it('should return the most recent result (ordered by createdAt desc)', async () => {
    const recentResult = createSavedICPResult({
      id: 'icp-result-latest',
      createdAt: new Date('2025-12-01T00:00:00.000Z'),
    })
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(recentResult as any)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    expect(data.result.id).toBe('icp-result-latest')
    // Verify the orderBy was passed correctly
    expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('should return octantScores as a JSON object', async () => {
    const mockResult = createSavedICPResult()
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(mockResult as any)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    const octantScores = data.result.octantScores
    expect(octantScores).toEqual({
      PA: 72.5,
      BC: 30.0,
      DE: 15.0,
      FG: 10.0,
      HI: 20.0,
      JK: 50.0,
      LM: 60.0,
      NO: 65.0,
    })
  })
})

describe('ICP API Route - POST /api/icp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save a new ICP result and return success', async () => {
    const payload = createICPSavePayload()
    const createdRecord = {
      id: 'icp-result-new',
      userId: MOCK_USER_ID,
      primaryStyle: payload.primaryStyle,
      secondaryStyle: payload.secondaryStyle,
      dominanceScore: payload.dominanceScore,
      affiliationScore: payload.affiliationScore,
      octantScores: payload.octantScores,
      analysisData: payload.analysisData,
      answers: payload.answers,
      locale: payload.locale,
      createdAt: new Date(),
    }

    vi.mocked(prisma.iCPResult.create).mockResolvedValue(createdRecord as any)

    const request = makePostRequest(payload)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.id).toBe('icp-result-new')
    expect(data.primaryStyle).toBe('PA')
    expect(data.secondaryStyle).toBe('NO')
    expect(data.dominanceScore).toBe(72.5)
    expect(data.affiliationScore).toBe(45.3)
    expect(data.message).toBe('ICP result saved successfully')
  })

  it('should return validation error when primaryStyle is missing', async () => {
    const invalidPayload = {
      secondaryStyle: 'NO',
      dominanceScore: 72.5,
      affiliationScore: 45.3,
    }

    const request = makePostRequest(invalidPayload)
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
    expect(data.details).toBeDefined()
    expect(Array.isArray(data.details)).toBe(true)
    expect(data.details.length).toBeGreaterThan(0)
    expect(data.details[0]).toHaveProperty('path')
    expect(data.details[0]).toHaveProperty('message')
  })

  it('should log a warning when validation fails', async () => {
    const invalidPayload = { secondaryStyle: 'NO' }

    const request = makePostRequest(invalidPayload)
    await POST(request)

    expect(logger.warn).toHaveBeenCalledWith(
      '[ICP] validation failed',
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ message: 'Missing required fields' }),
        ]),
      })
    )
  })

  it('should call prisma.iCPResult.create with correct data shape', async () => {
    const payload = createICPSavePayload()
    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-new',
      ...payload,
      userId: MOCK_USER_ID,
    } as any)

    const request = makePostRequest(payload)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledTimes(1)
    expect(prisma.iCPResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: MOCK_USER_ID,
          testVersion: 'icp_v2',
          resultId: null,
          primaryStyle: 'PA',
          secondaryStyle: 'NO',
          dominanceScore: 72.5,
          affiliationScore: 45.3,
          confidence: null,
          axes: {},
          completionSeconds: null,
          missingAnswerCount: 0,
          octantScores: payload.octantScores,
          analysisData: payload.analysisData,
          answers: payload.answers,
          locale: 'ko',
        }),
      })
    )
  })

  it('should save with optional fields defaulted when omitted', async () => {
    const minimalPayload = {
      primaryStyle: 'DE',
      secondaryStyle: 'FG',
      dominanceScore: 20.0,
      affiliationScore: 15.0,
    }

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-minimal',
      userId: MOCK_USER_ID,
      primaryStyle: 'DE',
      secondaryStyle: 'FG',
      dominanceScore: 20.0,
      affiliationScore: 15.0,
      octantScores: {},
      analysisData: {},
      answers: {},
      locale: 'en',
    } as any)

    const request = makePostRequest(minimalPayload)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
        primaryStyle: 'DE',
        secondaryStyle: 'FG',
        dominanceScore: 20.0,
        affiliationScore: 15.0,
        octantScores: {},
        analysisData: {},
        answers: {},
        locale: 'en',
      }),
    })
  })

  it('should default locale to "en" when not provided', async () => {
    const payloadWithoutLocale = createICPSavePayload()
    delete (payloadWithoutLocale as any).locale

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-no-locale',
      userId: MOCK_USER_ID,
      ...payloadWithoutLocale,
      locale: 'en',
    } as any)

    const request = makePostRequest(payloadWithoutLocale)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        locale: 'en',
      }),
    })
  })

  it('should default octantScores to empty object when not provided', async () => {
    const payloadWithoutOctant = createICPSavePayload()
    delete (payloadWithoutOctant as any).octantScores

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-no-octant',
      userId: MOCK_USER_ID,
      ...payloadWithoutOctant,
      octantScores: {},
    } as any)

    const request = makePostRequest(payloadWithoutOctant)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        octantScores: {},
      }),
    })
  })

  it('should default analysisData to empty object when not provided', async () => {
    const payloadWithoutAnalysis = createICPSavePayload()
    delete (payloadWithoutAnalysis as any).analysisData

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-no-analysis',
      userId: MOCK_USER_ID,
      ...payloadWithoutAnalysis,
      analysisData: {},
    } as any)

    const request = makePostRequest(payloadWithoutAnalysis)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        analysisData: {},
      }),
    })
  })

  it('should default answers to empty object when not provided', async () => {
    const payloadWithoutAnswers = createICPSavePayload()
    delete (payloadWithoutAnswers as any).answers

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-no-answers',
      userId: MOCK_USER_ID,
      ...payloadWithoutAnswers,
      answers: {},
    } as any)

    const request = makePostRequest(payloadWithoutAnswers)
    await POST(request)

    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        answers: {},
      }),
    })
  })

  it('should return the correct response shape on successful save', async () => {
    const payload = createICPSavePayload()
    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-shape',
      userId: MOCK_USER_ID,
      primaryStyle: 'PA',
      secondaryStyle: 'NO',
      dominanceScore: 72.5,
      affiliationScore: 45.3,
    } as any)

    const request = makePostRequest(payload)
    const response = await POST(request)
    const data = await response.json()

    // Verify response includes exactly the expected keys
    expect(data).toHaveProperty('success', true)
    expect(data).toHaveProperty('id', 'icp-result-shape')
    expect(data).toHaveProperty('primaryStyle', 'PA')
    expect(data).toHaveProperty('secondaryStyle', 'NO')
    expect(data).toHaveProperty('dominanceScore', 72.5)
    expect(data).toHaveProperty('affiliationScore', 45.3)
    expect(data).toHaveProperty('message', 'ICP result saved successfully')

    // Ensure no unexpected leaking of internal data
    expect(data).not.toHaveProperty('userId')
    expect(data).not.toHaveProperty('octantScores')
    expect(data).not.toHaveProperty('analysisData')
    expect(data).not.toHaveProperty('answers')
  })

  it('should format validation error details with path and message', async () => {
    const invalidPayload = { dominanceScore: 50 }

    const request = makePostRequest(invalidPayload)
    const response = await POST(request)
    const data = await response.json()

    expect(data.details).toEqual([
      {
        path: 'primaryStyle',
        message: 'Missing required fields',
      },
    ])
  })

  it('should use the authenticated userId from context, not from the request body', async () => {
    const payload = createICPSavePayload()
    // Attempt to inject a different userId in the body
    const payloadWithInjectedUserId = { ...payload, userId: 'attacker-id' }

    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-result-auth',
      userId: MOCK_USER_ID,
      ...payload,
    } as any)

    const request = makePostRequest(payloadWithInjectedUserId)
    await POST(request)

    // The create call must use the authenticated user, not the injected one
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })
})

describe('ICP API Route - Middleware integration', () => {
  it('GET should be exported as an async function (wrapped by withApiMiddleware)', () => {
    // The GET export is the result of withApiMiddleware wrapping the handler.
    // Verify it exists and is callable.
    expect(GET).toBeDefined()
    expect(typeof GET).toBe('function')
  })

  it('POST should be exported as an async function (wrapped by withApiMiddleware)', () => {
    expect(POST).toBeDefined()
    expect(typeof POST).toBe('function')
  })

  it('GET should invoke the inner handler with the middleware-injected context', async () => {
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

    const request = makeGetRequest()
    const response = await GET(request)
    const data = await response.json()

    // The withApiMiddleware mock injects userId: 'test-user-id' into context.
    // If the handler received context correctly, it calls findFirst with that userId.
    expect(prisma.iCPResult.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: MOCK_USER_ID },
      })
    )
    // And the route returns a valid response
    expect(data.saved).toBe(false)
  })

  it('POST should invoke the inner handler with the middleware-injected context', async () => {
    const payload = createICPSavePayload()
    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-ctx-test',
      userId: MOCK_USER_ID,
      ...payload,
    } as any)

    const request = makePostRequest(payload)
    const response = await POST(request)
    const data = await response.json()

    // The middleware mock injects the context; the handler passes context.userId to create
    expect(prisma.iCPResult.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
    expect(data.success).toBe(true)
  })

  it('both handlers should accept a NextRequest and return a NextResponse', async () => {
    vi.mocked(prisma.iCPResult.findFirst).mockResolvedValue(null)

    const getRequest = makeGetRequest()
    const getResponse = await GET(getRequest)
    expect(getResponse).toBeInstanceOf(NextResponse)

    const payload = createICPSavePayload()
    vi.mocked(prisma.iCPResult.create).mockResolvedValue({
      id: 'icp-type-test',
      userId: MOCK_USER_ID,
      ...payload,
    } as any)

    const postRequest = makePostRequest(payload)
    const postResponse = await POST(postRequest)
    expect(postResponse).toBeInstanceOf(NextResponse)
  })
})

describe('ICP API Route - Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('GET should propagate database errors', async () => {
    vi.mocked(prisma.iCPResult.findFirst).mockRejectedValue(new Error('Database connection failed'))

    const request = makeGetRequest()

    await expect(GET(request)).rejects.toThrow('Database connection failed')
  })

  it('POST should propagate database errors on create', async () => {
    const payload = createICPSavePayload()
    vi.mocked(prisma.iCPResult.create).mockRejectedValue(new Error('Unique constraint violation'))

    const request = makePostRequest(payload)

    await expect(POST(request)).rejects.toThrow('Unique constraint violation')
  })

  it('POST should propagate errors when request body is not valid JSON', async () => {
    // Create a request with an invalid body that will cause request.json() to throw
    const request = new NextRequest('http://localhost/api/icp', {
      method: 'POST',
      body: 'not-valid-json',
      headers: { 'Content-Type': 'application/json' },
    })

    await expect(POST(request)).rejects.toThrow()
  })
})
