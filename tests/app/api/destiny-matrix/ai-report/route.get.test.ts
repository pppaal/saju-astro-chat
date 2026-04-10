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
      overallScore: { total: 85, grade: 'A', gradeDescription: '테스트 등급 설명' },
      topInsights: [
        {
          title: '테스트 인사이트',
          description: '테스트 설명',
          category: 'strength',
          actionItems: [{ text: '테스트 액션' }],
        },
      ],
      domainAnalysis: [
        { domain: 'career', score: 82, summary: '커리어 강점', hasData: true },
        { domain: 'wealth', score: 74, summary: '재물 흐름 보통', hasData: true },
      ],
      lang: 'ko',
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

import { GET, POST, __testables } from '@/app/api/destiny-matrix/ai-report/route'
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

const MOCK_STRICT_FAIL_REPORT = {
  ...MOCK_AI_REPORT,
  patterns: [],
  graphRagEvidence: { anchors: [] },
  meta: {
    ...MOCK_AI_REPORT.meta,
    qualityMetrics: { coreQualityScore: 92 },
  },
}

const MOCK_STRICT_PASS_REPORT = {
  ...MOCK_AI_REPORT,
  patterns: [{ id: 'pattern-1' }],
  graphRagEvidence: {
    anchors: [{ section: 'overview', crossEvidenceSets: [{}] }],
  },
  meta: {
    ...MOCK_AI_REPORT.meta,
    qualityMetrics: { coreQualityScore: 92 },
  },
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
