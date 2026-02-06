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
        isPremium: false,
      }

      const result = await handler(req, context)

      if (result instanceof Response) return result

      if (result?.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          UNAUTHORIZED: 401,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
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
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

// ---------------------------------------------------------------------------
// Mock Prisma - every model/method the route touches
// ---------------------------------------------------------------------------
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    savedPerson: {
      count: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
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
// Mock Zod validation schemas
// ---------------------------------------------------------------------------
vi.mock('@/app/api/me/circle/validation', () => ({
  GetCircleSchema: {
    safeParse: vi.fn((data: any) => {
      const limit = data.limit != null ? parseInt(data.limit, 10) : 20
      const offset = data.offset != null ? parseInt(data.offset, 10) : 0

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return {
          success: false,
          error: { issues: [{ message: 'limit must be between 1 and 100' }] },
        }
      }
      if (isNaN(offset) || offset < 0) {
        return {
          success: false,
          error: { issues: [{ message: 'offset must be >= 0' }] },
        }
      }

      return { success: true, data: { limit, offset } }
    }),
  },
  PostCircleSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.name || !data.relation) {
        return {
          success: false,
          error: { issues: [{ message: 'Missing required fields' }] },
        }
      }
      return { success: true, data }
    }),
  },
  DeleteCircleSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data.id) {
        return {
          success: false,
          error: { issues: [{ message: 'Missing id' }] },
        }
      }
      return { success: true, data }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------
import { GET, POST, DELETE } from '@/app/api/me/circle/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a NextRequest for GET /api/me/circle with optional query params. */
function makeGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/me/circle')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, { method: 'GET' })
}

/** Build a NextRequest for POST /api/me/circle with a JSON body. */
function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(new URL('http://localhost/api/me/circle'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/** Build a NextRequest for DELETE /api/me/circle with optional query params. */
function makeDeleteRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/me/circle')
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url, { method: 'DELETE' })
}

/** A reusable saved person object for mocking Prisma results. */
function makePerson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'person-1',
    userId: 'test-user-id',
    name: 'Hong Gildong',
    relation: 'friend',
    birthDate: '1990-01-15',
    birthTime: '08:30',
    gender: 'male',
    birthCity: 'Seoul',
    latitude: 37.5665,
    longitude: 126.978,
    tzId: 'Asia/Seoul',
    note: 'A close friend',
    createdAt: new Date('2025-06-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    ...overrides,
  }
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Circle API - GET /api/me/circle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // GET - Paginated list
  // -----------------------------------------------------------------------

  it('should return a paginated list of saved people', async () => {
    const people = [
      makePerson({ id: 'person-1', name: 'Alice', relation: 'friend' }),
      makePerson({ id: 'person-2', name: 'Bob', relation: 'family' }),
    ]

    vi.mocked(prisma.savedPerson.count).mockResolvedValue(2)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue(people as any)

    const response = await GET(makeGetRequest({ limit: '10', offset: '0' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.people).toHaveLength(2)
    expect(data.data.people[0].name).toBe('Alice')
    expect(data.data.people[1].name).toBe('Bob')
    expect(data.data.pagination).toEqual({
      total: 2,
      limit: 10,
      offset: 0,
      hasMore: false,
    })
  })

  it('should return an empty list when no saved people exist', async () => {
    vi.mocked(prisma.savedPerson.count).mockResolvedValue(0)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue([])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.people).toEqual([])
    expect(data.data.pagination.total).toBe(0)
    expect(data.data.pagination.hasMore).toBe(false)
  })

  it('should use default pagination values (limit=20, offset=0) when no params are provided', async () => {
    vi.mocked(prisma.savedPerson.count).mockResolvedValue(0)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue([])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination.limit).toBe(20)
    expect(data.data.pagination.offset).toBe(0)

    expect(prisma.savedPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 20,
        skip: 0,
      })
    )
  })

  it('should compute hasMore=true when more records exist beyond the current page', async () => {
    const people = [
      makePerson({ id: 'person-1', name: 'Alice' }),
      makePerson({ id: 'person-2', name: 'Bob' }),
    ]

    vi.mocked(prisma.savedPerson.count).mockResolvedValue(5)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue(people as any)

    const response = await GET(makeGetRequest({ limit: '2', offset: '0' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.pagination.hasMore).toBe(true)
    expect(data.data.pagination.total).toBe(5)
  })

  it('should compute hasMore=false when offset + returned count reaches total', async () => {
    const people = [
      makePerson({ id: 'person-4', name: 'Dave' }),
      makePerson({ id: 'person-5', name: 'Eve' }),
    ]

    vi.mocked(prisma.savedPerson.count).mockResolvedValue(5)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue(people as any)

    const response = await GET(makeGetRequest({ limit: '2', offset: '3' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    // offset(3) + returned(2) = 5 which equals total(5), so hasMore = false
    expect(data.data.pagination.hasMore).toBe(false)
  })

  it('should order by relation asc then name asc', async () => {
    vi.mocked(prisma.savedPerson.count).mockResolvedValue(0)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue([])

    await GET(makeGetRequest())

    expect(prisma.savedPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ relation: 'asc' }, { name: 'asc' }],
      })
    )
  })

  it('should filter by the authenticated user id', async () => {
    vi.mocked(prisma.savedPerson.count).mockResolvedValue(0)
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue([])

    await GET(makeGetRequest())

    expect(prisma.savedPerson.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user-id' },
      })
    )
    expect(prisma.savedPerson.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'test-user-id' },
      })
    )
  })

  it('should return VALIDATION_ERROR for invalid limit', async () => {
    const response = await GET(makeGetRequest({ limit: 'abc' }))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return DATABASE_ERROR when prisma.savedPerson.count throws', async () => {
    vi.mocked(prisma.savedPerson.count).mockRejectedValue(new Error('Connection refused'))
    vi.mocked(prisma.savedPerson.findMany).mockResolvedValue([])

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DATABASE_ERROR')
    expect(logger.error).toHaveBeenCalledWith('Error fetching circle:', expect.any(Error))
  })

  it('should return DATABASE_ERROR when prisma.savedPerson.findMany throws', async () => {
    vi.mocked(prisma.savedPerson.count).mockResolvedValue(3)
    vi.mocked(prisma.savedPerson.findMany).mockRejectedValue(new Error('Query timeout'))

    const response = await GET(makeGetRequest())
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('DATABASE_ERROR')
  })
})

describe('Circle API - POST /api/me/circle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // POST - Create a person
  // -----------------------------------------------------------------------

  it('should create a new saved person with all fields', async () => {
    const inputBody = {
      name: 'Kim Minjun',
      relation: 'partner',
      birthDate: '1992-07-22',
      birthTime: '14:00',
      gender: 'male',
      birthCity: 'Busan',
      latitude: 35.1796,
      longitude: 129.0756,
      tzId: 'Asia/Seoul',
      note: 'My partner',
    }

    const createdPerson = makePerson({
      id: 'new-person-id',
      ...inputBody,
    })

    vi.mocked(prisma.savedPerson.create).mockResolvedValue(createdPerson as any)

    const response = await POST(makePostRequest(inputBody))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.person.id).toBe('new-person-id')
    expect(data.data.person.name).toBe('Kim Minjun')
    expect(data.data.person.relation).toBe('partner')

    expect(prisma.savedPerson.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        name: 'Kim Minjun',
        relation: 'partner',
        birthDate: '1992-07-22',
        birthTime: '14:00',
        gender: 'male',
        birthCity: 'Busan',
        latitude: 35.1796,
        longitude: 129.0756,
        tzId: 'Asia/Seoul',
        note: 'My partner',
      }),
    })
  })

  it('should create a person with only required fields and null out optional ones', async () => {
    const inputBody = {
      name: 'Lee Sooyoung',
      relation: 'colleague',
    }

    const createdPerson = makePerson({
      id: 'minimal-person-id',
      name: 'Lee Sooyoung',
      relation: 'colleague',
      birthDate: null,
      birthTime: null,
      gender: null,
      birthCity: null,
      latitude: null,
      longitude: null,
      tzId: null,
      note: null,
    })

    vi.mocked(prisma.savedPerson.create).mockResolvedValue(createdPerson as any)

    const response = await POST(makePostRequest(inputBody))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.person.name).toBe('Lee Sooyoung')

    expect(prisma.savedPerson.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        name: 'Lee Sooyoung',
        relation: 'colleague',
        birthDate: null,
        birthTime: null,
        gender: null,
        birthCity: null,
        latitude: null,
        longitude: null,
        tzId: null,
        note: null,
      }),
    })
  })

  it('should return VALIDATION_ERROR when name is missing', async () => {
    const response = await POST(makePostRequest({ relation: 'friend' }))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.savedPerson.create).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR when relation is missing', async () => {
    const response = await POST(makePostRequest({ name: 'Someone' }))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.savedPerson.create).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR when both name and relation are missing', async () => {
    const response = await POST(makePostRequest({}))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.savedPerson.create).not.toHaveBeenCalled()
  })

  it('should return DATABASE_ERROR when prisma.savedPerson.create throws', async () => {
    vi.mocked(prisma.savedPerson.create).mockRejectedValue(new Error('Unique constraint violation'))

    const response = await POST(makePostRequest({ name: 'Test', relation: 'friend' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DATABASE_ERROR')
    expect(logger.error).toHaveBeenCalledWith('Error adding person:', expect.any(Error))
  })

  it('should log a warning when POST validation fails', async () => {
    await POST(makePostRequest({}))

    expect(logger.warn).toHaveBeenCalledWith(
      '[me/circle POST] Validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })
})

describe('Circle API - DELETE /api/me/circle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -----------------------------------------------------------------------
  // DELETE - Remove a person
  // -----------------------------------------------------------------------

  it('should delete a person owned by the authenticated user', async () => {
    const person = makePerson({ id: 'person-to-delete', userId: 'test-user-id' })

    vi.mocked(prisma.savedPerson.findUnique).mockResolvedValue(person as any)
    vi.mocked(prisma.savedPerson.delete).mockResolvedValue(person as any)

    const response = await DELETE(makeDeleteRequest({ id: 'person-to-delete' }))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)

    expect(prisma.savedPerson.findUnique).toHaveBeenCalledWith({
      where: { id: 'person-to-delete' },
    })
    expect(prisma.savedPerson.delete).toHaveBeenCalledWith({
      where: { id: 'person-to-delete' },
    })
  })

  it('should return NOT_FOUND when the person does not exist', async () => {
    vi.mocked(prisma.savedPerson.findUnique).mockResolvedValue(null)

    const response = await DELETE(makeDeleteRequest({ id: 'nonexistent-id' }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(prisma.savedPerson.delete).not.toHaveBeenCalled()
  })

  it('should return NOT_FOUND when person exists but is owned by a different user', async () => {
    const otherUserPerson = makePerson({
      id: 'other-person',
      userId: 'another-user-id',
    })

    vi.mocked(prisma.savedPerson.findUnique).mockResolvedValue(otherUserPerson as any)

    const response = await DELETE(makeDeleteRequest({ id: 'other-person' }))
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(data.error.message).toBe('Not found')
    expect(prisma.savedPerson.delete).not.toHaveBeenCalled()
  })

  it('should return VALIDATION_ERROR when id parameter is missing', async () => {
    const response = await DELETE(makeDeleteRequest())
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.savedPerson.findUnique).not.toHaveBeenCalled()
    expect(prisma.savedPerson.delete).not.toHaveBeenCalled()
  })

  it('should return DATABASE_ERROR when prisma.savedPerson.findUnique throws', async () => {
    vi.mocked(prisma.savedPerson.findUnique).mockRejectedValue(new Error('DB connection lost'))

    const response = await DELETE(makeDeleteRequest({ id: 'some-id' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('DATABASE_ERROR')
    expect(logger.error).toHaveBeenCalledWith('Error deleting person:', expect.any(Error))
  })

  it('should return DATABASE_ERROR when prisma.savedPerson.delete throws', async () => {
    const person = makePerson({ id: 'fail-delete', userId: 'test-user-id' })

    vi.mocked(prisma.savedPerson.findUnique).mockResolvedValue(person as any)
    vi.mocked(prisma.savedPerson.delete).mockRejectedValue(
      new Error('Foreign key constraint failed')
    )

    const response = await DELETE(makeDeleteRequest({ id: 'fail-delete' }))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('DATABASE_ERROR')
    expect(logger.error).toHaveBeenCalledWith('Error deleting person:', expect.any(Error))
  })

  it('should log a warning when DELETE validation fails', async () => {
    await DELETE(makeDeleteRequest())

    expect(logger.warn).toHaveBeenCalledWith(
      '[me/circle DELETE] Validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })
})
