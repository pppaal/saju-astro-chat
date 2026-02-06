import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock middleware BEFORE importing route
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler, _options) => {
    return async (req: NextRequest, ...args: unknown[]) => {
      // Check for unauthenticated test scenario
      const testContext = (args[0] as { userId?: string | null; isAuthenticated?: boolean }) || {}
      const userId = testContext.userId
      const isAuthenticated = testContext.isAuthenticated ?? (userId !== null && userId !== undefined)

      if (!isAuthenticated) {
        const { NextResponse } = await import('next/server')
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }

      const context = {
        userId,
        session: { user: { id: userId } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      return handler(req, context, ...args)
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    userReport: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock next-auth (required for middleware)
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock rate limiting
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 9 }),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

// Mock CSRF
vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockReturnValue(null),
}))

// Mock credits
vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

// Keep actual Zod validation
vi.mock('@/lib/api/zodValidation', async () => {
  const actual = await vi.importActual('@/lib/api/zodValidation')
  return actual
})

import { POST } from '@/app/api/destiny-match/report/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

describe('Destiny Match Report API - POST', () => {
  const mockUserId = 'user-123'
  const mockReportedUserId = 'user-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============ Authentication Tests ============

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: null, isAuthenticated: false } as unknown)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('unauthorized')
    })

    it('should accept authenticated user requests', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ============ Validation Tests ============

  describe('Validation - Required Fields', () => {
    it('should return 400 when reportedUserId is missing', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'reportedUserId',
          }),
        ])
      )
    })

    it('should return 400 when category is missing', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: 'category',
          }),
        ])
      )
    })

    it('should return 400 when body is empty', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })
  })

  describe('Validation - reportedUserId', () => {
    it('should return 400 when reportedUserId is empty string', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: '',
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when reportedUserId exceeds max length (200 chars)', async () => {
      const longId = 'a'.repeat(201)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: longId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should trim whitespace from reportedUserId', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: `  ${mockReportedUserId}  `,
          category: 'spam',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reportedId: mockReportedUserId,
          }),
        })
      )
    })
  })

  describe('Validation - category', () => {
    it('should return 400 for invalid category', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'invalid_category',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    const validCategories = ['inappropriate', 'spam', 'fake', 'harassment', 'other']

    validCategories.forEach((category) => {
      it(`should accept valid category: ${category}`, async () => {
        vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
        vi.mocked(prisma.userReport.create).mockResolvedValue({
          id: 'report-123',
          reporterId: mockUserId,
          reportedId: mockReportedUserId,
          category,
          description: null,
          createdAt: new Date(),
        } as never)

        const request = new NextRequest('http://localhost/api/destiny-match/report', {
          method: 'POST',
          body: JSON.stringify({
            reportedUserId: mockReportedUserId,
            category,
          }),
        })

        const response = await POST(request, { userId: mockUserId } as unknown)

        expect(response.status).toBe(200)
      })
    })
  })

  describe('Validation - description (optional)', () => {
    it('should accept request without description', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should accept valid description', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'harassment',
        description: 'Sent inappropriate messages',
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'harassment',
          description: 'Sent inappropriate messages',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })

    it('should return 400 when description exceeds max length (1000 chars)', async () => {
      const longDescription = 'a'.repeat(1001)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
          description: longDescription,
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should truncate description to 500 chars when saving to database', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'other',
        description: 'a'.repeat(500),
        createdAt: new Date(),
      } as never)

      const description = 'a'.repeat(600)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'other',
          description,
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'a'.repeat(500),
          }),
        })
      )
    })

    it('should trim whitespace from description', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: 'Test description',
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
          description: '  Test description  ',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Test description',
          }),
        })
      )
    })
  })

  // ============ Access Control Tests ============

  describe('Access Control', () => {
    it('should return 400 when user tries to report themselves', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockUserId, // Same as reporter
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('자기 자신을 신고할 수 없습니다')
    })

    it('should return 400 when user reports same person within 24 hours', async () => {
      // Mock existing recent report
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue({
        id: 'existing-report',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(), // Within 24 hours
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'harassment',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('이미 신고한 사용자입니다. 24시간 후 다시 시도해주세요.')
    })

    it('should allow reporting after 24 hours have passed', async () => {
      // No recent report found (null means no report in last 24 hours)
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should check for recent reports with correct time window', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.findFirst).toHaveBeenCalledWith({
        where: {
          reporterId: mockUserId,
          reportedId: mockReportedUserId,
          createdAt: { gte: expect.any(Date) },
        },
      })
    })
  })

  // ============ Success Cases ============

  describe('Success Cases', () => {
    it('should create report successfully with minimal data', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('신고가 접수되었습니다.')
    })

    it('should create report successfully with full data', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'harassment',
        description: 'Detailed harassment description',
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'harassment',
          description: 'Detailed harassment description',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should save report with correct data structure', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'fake',
        description: 'Fake profile',
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'fake',
          description: 'Fake profile',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: mockUserId,
          reportedId: mockReportedUserId,
          category: 'fake',
          description: 'Fake profile',
        },
      })
    })

    it('should set description to null when not provided', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(prisma.userReport.create).toHaveBeenCalledWith({
        data: {
          reporterId: mockUserId,
          reportedId: mockReportedUserId,
          category: 'spam',
          description: null,
        },
      })
    })
  })

  // ============ Error Handling Tests ============

  describe('Error Handling', () => {
    it('should log validation failures', async () => {
      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'invalid',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Destiny match report] validation failed',
        expect.objectContaining({
          errors: expect.any(Array),
        })
      )
    })

    it('should log successful reports', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      await POST(request, { userId: mockUserId } as unknown)

      expect(logger.info).toHaveBeenCalledWith(
        '[destiny-match/report] User reported',
        expect.objectContaining({
          reporterId: mockUserId,
          reportedId: mockReportedUserId,
          category: 'spam',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      vi.mocked(prisma.userReport.findFirst).mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      // The middleware wrapper should catch the error
      await expect(POST(request, { userId: mockUserId } as unknown)).rejects.toThrow('Database connection failed')
    })

    it('should handle report creation failure', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockRejectedValue(new Error('Failed to create report'))

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'spam',
        }),
      })

      await expect(POST(request, { userId: mockUserId } as unknown)).rejects.toThrow('Failed to create report')
    })
  })

  // ============ Edge Cases ============

  describe('Edge Cases', () => {
    it('should handle special characters in reportedUserId', async () => {
      const specialUserId = 'user-with-special_chars.123'
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: specialUserId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: specialUserId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })

    it('should handle unicode in description', async () => {
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'harassment',
        description: '이 사용자가 부적절한 메시지를 보냈습니다 🚫',
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'harassment',
          description: '이 사용자가 부적절한 메시지를 보냈습니다 🚫',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })

    it('should allow reporting different users', async () => {
      const otherUserId = 'user-789'
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: otherUserId,
        category: 'inappropriate',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: otherUserId,
          category: 'inappropriate',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })

    it('should handle maximum length reportedUserId (200 chars)', async () => {
      const maxLengthId = 'a'.repeat(200)
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: maxLengthId,
        category: 'spam',
        description: null,
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: maxLengthId,
          category: 'spam',
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })

    it('should handle maximum length description (1000 chars)', async () => {
      const maxLengthDescription = 'a'.repeat(1000)
      vi.mocked(prisma.userReport.findFirst).mockResolvedValue(null)
      vi.mocked(prisma.userReport.create).mockResolvedValue({
        id: 'report-123',
        reporterId: mockUserId,
        reportedId: mockReportedUserId,
        category: 'other',
        description: maxLengthDescription.slice(0, 500), // Truncated to 500
        createdAt: new Date(),
      } as never)

      const request = new NextRequest('http://localhost/api/destiny-match/report', {
        method: 'POST',
        body: JSON.stringify({
          reportedUserId: mockReportedUserId,
          category: 'other',
          description: maxLengthDescription,
        }),
      })

      const response = await POST(request, { userId: mockUserId } as unknown)

      expect(response.status).toBe(200)
    })
  })
})
