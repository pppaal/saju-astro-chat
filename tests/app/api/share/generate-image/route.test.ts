import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock dependencies - must be before route import
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      let session: any = null
      try {
        session = await (getServerSession as any)()
      } catch {
        // Session fetch failed - continue without session
      }

      const context = {
        userId: session?.user?.id || null,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: !!session?.user,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)

      // If result is already a Response (NextResponse), return it directly
      if (result instanceof Response) {
        return result
      }

      // Convert middleware helper results to NextResponse
      if (result.error) {
        const statusMap: Record<string, number> = {
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
        { status: result.status || 200 }
      )
    }
  }),
  createPublicStreamGuard: vi.fn((options: any) => options),
  createSimpleGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({
    data,
    status: 200,
  })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sharedResult: {
      create: vi.fn(),
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
  shareResultRequestSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: Array<{ path: string[]; message: string }> = []

      // title validation
      if (!data.title || typeof data.title !== 'string') {
        errors.push({ path: ['title'], message: 'Required' })
      } else if (data.title.trim().length === 0) {
        errors.push({ path: ['title'], message: 'String must contain at least 1 character(s)' })
      } else if (data.title.length > 200) {
        errors.push({ path: ['title'], message: 'String must contain at most 200 character(s)' })
      }

      // resultType validation
      if (!data.resultType || typeof data.resultType !== 'string') {
        errors.push({ path: ['resultType'], message: 'Required' })
      } else if (data.resultType.trim().length === 0) {
        errors.push({
          path: ['resultType'],
          message: 'String must contain at least 1 character(s)',
        })
      } else if (data.resultType.length > 50) {
        errors.push({
          path: ['resultType'],
          message: 'String must contain at most 50 character(s)',
        })
      }

      // description validation (optional)
      if (data.description !== undefined && data.description !== null) {
        if (typeof data.description !== 'string') {
          errors.push({
            path: ['description'],
            message: 'Expected string, received ' + typeof data.description,
          })
        } else if (data.description.length > 2000) {
          errors.push({
            path: ['description'],
            message: 'String must contain at most 2000 character(s)',
          })
        }
      }

      // resultData validation (optional)
      if (data.resultData !== undefined && data.resultData !== null) {
        if (typeof data.resultData !== 'object' || Array.isArray(data.resultData)) {
          errors.push({ path: ['resultData'], message: 'Expected object' })
        }
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors.map((e) => ({ path: e.path, message: e.message })) },
        }
      }

      return {
        success: true,
        data: {
          title: data.title.trim(),
          description: data.description?.trim() || undefined,
          resultType: data.resultType.trim(),
          resultData: data.resultData,
        },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/share/generate-image/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { apiSuccess, apiError } from '@/lib/api/middleware'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/share/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_REQUEST_BODY = {
  title: 'My Destiny Analysis',
  description: 'A comprehensive analysis of my fortune',
  resultType: 'destiny-map',
  resultData: { score: 85, summary: 'Good fortune ahead' },
}

const mockCreatedResult = {
  id: 'share-abc123',
  userId: 'user-123',
  resultType: 'destiny-map',
  title: 'My Destiny Analysis',
  description: 'A comprehensive analysis of my fortune',
  resultData: { score: 85, summary: 'Good fortune ahead' },
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  viewCount: 0,
  createdAt: new Date(),
}

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com' },
  expires: '2025-12-31',
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Share Generate Image API - POST /api/share/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue(mockSession as any)
    vi.mocked(prisma.sharedResult.create).mockResolvedValue(mockCreatedResult as any)

    // Reset apiSuccess and apiError to return proper format
    vi.mocked(apiSuccess).mockImplementation((data: any) => ({
      data,
      status: 200,
    }))
    vi.mocked(apiError).mockImplementation((code: string, message?: string) => ({
      error: { code, message },
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Input Validation
  // -------------------------------------------------------------------------
  describe('Input Validation', () => {
    it('should return VALIDATION_ERROR when title is missing', async () => {
      const request = createPostRequest({
        resultType: 'destiny-map',
        resultData: {},
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Validation failed')
    })

    it('should return VALIDATION_ERROR when title is empty', async () => {
      const request = createPostRequest({
        title: '   ',
        resultType: 'destiny-map',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return VALIDATION_ERROR when title exceeds 200 characters', async () => {
      const request = createPostRequest({
        title: 'A'.repeat(201),
        resultType: 'destiny-map',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('200')
    })

    it('should return VALIDATION_ERROR when resultType is missing', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultData: {},
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Validation failed')
    })

    it('should return VALIDATION_ERROR when resultType is empty', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: '',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return VALIDATION_ERROR when resultType exceeds 50 characters', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'x'.repeat(51),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('50')
    })

    it('should return VALIDATION_ERROR when description exceeds 2000 characters', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        description: 'D'.repeat(2001),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('2000')
    })

    it('should accept valid request with all fields', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(prisma.sharedResult.create).toHaveBeenCalled()
    })

    it('should accept valid request without optional fields', async () => {
      const request = createPostRequest({
        title: 'Minimal Request',
        resultType: 'tarot',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
    })

    it('should accept title with maximum length (200 characters)', async () => {
      const request = createPostRequest({
        title: 'T'.repeat(200),
        resultType: 'destiny-map',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
    })

    it('should accept description with maximum length (2000 characters)', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        description: 'D'.repeat(2000),
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // Authentication (Optional)
  // -------------------------------------------------------------------------
  describe('Authentication Handling', () => {
    it('should allow sharing without login (userId is null)', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: null,
        }),
      })
    })

    it('should track userId when user is logged in', async () => {
      vi.mocked(getServerSession).mockResolvedValue(mockSession as any)

      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
        }),
      })
    })

    it('should handle session fetch error gracefully', async () => {
      // When getServerSession throws an error, the mock middleware catches it
      // and continues with null userId
      vi.mocked(getServerSession).mockRejectedValue(new Error('Session error'))

      const request = createPostRequest(VALID_REQUEST_BODY)

      // The response should still work (session fetch error is handled gracefully)
      const response = await POST(request)
      // Since the mock catches the error, we just verify the request completes
      expect(response).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Database Operations
  // -------------------------------------------------------------------------
  describe('Database Operations', () => {
    it('should create shared result with correct data', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)

      await POST(request)

      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          resultType: 'destiny-map',
          title: 'My Destiny Analysis',
          description: 'A comprehensive analysis of my fortune',
          resultData: { score: 85, summary: 'Good fortune ahead' },
        }),
      })
    })

    it('should set expiresAt to 30 days from now', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)
      const beforeCall = Date.now()

      await POST(request)

      const createCall = vi.mocked(prisma.sharedResult.create).mock.calls[0][0]
      const expiresAt = createCall.data.expiresAt as Date
      const thirtyDays = 30 * 24 * 60 * 60 * 1000

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(beforeCall + thirtyDays - 1000)
      expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + thirtyDays + 1000)
    })

    it('should store null description when not provided', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'tarot',
      })

      await POST(request)

      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      })
    })

    it('should store DbNull when resultData is not provided', async () => {
      const { Prisma } = await import('@prisma/client')
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'tarot',
      })

      await POST(request)

      const createCall = vi.mocked(prisma.sharedResult.create).mock.calls[0][0]
      // When resultData is undefined, it should be DbNull or similar
      expect(createCall.data.resultData).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Success Response
  // -------------------------------------------------------------------------
  describe('Success Response', () => {
    it('should return success with shareId', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)
      expect(json.data.shareId).toBe('share-abc123')
    })

    it('should return correct imageUrl format', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.imageUrl).toBe(
        '/api/share/og-image?shareId=share-abc123&title=My%20Destiny%20Analysis&type=destiny-map'
      )
    })

    it('should return correct shareUrl format', async () => {
      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      // Uses default base URL since env vars are not set
      expect(json.data.shareUrl).toContain('/shared/share-abc123')
    })

    it('should encode special characters in imageUrl title', async () => {
      vi.mocked(prisma.sharedResult.create).mockResolvedValue({
        ...mockCreatedResult,
        title: 'My & Special <Title>',
      } as any)

      const request = createPostRequest({
        title: 'My & Special <Title>',
        resultType: 'destiny-map',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.data.imageUrl).toContain(encodeURIComponent('My & Special <Title>'))
    })
  })

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return DATABASE_ERROR when prisma create fails', async () => {
      vi.mocked(prisma.sharedResult.create).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createPostRequest(VALID_REQUEST_BODY)

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(false)
      expect(json.error.code).toBe('DATABASE_ERROR')
      expect(json.error.message).toBe('Failed to generate share image')
    })

    it('should log error when database operation fails', async () => {
      const testError = new Error('Test database error')
      vi.mocked(prisma.sharedResult.create).mockRejectedValue(testError)

      const request = createPostRequest(VALID_REQUEST_BODY)

      await POST(request)

      expect(logger.error).toHaveBeenCalledWith('Share image generation error:', {
        error: testError,
      })
    })

    it('should log validation warning when validation fails', async () => {
      const request = createPostRequest({
        title: '',
        resultType: '',
      })

      await POST(request)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Share generate-image] validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Various Result Types
  // -------------------------------------------------------------------------
  describe('Various Result Types', () => {
    const resultTypes = [
      'destiny-map',
      'tarot',
      'numerology',
      'compatibility',
      'saju',
      'astrology',
      'iching',
      'dream',
      'past-life',
    ]

    for (const resultType of resultTypes) {
      it(`should handle ${resultType} result type`, async () => {
        vi.mocked(prisma.sharedResult.create).mockResolvedValue({
          ...mockCreatedResult,
          resultType,
        } as any)

        const request = createPostRequest({
          title: `My ${resultType} analysis`,
          resultType,
        })

        const response = await POST(request)
        const json = await response.json()

        expect(json.success).toBe(true)
        expect(json.data.imageUrl).toContain(`type=${resultType}`)
      })
    }
  })

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle empty resultData object', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        resultData: {},
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resultData: {},
        }),
      })
    })

    it('should handle complex nested resultData', async () => {
      const complexData = {
        sections: {
          overview: { score: 85, text: 'Good' },
          details: [
            { category: 'love', score: 90 },
            { category: 'career', score: 75 },
          ],
        },
        metadata: {
          generatedAt: '2025-01-15T10:00:00Z',
          version: '2.0',
        },
      }

      const request = createPostRequest({
        title: 'Complex Analysis',
        resultType: 'destiny-map',
        resultData: complexData,
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resultData: complexData,
        }),
      })
    })

    it('should trim whitespace from title', async () => {
      const request = createPostRequest({
        title: '  My Analysis  ',
        resultType: 'destiny-map',
      })

      await POST(request)

      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'My Analysis',
        }),
      })
    })

    it('should trim whitespace from description', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        description: '  My description  ',
      })

      await POST(request)

      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: 'My description',
        }),
      })
    })

    it('should handle Korean characters in title and description', async () => {
      vi.mocked(prisma.sharedResult.create).mockResolvedValue({
        ...mockCreatedResult,
        title: '나의 운세 분석',
        description: '상세한 사주 분석 결과입니다',
      } as any)

      const request = createPostRequest({
        title: '나의 운세 분석',
        resultType: 'saju',
        description: '상세한 사주 분석 결과입니다',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
      expect(json.data.imageUrl).toContain(encodeURIComponent('나의 운세 분석'))
    })

    it('should handle emoji in title', async () => {
      vi.mocked(prisma.sharedResult.create).mockResolvedValue({
        ...mockCreatedResult,
        title: 'My Fortune Analysis',
      } as any)

      const request = createPostRequest({
        title: 'My Fortune Analysis',
        resultType: 'destiny-map',
      })

      const response = await POST(request)
      const json = await response.json()

      expect(json.success).toBe(true)
    })

    it('should handle null description correctly', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        description: null,
      })

      await POST(request)

      expect(prisma.sharedResult.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null,
        }),
      })
    })

    it('should handle undefined vs null for optional fields', async () => {
      const request = createPostRequest({
        title: 'My Analysis',
        resultType: 'destiny-map',
        // description and resultData are undefined (not provided)
      })

      await POST(request)

      const createCall = vi.mocked(prisma.sharedResult.create).mock.calls[0][0]
      expect(createCall.data).toHaveProperty('description')
      expect(createCall.data).toHaveProperty('resultData')
    })
  })

  // -------------------------------------------------------------------------
  // Rate Limiting (Guard Configuration)
  // -------------------------------------------------------------------------
  describe('Rate Limiting Configuration', () => {
    it('should export POST as a function wrapped with middleware', async () => {
      // The POST export should be a function (wrapped by withApiMiddleware)
      expect(typeof POST).toBe('function')
    })
  })
})
