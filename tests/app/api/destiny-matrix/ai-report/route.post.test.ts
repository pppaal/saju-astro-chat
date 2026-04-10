import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mockContext: { userId?: string } = { userId: 'user-1' }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware:
    (handler: (req: NextRequest, context: typeof mockContext) => Promise<Response>) =>
    async (req: NextRequest) =>
      handler(req, mockContext),
  createAuthenticatedGuard: () => ({}),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    destinyMatrixReport: {
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/credits/creditService', () => ({
  canUseFeature: vi.fn(),
  consumeCredits: vi.fn(),
  getCreditBalance: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/ai-report/qualityAudit', () => ({
  auditMatrixInputReadiness: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/ai-report/crossConsistencyAudit', () => ({
  auditCrossConsistency: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/engine', () => ({
  calculateDestinyMatrix: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/interpreter/report-generator', () => ({
  FusionReportGenerator: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@/lib/destiny-matrix/core/buildCoreEnvelope', () => ({
  buildCoreEnvelope: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/core/adaptersPayload', () => ({
  buildSharedSurface: vi.fn(),
}))

vi.mock('@/lib/destiny-matrix/ai-report/graphRagEvidence', () => ({
  summarizeDestinyMatrixEvidence: vi.fn(() => ({ totalInsights: 0, items: [] })),
}))

vi.mock('@/lib/destiny-matrix/ai-report/pdfGenerator', () => ({
  generateFivePagePDF: vi.fn(),
  generatePremiumPDF: vi.fn(),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeRequestPreparation', () => ({
  prepareAiReportRequest: vi.fn(),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeReportGeneration', () => ({
  applyPreciseTimingSummaryIfNeeded: vi.fn(async ({ matrixSummary }) => matrixSummary),
  generateRouteAiReport: vi.fn(),
  regenerateRouteAiReportStrict: vi.fn(),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeErrorResponses', () => ({
  buildAiReportErrorResponse: vi.fn(),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeFreeDigest', () => ({
  buildRichFreeDigestReport: vi.fn(),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeReportOutput', () => ({
  buildGeneratedReportJsonResponse: vi.fn((payload) =>
    NextResponse.json({ success: true, ...payload })
  ),
  buildGeneratedReportPdfResponse: vi.fn(
    () => new NextResponse(new Uint8Array([1, 2, 3]), { status: 200 })
  ),
  persistReportPredictionSnapshotEntry: vi.fn(async () => 'prediction-1'),
}))

vi.mock('@/app/api/destiny-matrix/ai-report/routeReportPersistence', () => ({
  extractOverallScore: vi.fn(() => 88),
  extractReportSummary: vi.fn(() => 'summary'),
  generateReportTitle: vi.fn(() => 'Test Report'),
  normalizeReportTier: vi.fn((value) => (value === 'free' ? 'free' : 'premium')),
  scoreToGrade: vi.fn(() => 'A'),
}))

import { POST } from '@/app/api/destiny-matrix/ai-report/route'
import { prisma } from '@/lib/db/prisma'
import { canUseFeature, consumeCredits, getCreditBalance } from '@/lib/credits/creditService'
import { auditMatrixInputReadiness } from '@/lib/destiny-matrix/ai-report/qualityAudit'
import { auditCrossConsistency } from '@/lib/destiny-matrix/ai-report/crossConsistencyAudit'
import { buildCoreEnvelope } from '@/lib/destiny-matrix/core/buildCoreEnvelope'
import { buildSharedSurface } from '@/lib/destiny-matrix/core/adaptersPayload'
import {
  generateFivePagePDF,
  generatePremiumPDF,
} from '@/lib/destiny-matrix/ai-report/pdfGenerator'
import { prepareAiReportRequest } from '@/app/api/destiny-matrix/ai-report/routeRequestPreparation'
import {
  generateRouteAiReport,
  regenerateRouteAiReportStrict,
} from '@/app/api/destiny-matrix/ai-report/routeReportGeneration'
import { buildAiReportErrorResponse } from '@/app/api/destiny-matrix/ai-report/routeErrorResponses'
import { buildRichFreeDigestReport } from '@/app/api/destiny-matrix/ai-report/routeFreeDigest'
import {
  buildGeneratedReportJsonResponse,
  buildGeneratedReportPdfResponse,
  persistReportPredictionSnapshotEntry,
} from '@/app/api/destiny-matrix/ai-report/routeReportOutput'

const MOCK_BALANCE = {
  plan: 'pro',
  remainingCredits: 50,
  monthlyCredits: 100,
  usedCredits: 50,
  bonusCredits: 0,
  totalCredits: 100,
}

const MOCK_BASE_REPORT = {
  overallScore: { total: 82, grade: 'A', gradeDescription: 'strong' },
  topInsights: [
    {
      title: 'Insight',
      description: 'desc',
      category: 'strength',
      actionItems: [{ text: 'Do it' }],
    },
  ],
  domainAnalysis: [{ domain: 'career', score: 81, summary: 'career', hasData: true }],
}

const MOCK_AI_REPORT = {
  summary: 'AI summary',
  overallScore: 88,
  sections: [{ title: 'Overview', content: 'content' }],
  patterns: [{ id: 'pattern-1' }],
  graphRagEvidence: { anchors: [{ id: 'A1' }] },
  meta: { qualityMetrics: { coreQualityScore: 90 }, modelUsed: 'claude-haiku' },
}

function createPrepared(overrides: Record<string, unknown> = {}) {
  return {
    success: true as const,
    data: {
      requestBody: { reportTier: 'premium' },
      validatedInput: {},
      period: 'comprehensive',
      theme: undefined,
      name: 'Tester',
      birthDate: '1995-02-09',
      format: 'json',
      detailLevel: 'detailed',
      bilingual: false,
      targetChars: 2400,
      userQuestion: 'What should I do?',
      deterministicProfile: 'balanced',
      tone: 'friendly',
      targetDate: '2026-04-10',
      profileContext: { analysisAt: '2026-04-10T00:00:00.000Z' },
      matrixInput: { lang: 'ko', dayMasterElement: '?' },
      timingData: {
        daeun: { stem: '?' },
        seun: { stem: '?' },
        wolun: { stem: '?' },
        iljin: { stem: '?' },
      },
      missingKeys: [],
      queryDomain: undefined,
      maxInsights: 5,
      includeVisualizations: false,
      includeDetailedData: true,
      ...overrides,
    },
  }
}

function createEnvelope() {
  return {
    matrix: { summary: { overallMessage: 'matrix-summary' } },
    layerResults: {},
    matrixReport: MOCK_BASE_REPORT,
    normalizedInput: { lang: 'ko' },
    coreSeed: {},
  }
}

function createRequest(body: unknown) {
  return new NextRequest('http://localhost/api/destiny-matrix/ai-report', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('POST /api/destiny-matrix/ai-report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockContext.userId = 'user-1'
    delete process.env.AI_REPORT_ALLOW_HARD_BLOCKS
    delete process.env.AI_REPORT_STRICT_INPUT_READINESS
    delete process.env.AI_REPORT_STRICT_PATTERN_GUARD

    vi.mocked(getCreditBalance).mockResolvedValue(MOCK_BALANCE as any)
    vi.mocked(consumeCredits).mockResolvedValue({ success: true } as any)
    vi.mocked(canUseFeature).mockResolvedValue(true as any)
    vi.mocked(auditMatrixInputReadiness).mockReturnValue({
      ready: true,
      score: 92,
      blockers: [],
      warnings: [],
    } as any)
    vi.mocked(auditCrossConsistency).mockReturnValue({ score: 88, blockers: [] } as any)
    vi.mocked(buildCoreEnvelope).mockReturnValue(createEnvelope() as any)
    vi.mocked(buildSharedSurface).mockReturnValue({ personModel: { id: 'person-1' } } as any)
    vi.mocked(prepareAiReportRequest).mockResolvedValue(createPrepared() as any)
    vi.mocked(generateRouteAiReport).mockResolvedValue({
      aiReport: MOCK_AI_REPORT as any,
      premiumReport: null,
    })
    vi.mocked(regenerateRouteAiReportStrict).mockResolvedValue({
      aiReport: MOCK_AI_REPORT as any,
      premiumReport: null,
    })
    vi.mocked(buildRichFreeDigestReport).mockReturnValue({
      summary: 'free summary',
      overallScore: 72,
      grade: 'B',
      topInsights: [{ title: 'Digest insight', description: 'Digest desc' }],
      domainAnalysis: [{ domain: 'career', score: 72, summary: 'digest', hasData: true }],
    } as any)
    vi.mocked(prisma.destinyMatrixReport.create).mockResolvedValue({ id: 'report-1' } as any)
    vi.mocked(prisma.destinyMatrixReport.update).mockResolvedValue({ id: 'report-1' } as any)
    vi.mocked(generatePremiumPDF).mockResolvedValue(new Uint8Array([1, 2, 3]) as any)
    vi.mocked(generateFivePagePDF).mockResolvedValue(new Uint8Array([4, 5, 6]) as any)
    vi.mocked(buildAiReportErrorResponse).mockReturnValue(
      NextResponse.json({ success: false, error: { code: 'AI_ROUTE_ERROR' } }, { status: 500 })
    )
  })

  it('returns 401 when no authenticated user is present', async () => {
    mockContext.userId = undefined

    const response = await POST(createRequest({ ok: true }))
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(vi.mocked(prepareAiReportRequest)).not.toHaveBeenCalled()
  })

  it('returns 400 when request preparation fails', async () => {
    vi.mocked(prepareAiReportRequest).mockResolvedValue({
      success: false,
      validationErrors: ['missing birthDate'],
    } as any)

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error.details).toContain('missing birthDate')
  })

  it('returns 402 when the user does not have enough credits', async () => {
    vi.mocked(getCreditBalance).mockResolvedValue({ ...MOCK_BALANCE, remainingCredits: 1 } as any)

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(402)
    expect(data.error.code).toBe('INSUFFICIENT_CREDITS')
  })

  it('returns 422 when strict input readiness blocks generation', async () => {
    process.env.AI_REPORT_ALLOW_HARD_BLOCKS = 'true'
    process.env.AI_REPORT_STRICT_INPUT_READINESS = 'true'
    vi.mocked(auditMatrixInputReadiness).mockReturnValue({
      ready: false,
      score: 40,
      blockers: ['missing critical inputs'],
      warnings: [],
    } as any)

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error.code).toBe('INPUT_QUALITY_BLOCKED')
  })

  it('returns a free digest without consuming credits for free tier', async () => {
    vi.mocked(prepareAiReportRequest).mockResolvedValue(
      createPrepared({ requestBody: { reportTier: 'free' }, period: 'monthly' }) as any
    )

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.creditsUsed).toBe(0)
    expect(data.report.summary).toBe('free summary')
    expect(vi.mocked(consumeCredits)).not.toHaveBeenCalled()
    expect(vi.mocked(generateRouteAiReport)).not.toHaveBeenCalled()
  })

  it('returns a generated JSON report for paid comprehensive requests', async () => {
    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(vi.mocked(generateRouteAiReport)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(consumeCredits)).toHaveBeenCalledWith('user-1', 'reading', 7)
    expect(vi.mocked(buildGeneratedReportJsonResponse)).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'comprehensive',
        predictionId: 'prediction-1',
        savedReportId: 'report-1',
      })
    )
  })

  it('retries once when strict pattern gate fails on the first pass', async () => {
    process.env.AI_REPORT_ALLOW_HARD_BLOCKS = 'true'
    process.env.AI_REPORT_STRICT_PATTERN_GUARD = 'true'
    vi.mocked(auditCrossConsistency)
      .mockReturnValueOnce({ score: 20, blockers: ['weak consistency'] } as any)
      .mockReturnValueOnce({ score: 90, blockers: [] } as any)

    const response = await POST(createRequest({}))

    expect(response.status).toBe(200)
    expect(vi.mocked(regenerateRouteAiReportStrict)).toHaveBeenCalledTimes(1)
  })

  it('returns 422 when strict pattern gate still fails after retry', async () => {
    process.env.AI_REPORT_ALLOW_HARD_BLOCKS = 'true'
    process.env.AI_REPORT_STRICT_PATTERN_GUARD = 'true'
    vi.mocked(auditCrossConsistency).mockReturnValue({
      score: 20,
      blockers: ['weak consistency'],
    } as any)
    vi.mocked(generateRouteAiReport).mockResolvedValue({
      aiReport: {
        ...MOCK_AI_REPORT,
        patterns: [],
        graphRagEvidence: { anchors: [] },
        meta: { qualityMetrics: { coreQualityScore: 40 } },
      } as any,
      premiumReport: null,
    })
    vi.mocked(regenerateRouteAiReportStrict).mockResolvedValue({
      aiReport: {
        ...MOCK_AI_REPORT,
        patterns: [],
        graphRagEvidence: { anchors: [] },
        meta: { qualityMetrics: { coreQualityScore: 40 } },
      } as any,
      premiumReport: null,
    })

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(422)
    expect(data.error.code).toBe('PATTERN_QUALITY_BLOCKED')
  })

  it('returns a PDF response when format=pdf and the user can use the feature', async () => {
    vi.mocked(prepareAiReportRequest).mockResolvedValue(createPrepared({ format: 'pdf' }) as any)
    vi.mocked(generateRouteAiReport).mockResolvedValue({
      aiReport: MOCK_AI_REPORT as any,
      premiumReport: { id: 'premium-report' } as any,
    })

    const response = await POST(createRequest({}))

    expect(response.status).toBe(200)
    expect(vi.mocked(generatePremiumPDF)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.destinyMatrixReport.update)).toHaveBeenCalledWith({
      where: { id: 'report-1' },
      data: { pdfGenerated: true },
    })
    expect(vi.mocked(buildGeneratedReportPdfResponse)).toHaveBeenCalledTimes(1)
  })

  it('returns 403 when format=pdf but the feature is not available', async () => {
    vi.mocked(prepareAiReportRequest).mockResolvedValue(createPrepared({ format: 'pdf' }) as any)
    vi.mocked(canUseFeature).mockResolvedValue(false as any)

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error.code).toBe('FEATURE_LOCKED')
  })

  it('delegates unexpected failures to the route error responder', async () => {
    vi.mocked(generateRouteAiReport).mockRejectedValue(new Error('boom'))

    const response = await POST(createRequest({}))
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error.code).toBe('AI_ROUTE_ERROR')
    expect(vi.mocked(buildAiReportErrorResponse)).toHaveBeenCalledTimes(1)
  })
})
