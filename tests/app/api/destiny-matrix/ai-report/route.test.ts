// tests/app/api/destiny-matrix/ai-report/route.test.ts
// Comprehensive tests for Destiny Fusion Matrix AI Premium Report API

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ===========================
// Mock dependencies - BEFORE route import
// ===========================

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    destinyMatrixReport: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/destiny-matrix', () => ({
  calculateDestinyMatrix: vi.fn(),
  FusionReportGenerator: vi.fn().mockImplementation(() => ({
    generateReport: vi.fn().mockReturnValue({
      id: 'report-123',
      overallScore: { total: 85, grade: 'A' },
      topInsights: [{ text: 'Test insight' }],
    }),
  })),
  validateReportRequest: vi.fn(),
  DestinyMatrixError: class DestinyMatrixError extends Error {
    public readonly code: string
    public readonly details?: unknown
    public readonly timestamp: Date
    constructor(code: string, options?: { message?: string; details?: unknown; lang?: string }) {
      super(options?.message || 'Test error')
      this.name = 'DestinyMatrixError'
      this.code = code
      this.details = options?.details
      this.timestamp = new Date()
      Object.setPrototypeOf(this, DestinyMatrixError.prototype)
    }
    toJSON() {
      return {
        success: false,
        error: {
          code: this.code,
          message: this.message,
          details: this.details,
          timestamp: this.timestamp.toISOString(),
        },
      }
    }
    getHttpStatus() {
      const codeNum = parseInt(this.code.replace('DFM_', ''), 10)
      if (codeNum >= 1000 && codeNum < 2000) return 400
      if (codeNum >= 2000 && codeNum < 3000) return 422
      if (codeNum >= 3000 && codeNum < 4000) return 404
      return 500
    }
  },
  ErrorCodes: {
    VALIDATION_ERROR: 'DFM_1000',
    CALCULATION_ERROR: 'DFM_2000',
    INTERNAL_ERROR: 'DFM_9000',
    UNKNOWN_ERROR: 'DFM_9999',
  },
  wrapError: vi.fn().mockImplementation((error: unknown) => {
    const err = {
      code: 'DFM_9000',
      message: error instanceof Error ? error.message : String(error),
      toJSON() {
        return {
          success: false,
          error: { code: this.code, message: this.message, timestamp: new Date().toISOString() },
        }
      },
      getHttpStatus() {
        return 500
      },
    }
    return err
  }),
}))

vi.mock('@/lib/destiny-matrix/ai-report', () => ({
  generateAIPremiumReport: vi.fn(),
  generateTimingReport: vi.fn(),
  generateThemedReport: vi.fn(),
  generateFivePagePDF: vi.fn(),
  generatePremiumPDF: vi.fn(),
  summarizeDestinyMatrixEvidence: vi.fn().mockReturnValue({
    totalInsights: 0,
    totalSourceLinks: 0,
    domains: {},
    layerCoverage: [],
    items: [],
  }),
  summarizeGraphRAGEvidence: vi.fn().mockReturnValue(null),
  REPORT_CREDIT_COSTS: {
    daily: 2,
    monthly: 3,
    yearly: 5,
    comprehensive: 7,
    themed: 3,
    love: 3,
    career: 3,
    wealth: 3,
    health: 3,
    family: 3,
  },
}))

vi.mock('@/lib/credits/creditService', () => ({
  canUseFeature: vi.fn(),
  consumeCredits: vi.fn(),
  getCreditBalance: vi.fn(),
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    UNPROCESSABLE_ENTITY: 422,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// ===========================
// Import route handlers and mocked modules AFTER mocks
// ===========================

import { GET, POST } from '@/app/api/destiny-matrix/ai-report/route'
import { getServerSession } from 'next-auth'
import { getCreditBalance, consumeCredits, canUseFeature } from '@/lib/credits/creditService'
import { validateReportRequest, calculateDestinyMatrix } from '@/lib/destiny-matrix'
import {
  generateAIPremiumReport,
  generateTimingReport,
  generateThemedReport,
  generateFivePagePDF,
  generatePremiumPDF,
} from '@/lib/destiny-matrix/ai-report'
import { rateLimit } from '@/lib/rateLimit'
import { prisma } from '@/lib/db/prisma'

// ===========================
// Shared test fixtures
// ===========================

const MOCK_SESSION = {
  user: { id: 'user-abc-123', email: 'test@example.com' },
  expires: '2026-12-31',
}

const MOCK_BALANCE = {
  plan: 'pro' as const,
  remainingCredits: 50,
  monthlyCredits: 100,
  usedCredits: 50,
  bonusCredits: 0,
  totalCredits: 100,
}

const MOCK_VALID_INPUT = {
  dayMasterElement: '\uBAA9', // Wood element
  geokguk: 'jeonggwan',
  yongsin: '\uD654', // Fire element
  sibsinDistribution: { '\uC815\uAD00': 2 },
  shinsalList: ['\uCC9C\uC744\uADC0\uC778'],
  planetHouses: { Sun: 10, Moon: 4 },
  activeTransits: ['jupiterReturn'],
  lang: 'ko',
}

const MOCK_VALIDATED_DATA = {
  ...MOCK_VALID_INPUT,
  queryDomain: undefined,
  maxInsights: 5,
}

const MOCK_MATRIX_RESULT = {
  layer1_elementCore: {},
  layer2_sibsinPlanet: {},
  layer3_sibsinHouse: {},
  layer4_timing: {},
  layer5_relationAspect: {},
  layer6_stageHouse: {},
  layer7_advanced: {},
  layer8_shinsalPlanet: {},
  layer9_asteroidHouse: {},
  layer10_extraPointElement: {},
}

const MOCK_AI_REPORT = {
  id: 'ai-report-001',
  generatedAt: '2026-01-15T10:00:00Z',
  summary: 'Your comprehensive destiny analysis',
  overallScore: 85,
  matrixSummary: { overallScore: 85 },
  sections: [{ title: 'Overview', content: 'Your destiny matrix shows...' }],
  meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
}

const MOCK_TIMING_REPORT = {
  id: 'timing-report-001',
  generatedAt: '2026-01-15T10:00:00Z',
  period: 'daily',
  periodScore: { overall: 78, career: 80, love: 75, wealth: 70, health: 85 },
  sections: {
    overview: "Today's energy is positive",
    energy: 'High energy day',
    opportunities: 'Good time for career moves',
    cautions: 'Watch finances',
    domains: { career: 'Good', love: 'Steady', wealth: 'Careful', health: 'Strong' },
    actionPlan: 'Focus on career',
  },
  meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
}

const MOCK_THEMED_REPORT = {
  id: 'themed-report-001',
  generatedAt: '2026-01-15T10:00:00Z',
  theme: 'love',
  themeScore: { overall: 82, potential: 85, timing: 78, compatibility: 80 },
  sections: {
    deepAnalysis: 'Your love fortune...',
    patterns: 'Recurring patterns...',
    timing: 'Best timing for love...',
    recommendations: ['Be open to new connections'],
    actionPlan: 'Follow your heart',
  },
  meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
}

const MOCK_SAVED_REPORT = {
  id: 'saved-report-db-001',
  userId: 'user-abc-123',
  reportType: 'comprehensive',
  createdAt: new Date(),
}

// ===========================
// Helper to create requests
// ===========================

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/destiny-matrix/ai-report', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `http://localhost/api/destiny-matrix/ai-report?${queryParams}`
    : 'http://localhost/api/destiny-matrix/ai-report'
  return new NextRequest(url, { method: 'GET' })
}

// ===========================
// Helper to set up successful flow mocks
// ===========================

function setupSuccessfulFlow() {
  vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
  vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
  vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
  vi.mocked(validateReportRequest).mockReturnValue({
    success: true,
    data: MOCK_VALIDATED_DATA,
    errors: [],
  } as any)
  vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
  vi.mocked(generateAIPremiumReport).mockResolvedValue(MOCK_AI_REPORT as any)
  vi.mocked(consumeCredits).mockResolvedValue({ success: true, remaining: 43 } as any)
  vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)
}

// ===========================
// POST tests
// ===========================

describe('POST /api/destiny-matrix/ai-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Authentication ----

  describe('Authentication', () => {
    it('should return 401 when no session exists', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session has no user', async () => {
      vi.mocked(getServerSession).mockResolvedValue({ expires: '2026-12-31' } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 when session user has no id', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { email: 'test@example.com' },
        expires: '2026-12-31',
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
    })
  })

  // ---- Rate Limiting ----

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        headers: new Headers({ 'Retry-After': '60' }),
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('should proceed when rate limit allows', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(rateLimit).toHaveBeenCalled()
    })
  })

  // ---- Input Validation ----

  describe('Input Validation', () => {
    it('should return error for invalid JSON body', async () => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)

      const req = new NextRequest('http://localhost/api/destiny-matrix/ai-report', {
        method: 'POST',
        body: 'not valid json{{{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(req)
      const data = await response.json()

      // Invalid JSON is caught and wrapped via wrapError
      expect(data.success).toBe(false)
    })

    it('should return 400 when validation fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: false,
        errors: [{ field: 'dayMasterElement', message: 'Required' }],
      } as any)

      const req = createPostRequest({})
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DFM_1000')
      expect(data.error.details).toBeDefined()
    })
  })

  // ---- Credit Checks ----

  describe('Credit Checks', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
    })

    it('should return 402 when insufficient credits for comprehensive report', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 3,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INSUFFICIENT_CREDITS')
      expect(data.error.required).toBe(7) // comprehensive cost
      expect(data.error.current).toBe(3)
    })

    it('should return 402 when insufficient credits for daily timing report', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 1,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'daily' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error.required).toBe(2) // daily cost
    })

    it('should return 402 when insufficient credits for monthly timing report', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 2,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'monthly' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error.required).toBe(3) // monthly cost
    })

    it('should return 402 when insufficient credits for yearly timing report', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 4,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'yearly' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error.required).toBe(5) // yearly cost
    })

    it('should return 402 when insufficient credits for themed report', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 2,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'love' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error.required).toBe(3) // themed cost
    })

    it('should use themed cost when both theme and period are set', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 2,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'career', period: 'daily' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      // theme takes precedence: cost = 3
      expect(data.error.required).toBe(3)
    })

    it('should use comprehensive cost when period is "comprehensive"', async () => {
      vi.mocked(getCreditBalance).mockResolvedValue({
        remainingCredits: 5,
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'comprehensive' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error.required).toBe(7) // comprehensive cost
    })
  })

  // ---- Credit Deduction Failure ----

  describe('Credit Deduction Failure', () => {
    it('should return 500 when credit consumption fails', async () => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
      vi.mocked(generateAIPremiumReport).mockResolvedValue(MOCK_AI_REPORT as any)
      vi.mocked(consumeCredits).mockResolvedValue({ success: false } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('CREDIT_DEDUCTION_FAILED')
    })
  })

  // ---- Successful Comprehensive Report ----

  describe('Successful Comprehensive Report', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should generate comprehensive report and return JSON', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.creditsUsed).toBe(7)
      expect(data.remainingCredits).toBe(43)
      expect(data.reportType).toBe('comprehensive')
      expect(data.report).toBeDefined()
      expect(data.report.id).toBe('saved-report-db-001')
      expect(data.report.crossConsistencyAudit).toBeDefined()
      expect(typeof data.report.crossConsistencyAudit.score).toBe('number')
    })

    it('should call generateAIPremiumReport with correct params', async () => {
      const req = createPostRequest({
        ...MOCK_VALID_INPUT,
        name: 'Test User',
        birthDate: '1990-05-15',
        detailLevel: 'comprehensive',
      })

      await POST(req)

      expect(generateAIPremiumReport).toHaveBeenCalledTimes(1)
      const args = vi.mocked(generateAIPremiumReport).mock.calls[0]
      expect(args[2]).toMatchObject({
        name: 'Test User',
        birthDate: '1990-05-15',
        detailLevel: 'comprehensive',
      })
    })

    it('should pass long-form options to comprehensive report generation', async () => {
      const req = createPostRequest({
        ...MOCK_VALID_INPUT,
        detailLevel: 'comprehensive',
        bilingual: true,
        targetChars: 20000,
        tone: 'realistic',
      })

      await POST(req)

      expect(generateAIPremiumReport).toHaveBeenCalledTimes(1)
      const args = vi.mocked(generateAIPremiumReport).mock.calls[0]
      expect(args[2]).toMatchObject({
        detailLevel: 'comprehensive',
        bilingual: true,
        targetChars: 20000,
        tone: 'realistic',
      })
    })

    it('should default detailLevel to "detailed"', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      const args = vi.mocked(generateAIPremiumReport).mock.calls[0]
      expect(args[2]?.detailLevel).toBe('detailed')
    })

    it('should save report to database', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-abc-123',
          reportType: 'comprehensive',
          period: null,
          theme: null,
          locale: 'ko',
        }),
      })
    })

    it('should not require themed diagnostics fields for comprehensive reports', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      const callArg = vi.mocked(prisma.destinyMatrixReport.create).mock.calls[0]?.[0] as {
        data: { reportData: Record<string, unknown> }
      }
      expect(callArg.data.reportData.qualityAudit).toBeUndefined()
      expect(callArg.data.reportData.calculationDetails).toBeUndefined()
    })

    it('should consume credits with correct amount', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(consumeCredits).toHaveBeenCalledWith('user-abc-123', 'reading', 7)
    })
  })

  // ---- Timing Reports ----

  describe('Timing Reports', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
      vi.mocked(generateTimingReport).mockResolvedValue(MOCK_TIMING_REPORT as any)
      vi.mocked(consumeCredits).mockResolvedValue({ success: true, remaining: 48 } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'timing',
      } as any)
    })

    it('should generate daily timing report', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'daily' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.creditsUsed).toBe(2)
      expect(data.reportType).toBe('timing')
      expect(generateTimingReport).toHaveBeenCalledTimes(1)
    })

    it('should generate monthly timing report', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'monthly' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.creditsUsed).toBe(3)
      expect(data.reportType).toBe('timing')
    })

    it('should generate yearly timing report', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'yearly' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.creditsUsed).toBe(5)
      expect(data.reportType).toBe('timing')
    })

    it('should pass targetDate to timing report generation', async () => {
      const req = createPostRequest({
        ...MOCK_VALID_INPUT,
        period: 'daily',
        targetDate: '2026-06-15',
      })

      await POST(req)

      expect(generateTimingReport).toHaveBeenCalledTimes(1)
      const args = vi.mocked(generateTimingReport).mock.calls[0]
      expect(args[4]?.targetDate).toBe('2026-06-15')
    })

    it('should save timing report to DB with correct reportType', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'monthly' })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportType: 'timing',
          period: 'monthly',
          theme: null,
        }),
      })
    })

    it('should not force themed diagnostics fields for timing reports', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'daily' })
      await POST(req)

      const callArg = vi.mocked(prisma.destinyMatrixReport.create).mock.calls[0]?.[0] as {
        data: { reportData: Record<string, unknown> }
      }
      expect(callArg.data.reportData.qualityAudit).toBeUndefined()
      expect(callArg.data.reportData.calculationDetails).toBeUndefined()
    })
  })

  // ---- Themed Reports ----

  describe('Themed Reports', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
      vi.mocked(generateThemedReport).mockResolvedValue(MOCK_THEMED_REPORT as any)
      vi.mocked(consumeCredits).mockResolvedValue({ success: true, remaining: 47 } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
      } as any)
    })

    it('should generate love themed report', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'love' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.creditsUsed).toBe(3)
      expect(data.reportType).toBe('themed')
      expect(generateThemedReport).toHaveBeenCalledTimes(1)
    })

    it('should generate career themed report', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'career' })
      await POST(req)

      expect(generateThemedReport).toHaveBeenCalledTimes(1)
    })

    it('should prioritize theme over period', async () => {
      const req = createPostRequest({
        ...MOCK_VALID_INPUT,
        theme: 'wealth',
        period: 'daily',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.reportType).toBe('themed')
      expect(generateThemedReport).toHaveBeenCalledTimes(1)
      expect(generateTimingReport).not.toHaveBeenCalled()
    })

    it('should save themed report to DB with correct metadata', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'health' })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reportType: 'themed',
          theme: 'health',
        }),
      })
    })

    it('should persist qualityAudit and calculationDetails for themed reports', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'love' })
      await POST(req)

      const callArg = vi.mocked(prisma.destinyMatrixReport.create).mock.calls[0]?.[0] as {
        data: { reportData: Record<string, unknown> }
      }
      expect(callArg.data.reportData.qualityAudit).toBeDefined()
      expect(callArg.data.reportData.calculationDetails).toBeDefined()

      const details = callArg.data.reportData.calculationDetails as Record<string, unknown>
      expect(details.layerResults).toBeDefined()
      expect(details.inputSnapshot).toBeDefined()
    })

    it('should block themed report when overclaim guard is triggered', async () => {
      vi.mocked(generateThemedReport).mockResolvedValue({
        ...MOCK_THEMED_REPORT,
        theme: 'career',
        sections: {
          deepAnalysis: '절대 실패하지 않는다. 반드시 대박난다.',
          patterns: '무조건 이긴다. 100% 성공이다.',
          timing: '지금 안 하면 인생 파탄이다.',
          recommendations: ['당장 올인해라.'],
          actionPlan: '즉시 전재산 투자.',
          strategy: '완벽한 확정 성공 루트.',
        },
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'career' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('QUALITY_BLOCKED')
      expect(data.error.blockedSections).toContain('deepAnalysis')
      expect(Array.isArray(data.error.overclaimFindings)).toBe(true)
      expect(data.error.overclaimFindings.length).toBeGreaterThan(0)
      expect(data.error.qualityAudit).toBeDefined()
      expect(data.error.qualityAudit.shouldBlock).toBe(true)
      expect(consumeCredits).not.toHaveBeenCalled()
      expect(prisma.destinyMatrixReport.create).not.toHaveBeenCalled()
    })
  })

  // ---- PDF Generation ----

  describe('PDF Generation', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
      vi.mocked(generateAIPremiumReport).mockResolvedValue(MOCK_AI_REPORT as any)
      vi.mocked(consumeCredits).mockResolvedValue({ success: true, remaining: 43 } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)
    })

    it('should return PDF when format is pdf and user can use feature', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(true)
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46]) // %PDF
      vi.mocked(generatePremiumPDF).mockResolvedValue(pdfBuffer as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, format: 'pdf' })
      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(response.headers.get('Content-Disposition')).toContain('attachment')
      expect(response.headers.get('Content-Disposition')).toContain('saved-report-db-001')
    })

    it('should update pdfGenerated flag in DB after PDF generation', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(true)
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46])
      vi.mocked(generatePremiumPDF).mockResolvedValue(pdfBuffer as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, format: 'pdf' })
      await POST(req)

      expect(prisma.destinyMatrixReport.update).toHaveBeenCalledWith({
        where: { id: 'saved-report-db-001' },
        data: { pdfGenerated: true },
      })
    })

    it('should return 403 when user cannot use PDF feature', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(false)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, format: 'pdf' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FEATURE_LOCKED')
      expect(data.error.upgrade).toBe(true)
    })

    it('should return 5-page PDF for non-comprehensive reports when format=pdf', async () => {
      vi.mocked(canUseFeature).mockResolvedValue(true)
      vi.mocked(generateTimingReport).mockResolvedValue(MOCK_TIMING_REPORT as any)
      const pdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46])
      vi.mocked(generateFivePagePDF).mockResolvedValue(pdfBuffer as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'timing',
      } as any)

      const req = createPostRequest({
        ...MOCK_VALID_INPUT,
        period: 'daily',
        format: 'pdf',
      })

      const response = await POST(req)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/pdf')
      expect(generateFivePagePDF).toHaveBeenCalledTimes(1)
      expect(canUseFeature).toHaveBeenCalledTimes(1)
    })
  })

  // ---- Error Handling ----

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
    })

    it('should handle "No AI providers available" error', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('No AI providers available for this request')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AI_NOT_CONFIGURED')
    })

    it('should handle "All AI providers failed" error', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('All AI providers failed to generate report')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('AI_SERVICE_ERROR')
    })

    it('should handle "API error" message', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('API error: rate limit exceeded')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('AI_SERVICE_ERROR')
    })

    it('should handle timeout/aborted errors', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('Request was aborted due to timeout')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('AI_TIMEOUT')
    })

    it('should handle AbortError', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('AbortError: The operation was aborted')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('AI_TIMEOUT')
    })

    it('should handle timeout keyword in error message', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('Connection timeout after 30000ms')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('AI_TIMEOUT')
    })

    it('should wrap unknown errors via wrapError', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue(
        new Error('Something completely unexpected')
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should wrap non-Error objects via wrapError', async () => {
      vi.mocked(generateAIPremiumReport).mockRejectedValue('string error')

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should log error details', async () => {
      const { logger } = await import('@/lib/logger')
      vi.mocked(generateAIPremiumReport).mockRejectedValue(new Error('Some AI error'))

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        'AI Report Generation Error:',
        expect.objectContaining({
          message: 'Some AI error',
          name: 'Error',
        })
      )
    })
  })

  // ---- Report Saving - Summary and Score extraction ----

  describe('Report Summary and Score Extraction', () => {
    beforeEach(() => {
      vi.mocked(getServerSession).mockResolvedValue(MOCK_SESSION as any)
      vi.mocked(rateLimit).mockResolvedValue({ allowed: true, headers: new Headers() } as any)
      vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
      vi.mocked(consumeCredits).mockResolvedValue({ success: true, remaining: 43 } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue(MOCK_SAVED_REPORT as any)
    })

    it('should extract summary from report.summary field', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        summary: 'Direct summary text',
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: 'Direct summary text',
        }),
      })
    })

    it('should extract overallScore from report', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 92,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: 92,
          grade: 'S',
        }),
      })
    })

    it('should assign grade S for score >= 90', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 90,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ grade: 'S' }),
      })
    })

    it('should assign grade A for score 80-89', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 85,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ grade: 'A' }),
      })
    })

    it('should assign grade B for score 70-79', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 75,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ grade: 'B' }),
      })
    })

    it('should assign grade C for score 60-69', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 65,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ grade: 'C' }),
      })
    })

    it('should assign grade D for score < 60', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        ...MOCK_AI_REPORT,
        overallScore: 45,
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ grade: 'D' }),
      })
    })

    it('should handle null score from report with no score fields', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-no-score',
        generatedAt: '2026-01-15T10:00:00Z',
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: null,
          grade: null,
        }),
      })
    })

    it('should extract score from periodScore.overall for timing reports', async () => {
      vi.mocked(generateTimingReport).mockResolvedValue({
        ...MOCK_TIMING_REPORT,
        periodScore: { overall: 88, career: 90, love: 85, wealth: 82, health: 92 },
      } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'timing',
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, period: 'daily' })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: 88,
          grade: 'A',
        }),
      })
    })

    it('should extract score from themeScore.overall for themed reports', async () => {
      vi.mocked(generateThemedReport).mockResolvedValue({
        ...MOCK_THEMED_REPORT,
        themeScore: { overall: 72, potential: 80, timing: 70, compatibility: 65 },
      } as any)
      vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({
        ...MOCK_SAVED_REPORT,
        reportType: 'themed',
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, theme: 'love' })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: 72,
          grade: 'B',
        }),
      })
    })

    it('should fallback summary to overallMessage if summary missing', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-msg',
        generatedAt: '2026-01-15T10:00:00Z',
        overallMessage: 'Overall message fallback',
        overallScore: 80,
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: 'Overall message fallback',
        }),
      })
    })

    it('should fallback summary to first section content if no summary or overallMessage', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-sections',
        generatedAt: '2026-01-15T10:00:00Z',
        overallScore: 80,
        sections: [{ title: 'First', content: 'First section content here' }],
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: expect.stringContaining('First section content here'),
        }),
      })
    })

    it('should use default summary when no extractable summary exists', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-empty',
        generatedAt: '2026-01-15T10:00:00Z',
        overallScore: 80,
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: expect.any(String),
        }),
      })
    })

    it('should extract score from matrixSummary.overallScore', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-matrix-summary',
        generatedAt: '2026-01-15T10:00:00Z',
        matrixSummary: { overallScore: 77 },
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: 77,
          grade: 'B',
        }),
      })
    })

    it('should extract score from "score" field', async () => {
      vi.mocked(generateAIPremiumReport).mockResolvedValue({
        id: 'report-score-field',
        generatedAt: '2026-01-15T10:00:00Z',
        score: 63,
        meta: { modelUsed: 'gpt-4', reportVersion: '1.0.0' },
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          overallScore: 63,
          grade: 'C',
        }),
      })
    })
  })

  // ---- Language Support ----

  describe('Language Support', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should default to ko language', async () => {
      const req = createPostRequest({ ...MOCK_VALID_INPUT, lang: undefined })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'ko',
        }),
      })
    })

    it('should pass en language when specified', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, lang: 'en' },
        errors: [],
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, lang: 'en' })
      await POST(req)

      expect(prisma.destinyMatrixReport.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          locale: 'en',
        }),
      })
    })
  })
})

// ===========================
// GET tests
// ===========================

describe('GET /api/destiny-matrix/ai-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 400 when format is not "docs"', async () => {
    const req = createGetRequest()
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.message).toContain('POST')
    expect(data.error.message).toContain('docs')
  })

  it('should return 400 for unknown format parameter', async () => {
    const req = createGetRequest('format=unknown')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should return API documentation when format=docs', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.openapi).toBe('3.0.0')
    expect(data.info.title).toContain('Destiny Fusion Matrix')
    expect(data.info.version).toBe('1.0.0')
  })

  it('should include paths in documentation', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    expect(data.paths['/api/destiny-matrix/ai-report']).toBeDefined()
    expect(data.paths['/api/destiny-matrix/ai-report'].post).toBeDefined()
  })

  it('should include schema definitions in documentation', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    expect(data.components.schemas.AIReportRequest).toBeDefined()
    expect(data.components.schemas.AIReportRequest.properties.dayMasterElement).toBeDefined()
  })

  it('should include pricing info in documentation', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    expect(data.pricing).toBeDefined()
    expect(data.pricing.creditCost).toBe(7) // comprehensive cost
    expect(data.pricing.availablePlans).toContain('pro')
    expect(data.pricing.availablePlans).toContain('premium')
  })

  it('should include security scheme in documentation', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    expect(data.components.securitySchemes.bearerAuth).toBeDefined()
    expect(data.components.securitySchemes.bearerAuth.type).toBe('http')
  })

  it('should list all response codes in documentation', async () => {
    const req = createGetRequest('format=docs')
    const response = await GET(req)
    const data = await response.json()

    const responses = data.paths['/api/destiny-matrix/ai-report'].post.responses
    expect(responses['200']).toBeDefined()
    expect(responses['401']).toBeDefined()
    expect(responses['402']).toBeDefined()
    expect(responses['403']).toBeDefined()
  })
})
