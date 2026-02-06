import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock middleware as passthrough - must be before route import
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

      const result = await handler(req, context)

      if (result instanceof Response) return result

      if (result?.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          DATABASE_ERROR: 500,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// ---------------------------------------------------------------------------
// Mock Prisma client
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    personalityResult: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Mock Prisma namespace for InputJsonValue and DbNull
// ---------------------------------------------------------------------------
vi.mock('@prisma/client', () => ({
  Prisma: {
    InputJsonValue: {},
    DbNull: Symbol('DbNull'),
  },
}))

// ---------------------------------------------------------------------------
// Mock logger
// ---------------------------------------------------------------------------
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Mock Zod validation schema for personalitySaveRequestSchema
//
// Faithfully reproduces the real schema's required fields:
//   typeCode (string), personaName (string), avatarGender ('M'|'F'),
//   energyScore (number), cognitionScore (number), decisionScore (number),
//   rhythmScore (number), consistencyScore (number|null|undefined),
//   analysisData (object), answers (object|undefined)
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/zodValidation', () => ({
  personalitySaveRequestSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return {
          success: false,
          error: { issues: [{ message: 'Expected object' }] },
        }
      }
      if (!data.typeCode || typeof data.typeCode !== 'string') {
        return {
          success: false,
          error: { issues: [{ message: 'Missing or invalid typeCode' }] },
        }
      }
      if (!data.personaName || typeof data.personaName !== 'string') {
        return {
          success: false,
          error: { issues: [{ message: 'Missing or invalid personaName' }] },
        }
      }
      if (!data.avatarGender || !['M', 'F'].includes(data.avatarGender)) {
        return {
          success: false,
          error: { issues: [{ message: 'avatarGender must be M or F' }] },
        }
      }
      const numericFields = ['energyScore', 'cognitionScore', 'decisionScore', 'rhythmScore']
      for (const field of numericFields) {
        if (typeof data[field] !== 'number') {
          return {
            success: false,
            error: { issues: [{ message: `${field} must be a number` }] },
          }
        }
      }
      return { success: true, data }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------
import { GET, POST } from '@/app/api/personality/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { personalitySaveRequestSchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a GET request to /api/personality */
function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost/api/personality', {
    method: 'GET',
  })
}

/** Build a POST request to /api/personality with a JSON body */
function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/personality', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** A complete, valid personality save payload with decimal scores */
function buildValidSaveBody(overrides?: Record<string, unknown>) {
  return {
    typeCode: 'RVLA',
    personaName: 'The Philosopher',
    avatarGender: 'M' as const,
    energyScore: 72.4,
    cognitionScore: 85.7,
    decisionScore: 63.2,
    rhythmScore: 91.8,
    consistencyScore: 44.6,
    analysisData: { traits: ['analytical', 'calm'], description: 'Deep thinker' },
    answers: { q1: 'A', q2: 'C', q3: 'B' },
    ...overrides,
  }
}

/** A stored personality result as returned from the database */
function buildStoredResult(overrides?: Record<string, unknown>) {
  return {
    id: 'result-abc-123',
    typeCode: 'RVLA',
    personaName: 'The Philosopher',
    avatarGender: 'M',
    energyScore: 72,
    cognitionScore: 86,
    decisionScore: 63,
    rhythmScore: 92,
    consistencyScore: 45,
    analysisData: { traits: ['analytical', 'calm'], description: 'Deep thinker' },
    createdAt: new Date('2025-06-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    ...overrides,
  }
}

// ===========================================================================
// GET /api/personality
// ===========================================================================
describe('Personality API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Successful retrieval of an existing saved result
  // -----------------------------------------------------------------------
  it('should return saved:true with the full result when a record exists', async () => {
    const storedResult = buildStoredResult()
    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(storedResult as any)

    const response = await GET(makeGetRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.saved).toBe(true)
    expect(body.data.result).toBeDefined()
    expect(body.data.result.id).toBe('result-abc-123')
    expect(body.data.result.typeCode).toBe('RVLA')
    expect(body.data.result.personaName).toBe('The Philosopher')
    expect(body.data.result.energyScore).toBe(72)
    expect(body.data.result.cognitionScore).toBe(86)
    expect(body.data.result.decisionScore).toBe(63)
    expect(body.data.result.rhythmScore).toBe(92)
    expect(body.data.result.consistencyScore).toBe(45)
    expect(body.data.result.avatarGender).toBe('M')
    expect(body.data.result.analysisData).toEqual({
      traits: ['analytical', 'calm'],
      description: 'Deep thinker',
    })
  })

  // -----------------------------------------------------------------------
  // Prisma called with correct arguments
  // -----------------------------------------------------------------------
  it('should query prisma.personalityResult.findUnique with the correct userId and select fields', async () => {
    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

    await GET(makeGetRequest())

    expect(prisma.personalityResult.findUnique).toHaveBeenCalledTimes(1)
    expect(prisma.personalityResult.findUnique).toHaveBeenCalledWith({
      where: { userId: 'test-user-id' },
      select: {
        id: true,
        typeCode: true,
        personaName: true,
        avatarGender: true,
        energyScore: true,
        cognitionScore: true,
        decisionScore: true,
        rhythmScore: true,
        consistencyScore: true,
        analysisData: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  })

  // -----------------------------------------------------------------------
  // No saved result found
  // -----------------------------------------------------------------------
  it('should return saved:false when no personality result exists for the user', async () => {
    vi.mocked(prisma.personalityResult.findUnique).mockResolvedValue(null)

    const response = await GET(makeGetRequest())
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.success).toBe(true)
    expect(body.data.saved).toBe(false)
    expect(body.data.result).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Database error during GET
  // -----------------------------------------------------------------------
  it('should return DATABASE_ERROR when prisma.findUnique throws', async () => {
    vi.mocked(prisma.personalityResult.findUnique).mockRejectedValue(
      new Error('Connection refused')
    )

    const response = await GET(makeGetRequest())
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('DATABASE_ERROR')
    expect(body.error.message).toBe('server_error')
  })

  // -----------------------------------------------------------------------
  // Logger is called on database error
  // -----------------------------------------------------------------------
  it('should log the error when prisma.findUnique throws', async () => {
    const dbError = new Error('Connection timed out')
    vi.mocked(prisma.personalityResult.findUnique).mockRejectedValue(dbError)

    await GET(makeGetRequest())

    expect(logger.error).toHaveBeenCalledWith('GET /api/personality error:', dbError)
  })
})

// ===========================================================================
// POST /api/personality
// ===========================================================================
describe('Personality API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // Successful save (new record via upsert)
  // -----------------------------------------------------------------------
  it('should save a new personality result and return the created record summary', async () => {
    const body = buildValidSaveBody()
    const upsertResult = {
      id: 'new-result-id',
      typeCode: body.typeCode,
      personaName: body.personaName,
      avatarGender: body.avatarGender,
      energyScore: Math.round(body.energyScore),
      cognitionScore: Math.round(body.cognitionScore),
      decisionScore: Math.round(body.decisionScore),
      rhythmScore: Math.round(body.rhythmScore),
      consistencyScore: Math.round(body.consistencyScore),
    }
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue(upsertResult as any)

    const response = await POST(makePostRequest(body))
    expect(response.status).toBe(200)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(true)
    expect(responseBody.data.success).toBe(true)
    expect(responseBody.data.result.id).toBe('new-result-id')
    expect(responseBody.data.result.typeCode).toBe('RVLA')
    expect(responseBody.data.result.personaName).toBe('The Philosopher')
  })

  // -----------------------------------------------------------------------
  // Score rounding via Math.round
  // -----------------------------------------------------------------------
  it('should round all score values with Math.round in both create and update blocks', async () => {
    const body = buildValidSaveBody({
      energyScore: 72.4,
      cognitionScore: 85.7,
      decisionScore: 63.2,
      rhythmScore: 91.8,
      consistencyScore: 44.6,
    })

    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'rounded-id',
      typeCode: body.typeCode,
      personaName: body.personaName,
    } as any)

    await POST(makePostRequest(body))

    expect(prisma.personalityResult.upsert).toHaveBeenCalledTimes(1)
    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any

    // Verify create block has rounded scores
    expect(upsertCall.create.energyScore).toBe(72)     // Math.round(72.4)
    expect(upsertCall.create.cognitionScore).toBe(86)   // Math.round(85.7)
    expect(upsertCall.create.decisionScore).toBe(63)    // Math.round(63.2)
    expect(upsertCall.create.rhythmScore).toBe(92)      // Math.round(91.8)
    expect(upsertCall.create.consistencyScore).toBe(45)  // Math.round(44.6)

    // Verify update block also has rounded scores
    expect(upsertCall.update.energyScore).toBe(72)
    expect(upsertCall.update.cognitionScore).toBe(86)
    expect(upsertCall.update.decisionScore).toBe(63)
    expect(upsertCall.update.rhythmScore).toBe(92)
    expect(upsertCall.update.consistencyScore).toBe(45)
  })

  // -----------------------------------------------------------------------
  // Update existing record (upsert correct structure)
  // -----------------------------------------------------------------------
  it('should call prisma.upsert with correct where, create, and update blocks', async () => {
    const body = buildValidSaveBody()

    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'existing-id',
      typeCode: body.typeCode,
      personaName: body.personaName,
    } as any)

    await POST(makePostRequest(body))

    expect(prisma.personalityResult.upsert).toHaveBeenCalledTimes(1)
    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any

    // where clause uses the authenticated user's ID
    expect(upsertCall.where).toEqual({ userId: 'test-user-id' })

    // create block includes userId
    expect(upsertCall.create.userId).toBe('test-user-id')
    expect(upsertCall.create.typeCode).toBe('RVLA')
    expect(upsertCall.create.personaName).toBe('The Philosopher')
    expect(upsertCall.create.avatarGender).toBe('M')
    expect(upsertCall.create.analysisData).toEqual({
      traits: ['analytical', 'calm'],
      description: 'Deep thinker',
    })

    // update block does NOT include userId but does include updatedAt
    expect(upsertCall.update.typeCode).toBe('RVLA')
    expect(upsertCall.update.personaName).toBe('The Philosopher')
    expect(upsertCall.update.userId).toBeUndefined()
    expect(upsertCall.update.updatedAt).toBeInstanceOf(Date)
  })

  // -----------------------------------------------------------------------
  // Update with different data returns updated record
  // -----------------------------------------------------------------------
  it('should update an existing personality result via upsert and return the new summary', async () => {
    const updatedResult = {
      id: 'existing-result-id',
      typeCode: 'GSAF',
      personaName: 'The Architect',
    }
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue(updatedResult as any)

    const body = buildValidSaveBody({
      typeCode: 'GSAF',
      personaName: 'The Architect',
    })

    const response = await POST(makePostRequest(body))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.result.typeCode).toBe('GSAF')
    expect(data.data.result.personaName).toBe('The Architect')
  })

  // -----------------------------------------------------------------------
  // Null consistencyScore
  // -----------------------------------------------------------------------
  it('should pass null for consistencyScore when it is null', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'null-cs-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    // Override safeParse to return null consistencyScore
    vi.mocked(personalitySaveRequestSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: { ...buildValidSaveBody(), consistencyScore: null },
    } as any)

    await POST(makePostRequest(buildValidSaveBody({ consistencyScore: null })))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    expect(upsertCall.create.consistencyScore).toBeNull()
    expect(upsertCall.update.consistencyScore).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Undefined consistencyScore
  // -----------------------------------------------------------------------
  it('should pass null for consistencyScore when it is undefined', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'undef-cs-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    const bodyWithoutConsistency = buildValidSaveBody()
    delete (bodyWithoutConsistency as any).consistencyScore

    vi.mocked(personalitySaveRequestSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: { ...bodyWithoutConsistency, consistencyScore: undefined },
    } as any)

    await POST(makePostRequest(bodyWithoutConsistency))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    expect(upsertCall.create.consistencyScore).toBeNull()
    expect(upsertCall.update.consistencyScore).toBeNull()
  })

  // -----------------------------------------------------------------------
  // Answers field: present
  // -----------------------------------------------------------------------
  it('should store answers as InputJsonValue when provided', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'with-answers-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    const body = buildValidSaveBody({ answers: { q1: 'A', q2: 'B' } })

    await POST(makePostRequest(body))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    expect(upsertCall.create.answers).toEqual({ q1: 'A', q2: 'B' })
    expect(upsertCall.update.answers).toEqual({ q1: 'A', q2: 'B' })
  })

  // -----------------------------------------------------------------------
  // Answers field: absent -> Prisma.DbNull
  // -----------------------------------------------------------------------
  it('should store Prisma.DbNull for answers when answers is falsy', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'no-answers-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    const bodyNoAnswers = buildValidSaveBody()
    delete (bodyNoAnswers as any).answers

    vi.mocked(personalitySaveRequestSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: { ...bodyNoAnswers, answers: undefined },
    } as any)

    await POST(makePostRequest(bodyNoAnswers))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    // When answers is falsy, the route uses Prisma.DbNull (a Symbol in our mock)
    expect(typeof upsertCall.create.answers).toBe('symbol')
    expect(typeof upsertCall.update.answers).toBe('symbol')
  })

  // -----------------------------------------------------------------------
  // Validation failure: missing typeCode
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when typeCode is missing from the body', async () => {
    const body = { personaName: 'Test', avatarGender: 'M', energyScore: 50 }

    const response = await POST(makePostRequest(body))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(responseBody.error.message).toContain('Missing or invalid typeCode')

    // prisma should NOT have been called
    expect(prisma.personalityResult.upsert).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Validation failure: missing personaName
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when personaName is missing', async () => {
    const body = { typeCode: 'RVLA', avatarGender: 'M', energyScore: 50 }

    // safeParse will catch missing personaName because our mock checks it
    // after typeCode passes
    const response = await POST(makePostRequest(body))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(responseBody.error.message).toContain('Missing or invalid personaName')
  })

  // -----------------------------------------------------------------------
  // Validation failure: invalid avatarGender
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when avatarGender is invalid', async () => {
    const body = buildValidSaveBody({ avatarGender: 'X' })

    const response = await POST(makePostRequest(body))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(responseBody.error.message).toContain('avatarGender must be M or F')
  })

  // -----------------------------------------------------------------------
  // Validation failure: non-numeric score field
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when a required score field is not a number', async () => {
    const body = buildValidSaveBody({ energyScore: 'not-a-number' })

    const response = await POST(makePostRequest(body))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
    expect(responseBody.error.message).toContain('energyScore must be a number')
  })

  // -----------------------------------------------------------------------
  // Null body (request.json() fails -> .catch(() => null))
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when request body is unparseable JSON', async () => {
    const response = await POST(makePostRequest('this is not valid json {{{{'))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')

    // prisma should NOT have been called
    expect(prisma.personalityResult.upsert).not.toHaveBeenCalled()
  })

  // -----------------------------------------------------------------------
  // Empty object body
  // -----------------------------------------------------------------------
  it('should return VALIDATION_ERROR when request body is an empty object', async () => {
    const response = await POST(makePostRequest({}))
    expect(response.status).toBe(422)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('VALIDATION_ERROR')
  })

  // -----------------------------------------------------------------------
  // Database error during POST (upsert throws)
  // -----------------------------------------------------------------------
  it('should return DATABASE_ERROR when prisma.upsert throws', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockRejectedValue(
      new Error('Unique constraint violation')
    )

    const response = await POST(makePostRequest(buildValidSaveBody()))
    expect(response.status).toBe(500)

    const responseBody = await response.json()
    expect(responseBody.success).toBe(false)
    expect(responseBody.error.code).toBe('DATABASE_ERROR')
    expect(responseBody.error.message).toBe('server_error')
  })

  // -----------------------------------------------------------------------
  // Logger called on database error
  // -----------------------------------------------------------------------
  it('should log the error when prisma.upsert throws', async () => {
    const dbError = new Error('Deadlock detected')
    vi.mocked(prisma.personalityResult.upsert).mockRejectedValue(dbError)

    await POST(makePostRequest(buildValidSaveBody()))

    expect(logger.error).toHaveBeenCalledWith('POST /api/personality error:', dbError)
  })

  // -----------------------------------------------------------------------
  // Logger called on validation failure
  // -----------------------------------------------------------------------
  it('should log a warning when validation fails', async () => {
    const body = { personaName: 'Test' } // missing typeCode

    await POST(makePostRequest(body))

    expect(logger.warn).toHaveBeenCalledWith(
      '[Personality save] validation failed',
      expect.objectContaining({
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.any(String) }),
        ]),
      })
    )
  })

  // -----------------------------------------------------------------------
  // updatedAt only in update block, not in create
  // -----------------------------------------------------------------------
  it('should include updatedAt in the update block but not in create', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'r-1',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    await POST(makePostRequest(buildValidSaveBody()))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    expect(upsertCall.update.updatedAt).toBeInstanceOf(Date)
    expect(upsertCall.create.updatedAt).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Response only exposes id, typeCode, personaName
  // -----------------------------------------------------------------------
  it('should only return id, typeCode, and personaName in the success response (not full row)', async () => {
    const fullDbRow = {
      id: 'result-xyz',
      userId: 'test-user-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
      avatarGender: 'M',
      energyScore: 72,
      cognitionScore: 86,
      decisionScore: 63,
      rhythmScore: 92,
      consistencyScore: 45,
      analysisData: { traits: ['analytical'] },
      answers: { q1: 'A' },
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue(fullDbRow as any)

    const response = await POST(makePostRequest(buildValidSaveBody()))
    const responseBody = await response.json()

    // The route explicitly picks only id, typeCode, personaName from the upsert result
    expect(responseBody.data.result).toEqual({
      id: 'result-xyz',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    })
    // Should NOT leak other fields
    expect(responseBody.data.result.energyScore).toBeUndefined()
    expect(responseBody.data.result.answers).toBeUndefined()
    expect(responseBody.data.result.userId).toBeUndefined()
    expect(responseBody.data.result.avatarGender).toBeUndefined()
  })

  // -----------------------------------------------------------------------
  // Boundary score rounding
  // -----------------------------------------------------------------------
  it('should round scores at boundary values correctly', async () => {
    vi.mocked(prisma.personalityResult.upsert).mockResolvedValue({
      id: 'boundary-id',
      typeCode: 'RVLA',
      personaName: 'The Philosopher',
    } as any)

    vi.mocked(personalitySaveRequestSchema.safeParse).mockReturnValueOnce({
      success: true,
      data: {
        ...buildValidSaveBody(),
        energyScore: 0.5,       // rounds to 1 (Math.round rounds 0.5 up)
        cognitionScore: 0.4,    // rounds to 0
        decisionScore: 99.5,    // rounds to 100
        rhythmScore: 100.0,     // stays 100
        consistencyScore: 0.0,  // stays 0
      },
    } as any)

    await POST(makePostRequest(buildValidSaveBody()))

    const upsertCall = vi.mocked(prisma.personalityResult.upsert).mock.calls[0][0] as any
    expect(upsertCall.create.energyScore).toBe(1)
    expect(upsertCall.create.cognitionScore).toBe(0)
    expect(upsertCall.create.decisionScore).toBe(100)
    expect(upsertCall.create.rhythmScore).toBe(100)
    expect(upsertCall.create.consistencyScore).toBe(0)
  })

  // -----------------------------------------------------------------------
  // Validation error message is constructed from all issues
  // -----------------------------------------------------------------------
  it('should construct the validation error message from all issue messages joined by commas', async () => {
    // Override safeParse to return multiple issues
    vi.mocked(personalitySaveRequestSchema.safeParse).mockReturnValueOnce({
      success: false,
      error: {
        issues: [
          { message: 'typeCode is required' },
          { message: 'energyScore must be a number' },
        ],
      },
    } as any)

    const response = await POST(makePostRequest({}))
    const responseBody = await response.json()

    expect(response.status).toBe(422)
    expect(responseBody.error.message).toContain('typeCode is required')
    expect(responseBody.error.message).toContain('energyScore must be a number')
    // The route joins issue messages with ', '
    expect(responseBody.error.message).toBe(
      'Validation failed: typeCode is required, energyScore must be a number'
    )
  })
})

// ===========================================================================
// Module-level exports
// ===========================================================================
describe('Personality API - Module exports', () => {
  it('should export GET and POST as functions', () => {
    expect(typeof GET).toBe('function')
    expect(typeof POST).toBe('function')
  })
})
