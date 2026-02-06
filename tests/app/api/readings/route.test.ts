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

      const result = await handler(req, context)

      if (result instanceof Response) return result

      if (result?.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          DATABASE_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
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
  parseJsonBody: vi.fn(async (req: any) => req.json()),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
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

vi.mock('@/lib/api/zodValidation', () => ({
  readingsSaveSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data?.type || !data?.content) {
        return {
          success: false,
          error: {
            issues: [{ message: 'Missing type or content' }],
          },
        }
      }
      return { success: true, data }
    }),
  },
  readingsGetQuerySchema: {
    safeParse: vi.fn((data: any) => ({
      success: true,
      data: {
        type: data.type,
        limit: parseInt(data.limit) || 10,
      },
    })),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST, GET } from '@/app/api/readings/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { readingsSaveSchema, readingsGetQuerySchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/readings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createGetRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost:3000/api/readings')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString(), { method: 'GET' })
}

// ===========================================================================
// Tests
// ===========================================================================

describe('POST /api/readings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a reading and return success with id', async () => {
    vi.mocked(prisma.reading.create).mockResolvedValue({
      id: 'reading-001',
      userId: 'test-user-id',
      type: 'saju',
      title: null,
      content: 'Detailed saju reading content',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const req = createPostRequest({
      type: 'saju',
      content: 'Detailed saju reading content',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({ success: true, id: 'reading-001' })

    expect(prisma.reading.create).toHaveBeenCalledOnce()
    expect(prisma.reading.create).toHaveBeenCalledWith({
      data: {
        userId: 'test-user-id',
        type: 'saju',
        title: null,
        content: 'Detailed saju reading content',
      },
    })
  })

  it('should return 422 when validation fails (missing type or content)', async () => {
    const req = createPostRequest({ title: 'Orphan title' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toContain('Missing type or content')

    // Database should NOT have been called
    expect(prisma.reading.create).not.toHaveBeenCalled()

    // Validation failure should be logged as a warning
    expect(logger.warn).toHaveBeenCalledWith(
      '[Readings] validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  it('should create a reading with an optional title', async () => {
    vi.mocked(prisma.reading.create).mockResolvedValue({
      id: 'reading-002',
      userId: 'test-user-id',
      type: 'astrology',
      title: 'My Astrology Reading',
      content: 'Astrology content here',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const req = createPostRequest({
      type: 'astrology',
      title: 'My Astrology Reading',
      content: 'Astrology content here',
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({ success: true, id: 'reading-002' })

    expect(prisma.reading.create).toHaveBeenCalledWith({
      data: {
        userId: 'test-user-id',
        type: 'astrology',
        title: 'My Astrology Reading',
        content: 'Astrology content here',
      },
    })
  })

  it('should set title to null when title is not provided', async () => {
    vi.mocked(prisma.reading.create).mockResolvedValue({
      id: 'reading-003',
      userId: 'test-user-id',
      type: 'tarot',
      title: null,
      content: 'Tarot interpretation',
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)

    const req = createPostRequest({
      type: 'tarot',
      content: 'Tarot interpretation',
    })
    await POST(req)

    expect(prisma.reading.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: null,
      }),
    })
  })

  it('should propagate database errors from prisma.reading.create', async () => {
    vi.mocked(prisma.reading.create).mockRejectedValue(
      new Error('Database connection lost')
    )

    const req = createPostRequest({
      type: 'saju',
      content: 'Some reading content',
    })

    await expect(POST(req)).rejects.toThrow('Database connection lost')
  })
})

describe('GET /api/readings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should list readings for the authenticated user', async () => {
    const mockReadings = [
      {
        id: 'reading-001',
        type: 'saju',
        title: 'Saju Reading',
        createdAt: new Date('2025-06-15'),
        updatedAt: new Date('2025-06-15'),
      },
      {
        id: 'reading-002',
        type: 'astrology',
        title: 'Astrology Reading',
        createdAt: new Date('2025-06-14'),
        updatedAt: new Date('2025-06-14'),
      },
    ]
    vi.mocked(prisma.reading.findMany).mockResolvedValue(mockReadings as any)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.readings).toHaveLength(2)
    expect(json.data.readings[0].id).toBe('reading-001')
    expect(json.data.readings[1].id).toBe('reading-002')

    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user-id',
        }),
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })
    )
  })

  it('should filter readings by type when type query param is provided', async () => {
    const mockReadings = [
      {
        id: 'reading-saju-1',
        type: 'saju',
        title: 'Saju Reading',
        createdAt: new Date('2025-06-15'),
        updatedAt: new Date('2025-06-15'),
      },
    ]
    vi.mocked(prisma.reading.findMany).mockResolvedValue(mockReadings as any)

    const req = createGetRequest({ type: 'saju' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.readings).toHaveLength(1)
    expect(json.data.readings[0].type).toBe('saju')

    // The where clause should include the type filter
    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'test-user-id',
          type: 'saju',
        }),
      })
    )
  })

  it('should support pagination with page and limit params', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest({ page: '3', limit: '5' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.page).toBe(3)
    expect(json.data.limit).toBe(5)

    // page=3, limit=5 => skip = (3-1) * 5 = 10
    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 5,
        skip: 10,
      })
    )
  })

  it('should return empty array when user has no readings', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.readings).toEqual([])
  })

  it('should use default limit of 10 when limit param is not provided', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.limit).toBe(10)

    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
      })
    )
  })

  it('should default to page 1 and skip 0 when page param is not provided', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest()
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.page).toBe(1)

    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 0,
      })
    )
  })

  it('should not include type in where clause when type param is not provided', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest()
    await GET(req)

    const callArgs = vi.mocked(prisma.reading.findMany).mock.calls[0][0] as any
    // When no type is provided, the where clause should only contain userId
    expect(callArgs.where).toEqual({ userId: 'test-user-id' })
  })

  it('should accept a custom limit from query params', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest({ limit: '25' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.limit).toBe(25)

    expect(prisma.reading.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
      })
    )
  })

  it('should validate query params via readingsGetQuerySchema', async () => {
    vi.mocked(prisma.reading.findMany).mockResolvedValue([] as any)

    const req = createGetRequest({ type: 'astrology', limit: '15' })
    await GET(req)

    expect(readingsGetQuerySchema.safeParse).toHaveBeenCalledWith({
      type: 'astrology',
      limit: '15',
    })
  })

  it('should return 422 when GET query validation fails', async () => {
    vi.mocked(readingsGetQuerySchema.safeParse).mockReturnValueOnce({
      success: false,
      error: {
        issues: [{ message: 'Invalid limit value' }],
      },
    } as any)

    const req = createGetRequest({ limit: 'not-a-number' })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toContain('Invalid limit value')

    // Database should NOT have been queried
    expect(prisma.reading.findMany).not.toHaveBeenCalled()

    // Validation failure should be logged
    expect(logger.warn).toHaveBeenCalledWith(
      '[Readings GET] query validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  it('should propagate database errors from prisma.reading.findMany', async () => {
    vi.mocked(prisma.reading.findMany).mockRejectedValue(
      new Error('Query timeout')
    )

    const req = createGetRequest()

    await expect(GET(req)).rejects.toThrow('Query timeout')
  })
})
