import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user', session: { user: { id: 'test-user' } }, ip: '127.0.0.1', locale: 'ko' }
      return handler(req, context)
    }
  }),
  createPublicStreamGuard: vi.fn(() => ({})),
  createSimpleGuard: vi.fn(() => ({})),
  apiError: vi.fn((code: string, message?: string) => NextResponse.json({ error: code, message }, { status: code === 'BAD_REQUEST' ? 400 : code === 'VALIDATION_ERROR' ? 422 : 500 })),
  ErrorCodes: { BAD_REQUEST: 'BAD_REQUEST', VALIDATION_ERROR: 'VALIDATION_ERROR', INTERNAL_ERROR: 'INTERNAL_ERROR' },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sectionFeedback: {
      create: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
  },
}))

vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text: string) => text),
  cleanText: vi.fn((text: string) => text),
}))

vi.mock('@/lib/api', () => ({
  apiClient: { post: vi.fn() },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/api/requestParser', () => ({
  parseRequestBody: vi.fn(async (req: any) => req.json()),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  sectionFeedbackRequestSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.service || !data.sectionId) return { success: false, error: { issues: [{ message: 'Missing required fields', path: ['service'] }] } }
      return { success: true, data }
    }),
  },
  feedbackGetQuerySchema: {
    safeParse: vi.fn((data: any) => ({ success: true, data })),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST, GET } from '@/app/api/feedback/route'
import { prisma } from '@/lib/db/prisma'
import { apiClient } from '@/lib/api'
import { guardText, cleanText } from '@/lib/textGuards'
import { logger } from '@/lib/logger'
import { sectionFeedbackRequestSchema, feedbackGetQuerySchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/feedback')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

const VALID_FEEDBACK_BODY = {
  service: 'destiny-map',
  theme: 'career',
  sectionId: 'overview-career',
  helpful: true,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: prisma.create returns a record with an id
    vi.mocked(prisma.sectionFeedback.create).mockResolvedValue({
      id: 'fb-001',
      service: 'destiny-map',
      theme: 'career',
      sectionId: 'overview-career',
      helpful: true,
      dayMaster: null,
      sunSign: null,
      locale: 'ko',
      userHash: null,
      createdAt: new Date(),
    } as any)

    // Default: RLHF succeeds
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      data: { feedback_id: 'rlhf-001', new_badges: ['first-feedback'] },
    } as any)
  })

  // ---- Test 1: Valid feedback submission ----
  it('should save feedback and return success with RLHF data', async () => {
    const req = createPostRequest(VALID_FEEDBACK_BODY)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      success: true,
      id: 'fb-001',
      rlhfId: 'rlhf-001',
      badges: ['first-feedback'],
    })

    // Verify database write
    expect(prisma.sectionFeedback.create).toHaveBeenCalledOnce()
    expect(prisma.sectionFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        service: 'destiny-map',
        theme: 'career',
        sectionId: 'overview-career',
        helpful: true,
        locale: 'ko',
      }),
    })

    // Verify RLHF call
    expect(apiClient.post).toHaveBeenCalledOnce()
    expect(apiClient.post).toHaveBeenCalledWith(
      '/rlhf/feedback',
      expect.objectContaining({
        rating: 5, // helpful === true maps to rating 5
        user_id: 'anonymous',
        consultation_data: expect.objectContaining({
          record_id: 'fb-001',
          theme: 'career',
          locale: 'ko',
        }),
      }),
      { timeout: 8000 },
    )

    // Verify Cache-Control header
    expect(res.headers.get('Cache-Control')).toBe('no-store')
  })

  // ---- Test 2: Invalid body -- missing required fields ----
  it('should return 422 when required fields are missing', async () => {
    const req = createPostRequest({ helpful: true })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.message).toContain('Missing required fields')

    // DB and RLHF should NOT have been called
    expect(prisma.sectionFeedback.create).not.toHaveBeenCalled()
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  // ---- Test 3: RLHF failure is handled gracefully ----
  it('should still return success when RLHF backend throws', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('RLHF service unavailable'))

    const req = createPostRequest(VALID_FEEDBACK_BODY)
    const res = await POST(req)
    const json = await res.json()

    // The primary feedback save should still succeed
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.id).toBe('fb-001')
    // RLHF fields should be absent / empty since RLHF failed
    expect(json.rlhfId).toBeUndefined()
    expect(json.badges).toEqual([])

    // DB write should still have happened
    expect(prisma.sectionFeedback.create).toHaveBeenCalledOnce()
    // RLHF error should have been logged as a warning
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Feedback] RLHF backend not available'),
      expect.any(Error),
    )
  })

  // ---- Test 4: Feedback with all optional fields ----
  it('should pass optional fields through text guards and include them in the RLHF payload', async () => {
    const fullBody = {
      ...VALID_FEEDBACK_BODY,
      dayMaster: 'Gab-Mok',
      sunSign: 'Aries',
      locale: 'en',
      userHash: 'user-hash-abc',
      recordId: 'rec-999',
      rating: 4,
      feedbackText: 'Very insightful reading',
      userQuestion: 'Will my career improve?',
      consultationSummary: 'Career outlook is positive based on wood element',
      contextUsed: 'Year pillar analysis with daeun transit',
    }

    const req = createPostRequest(fullBody)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)

    // guardText should have been called for each text field
    expect(guardText).toHaveBeenCalledWith('Very insightful reading', 600)
    expect(guardText).toHaveBeenCalledWith('Will my career improve?', 600)
    expect(guardText).toHaveBeenCalledWith('Career outlook is positive based on wood element', 600)
    expect(guardText).toHaveBeenCalledWith('Year pillar analysis with daeun transit', 600)

    // cleanText should have been called for RLHF feedback field
    expect(cleanText).toHaveBeenCalledWith('Very insightful reading', 500)

    // DB write should include optional fields
    expect(prisma.sectionFeedback.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dayMaster: 'Gab-Mok',
        sunSign: 'Aries',
        locale: 'en',
        userHash: 'user-hash-abc',
      }),
    })

    // RLHF payload should carry the explicit rating and full consultation data
    expect(apiClient.post).toHaveBeenCalledWith(
      '/rlhf/feedback',
      expect.objectContaining({
        rating: 4,
        user_id: 'user-hash-abc',
        consultation_data: expect.objectContaining({
          record_id: 'rec-999',
          user_prompt: 'Will my career improve?',
          consultation_summary: 'Career outlook is positive based on wood element',
          context_used: 'Year pillar analysis with daeun transit',
        }),
      }),
      { timeout: 8000 },
    )
  })

  // ---- Test 5: helpful=false maps to RLHF rating 1 ----
  it('should send rating 1 to RLHF when helpful is false and no explicit rating', async () => {
    const body = { ...VALID_FEEDBACK_BODY, helpful: false }
    const req = createPostRequest(body)
    await POST(req)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/rlhf/feedback',
      expect.objectContaining({
        rating: 1,
        feedback: 'Not helpful',
      }),
      { timeout: 8000 },
    )
  })

  // ---- Test 6: RLHF returns non-ok response ----
  it('should return empty RLHF fields when RLHF responds with ok=false', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ ok: false, data: null } as any)

    const req = createPostRequest(VALID_FEEDBACK_BODY)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.rlhfId).toBeUndefined()
    expect(json.badges).toEqual([])
  })

  // ---- Test 7: null / non-object body returns 400 ----
  it('should return 400 when request body is null or non-object', async () => {
    // Simulate parseRequestBody returning null (e.g. empty body)
    const { parseRequestBody } = await import('@/lib/api/requestParser')
    vi.mocked(parseRequestBody).mockResolvedValueOnce(null)

    const req = createPostRequest({})
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('BAD_REQUEST')
    expect(json.message).toBe('Invalid request body')

    expect(prisma.sectionFeedback.create).not.toHaveBeenCalled()
  })

  // ---- Test 8: Database error propagates ----
  it('should propagate error when prisma.create fails', async () => {
    vi.mocked(prisma.sectionFeedback.create).mockRejectedValue(new Error('DB connection lost'))

    const req = createPostRequest(VALID_FEEDBACK_BODY)
    await expect(POST(req)).rejects.toThrow('DB connection lost')

    // RLHF should not be reached since create threw before it
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

describe('GET /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Test 9: Returns aggregated stats ----
  it('should return aggregated feedback statistics', async () => {
    vi.mocked(prisma.sectionFeedback.count)
      .mockResolvedValueOnce(100 as any) // total
      .mockResolvedValueOnce(75 as any)  // positive

    vi.mocked(prisma.sectionFeedback.groupBy)
      .mockResolvedValueOnce([
        { sectionId: 'overview', _count: { _all: 60 } },
        { sectionId: 'career', _count: { _all: 40 } },
      ] as any) // bySectionTotals
      .mockResolvedValueOnce([
        { sectionId: 'overview', _count: { _all: 50 } },
        { sectionId: 'career', _count: { _all: 25 } },
      ] as any) // bySectionPositives

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      total: 100,
      positive: 75,
      negative: 25,
      satisfactionRate: 75,
      bySection: [
        { sectionId: 'overview', total: 60, positive: 50, rate: 83 },
        { sectionId: 'career', total: 40, positive: 25, rate: 63 },
      ],
    })

    // Verify all four aggregation queries ran
    expect(prisma.sectionFeedback.count).toHaveBeenCalledTimes(2)
    expect(prisma.sectionFeedback.groupBy).toHaveBeenCalledTimes(2)
  })

  // ---- Test 10: Filters by service query param ----
  it('should filter stats by service query parameter', async () => {
    vi.mocked(prisma.sectionFeedback.count)
      .mockResolvedValueOnce(30 as any)
      .mockResolvedValueOnce(20 as any)

    vi.mocked(prisma.sectionFeedback.groupBy)
      .mockResolvedValueOnce([
        { sectionId: 'overview', _count: { _all: 30 } },
      ] as any)
      .mockResolvedValueOnce([
        { sectionId: 'overview', _count: { _all: 20 } },
      ] as any)

    const req = createGetRequest({ service: 'destiny-map' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.total).toBe(30)

    // Verify the where clause includes the service filter
    expect(prisma.sectionFeedback.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ service: 'destiny-map' }) }),
    )
    // The positive count query should also carry the service filter plus helpful: true
    expect(prisma.sectionFeedback.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ service: 'destiny-map', helpful: true }),
      }),
    )
  })

  // ---- Test 11: Filters by both service and theme ----
  it('should filter stats by both service and theme query parameters', async () => {
    vi.mocked(prisma.sectionFeedback.count)
      .mockResolvedValueOnce(10 as any)
      .mockResolvedValueOnce(8 as any)

    vi.mocked(prisma.sectionFeedback.groupBy)
      .mockResolvedValueOnce([
        { sectionId: 'career-analysis', _count: { _all: 10 } },
      ] as any)
      .mockResolvedValueOnce([
        { sectionId: 'career-analysis', _count: { _all: 8 } },
      ] as any)

    const req = createGetRequest({ service: 'destiny-map', theme: 'career' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.total).toBe(10)
    expect(json.satisfactionRate).toBe(80)

    // Both groupBy calls should carry service + theme
    expect(prisma.sectionFeedback.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ service: 'destiny-map', theme: 'career' }),
      }),
    )
  })

  // ---- Test 12: Empty results ----
  it('should return zero stats and empty section array when no feedback exists', async () => {
    vi.mocked(prisma.sectionFeedback.count)
      .mockResolvedValueOnce(0 as any)
      .mockResolvedValueOnce(0 as any)

    vi.mocked(prisma.sectionFeedback.groupBy)
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toEqual({
      total: 0,
      positive: 0,
      negative: 0,
      satisfactionRate: 0,
      bySection: [],
    })
  })

  // ---- Test 13: GET query validation failure ----
  it('should return 422 when query validation fails', async () => {
    const { feedbackGetQuerySchema: schema } = await import('@/lib/api/zodValidation')
    vi.mocked(schema.safeParse).mockReturnValueOnce({
      success: false,
      error: { issues: [{ message: 'Service too long', path: ['service'] }] },
    } as any)

    const req = createGetRequest({ service: 'a'.repeat(200) })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.error).toBe('VALIDATION_ERROR')
    expect(json.message).toContain('Service too long')

    // No DB queries should have been made
    expect(prisma.sectionFeedback.count).not.toHaveBeenCalled()
    expect(prisma.sectionFeedback.groupBy).not.toHaveBeenCalled()
  })

  // ---- Test 14: Section with zero positives gets rate 0 ----
  it('should compute rate 0 for sections with no positive feedback', async () => {
    vi.mocked(prisma.sectionFeedback.count)
      .mockResolvedValueOnce(50 as any)
      .mockResolvedValueOnce(0 as any)

    vi.mocked(prisma.sectionFeedback.groupBy)
      .mockResolvedValueOnce([
        { sectionId: 'health', _count: { _all: 50 } },
      ] as any)
      .mockResolvedValueOnce([] as any) // no positives at all

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.total).toBe(50)
    expect(json.positive).toBe(0)
    expect(json.negative).toBe(50)
    expect(json.satisfactionRate).toBe(0)
    expect(json.bySection).toEqual([
      { sectionId: 'health', total: 50, positive: 0, rate: 0 },
    ])
  })
})
