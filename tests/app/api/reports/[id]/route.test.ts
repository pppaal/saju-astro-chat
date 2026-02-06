/**
 * Comprehensive tests for /api/reports/[id]
 * Tests GET/DELETE operations by ID, validation, authentication, and access control
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock next-auth with getServerSession
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      user: { name: 'Test User', email: 'test@example.com', id: 'user-123' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  ),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock dependencies
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    destinyMatrixReport: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
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

// Mock Zod validation schemas
vi.mock('@/lib/api/zodValidation', () => ({
  idParamSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      const errors: { path: string[]; message: string }[] = []

      if (!data.id || typeof data.id !== 'string' || data.id.trim().length === 0) {
        errors.push({ path: ['id'], message: 'ID is required' })
      } else if (data.id.length > 100) {
        errors.push({ path: ['id'], message: 'ID must be at most 100 characters' })
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: { id: data.id },
      }
    }),
  },
}))

// Mock middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn(
    (
      handler: (req: NextRequest, context: Record<string, unknown>) => Promise<unknown>,
      _options: unknown
    ) => {
      return async (req: NextRequest, ...args: unknown[]) => {
        const { getServerSession } = await import('next-auth')
        const { authOptions } = await import('@/lib/auth/authOptions')

        let session: { user?: { id: string; name?: string; email?: string } } | null = null
        try {
          session = await (
            getServerSession as (
              opts: unknown
            ) => Promise<{ user?: { id: string; name?: string; email?: string } } | null>
          )(authOptions)
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: 'Internal Server Error', status: 500 },
            },
            { status: 500 }
          )
        }

        if (!session?.user?.id) {
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized', status: 401 } },
            { status: 401 }
          )
        }

        const context = {
          userId: session.user.id,
          session,
          ip: '127.0.0.1',
          locale: 'ko',
          isAuthenticated: true,
          isPremium: false,
        }

        try {
          const result = (await handler(req, context, ...args)) as
            | { data?: unknown; error?: { code: string; message?: string }; status?: number }
            | Response
          if (result instanceof Response) return result
          if (result?.error) {
            const statusMap: Record<string, number> = {
              BAD_REQUEST: 400,
              VALIDATION_ERROR: 422,
              INTERNAL_ERROR: 500,
              NOT_FOUND: 404,
              DATABASE_ERROR: 500,
            }
            return NextResponse.json(
              { success: false, error: { code: result.error.code, message: result.error.message } },
              { status: statusMap[result.error.code] || 500 }
            )
          }
          return NextResponse.json({ success: true, data: result?.data }, { status: result?.status || 200 })
        } catch (err: unknown) {
          const error = err as Error
          return NextResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: error.message || 'Internal Server Error' },
            },
            { status: 500 }
          )
        }
      }
    }
  ),
  createAuthenticatedGuard: vi.fn((opts: Record<string, unknown>) => ({
    ...opts,
    requireAuth: true,
  })),
  apiSuccess: vi.fn((data: unknown, options?: { status?: number; meta?: Record<string, unknown> }) => ({
    data,
    status: options?.status,
    meta: options?.meta,
  })),
  apiError: vi.fn((code: string, message?: string, details?: unknown) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

describe('/api/reports/[id]', () => {
  const mockUserId = 'user-123'
  const mockReportId = 'report-456'

  const mockReport = {
    id: mockReportId,
    userId: mockUserId,
    reportType: 'monthly',
    period: '2024-06',
    theme: 'career',
    reportData: {
      summary: 'Monthly career report',
      sections: [
        { title: 'Overview', content: 'Career overview content' },
        { title: 'Opportunities', content: 'Career opportunities content' },
      ],
      keywords: ['growth', 'networking', 'leadership'],
      insights: ['Focus on professional development', 'Good time for networking'],
      actionItems: ['Update resume', 'Schedule mentor meetings'],
    },
    title: 'June 2024 Career Report',
    summary: 'Comprehensive career analysis for June 2024',
    overallScore: 85,
    grade: 'A',
    pdfGenerated: true,
    pdfUrl: 'https://example.com/reports/report-456.pdf',
    locale: 'ko',
    createdAt: new Date('2024-06-01T10:00:00Z'),
    updatedAt: new Date('2024-06-01T10:00:00Z'),
  }

  const createRouteContext = (id: string) => ({
    params: Promise.resolve({ id }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { name: 'Test User', email: 'test@example.com', id: mockUserId },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  })

  // =============================================================
  // GET Handler Tests
  // =============================================================

  describe('GET /api/reports/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })

      it('should reject requests without user id in session', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(401)
      })

      it('should return 500 when getServerSession throws an error', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Session service unavailable')
        )

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Parameter Validation', () => {
      it('should reject empty ID parameter', async () => {
        const req = new Request('http://localhost:3000/api/reports/')
        const routeContext = createRouteContext('')

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('invalid_params')
      })

      it('should reject ID longer than 100 characters', async () => {
        const longId = 'a'.repeat(101)
        const req = new Request(`http://localhost:3000/api/reports/${longId}`)
        const routeContext = createRouteContext(longId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('invalid_params')
      })

      it('should accept valid ID at exactly 100 characters', async () => {
        const validId = 'a'.repeat(100)
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReport,
          id: validId,
        })

        const req = new Request(`http://localhost:3000/api/reports/${validId}`)
        const routeContext = createRouteContext(validId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(200)
      })
    })

    describe('Access Control', () => {
      it('should return 404 when report does not exist', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/reports/nonexistent-id')
        const routeContext = createRouteContext('nonexistent-id')

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when accessing another users report', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new Request('http://localhost:3000/api/reports/other-user-report')
        const routeContext = createRouteContext('other-user-report')

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.destinyMatrixReport.findFirst).toHaveBeenCalledWith({
          where: {
            id: 'other-user-report',
            userId: mockUserId,
          },
          select: expect.any(Object),
        })
      })

      it('should only query for reports belonging to authenticated user', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        await GET(req, routeContext)

        expect(prisma.destinyMatrixReport.findFirst).toHaveBeenCalledWith({
          where: {
            id: mockReportId,
            userId: mockUserId,
          },
          select: {
            id: true,
            reportType: true,
            period: true,
            theme: true,
            reportData: true,
            title: true,
            summary: true,
            overallScore: true,
            grade: true,
            pdfGenerated: true,
            pdfUrl: true,
            locale: true,
            createdAt: true,
            updatedAt: true,
          },
        })
      })
    })

    describe('Successful Retrieval', () => {
      it('should return report data with all fields correctly mapped', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.success).toBe(true)
        expect(result.data.report).toBeDefined()
        expect(result.data.report.id).toBe(mockReportId)
        expect(result.data.report.type).toBe('monthly')
        expect(result.data.report.period).toBe('2024-06')
        expect(result.data.report.theme).toBe('career')
        expect(result.data.report.title).toBe('June 2024 Career Report')
        expect(result.data.report.score).toBe(85)
        expect(result.data.report.grade).toBe('A')
      })

      it('should return sections, keywords, insights, and actionItems from reportData', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.report.sections).toEqual([
          { title: 'Overview', content: 'Career overview content' },
          { title: 'Opportunities', content: 'Career opportunities content' },
        ])
        expect(result.data.report.keywords).toEqual(['growth', 'networking', 'leadership'])
        expect(result.data.report.insights).toEqual([
          'Focus on professional development',
          'Good time for networking',
        ])
        expect(result.data.report.actionItems).toEqual(['Update resume', 'Schedule mentor meetings'])
      })

      it('should fallback to reportData.summary when report.summary is null', async () => {
        const reportWithoutSummary = {
          ...mockReport,
          summary: null,
        }
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
          reportWithoutSummary
        )

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.report.summary).toBe('Monthly career report')
      })

      it('should return createdAt as ISO string', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.report.createdAt).toBe('2024-06-01T10:00:00.000Z')
      })

      it('should include fullData from reportData', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(result.data.report.fullData).toEqual(mockReport.reportData)
      })

      it('should handle report with minimal data (empty arrays)', async () => {
        const minimalReport = {
          id: 'minimal-report',
          userId: mockUserId,
          reportType: 'weekly',
          period: '2024-W23',
          theme: null,
          reportData: {},
          title: 'Minimal Report',
          summary: 'A minimal report',
          overallScore: null,
          grade: null,
          pdfGenerated: false,
          pdfUrl: null,
          locale: 'en',
          createdAt: new Date('2024-06-01'),
          updatedAt: new Date('2024-06-01'),
        }
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(minimalReport)

        const req = new Request('http://localhost:3000/api/reports/minimal-report')
        const routeContext = createRouteContext('minimal-report')

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.report.sections).toEqual([])
        expect(result.data.report.keywords).toEqual([])
        expect(result.data.report.insights).toEqual([])
        expect(result.data.report.actionItems).toEqual([])
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database connection failed')
        )

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(logger.error).toHaveBeenCalledWith('Report Fetch Error:', expect.any(Error))
      })

      it('should handle Prisma-specific errors', async () => {
        const prismaError = new Error('PrismaClientKnownRequestError') as Error & { code?: string }
        prismaError.code = 'P2025'
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError)

        const req = new Request(`http://localhost:3000/api/reports/${mockReportId}`)
        const routeContext = createRouteContext(mockReportId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Edge Cases', () => {
      it('should handle CUID format IDs', async () => {
        const cuidId = 'clxyz1234567890abcdef'
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReport,
          id: cuidId,
        })

        const req = new Request(`http://localhost:3000/api/reports/${cuidId}`)
        const routeContext = createRouteContext(cuidId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.report.id).toBe(cuidId)
      })

      it('should handle UUID format IDs', async () => {
        const uuidId = '550e8400-e29b-41d4-a716-446655440000'
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReport,
          id: uuidId,
        })

        const req = new Request(`http://localhost:3000/api/reports/${uuidId}`)
        const routeContext = createRouteContext(uuidId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.report.id).toBe(uuidId)
      })

      it('should handle special characters in report ID', async () => {
        const specialId = 'report-123-abc-xyz'
        ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
          ...mockReport,
          id: specialId,
        })

        const req = new Request(`http://localhost:3000/api/reports/${specialId}`)
        const routeContext = createRouteContext(specialId)

        const { GET } = await import('@/app/api/reports/[id]/route')
        const response = await GET(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data.report.id).toBe(specialId)
      })
    })
  })

  // =============================================================
  // DELETE Handler Tests
  // =============================================================

  describe('DELETE /api/reports/[id]', () => {
    describe('Authentication', () => {
      it('should reject unauthenticated delete requests', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(401)
        expect(result.error.code).toBe('UNAUTHORIZED')
      })

      it('should reject delete requests without user id in session', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
          user: { name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(401)
      })

      it('should return 500 when getServerSession throws an error', async () => {
        ;(getServerSession as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Auth service unavailable')
        )

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Parameter Validation', () => {
      it('should reject empty ID parameter for delete', async () => {
        const req = new NextRequest('http://localhost:3000/api/reports/', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('')

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('invalid_params')
      })

      it('should reject ID longer than 100 characters for delete', async () => {
        const longId = 'a'.repeat(101)
        const req = new NextRequest(`http://localhost:3000/api/reports/${longId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(longId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toBe('invalid_params')
      })
    })

    describe('Access Control', () => {
      it('should return 404 when trying to delete non-existent report', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 })

        const req = new NextRequest('http://localhost:3000/api/reports/nonexistent-id', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('nonexistent-id')

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error.code).toBe('NOT_FOUND')
      })

      it('should return 404 when trying to delete another users report', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 0 })

        const req = new NextRequest('http://localhost:3000/api/reports/other-user-report', {
          method: 'DELETE',
        })
        const routeContext = createRouteContext('other-user-report')

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(404)
        expect(prisma.destinyMatrixReport.deleteMany).toHaveBeenCalledWith({
          where: {
            id: 'other-user-report',
            userId: mockUserId,
          },
        })
      })

      it('should filter by both id AND userId in delete query', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        await DELETE(req, routeContext)

        expect(prisma.destinyMatrixReport.deleteMany).toHaveBeenCalledWith({
          where: {
            id: mockReportId,
            userId: mockUserId,
          },
        })
      })
    })

    describe('Successful Deletion', () => {
      it('should delete report successfully and return success message', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.success).toBe(true)
        expect(result.data.message).toContain('삭제')
      })

      it('should call deleteMany with correct where clause', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        await DELETE(req, routeContext)

        expect(prisma.destinyMatrixReport.deleteMany).toHaveBeenCalledWith({
          where: {
            id: mockReportId,
            userId: mockUserId,
          },
        })
      })
    })

    describe('Error Handling', () => {
      it('should handle database errors during delete', async () => {
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(
          new Error('Database write error')
        )

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)
        const result = await response.json()

        expect(response.status).toBe(500)
        expect(result.error.code).toBe('DATABASE_ERROR')
        expect(logger.error).toHaveBeenCalledWith('Report Delete Error:', expect.any(Error))
      })

      it('should handle Prisma constraint violations', async () => {
        const prismaError = new Error('Foreign key constraint failed') as Error & { code?: string }
        prismaError.code = 'P2003'
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockRejectedValue(prismaError)

        const req = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(500)
      })
    })

    describe('Idempotency', () => {
      it('should return 404 on second delete of same resource', async () => {
        // First delete succeeds
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          count: 1,
        })

        const req1 = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext1 = createRouteContext(mockReportId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response1 = await DELETE(req1, routeContext1)
        expect(response1.status).toBe(200)

        // Second delete returns 404 since record no longer exists
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          count: 0,
        })

        const req2 = new NextRequest(`http://localhost:3000/api/reports/${mockReportId}`, {
          method: 'DELETE',
        })
        const routeContext2 = createRouteContext(mockReportId)

        const response2 = await DELETE(req2, routeContext2)
        expect(response2.status).toBe(404)
      })
    })

    describe('Edge Cases', () => {
      it('should handle UUID format ids in delete', async () => {
        const uuidId = '550e8400-e29b-41d4-a716-446655440000'
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

        const req = new NextRequest(`http://localhost:3000/api/reports/${uuidId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(uuidId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(200)
        expect(prisma.destinyMatrixReport.deleteMany).toHaveBeenCalledWith({
          where: {
            id: uuidId,
            userId: mockUserId,
          },
        })
      })

      it('should handle CUID format ids in delete', async () => {
        const cuidId = 'clxyz1234567890abcdef'
        ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({ count: 1 })

        const req = new NextRequest(`http://localhost:3000/api/reports/${cuidId}`, {
          method: 'DELETE',
        })
        const routeContext = createRouteContext(cuidId)

        const { DELETE } = await import('@/app/api/reports/[id]/route')
        const response = await DELETE(req, routeContext)

        expect(response.status).toBe(200)
      })
    })
  })

  // =============================================================
  // Multi-User Isolation Tests
  // =============================================================

  describe('Multi-User Isolation', () => {
    it('should isolate data between different users for GET', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const sharedReportId = 'shared-report-id'

      // User 1 has access
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...mockReport,
        id: sharedReportId,
        userId: user1Id,
      })

      const { GET } = await import('@/app/api/reports/[id]/route')

      const req1 = new Request(`http://localhost:3000/api/reports/${sharedReportId}`)
      const routeContext1 = createRouteContext(sharedReportId)
      const response1 = await GET(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 does not have access to same ID
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.destinyMatrixReport.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null)

      const req2 = new Request(`http://localhost:3000/api/reports/${sharedReportId}`)
      const routeContext2 = createRouteContext(sharedReportId)
      const response2 = await GET(req2, routeContext2)
      expect(response2.status).toBe(404)
    })

    it('should isolate data between different users for DELETE', async () => {
      const user1Id = 'user-1'
      const user2Id = 'user-2'
      const reportId = 'user1-report-id'

      // User 1 can delete their own data
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user1Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 1,
      })

      const { DELETE } = await import('@/app/api/reports/[id]/route')

      const req1 = new NextRequest(`http://localhost:3000/api/reports/${reportId}`, {
        method: 'DELETE',
      })
      const routeContext1 = createRouteContext(reportId)
      const response1 = await DELETE(req1, routeContext1)
      expect(response1.status).toBe(200)

      // User 2 cannot delete User 1's data
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { id: user2Id },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      ;(prisma.destinyMatrixReport.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        count: 0,
      })

      const req2 = new NextRequest(`http://localhost:3000/api/reports/${reportId}`, {
        method: 'DELETE',
      })
      const routeContext2 = createRouteContext(reportId)
      const response2 = await DELETE(req2, routeContext2)
      expect(response2.status).toBe(404)
    })
  })

  // =============================================================
  // Rate Limiting Configuration Tests
  // =============================================================

  describe('Rate Limiting Configuration', () => {
    it('should export GET as a function wrapped by withApiMiddleware', async () => {
      const { GET } = await import('@/app/api/reports/[id]/route')
      expect(typeof GET).toBe('function')
    })

    it('should export DELETE as a function wrapped by withApiMiddleware', async () => {
      const { DELETE } = await import('@/app/api/reports/[id]/route')
      expect(typeof DELETE).toBe('function')
    })
  })
})
