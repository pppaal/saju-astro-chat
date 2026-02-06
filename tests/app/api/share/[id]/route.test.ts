import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mock dependencies - must be before route import
// ---------------------------------------------------------------------------

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    sharedResult: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

vi.mock('@/lib/api/zodValidation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/zodValidation')>()
  return {
    ...actual,
    idParamSchema: {
      safeParse: vi.fn((data: any) => {
        if (!data.id || typeof data.id !== 'string') {
          return {
            success: false,
            error: {
              issues: [{ path: ['id'], message: 'Invalid id parameter' }],
            },
          }
        }
        if (data.id.length === 0) {
          return {
            success: false,
            error: {
              issues: [{ path: ['id'], message: 'String must contain at least 1 character(s)' }],
            },
          }
        }
        if (data.id.length > 100) {
          return {
            success: false,
            error: {
              issues: [{ path: ['id'], message: 'String must contain at most 100 character(s)' }],
            },
          }
        }
        return { success: true, data: { id: data.id } }
      }),
    },
  }
})

// ---------------------------------------------------------------------------
// Imports AFTER mocks
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/share/[id]/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/share/${id}`, {
    method: 'GET',
  })
}

function createParams(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

const mockSharedResult = {
  id: 'share-123',
  userId: 'user-456',
  resultType: 'destiny-map',
  title: 'My Destiny Map Result',
  description: 'A detailed analysis of my destiny',
  resultData: { score: 85, summary: 'Excellent fortune' },
  viewCount: 5,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days in future
  createdAt: new Date('2025-01-15T10:00:00Z'),
}

// ===========================================================================
// Tests
// ===========================================================================

describe('Share API - GET /api/share/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------
  describe('Input Validation', () => {
    it('should return 422 when id parameter is missing', async () => {
      const request = createRequest('')
      const params = createParams('')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when id is too long (> 100 characters)', async () => {
      const longId = 'a'.repeat(101)
      const request = createRequest(longId)
      const params = createParams(longId)

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should accept valid id with maximum length (100 characters)', async () => {
      const validId = 'a'.repeat(100)
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest(validId)
      const params = createParams(validId)

      const response = await GET(request, params)

      // Should proceed to database query (not fail validation)
      expect(prisma.sharedResult.findUnique).toHaveBeenCalledWith({
        where: { id: validId },
      })
    })

    it('should accept valid short id', async () => {
      const validId = 'abc123'
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(mockSharedResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(mockSharedResult as any)

      const request = createRequest(validId)
      const params = createParams(validId)

      const response = await GET(request, params)

      expect(response.status).toBe(200)
      expect(prisma.sharedResult.findUnique).toHaveBeenCalledWith({
        where: { id: validId },
      })
    })
  })

  // -------------------------------------------------------------------------
  // Not Found
  // -------------------------------------------------------------------------
  describe('Not Found Scenarios', () => {
    it('should return 404 when shared result does not exist', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest('nonexistent-id')
      const params = createParams('nonexistent-id')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Shared result not found')
    })

    it('should query database with correct id', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest('specific-share-id')
      const params = createParams('specific-share-id')

      await GET(request, params)

      expect(prisma.sharedResult.findUnique).toHaveBeenCalledWith({
        where: { id: 'specific-share-id' },
      })
    })
  })

  // -------------------------------------------------------------------------
  // Expiration
  // -------------------------------------------------------------------------
  describe('Expiration Handling', () => {
    it('should return 404 when shared result has expired', async () => {
      const expiredResult = {
        ...mockSharedResult,
        expiresAt: new Date(Date.now() - 1000), // 1 second in the past
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(expiredResult as any)

      const request = createRequest('expired-share')
      const params = createParams('expired-share')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Shared result has expired')
    })

    it('should not return 410 when expiresAt is null', async () => {
      const noExpirationResult = {
        ...mockSharedResult,
        expiresAt: null,
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(noExpirationResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(noExpirationResult as any)

      const request = createRequest('no-expiration-share')
      const params = createParams('no-expiration-share')

      const response = await GET(request, params)

      expect(response.status).toBe(200)
    })

    it('should not return 410 when expiresAt is in the future', async () => {
      const futureResult = {
        ...mockSharedResult,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day in future
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(futureResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(futureResult as any)

      const request = createRequest('future-share')
      const params = createParams('future-share')

      const response = await GET(request, params)

      expect(response.status).toBe(200)
    })

    it('should return 404 when expiresAt is exactly now', async () => {
      const now = new Date()
      const exactlyExpiredResult = {
        ...mockSharedResult,
        expiresAt: new Date(now.getTime() - 1), // Just past
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(exactlyExpiredResult as any)

      const request = createRequest('exact-expiration-share')
      const params = createParams('exact-expiration-share')

      const response = await GET(request, params)

      expect(response.status).toBe(404)
    })
  })

  // -------------------------------------------------------------------------
  // View Count Increment
  // -------------------------------------------------------------------------
  describe('View Count Increment', () => {
    it('should increment view count on successful retrieval', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(mockSharedResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue({
        ...mockSharedResult,
        viewCount: 6,
      } as any)

      const request = createRequest('share-123')
      const params = createParams('share-123')

      await GET(request, params)

      expect(prisma.sharedResult.update).toHaveBeenCalledWith({
        where: { id: 'share-123' },
        data: { viewCount: { increment: 1 } },
      })
    })

    it('should not increment view count if result not found', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest('nonexistent')
      const params = createParams('nonexistent')

      await GET(request, params)

      expect(prisma.sharedResult.update).not.toHaveBeenCalled()
    })

    it('should not increment view count if result has expired', async () => {
      const expiredResult = {
        ...mockSharedResult,
        expiresAt: new Date(Date.now() - 1000),
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(expiredResult as any)

      const request = createRequest('expired')
      const params = createParams('expired')

      await GET(request, params)

      expect(prisma.sharedResult.update).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Success Response
  // -------------------------------------------------------------------------
  describe('Success Response', () => {
    it('should return correct response structure', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(mockSharedResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(mockSharedResult as any)

      const request = createRequest('share-123')
      const params = createParams('share-123')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        type: 'destiny-map',
        title: 'My Destiny Map Result',
        description: 'A detailed analysis of my destiny',
        data: { score: 85, summary: 'Excellent fortune' },
        createdAt: '2025-01-15T10:00:00.000Z',
      })
    })

    it('should return null description when not set', async () => {
      const resultWithoutDescription = {
        ...mockSharedResult,
        description: null,
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(resultWithoutDescription as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(resultWithoutDescription as any)

      const request = createRequest('share-no-desc')
      const params = createParams('share-no-desc')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.description).toBeNull()
    })

    it('should return null data when resultData is null', async () => {
      const resultWithoutData = {
        ...mockSharedResult,
        resultData: null,
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(resultWithoutData as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(resultWithoutData as any)

      const request = createRequest('share-no-data')
      const params = createParams('share-no-data')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeNull()
    })

    it('should handle various result types', async () => {
      const resultTypes = ['destiny-map', 'tarot', 'numerology', 'compatibility', 'saju']

      for (const resultType of resultTypes) {
        vi.clearAllMocks()
        const typedResult = { ...mockSharedResult, resultType }
        vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(typedResult as any)
        vi.mocked(prisma.sharedResult.update).mockResolvedValue(typedResult as any)

        const request = createRequest(`share-${resultType}`)
        const params = createParams(`share-${resultType}`)

        const response = await GET(request, params)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.type).toBe(resultType)
      }
    })
  })

  // -------------------------------------------------------------------------
  // Error Handling
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 when database findUnique throws', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = createRequest('db-error')
      const params = createParams('db-error')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(logger.error).toHaveBeenCalledWith('Error fetching shared result:', {
        error: expect.any(Error),
      })
    })

    it('should return 500 when database update throws', async () => {
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(mockSharedResult as any)
      vi.mocked(prisma.sharedResult.update).mockRejectedValue(new Error('Update failed'))

      const request = createRequest('update-error')
      const params = createParams('update-error')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should log error with context when exception occurs', async () => {
      const testError = new Error('Test error')
      vi.mocked(prisma.sharedResult.findUnique).mockRejectedValue(testError)

      const request = createRequest('log-error')
      const params = createParams('log-error')

      await GET(request, params)

      expect(logger.error).toHaveBeenCalledWith('Error fetching shared result:', {
        error: testError,
      })
    })
  })

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle special characters in id', async () => {
      const specialId = 'share-abc_123-xyz'
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest(specialId)
      const params = createParams(specialId)

      await GET(request, params)

      expect(prisma.sharedResult.findUnique).toHaveBeenCalledWith({
        where: { id: specialId },
      })
    })

    it('should handle numeric-like id strings', async () => {
      const numericId = '12345678901234567890'
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(null)

      const request = createRequest(numericId)
      const params = createParams(numericId)

      await GET(request, params)

      expect(prisma.sharedResult.findUnique).toHaveBeenCalledWith({
        where: { id: numericId },
      })
    })

    it('should handle UUID-formatted ids', async () => {
      const uuidId = '550e8400-e29b-41d4-a716-446655440000'
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(mockSharedResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(mockSharedResult as any)

      const request = createRequest(uuidId)
      const params = createParams(uuidId)

      const response = await GET(request, params)

      expect(response.status).toBe(200)
    })

    it('should handle result with complex resultData', async () => {
      const complexResult = {
        ...mockSharedResult,
        resultData: {
          nested: {
            deeply: {
              value: [1, 2, 3],
            },
          },
          array: ['a', 'b', 'c'],
          boolean: true,
          number: 42.5,
        },
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(complexResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(complexResult as any)

      const request = createRequest('complex-data')
      const params = createParams('complex-data')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(complexResult.resultData)
    })

    it('should handle very long title and description', async () => {
      const longTextResult = {
        ...mockSharedResult,
        title: 'A'.repeat(200),
        description: 'B'.repeat(2000),
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(longTextResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue(longTextResult as any)

      const request = createRequest('long-text')
      const params = createParams('long-text')

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('A'.repeat(200))
      expect(data.description).toBe('B'.repeat(2000))
    })

    it('should handle result with zero view count', async () => {
      const zeroViewResult = {
        ...mockSharedResult,
        viewCount: 0,
      }
      vi.mocked(prisma.sharedResult.findUnique).mockResolvedValue(zeroViewResult as any)
      vi.mocked(prisma.sharedResult.update).mockResolvedValue({
        ...zeroViewResult,
        viewCount: 1,
      } as any)

      const request = createRequest('zero-views')
      const params = createParams('zero-views')

      const response = await GET(request, params)

      expect(response.status).toBe(200)
      expect(prisma.sharedResult.update).toHaveBeenCalledWith({
        where: { id: 'zero-views' },
        data: { viewCount: { increment: 1 } },
      })
    })
  })
})
