// tests/app/api/fortune/route.test.ts
// Comprehensive tests for the Fortune save/get API route

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
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    fortune: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
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
  fortuneSaveSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.date || !data.kind || !data.content) {
        return {
          success: false,
          error: {
            issues: [
              { message: 'Missing required fields', path: ['date'] },
            ],
          },
        }
      }
      return { success: true, data }
    }),
  },
  fortuneGetQuerySchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.date) {
        return {
          success: false,
          error: {
            issues: [{ message: 'Missing date', path: ['date'] }],
          },
        }
      }
      return {
        success: true,
        data: { date: data.date, kind: data.kind || 'daily' },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------

import { POST, GET } from '@/app/api/fortune/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { fortuneSaveSchema, fortuneGetQuerySchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a POST NextRequest with a JSON body */
function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/fortune', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** Build a GET NextRequest with query parameters */
function makeGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/fortune')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

/** Normalize a date string the same way the route does (UTC midnight) */
function normalizeDate(dateStr: string): Date {
  const d = new Date(dateStr)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** A valid fortune body used in most POST tests */
const VALID_FORTUNE_BODY = {
  date: '2025-06-15',
  kind: 'daily',
  title: 'Today fortune',
  content: 'Great things ahead',
}

/** A saved fortune record returned from the database */
const SAVED_FORTUNE_RECORD = {
  id: 'fortune-1',
  userId: 'test-user-id',
  date: normalizeDate('2025-06-15'),
  kind: 'daily',
  title: 'Today fortune',
  content: 'Great things ahead',
  createdAt: new Date('2025-06-15T00:00:00Z'),
  updatedAt: new Date('2025-06-15T00:00:00Z'),
}

// ===================================================================
// POST /api/fortune
// ===================================================================
describe('Fortune API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.fortune.upsert).mockResolvedValue(SAVED_FORTUNE_RECORD as any)
  })

  // -----------------------------------------------------------------
  // Successful save
  // -----------------------------------------------------------------
  it('should save a fortune and return the upserted record', async () => {
    const response = await POST(makePostRequest(VALID_FORTUNE_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('fortune-1')
    expect(data.userId).toBe('test-user-id')
    expect(data.kind).toBe('daily')
    expect(data.content).toBe('Great things ahead')
  })

  it('should call prisma.fortune.upsert with the correct compound key and fields', async () => {
    await POST(makePostRequest(VALID_FORTUNE_BODY))

    const expectedDate = normalizeDate('2025-06-15')

    expect(prisma.fortune.upsert).toHaveBeenCalledWith({
      where: {
        userId_date_kind: {
          userId: 'test-user-id',
          date: expectedDate,
          kind: 'daily',
        },
      },
      update: { title: 'Today fortune', content: 'Great things ahead' },
      create: {
        userId: 'test-user-id',
        date: expectedDate,
        kind: 'daily',
        title: 'Today fortune',
        content: 'Great things ahead',
      },
    })
  })

  it('should normalize the date to UTC midnight', async () => {
    // Use a date with time information that should be stripped
    const body = {
      date: '2025-09-20T15:30:00+09:00',
      kind: 'daily',
      content: 'Afternoon fortune',
    }

    await POST(makePostRequest(body))

    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    const usedDate = (call as any).where.userId_date_kind.date as Date

    // The date should be UTC midnight regardless of the timezone offset
    expect(usedDate.getUTCHours()).toBe(0)
    expect(usedDate.getUTCMinutes()).toBe(0)
    expect(usedDate.getUTCSeconds()).toBe(0)
    expect(usedDate.getUTCMilliseconds()).toBe(0)
  })

  // -----------------------------------------------------------------
  // Validation failure
  // -----------------------------------------------------------------
  it('should return 400 when validation fails (missing required fields)', async () => {
    const invalidBody = { date: '2025-06-15' } // missing kind and content

    const response = await POST(makePostRequest(invalidBody))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'date', message: 'Missing required fields' }),
      ])
    )
    expect(prisma.fortune.upsert).not.toHaveBeenCalled()
  })

  it('should log a warning when validation fails', async () => {
    const invalidBody = { kind: 'daily' } // missing date and content

    await POST(makePostRequest(invalidBody))

    expect(logger.warn).toHaveBeenCalledWith(
      '[Fortune] validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  // -----------------------------------------------------------------
  // Upsert updates existing record
  // -----------------------------------------------------------------
  it('should update an existing fortune via upsert when record already exists', async () => {
    const updatedRecord = {
      ...SAVED_FORTUNE_RECORD,
      content: 'Updated fortune content',
      title: 'Updated title',
      updatedAt: new Date('2025-06-15T12:00:00Z'),
    }
    vi.mocked(prisma.fortune.upsert).mockResolvedValue(updatedRecord as any)

    const body = {
      date: '2025-06-15',
      kind: 'daily',
      title: 'Updated title',
      content: 'Updated fortune content',
    }
    const response = await POST(makePostRequest(body))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.content).toBe('Updated fortune content')
    expect(data.title).toBe('Updated title')

    // Verify the update payload
    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    expect((call as any).update).toEqual({
      title: 'Updated title',
      content: 'Updated fortune content',
    })
  })

  // -----------------------------------------------------------------
  // Optional title handling
  // -----------------------------------------------------------------
  it('should set title to null when title is not provided', async () => {
    const body = {
      date: '2025-06-15',
      kind: 'daily',
      content: 'Fortune without a title',
    }

    // The mock schema passes through all fields as-is.
    // The route does `title ?? null`, so undefined becomes null.
    await POST(makePostRequest(body))

    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    expect((call as any).update.title).toBeNull()
    expect((call as any).create.title).toBeNull()
  })

  it('should preserve an explicit null title', async () => {
    const body = {
      date: '2025-06-15',
      kind: 'daily',
      title: null,
      content: 'Fortune with explicit null title',
    }

    await POST(makePostRequest(body))

    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    expect((call as any).update.title).toBeNull()
    expect((call as any).create.title).toBeNull()
  })

  // -----------------------------------------------------------------
  // Different kind values
  // -----------------------------------------------------------------
  it('should handle different fortune kinds correctly', async () => {
    const body = {
      date: '2025-06-15',
      kind: 'monthly',
      title: 'Monthly overview',
      content: 'This month looks promising',
    }

    await POST(makePostRequest(body))

    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    expect((call as any).where.userId_date_kind.kind).toBe('monthly')
    expect((call as any).create.kind).toBe('monthly')
  })

  // -----------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------
  it('should propagate errors when prisma.fortune.upsert throws', async () => {
    vi.mocked(prisma.fortune.upsert).mockRejectedValue(
      new Error('Database connection lost')
    )

    await expect(POST(makePostRequest(VALID_FORTUNE_BODY))).rejects.toThrow(
      'Database connection lost'
    )
  })
})

// ===================================================================
// GET /api/fortune
// ===================================================================
describe('Fortune API - GET', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.fortune.findUnique).mockResolvedValue(SAVED_FORTUNE_RECORD as any)
  })

  // -----------------------------------------------------------------
  // Successful retrieval
  // -----------------------------------------------------------------
  it('should retrieve a fortune for the given date and kind', async () => {
    const response = await GET(makeGetRequest({ date: '2025-06-15', kind: 'daily' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fortune).toBeDefined()
    expect(data.fortune.id).toBe('fortune-1')
    expect(data.fortune.kind).toBe('daily')
    expect(data.fortune.content).toBe('Great things ahead')
  })

  it('should call prisma.fortune.findUnique with the correct compound key', async () => {
    await GET(makeGetRequest({ date: '2025-06-15', kind: 'daily' }))

    const expectedDate = normalizeDate('2025-06-15')

    expect(prisma.fortune.findUnique).toHaveBeenCalledWith({
      where: {
        userId_date_kind: {
          userId: 'test-user-id',
          date: expectedDate,
          kind: 'daily',
        },
      },
    })
  })

  it('should normalize the GET date to UTC midnight', async () => {
    await GET(makeGetRequest({ date: '2025-09-20', kind: 'daily' }))

    const call = vi.mocked(prisma.fortune.findUnique).mock.calls[0][0]
    const usedDate = (call as any).where.userId_date_kind.date as Date

    expect(usedDate.getUTCHours()).toBe(0)
    expect(usedDate.getUTCMinutes()).toBe(0)
    expect(usedDate.getUTCSeconds()).toBe(0)
    expect(usedDate.getUTCMilliseconds()).toBe(0)
  })

  // -----------------------------------------------------------------
  // Not found
  // -----------------------------------------------------------------
  it('should return { fortune: null } when no record is found', async () => {
    vi.mocked(prisma.fortune.findUnique).mockResolvedValue(null)

    const response = await GET(makeGetRequest({ date: '2025-01-01', kind: 'daily' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.fortune).toBeNull()
  })

  // -----------------------------------------------------------------
  // Validation failure
  // -----------------------------------------------------------------
  it('should return 400 when date query parameter is missing', async () => {
    // No date param at all
    const response = await GET(makeGetRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
    expect(data.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'date', message: 'Missing date' }),
      ])
    )
    expect(prisma.fortune.findUnique).not.toHaveBeenCalled()
  })

  it('should log a warning when GET query validation fails', async () => {
    await GET(makeGetRequest({}))

    expect(logger.warn).toHaveBeenCalledWith(
      '[Fortune GET] query validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  // -----------------------------------------------------------------
  // Default kind parameter
  // -----------------------------------------------------------------
  it('should default kind to "daily" when kind is not provided', async () => {
    await GET(makeGetRequest({ date: '2025-06-15' }))

    const call = vi.mocked(prisma.fortune.findUnique).mock.calls[0][0]
    expect((call as any).where.userId_date_kind.kind).toBe('daily')
  })

  it('should use the explicit kind when provided', async () => {
    await GET(makeGetRequest({ date: '2025-06-15', kind: 'monthly' }))

    const call = vi.mocked(prisma.fortune.findUnique).mock.calls[0][0]
    expect((call as any).where.userId_date_kind.kind).toBe('monthly')
  })

  // -----------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------
  it('should propagate errors when prisma.fortune.findUnique throws', async () => {
    vi.mocked(prisma.fortune.findUnique).mockRejectedValue(
      new Error('Database timeout')
    )

    await expect(
      GET(makeGetRequest({ date: '2025-06-15', kind: 'daily' }))
    ).rejects.toThrow('Database timeout')
  })
})

// ===================================================================
// Middleware wiring
// ===================================================================
describe('Fortune API - Middleware Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.fortune.upsert).mockResolvedValue(SAVED_FORTUNE_RECORD as any)
    vi.mocked(prisma.fortune.findUnique).mockResolvedValue(SAVED_FORTUNE_RECORD as any)
  })

  it('should export POST as a function wrapped by withApiMiddleware', () => {
    expect(typeof POST).toBe('function')
  })

  it('should export GET as a function wrapped by withApiMiddleware', () => {
    expect(typeof GET).toBe('function')
  })

  it('POST handler should receive userId from the middleware context', async () => {
    // The middleware mock injects context.userId = 'test-user-id'
    // Verify that this userId is passed through to the prisma call
    await POST(makePostRequest(VALID_FORTUNE_BODY))

    const call = vi.mocked(prisma.fortune.upsert).mock.calls[0][0]
    expect((call as any).where.userId_date_kind.userId).toBe('test-user-id')
    expect((call as any).create.userId).toBe('test-user-id')
  })

  it('GET handler should receive userId from the middleware context', async () => {
    await GET(makeGetRequest({ date: '2025-06-15', kind: 'daily' }))

    const call = vi.mocked(prisma.fortune.findUnique).mock.calls[0][0]
    expect((call as any).where.userId_date_kind.userId).toBe('test-user-id')
  })
})
