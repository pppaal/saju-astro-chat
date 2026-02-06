/**
 * Comprehensive tests for /api/destiny-matrix/save
 * Tests POST (save) and GET (retrieve) operations for Destiny Matrix reports
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ===========================
// Mock dependencies - BEFORE route import
// ===========================

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = { userId: 'test-user-id', session: { user: { id: 'test-user-id' } } }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 422,
          NOT_FOUND: 404,
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
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    destinyMatrixReport: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
  Prisma: {},
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
  destinyMatrixSaveRequestSchema: {
    safeParse: vi.fn(),
  },
  destinyMatrixSaveGetQuerySchema: {
    safeParse: vi.fn(),
  },
}))

// ===========================
// Import route handlers and mocked modules AFTER mocks
// ===========================

import { POST, GET } from '@/app/api/destiny-matrix/save/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  destinyMatrixSaveRequestSchema,
  destinyMatrixSaveGetQuerySchema,
} from '@/lib/api/zodValidation'

// ===========================
// Test fixtures
// ===========================

const MOCK_USER_ID = 'test-user-id'

const VALID_TIMING_REPORT_DATA = {
  reportType: 'timing' as const,
  period: 'daily' as const,
  reportData: {
    score: 85,
    insights: ['Good day for new beginnings'],
    elements: { wood: 30, fire: 25, earth: 20, metal: 15, water: 10 },
  },
  title: 'Daily Timing Report - January 15, 2024',
  summary: 'A favorable day with strong wood energy',
  overallScore: 85,
  grade: 'A',
  locale: 'ko',
}

const VALID_THEMED_REPORT_DATA = {
  reportType: 'themed' as const,
  theme: 'career' as const,
  reportData: {
    score: 78,
    insights: ['Career advancement opportunities'],
    recommendations: ['Focus on networking'],
  },
  title: 'Career Analysis Report',
  summary: 'Strong career prospects this month',
  overallScore: 78,
  grade: 'B+',
  locale: 'en',
}

const MOCK_SAVED_REPORT = {
  id: 'report-uuid-123',
  userId: MOCK_USER_ID,
  reportType: 'timing',
  period: 'daily',
  theme: null,
  reportData: VALID_TIMING_REPORT_DATA.reportData,
  title: VALID_TIMING_REPORT_DATA.title,
  summary: VALID_TIMING_REPORT_DATA.summary,
  overallScore: 85,
  grade: 'A',
  pdfGenerated: false,
  locale: 'ko',
  createdAt: new Date('2024-01-15T10:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
}

// ===========================
// Helper functions
// ===========================

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/destiny-matrix/save', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `http://localhost/api/destiny-matrix/save?${queryParams}`
    : 'http://localhost/api/destiny-matrix/save'
  return new NextRequest(url, { method: 'GET' })
}

function setupValidationSuccess(data: any) {
  vi.mocked(destinyMatrixSaveRequestSchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupValidationFailure(errors: any[]) {
  vi.mocked(destinyMatrixSaveRequestSchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

function setupGetValidationSuccess(data: any) {
  vi.mocked(destinyMatrixSaveGetQuerySchema.safeParse).mockReturnValue({
    success: true,
    data,
  } as any)
}

function setupGetValidationFailure(errors: any[]) {
  vi.mocked(destinyMatrixSaveGetQuerySchema.safeParse).mockReturnValue({
    success: false,
    error: { issues: errors },
  } as any)
}

// ===========================
// POST /api/destiny-matrix/save Tests
// ===========================

describe('POST /api/destiny-matrix/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 422 when validation fails due to missing reportType', async () => {
      setupValidationFailure([
        { path: ['reportType'], message: 'Required' },
      ])

      const req = createPostRequest({
        reportData: {},
        title: 'Test Report',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when validation fails due to missing title', async () => {
      setupValidationFailure([
        { path: ['title'], message: 'Required' },
      ])

      const req = createPostRequest({
        reportType: 'timing',
        period: 'daily',
        reportData: {},
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 422 when validation fails due to missing reportData', async () => {
      setupValidationFailure([
        { path: ['reportData'], message: 'Required' },
      ])

      const req = createPostRequest({
        reportType: 'timing',
        period: 'daily',
        title: 'Test Report',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
    })

    it('should return 422 when timing report is missing period', async () => {
      setupValidationFailure([
        { path: ['period'], message: 'period is required for timing reports' },
      ])

      const req = createPostRequest({
        reportType: 'timing',
        reportData: {},
        title: 'Test Report',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('period')
    })

    it('should return 422 when themed report is missing theme', async () => {
      setupValidationFailure([
        { path: ['theme'], message: 'theme is required for themed reports' },
      ])

      const req = createPostRequest({
        reportType: 'themed',
        reportData: {},
        title: 'Test Report',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.error.message).toContain('theme')
    })

    it('should return 422 when title exceeds maximum length', async () => {
      setupValidationFailure([
        { path: ['title'], message: 'String must contain at most 300 character(s)' },
      ])

      const req = createPostRequest({
        reportType: 'timing',
        period: 'daily',
        reportData: {},
        title: 'a'.repeat(301),
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when summary exceeds maximum length', async () => {
      setupValidationFailure([
        { path: ['summary'], message: 'String must contain at most 2000 character(s)' },
      ])

      const req = createPostRequest({
        ...VALID_TIMING_REPORT_DATA,
        summary: 'a'.repeat(2001),
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should return 422 when overallScore is out of range', async () => {
      setupValidationFailure([
        { path: ['overallScore'], message: 'Number must be less than or equal to 100' },
      ])

      const req = createPostRequest({
        ...VALID_TIMING_REPORT_DATA,
        overallScore: 150,
      })

      const response = await POST(req)

      expect(response.status).toBe(422)
    })

    it('should log validation warning when validation fails', async () => {
      setupValidationFailure([
        { path: ['reportType'], message: 'Required' },
      ])

      const req = createPostRequest({})

      await POST(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[DestinyMatrixSave POST] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })
  })

  describe('Successful Report Creation', () => {
    it('should create timing report successfully', async () => {
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('report-uuid-123')
      expect(data.data.createdAt).toBeDefined()
    })

    it('should create themed report successfully', async () => {
      const themedReport = {
        ...MOCK_SAVED_REPORT,
        id: 'themed-report-123',
        reportType: 'themed',
        period: null,
        theme: 'career',
      }
      setupValidationSuccess(VALID_THEMED_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(themedReport as any)

      const req = createPostRequest(VALID_THEMED_REPORT_DATA)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('themed-report-123')
    })

    it('should pass correct data to prisma.create', async () => {
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: MOCK_USER_ID,
          reportType: 'timing',
          period: 'daily',
          theme: null,
          reportData: VALID_TIMING_REPORT_DATA.reportData,
          title: VALID_TIMING_REPORT_DATA.title,
          summary: VALID_TIMING_REPORT_DATA.summary,
          overallScore: 85,
          grade: 'A',
          pdfGenerated: false,
          locale: 'ko',
        }),
      })
    })

    it('should use default locale when not provided', async () => {
      const dataWithoutLocale = { ...VALID_TIMING_REPORT_DATA }
      delete (dataWithoutLocale as any).locale
      const validatedData = { ...VALID_TIMING_REPORT_DATA, locale: 'ko' }

      setupValidationSuccess(validatedData)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createPostRequest(dataWithoutLocale)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })

    it('should handle optional fields as null', async () => {
      const minimalData = {
        reportType: 'timing' as const,
        period: 'monthly' as const,
        reportData: { score: 50 },
        title: 'Minimal Report',
      }
      const validatedMinimalData = {
        ...minimalData,
        theme: undefined,
        summary: undefined,
        overallScore: undefined,
        grade: undefined,
        locale: 'ko',
      }

      setupValidationSuccess(validatedMinimalData)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        summary: null,
        overallScore: null,
        grade: null,
      } as any)

      const req = createPostRequest(minimalData)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: null,
          overallScore: null,
          grade: null,
        }),
      })
    })

    it('should log success after saving report', async () => {
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      await POST(req)

      expect(logger.info).toHaveBeenCalledWith('Destiny Matrix report saved', {
        userId: MOCK_USER_ID,
        id: 'report-uuid-123',
        reportType: 'timing',
      })
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to save Destiny Matrix report')
    })

    it('should log database error', async () => {
      const dbError = new Error('Unique constraint violation')
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockRejectedValue(dbError)

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[DestinyMatrixSave POST] Database error',
        { error: dbError }
      )
    })

    it('should handle Prisma-specific errors', async () => {
      const prismaError = {
        code: 'P2002',
        message: 'Unique constraint failed',
        meta: { target: ['id'] },
      }
      setupValidationSuccess(VALID_TIMING_REPORT_DATA)
      vi.mocked(prisma.destinyMatrixReport.create).mockRejectedValue(prismaError)

      const req = createPostRequest(VALID_TIMING_REPORT_DATA)
      const response = await POST(req)

      expect(response.status).toBe(500)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('Report Type Variations', () => {
    it('should create daily timing report', async () => {
      const dailyReport = { ...VALID_TIMING_REPORT_DATA, period: 'daily' as const }
      setupValidationSuccess(dailyReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        period: 'daily',
      } as any)

      const req = createPostRequest(dailyReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create monthly timing report', async () => {
      const monthlyReport = { ...VALID_TIMING_REPORT_DATA, period: 'monthly' as const }
      setupValidationSuccess(monthlyReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        period: 'monthly',
      } as any)

      const req = createPostRequest(monthlyReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create yearly timing report', async () => {
      const yearlyReport = { ...VALID_TIMING_REPORT_DATA, period: 'yearly' as const }
      setupValidationSuccess(yearlyReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        period: 'yearly',
      } as any)

      const req = createPostRequest(yearlyReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create comprehensive timing report', async () => {
      const comprehensiveReport = { ...VALID_TIMING_REPORT_DATA, period: 'comprehensive' as const }
      setupValidationSuccess(comprehensiveReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        period: 'comprehensive',
      } as any)

      const req = createPostRequest(comprehensiveReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create love themed report', async () => {
      const loveReport = { ...VALID_THEMED_REPORT_DATA, theme: 'love' as const }
      setupValidationSuccess(loveReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
        theme: 'love',
        period: null,
      } as any)

      const req = createPostRequest(loveReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create wealth themed report', async () => {
      const wealthReport = { ...VALID_THEMED_REPORT_DATA, theme: 'wealth' as const }
      setupValidationSuccess(wealthReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
        theme: 'wealth',
        period: null,
      } as any)

      const req = createPostRequest(wealthReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create health themed report', async () => {
      const healthReport = { ...VALID_THEMED_REPORT_DATA, theme: 'health' as const }
      setupValidationSuccess(healthReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
        theme: 'health',
        period: null,
      } as any)

      const req = createPostRequest(healthReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should create family themed report', async () => {
      const familyReport = { ...VALID_THEMED_REPORT_DATA, theme: 'family' as const }
      setupValidationSuccess(familyReport)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
        theme: 'family',
        period: null,
      } as any)

      const req = createPostRequest(familyReport)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })
})

// ===========================
// GET /api/destiny-matrix/save Tests
// ===========================

describe('GET /api/destiny-matrix/save', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Validation', () => {
    it('should return 422 when id parameter is missing', async () => {
      setupGetValidationSuccess({ id: undefined })

      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
      expect(data.error.message).toBe('Missing id parameter')
    })

    it('should return 422 when id validation fails', async () => {
      setupGetValidationFailure([
        { path: ['id'], message: 'Invalid id format' },
      ])

      const req = createGetRequest('id=invalid')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.message).toBe('Missing or invalid id parameter')
    })

    it('should return 422 when id exceeds maximum length', async () => {
      setupGetValidationFailure([
        { path: ['id'], message: 'String must contain at most 100 character(s)' },
      ])

      const req = createGetRequest(`id=${'a'.repeat(101)}`)
      const response = await GET(req)

      expect(response.status).toBe(422)
    })
  })

  describe('Report Retrieval', () => {
    it('should return 404 when report is not found', async () => {
      setupGetValidationSuccess({ id: 'non-existent-id' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=non-existent-id')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('NOT_FOUND')
      expect(data.error.message).toBe('Destiny Matrix report not found')
    })

    it('should return report when found', async () => {
      setupGetValidationSuccess({ id: 'report-uuid-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createGetRequest('id=report-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.result.id).toBe(MOCK_SAVED_REPORT.id)
      expect(data.data.result.userId).toBe(MOCK_SAVED_REPORT.userId)
      expect(data.data.result.title).toBe(MOCK_SAVED_REPORT.title)
      expect(data.data.result.reportType).toBe(MOCK_SAVED_REPORT.reportType)
      expect(data.data.result.reportData).toEqual(MOCK_SAVED_REPORT.reportData)
    })

    it('should only return reports belonging to the authenticated user (userId check)', async () => {
      setupGetValidationSuccess({ id: 'report-uuid-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(MOCK_SAVED_REPORT as any)

      const req = createGetRequest('id=report-uuid-123')
      await GET(req)

      expect(prisma.destinyMatrixReport.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'report-uuid-123',
          userId: MOCK_USER_ID,
        },
      })
    })

    it('should return 404 when report belongs to different user', async () => {
      setupGetValidationSuccess({ id: 'other-user-report' })
      // findFirst returns null when userId doesn't match
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(null)

      const req = createGetRequest('id=other-user-report')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error.code).toBe('NOT_FOUND')
    })

    it('should return timing report with all fields', async () => {
      const fullReport = {
        ...MOCK_SAVED_REPORT,
        reportType: 'timing',
        period: 'daily',
        theme: null,
      }
      setupGetValidationSuccess({ id: 'report-uuid-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(fullReport as any)

      const req = createGetRequest('id=report-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.reportType).toBe('timing')
      expect(data.data.result.period).toBe('daily')
      expect(data.data.result.theme).toBeNull()
    })

    it('should return themed report with all fields', async () => {
      const themedReport = {
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
        period: null,
        theme: 'career',
      }
      setupGetValidationSuccess({ id: 'themed-report-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(themedReport as any)

      const req = createGetRequest('id=themed-report-123')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.reportType).toBe('themed')
      expect(data.data.result.period).toBeNull()
      expect(data.data.result.theme).toBe('career')
    })
  })

  describe('Database Error Handling', () => {
    it('should handle database error gracefully', async () => {
      setupGetValidationSuccess({ id: 'report-uuid-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockRejectedValue(
        new Error('Database connection failed')
      )

      const req = createGetRequest('id=report-uuid-123')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DATABASE_ERROR')
      expect(data.error.message).toBe('Failed to retrieve Destiny Matrix report')
    })

    it('should log database error', async () => {
      const dbError = new Error('Query timeout')
      setupGetValidationSuccess({ id: 'report-uuid-123' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockRejectedValue(dbError)

      const req = createGetRequest('id=report-uuid-123')
      await GET(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[DestinyMatrixSave GET] Database error',
        { error: dbError }
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string id as validation error', async () => {
      setupGetValidationSuccess({ id: '' })

      const req = createGetRequest('id=')
      const response = await GET(req)

      // Empty string is falsy, so it triggers the "Missing id parameter" check
      expect(response.status).toBe(422)
    })

    it('should handle report with null optional fields', async () => {
      const reportWithNulls = {
        ...MOCK_SAVED_REPORT,
        summary: null,
        overallScore: null,
        grade: null,
        theme: null,
      }
      setupGetValidationSuccess({ id: 'report-with-nulls' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(reportWithNulls as any)

      const req = createGetRequest('id=report-with-nulls')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.summary).toBeNull()
      expect(data.data.result.overallScore).toBeNull()
      expect(data.data.result.grade).toBeNull()
    })

    it('should handle report with complex reportData JSON', async () => {
      const complexReport = {
        ...MOCK_SAVED_REPORT,
        reportData: {
          layers: {
            layer1: { elements: ['wood', 'fire'], score: 90 },
            layer2: { aspects: ['conjunction', 'trine'], weight: 0.8 },
          },
          insights: [
            { category: 'career', message: 'Strong career prospects', priority: 1 },
            { category: 'love', message: 'New relationships possible', priority: 2 },
          ],
          metadata: {
            calculatedAt: '2024-01-15T10:00:00Z',
            version: '2.0',
          },
        },
      }
      setupGetValidationSuccess({ id: 'complex-report' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(complexReport as any)

      const req = createGetRequest('id=complex-report')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.result.reportData.layers.layer1.elements).toContain('wood')
    })

    it('should preserve Korean locale in retrieved report', async () => {
      const koreanReport = {
        ...MOCK_SAVED_REPORT,
        locale: 'ko',
        title: '일일 운세 리포트',
      }
      setupGetValidationSuccess({ id: 'korean-report' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(koreanReport as any)

      const req = createGetRequest('id=korean-report')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('ko')
      expect(data.data.result.title).toBe('일일 운세 리포트')
    })

    it('should preserve English locale in retrieved report', async () => {
      const englishReport = {
        ...MOCK_SAVED_REPORT,
        locale: 'en',
        title: 'Daily Fortune Report',
      }
      setupGetValidationSuccess({ id: 'english-report' })
      vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(englishReport as any)

      const req = createGetRequest('id=english-report')
      const response = await GET(req)
      const data = await response.json()

      expect(data.data.result.locale).toBe('en')
      expect(data.data.result.title).toBe('Daily Fortune Report')
    })
  })
})

// ===========================
// Integration-style Tests
// ===========================

describe('POST then GET workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should be able to retrieve a report that was just saved', async () => {
    // Setup POST
    setupValidationSuccess(VALID_TIMING_REPORT_DATA)
    vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

    const postReq = createPostRequest(VALID_TIMING_REPORT_DATA)
    const postResponse = await POST(postReq)
    const postData = await postResponse.json()

    expect(postResponse.status).toBe(200)
    const savedId = postData.data.id

    // Setup GET
    setupGetValidationSuccess({ id: savedId })
    vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(MOCK_SAVED_REPORT as any)

    const getReq = createGetRequest(`id=${savedId}`)
    const getResponse = await GET(getReq)
    const getData = await getResponse.json()

    expect(getResponse.status).toBe(200)
    expect(getData.data.result.id).toBe(savedId)
    expect(getData.data.result.title).toBe(VALID_TIMING_REPORT_DATA.title)
  })
})

// ===========================
// Security Tests
// ===========================

describe('Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should enforce user isolation - cannot access other users reports via GET', async () => {
    // The middleware always injects test-user-id, so findFirst will filter by that
    // If report belongs to another user, findFirst returns null
    setupGetValidationSuccess({ id: 'another-users-report' })
    vi.mocked(prisma.destinyMatrixReport.findFirst).mockResolvedValue(null)

    const req = createGetRequest('id=another-users-report')
    const response = await GET(req)

    expect(response.status).toBe(404)

    // Verify the query included userId filter
    expect(prisma.destinyMatrixReport.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'another-users-report',
        userId: MOCK_USER_ID,
      },
    })
  })

  it('should always associate saved reports with authenticated user', async () => {
    setupValidationSuccess(VALID_TIMING_REPORT_DATA)
    vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)

    const req = createPostRequest(VALID_TIMING_REPORT_DATA)
    await POST(req)

    expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: MOCK_USER_ID,
      }),
    })
  })
})
