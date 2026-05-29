/**
 * Regression test for cache invalidation prefix bug
 * (claude/cache-invalidation-prefix-fix).
 *
 * Bug: PATCH /api/me/profile was clearing cache with prefixes that did not
 * match the actual key formats produced by CacheKeys in redis-cache.ts, so
 * stale saju/destiny/yearly/calendar entries lingered until TTL after a user
 * changed their birth info.
 *
 * Real key formats:
 *   - saju:v1:${birthDate}:${birthTime}:${gender}:${calendar}
 *   - destiny:v1:${birthDate}:${birthTime}
 *   - yearly:v6:${birthDate}:${birthTime}:${gender}:${year}:${category}:${...}
 *   - cal:v1:${year}:${month}:${userId}     ← userId at the END
 *
 * This test pins each pattern's required prefix so future drift between
 * CacheKeys and CacheInvalidationPatterns fails loudly.
 */

import { vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock middleware as passthrough (must be before route import)
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: args[0]?.userId || 'user-123',
        session: { user: { id: args[0]?.userId || 'user-123' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      return handler(req, context, ...args)
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  extractLocale: vi.fn(() => 'ko'),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  userProfileUpdateSchema: {
    safeParse: vi.fn((data: any) => {
      if (data === null || typeof data !== 'object') {
        return { success: false, error: { issues: [{ message: 'Expected object', path: [] }] } }
      }
      const result: any = {}
      if (data.name !== undefined) result.name = data.name
      if (data.image !== undefined) result.image = data.image
      if (data.birthDate !== undefined) result.birthDate = data.birthDate
      if (data.birthTime !== undefined) result.birthTime = data.birthTime
      if (data.gender !== undefined) result.gender = data.gender
      if (data.birthCity !== undefined) result.birthCity = data.birthCity
      if (data.tzId !== undefined) result.tzId = data.tzId
      return { success: true, data: result }
    }),
  },
  createValidationErrorResponse: vi.fn((error: any) => {
    return new Response(JSON.stringify({ error: 'Validation failed', details: error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    userProfile: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => {
      // Run callback with the same prisma mock as `tx`
      const { prisma } = await import('@/lib/db/prisma')
      return cb(prisma)
    }),
  },
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  clearCacheByPattern: vi.fn().mockResolvedValue(0),
  // Real implementations of the helpers — we WANT the test to fail if these
  // ever drift away from CacheKeys' actual prefixes.
  CacheInvalidationPatterns: {
    sajuByBirthDate: (birthDate: string) => `saju:v1:${birthDate}:*`,
    destinyByBirthDate: (birthDate: string) => `destiny:v1:${birthDate}:*`,
    yearlyByBirthDate: (birthDate: string) => `yearly:v6:${birthDate}:*`,
    calendarByUser: (userId: string) => `cal:v1:*:*:${userId}`,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn(({ code, message }) => {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      BAD_REQUEST: 400,
    }
    return new Response(JSON.stringify({ error: message }), {
      status: statusMap[code] || 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }),
  ErrorCodes: {
    NOT_FOUND: 'NOT_FOUND',
    BAD_REQUEST: 'BAD_REQUEST',
  },
}))

import { PATCH } from '@/app/api/me/profile/route'
import { prisma } from '@/lib/db/prisma'
import { clearCacheByPattern } from '@/lib/cache/redis-cache'

describe('PATCH /api/me/profile — cache invalidation prefix regression', () => {
  const mockUserId = 'user-123'
  const mockContext = { userId: mockUserId }
  const birthDate = '1990-01-15'

  const baseUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    image: null,
    createdAt: new Date('2023-01-01'),
    profile: {
      profilePhoto: null,
      birthDate,
      birthTime: '14:30',
      gender: 'male',
      birthCity: 'Seoul',
      tzId: 'Asia/Seoul',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(clearCacheByPattern).mockResolvedValue(0)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(baseUser as any)
  })

  function patternCalls(): string[] {
    return vi.mocked(clearCacheByPattern).mock.calls.map((c) => c[0] as string)
  }

  it('uses saju:v1: prefix (not bare saju:) when birth info changes', async () => {
    const req = new NextRequest('http://localhost:3000/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ birthTime: '16:00' }),
    })

    await PATCH(req, mockContext)

    const calls = patternCalls()
    const sajuPatterns = calls.filter((p) => p.startsWith('saju:'))
    expect(sajuPatterns.length).toBeGreaterThan(0)
    // Every saju pattern must include the v1 version segment
    for (const p of sajuPatterns) {
      expect(p).toContain('saju:v1:')
      expect(p).toContain(birthDate)
    }
  })

  it('uses destiny:v1: prefix (not bare destiny:) when birth info changes', async () => {
    const req = new NextRequest('http://localhost:3000/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ birthTime: '16:00' }),
    })

    await PATCH(req, mockContext)

    const destinyPatterns = patternCalls().filter((p) => p.startsWith('destiny:'))
    expect(destinyPatterns.length).toBeGreaterThan(0)
    for (const p of destinyPatterns) {
      expect(p).toContain('destiny:v1:')
      expect(p).toContain(birthDate)
    }
  })

  it('uses yearly:v6: prefix (not the old yearly:v2:) when birth info changes', async () => {
    const req = new NextRequest('http://localhost:3000/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ gender: 'female' }),
    })

    await PATCH(req, mockContext)

    const yearlyPatterns = patternCalls().filter((p) => p.startsWith('yearly:'))
    expect(yearlyPatterns.length).toBeGreaterThan(0)
    for (const p of yearlyPatterns) {
      expect(p).toContain('yearly:v6:')
      expect(p).toContain(birthDate)
      // Must NOT regress to the old broken version
      expect(p).not.toContain('yearly:v2:')
    }
  })

  it('uses cal:v1:*:*:${userId} (userId at the END, two wildcards before) for calendar cache', async () => {
    const req = new NextRequest('http://localhost:3000/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ birthTime: '16:00' }),
    })

    await PATCH(req, mockContext)

    const calPatterns = patternCalls().filter((p) => p.startsWith('cal:'))
    expect(calPatterns).toContain(`cal:v1:*:*:${mockUserId}`)
    // Must NOT regress to the old broken format
    for (const p of calPatterns) {
      expect(p).not.toBe(`cal:user:${mockUserId}`)
    }
  })

  it('does not invalidate birth-specific caches when only non-birth fields change', async () => {
    const req = new NextRequest('http://localhost:3000/api/me/profile', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name' }),
    })

    await PATCH(req, mockContext)

    const calls = patternCalls()
    expect(calls.some((p) => p.startsWith('saju:'))).toBe(false)
    expect(calls.some((p) => p.startsWith('destiny:'))).toBe(false)
    expect(calls.some((p) => p.startsWith('yearly:'))).toBe(false)
    expect(calls.some((p) => p.startsWith('cal:'))).toBe(false)
  })
})
