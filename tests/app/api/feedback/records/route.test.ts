import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => handler),
  createSimpleGuard: vi.fn(() => ({})),
  apiError: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sectionFeedback: {
      findMany: vi.fn(),
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

// Mock the Zod validation schema to control validation behavior in tests
vi.mock('@/lib/api/zodValidation', () => ({
  feedbackRecordsQuerySchema: {
    safeParse: vi.fn((data: any) => {
      // Handle helpful validation - only 'true' and 'false' are valid strings
      if (data.helpful !== null && data.helpful !== undefined) {
        if (data.helpful !== 'true' && data.helpful !== 'false') {
          return {
            success: false,
            error: {
              issues: [{ path: ['helpful'], message: "Invalid enum value. Expected 'true' | 'false'" }],
            },
          }
        }
      }

      // Handle limit validation
      const parsedLimit = data.limit === null || data.limit === undefined ? 50 : Number(data.limit)
      if (isNaN(parsedLimit) || !Number.isInteger(parsedLimit)) {
        return {
          success: false,
          error: {
            issues: [{ path: ['limit'], message: 'Expected number, received nan' }],
          },
        }
      }
      if (parsedLimit < 1) {
        return {
          success: false,
          error: {
            issues: [{ path: ['limit'], message: 'Number must be greater than or equal to 1' }],
          },
        }
      }
      if (parsedLimit > 100) {
        return {
          success: false,
          error: {
            issues: [{ path: ['limit'], message: 'Number must be less than or equal to 100' }],
          },
        }
      }

      // Successful validation - transform helpful to boolean
      return {
        success: true,
        data: {
          service: data.service || undefined,
          theme: data.theme || undefined,
          helpful: data.helpful === 'true' ? true : data.helpful === 'false' ? false : undefined,
          limit: parsedLimit,
        },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/feedback/records/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/feedback/records')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

const MOCK_FEEDBACK_RECORD = {
  id: 'fb-001',
  service: 'destiny-map',
  theme: 'career',
  sectionId: 'overview-career',
  helpful: true,
  dayMaster: 'Gab-Mok',
  sunSign: 'Aries',
  locale: 'ko',
  userHash: 'user-hash-123',
  createdAt: new Date('2024-01-15T10:00:00Z'),
}

const MOCK_FEEDBACK_RECORDS = [
  MOCK_FEEDBACK_RECORD,
  {
    id: 'fb-002',
    service: 'destiny-map',
    theme: 'love',
    sectionId: 'overview-love',
    helpful: false,
    dayMaster: 'Byung-Hwa',
    sunSign: 'Leo',
    locale: 'en',
    userHash: 'user-hash-456',
    createdAt: new Date('2024-01-14T10:00:00Z'),
  },
  {
    id: 'fb-003',
    service: 'tarot',
    theme: 'general',
    sectionId: 'card-meaning',
    helpful: true,
    dayMaster: null,
    sunSign: 'Virgo',
    locale: 'ko',
    userHash: null,
    createdAt: new Date('2024-01-13T10:00:00Z'),
  },
]

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/feedback/records', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default: return mock records
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(MOCK_FEEDBACK_RECORDS as any)
  })

  // ---- Test 1: Returns feedback records without any filters ----
  it('should return all feedback records with default limit when no filters provided', async () => {
    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(3)
    expect(json.records[0].id).toBe('fb-001')

    // Verify prisma was called with correct default parameters
    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledOnce()
    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      take: 50, // default limit
      select: {
        id: true,
        service: true,
        theme: true,
        sectionId: true,
        helpful: true,
        dayMaster: true,
        sunSign: true,
        locale: true,
        userHash: true,
        createdAt: true,
      },
    })
  })

  // ---- Test 2: Filters by service parameter ----
  it('should filter feedback records by service parameter', async () => {
    const filteredRecords = MOCK_FEEDBACK_RECORDS.filter((r) => r.service === 'destiny-map')
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(filteredRecords as any)

    const req = createGetRequest({ service: 'destiny-map' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(2)
    expect(json.records.every((r: any) => r.service === 'destiny-map')).toBe(true)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { service: 'destiny-map' },
      })
    )
  })

  // ---- Test 3: Filters by theme parameter ----
  it('should filter feedback records by theme parameter', async () => {
    const filteredRecords = MOCK_FEEDBACK_RECORDS.filter((r) => r.theme === 'career')
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(filteredRecords as any)

    const req = createGetRequest({ theme: 'career' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(1)
    expect(json.records[0].theme).toBe('career')

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { theme: 'career' },
      })
    )
  })

  // ---- Test 4: Filters by helpful=true (positive feedback) ----
  it('should filter feedback records by helpful=true status', async () => {
    const filteredRecords = MOCK_FEEDBACK_RECORDS.filter((r) => r.helpful === true)
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(filteredRecords as any)

    const req = createGetRequest({ helpful: 'true' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(2)
    expect(json.records.every((r: any) => r.helpful === true)).toBe(true)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { helpful: true },
      })
    )
  })

  // ---- Test 5: Filters by helpful=false (negative feedback) ----
  it('should filter feedback records by helpful=false status', async () => {
    const filteredRecords = MOCK_FEEDBACK_RECORDS.filter((r) => r.helpful === false)
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(filteredRecords as any)

    const req = createGetRequest({ helpful: 'false' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(1)
    expect(json.records[0].helpful).toBe(false)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { helpful: false },
      })
    )
  })

  // ---- Test 6: Pagination with custom limit ----
  it('should apply custom limit for pagination', async () => {
    const limitedRecords = [MOCK_FEEDBACK_RECORDS[0]]
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(limitedRecords as any)

    const req = createGetRequest({ limit: '1' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(1)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
      })
    )
  })

  // ---- Test 7: Combination of multiple filters ----
  it('should apply multiple filters together (service, theme, helpful)', async () => {
    const filteredRecords = [MOCK_FEEDBACK_RECORDS[0]]
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(filteredRecords as any)

    const req = createGetRequest({
      service: 'destiny-map',
      theme: 'career',
      helpful: 'true',
      limit: '10',
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toHaveLength(1)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith({
      where: {
        service: 'destiny-map',
        theme: 'career',
        helpful: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        service: true,
        theme: true,
        sectionId: true,
        helpful: true,
        dayMaster: true,
        sunSign: true,
        locale: true,
        userHash: true,
        createdAt: true,
      },
    })
  })

  // ---- Test 8: Returns empty array when no records match ----
  it('should return empty records array when no feedback matches filters', async () => {
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue([])

    const req = createGetRequest({ service: 'nonexistent-service' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.records).toEqual([])
    expect(json.records).toHaveLength(0)
  })

  // ---- Test 9: Invalid limit parameter returns 400 ----
  it('should return 400 when limit exceeds maximum allowed value', async () => {
    const req = createGetRequest({ limit: '200' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')
    expect(json.details).toContain('limit')

    // Database should not be queried on validation failure
    expect(prisma.sectionFeedback.findMany).not.toHaveBeenCalled()

    // Warning should be logged
    expect(logger.warn).toHaveBeenCalledWith(
      '[feedback/records] Validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  // ---- Test 10: Invalid limit parameter (non-numeric) returns 400 ----
  it('should return 400 when limit is not a valid number', async () => {
    const req = createGetRequest({ limit: 'abc' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')

    expect(prisma.sectionFeedback.findMany).not.toHaveBeenCalled()
  })

  // ---- Test 11: Invalid helpful parameter returns 400 ----
  it('should return 400 when helpful parameter is invalid', async () => {
    const req = createGetRequest({ helpful: 'maybe' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')
    expect(json.details).toContain('helpful')

    expect(prisma.sectionFeedback.findMany).not.toHaveBeenCalled()
  })

  // ---- Test 12: Database error returns 500 ----
  it('should return 500 and log error when database query fails', async () => {
    const dbError = new Error('Database connection failed')
    vi.mocked(prisma.sectionFeedback.findMany).mockRejectedValue(dbError)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal Server Error')

    // Error should be logged
    expect(logger.error).toHaveBeenCalledWith('[Feedback Records Error]:', dbError)
  })

  // ---- Test 13: Limit of 0 is invalid ----
  it('should return 400 when limit is 0', async () => {
    const req = createGetRequest({ limit: '0' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')

    expect(prisma.sectionFeedback.findMany).not.toHaveBeenCalled()
  })

  // ---- Test 14: Negative limit is invalid ----
  it('should return 400 when limit is negative', async () => {
    const req = createGetRequest({ limit: '-5' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe('Validation failed')

    expect(prisma.sectionFeedback.findMany).not.toHaveBeenCalled()
  })

  // ---- Test 15: Records are ordered by createdAt descending ----
  it('should order records by createdAt in descending order', async () => {
    const req = createGetRequest()
    await GET(req)

    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  // ---- Test 16: Maximum allowed limit (100) is accepted ----
  it('should accept maximum limit of 100', async () => {
    vi.mocked(prisma.sectionFeedback.findMany).mockResolvedValue(MOCK_FEEDBACK_RECORDS as any)

    const req = createGetRequest({ limit: '100' })
    const res = await GET(req)

    expect(res.status).toBe(200)
    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 100,
      })
    )
  })

  // ---- Test 17: Select fields are properly returned ----
  it('should return only the selected fields for each record', async () => {
    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    const record = json.records[0]

    // Verify all expected fields are present
    expect(record).toHaveProperty('id')
    expect(record).toHaveProperty('service')
    expect(record).toHaveProperty('theme')
    expect(record).toHaveProperty('sectionId')
    expect(record).toHaveProperty('helpful')
    expect(record).toHaveProperty('dayMaster')
    expect(record).toHaveProperty('sunSign')
    expect(record).toHaveProperty('locale')
    expect(record).toHaveProperty('userHash')
    expect(record).toHaveProperty('createdAt')
  })

  // ---- Test 18: Empty service/theme strings are treated as no filter ----
  it('should not filter when empty service string is provided', async () => {
    const req = createGetRequest({ service: '' })
    const res = await GET(req)

    expect(res.status).toBe(200)

    // Empty string should not be added to where clause
    expect(prisma.sectionFeedback.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {},
      })
    )
  })
})
