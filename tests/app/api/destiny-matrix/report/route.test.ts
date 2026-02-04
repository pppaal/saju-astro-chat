// tests/app/api/destiny-matrix/report/route.test.ts
// Comprehensive tests for Destiny Fusion Matrix Report API v2.0

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ===========================
// Mock dependencies - BEFORE route import
// ===========================

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/destiny-matrix', () => {
  const DestinyMatrixError = class extends Error {
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
  }

  return {
    calculateDestinyMatrix: vi.fn(),
    FusionReportGenerator: vi.fn().mockImplementation(() => ({
      generateReport: vi.fn().mockReturnValue({
        id: 'report-123',
        overallScore: { total: 85, grade: 'A' },
        topInsights: [{ text: 'Test insight' }],
        domainAnalysis: [],
      }),
    })),
    validateReportRequest: vi.fn(),
    DestinyMatrixError,
    ErrorCodes: {
      VALIDATION_ERROR: 'DFM_1000',
      CALCULATION_ERROR: 'DFM_2000',
      INTERNAL_ERROR: 'DFM_9000',
      UNKNOWN_ERROR: 'DFM_9999',
    },
    wrapError: vi.fn().mockImplementation((error: unknown) => {
      if (error && typeof error === 'object' && 'code' in error) {
        return error
      }
      return {
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
    }),
    matrixCache: {
      getReport: vi.fn(),
      setReport: vi.fn(),
      getMatrix: vi.fn(),
      setMatrix: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        hits: 10,
        misses: 5,
        size: 15,
        hitRate: 0.67,
      }),
    },
    generateInputHash: vi.fn().mockReturnValue('hash-abc-123'),
    performanceMonitor: {
      start: vi.fn().mockReturnValue(vi.fn()),
      getStats: vi.fn().mockReturnValue({
        totalRequests: 100,
        averageTime: 250,
        p95: 500,
        p99: 800,
      }),
    },
  }
})

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
  },
}))

// ===========================
// Import route handlers and mocked modules AFTER mocks
// ===========================

import { GET, POST } from '@/app/api/destiny-matrix/report/route'
import {
  calculateDestinyMatrix,
  validateReportRequest,
  matrixCache,
  generateInputHash,
  performanceMonitor,
  wrapError,
} from '@/lib/destiny-matrix'

// ===========================
// Shared test fixtures
// ===========================

const MOCK_VALID_INPUT = {
  dayMasterElement: '\uBAA9',
  geokguk: 'jeonggwan',
  yongsin: '\uD654',
  sibsinDistribution: { '\uC815\uAD00': 2, '\uC815\uC778': 1 },
  shinsalList: ['\uCC9C\uC744\uADC0\uC778', '\uC5ED\uB9C8'],
  planetHouses: { Sun: 10, Moon: 4 },
  planetSigns: { Sun: 'Capricorn' },
  activeTransits: ['jupiterReturn'],
  lang: 'ko',
}

const MOCK_VALIDATED_DATA = {
  ...MOCK_VALID_INPUT,
  queryDomain: undefined,
  maxInsights: 5,
  includeVisualizations: true,
  includeDetailedData: false,
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

const MOCK_REPORT = {
  id: 'report-123',
  overallScore: { total: 85, grade: 'A' },
  topInsights: [{ text: 'Test insight', domain: 'career', score: 90 }],
  domainAnalysis: [{ domain: 'career', score: 90, description: 'Career analysis' }],
  timingAnalysis: { favorable: ['January'], challenging: ['March'] },
  visualizations: { radarChart: {} },
}

// ===========================
// Helper to create requests
// ===========================

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/destiny-matrix/report', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function createGetRequest(queryParams?: string): NextRequest {
  const url = queryParams
    ? `http://localhost/api/destiny-matrix/report?${queryParams}`
    : 'http://localhost/api/destiny-matrix/report'
  return new NextRequest(url, { method: 'GET' })
}

// ===========================
// Helper to set up the successful flow mocks
// ===========================

function setupSuccessfulFlow() {
  vi.mocked(validateReportRequest).mockReturnValue({
    success: true,
    data: MOCK_VALIDATED_DATA,
    errors: [],
  } as any)
  vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
  vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
  vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)
}

// ===========================
// POST tests
// ===========================

describe('POST /api/destiny-matrix/report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset performanceMonitor.start to return a mock end function
    vi.mocked(performanceMonitor.start).mockReturnValue(vi.fn())
  })

  // ---- Performance Monitoring ----

  describe('Performance Monitoring', () => {
    it('should start performance monitoring on each request', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(performanceMonitor.start).toHaveBeenCalledWith('generateReport')
    })

    it('should call end(false) for cache miss', async () => {
      const mockEnd = vi.fn()
      vi.mocked(performanceMonitor.start).mockReturnValue(mockEnd)
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(mockEnd).toHaveBeenCalledWith(false)
    })

    it('should call end(true) for cache hit', async () => {
      const mockEnd = vi.fn()
      vi.mocked(performanceMonitor.start).mockReturnValue(mockEnd)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(mockEnd).toHaveBeenCalledWith(true)
    })

    it('should call end(false) on error', async () => {
      const mockEnd = vi.fn()
      vi.mocked(performanceMonitor.start).mockReturnValue(mockEnd)
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw new Error('Calculation failed')
      })

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(mockEnd).toHaveBeenCalledWith(false)
    })
  })

  // ---- Input Parsing ----

  describe('Input Parsing', () => {
    it('should return error for invalid JSON body', async () => {
      const req = new NextRequest('http://localhost/api/destiny-matrix/report', {
        method: 'POST',
        body: 'this is not json{{{',
        headers: { 'Content-Type': 'application/json' },
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.success).toBe(false)
      // The DestinyMatrixError is thrown and then caught + wrapped in the catch block
      expect(data.error).toBeDefined()
    })
  })

  // ---- Input Validation ----

  describe('Input Validation', () => {
    it('should return 400 when validation fails', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: false,
        errors: [{ field: 'dayMasterElement', message: 'Required field is missing' }],
      } as any)

      const req = createPostRequest({})
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('DFM_1000')
      expect(data.error.details).toBeDefined()
    })

    it('should return validation error details in response', async () => {
      const validationErrors = [
        { field: 'dayMasterElement', message: 'Must be one of: Wood, Fire, Earth, Metal, Water' },
        { field: 'planetHouses.Sun', message: 'Must be between 1 and 12' },
      ]
      vi.mocked(validateReportRequest).mockReturnValue({
        success: false,
        errors: validationErrors,
      } as any)

      const req = createPostRequest({ dayMasterElement: 'invalid' })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.details).toEqual(validationErrors)
    })

    it('should pass request body to validateReportRequest', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(validateReportRequest).toHaveBeenCalledWith(MOCK_VALID_INPUT)
    })
  })

  // ---- Cache Behavior ----

  describe('Cache Behavior', () => {
    beforeEach(() => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
    })

    it('should return cached report on cache hit', async () => {
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cached).toBe(true)
      expect(data.report).toEqual(MOCK_REPORT)
      expect(calculateDestinyMatrix).not.toHaveBeenCalled()
    })

    it('should generate cache key correctly', async () => {
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(generateInputHash).toHaveBeenCalled()
      expect(matrixCache.getReport).toHaveBeenCalledWith('hash-abc-123_all_5')
    })

    it('should include queryDomain in cache key when present', async () => {
      const inputWithDomain = { ...MOCK_VALIDATED_DATA, queryDomain: 'career' }
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: inputWithDomain,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, queryDomain: 'career' })
      await POST(req)

      expect(matrixCache.getReport).toHaveBeenCalledWith('hash-abc-123_career_5')
    })

    it('should include maxInsights in cache key', async () => {
      const inputWithInsights = { ...MOCK_VALIDATED_DATA, maxInsights: 10 }
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: inputWithInsights,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, maxInsights: 10 })
      await POST(req)

      expect(matrixCache.getReport).toHaveBeenCalledWith('hash-abc-123_all_10')
    })

    it('should calculate matrix on cache miss', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(calculateDestinyMatrix).toHaveBeenCalledTimes(1)
    })

    it('should use cached matrix if available', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(matrixCache.getMatrix).toHaveBeenCalledWith('hash-abc-123')
      expect(calculateDestinyMatrix).not.toHaveBeenCalled()
    })

    it('should store new matrix in cache', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(matrixCache.setMatrix).toHaveBeenCalledWith('hash-abc-123', MOCK_MATRIX_RESULT)
    })

    it('should store generated report in cache', async () => {
      setupSuccessfulFlow()

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(matrixCache.setReport).toHaveBeenCalledWith('hash-abc-123_all_5', expect.any(Object))
    })

    it('should not store matrix in cache when cache hit on matrix', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(matrixCache.setMatrix).not.toHaveBeenCalled()
    })
  })

  // ---- Successful Report Generation ----

  describe('Successful Report Generation', () => {
    beforeEach(() => {
      setupSuccessfulFlow()
    })

    it('should return successful report with correct structure', async () => {
      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.cached).toBe(false)
      expect(data.report).toBeDefined()
    })

    it('should pass queryDomain to generator', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, queryDomain: 'career' },
        errors: [],
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, queryDomain: 'career' })
      await POST(req)

      // The FusionReportGenerator mock's generateReport is called
      // We check that the route called calculateDestinyMatrix and proceeded
      expect(calculateDestinyMatrix).toHaveBeenCalledTimes(1)
    })

    it('should use default ko language when not specified', async () => {
      const inputNoLang = { ...MOCK_VALID_INPUT }
      delete (inputNoLang as any).lang
      const validatedNoLang = { ...MOCK_VALIDATED_DATA, lang: undefined }
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: validatedNoLang,
        errors: [],
      } as any)

      const req = createPostRequest(inputNoLang)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle en language', async () => {
      const inputEn = { ...MOCK_VALID_INPUT, lang: 'en' }
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, lang: 'en' },
        errors: [],
      } as any)

      const req = createPostRequest(inputEn)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle default maxInsights value', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, maxInsights: undefined },
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)

      const req = createPostRequest({ ...MOCK_VALID_INPUT })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle custom maxInsights', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, maxInsights: 15 },
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, maxInsights: 15 })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle includeVisualizations option', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, includeVisualizations: false },
        errors: [],
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, includeVisualizations: false })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle includeDetailedData option', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, includeDetailedData: true },
        errors: [],
      } as any)

      const req = createPostRequest({ ...MOCK_VALID_INPUT, includeDetailedData: true })
      const response = await POST(req)

      expect(response.status).toBe(200)
    })
  })

  // ---- Error Handling ----

  describe('Error Handling', () => {
    it('should handle calculation errors', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw new Error('Layer calculation failed')
      })

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBeDefined()
    })

    it('should wrap errors via wrapError', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw new Error('Unexpected failure')
      })

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(wrapError).toHaveBeenCalled()
    })

    it('should log error details', async () => {
      const { logger } = await import('@/lib/logger')
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw new Error('Matrix computation error')
      })

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        'Destiny Matrix Report Error:',
        expect.objectContaining({
          code: expect.any(String),
          message: expect.any(String),
        })
      )
    })

    it('should handle non-Error thrown values', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockImplementation(() => {
        throw 'string-error-value'
      })

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle report generation errors', async () => {
      setupSuccessfulFlow()
      // Override FusionReportGenerator to throw in generateReport
      const { FusionReportGenerator } = await import('@/lib/destiny-matrix')
      vi.mocked(FusionReportGenerator).mockImplementationOnce(
        () =>
          ({
            generateReport: vi.fn().mockImplementation(() => {
              throw new Error('Report generation failed')
            }),
          }) as any
      )

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // ---- Edge Cases ----

  describe('Edge Cases', () => {
    it('should handle empty matrix layers', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: MOCK_VALIDATED_DATA,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockReturnValue({
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
      } as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle minimal valid input', async () => {
      const minimalInput = { dayMasterElement: '\uBAA9' }
      const minimalValidated = {
        dayMasterElement: '\uBAA9',
        queryDomain: undefined,
        maxInsights: undefined,
        includeVisualizations: undefined,
        includeDetailedData: undefined,
      }
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: minimalValidated,
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
      vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
      vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)

      const req = createPostRequest(minimalInput)
      const response = await POST(req)

      expect(response.status).toBe(200)
    })

    it('should handle all queryDomain values', async () => {
      const domains = [
        'personality',
        'career',
        'relationship',
        'wealth',
        'health',
        'spirituality',
        'timing',
      ]

      for (const domain of domains) {
        vi.clearAllMocks()
        vi.mocked(performanceMonitor.start).mockReturnValue(vi.fn())

        vi.mocked(validateReportRequest).mockReturnValue({
          success: true,
          data: { ...MOCK_VALIDATED_DATA, queryDomain: domain },
          errors: [],
        } as any)
        vi.mocked(matrixCache.getReport).mockReturnValue(undefined)
        vi.mocked(matrixCache.getMatrix).mockReturnValue(undefined)
        vi.mocked(calculateDestinyMatrix).mockReturnValue(MOCK_MATRIX_RESULT as any)

        const req = createPostRequest({ ...MOCK_VALID_INPUT, queryDomain: domain })
        const response = await POST(req)

        expect(response.status).toBe(200)
      }
    })

    it('should handle undefined queryDomain in cache key', async () => {
      vi.mocked(validateReportRequest).mockReturnValue({
        success: true,
        data: { ...MOCK_VALIDATED_DATA, queryDomain: undefined },
        errors: [],
      } as any)
      vi.mocked(matrixCache.getReport).mockReturnValue(MOCK_REPORT as any)

      const req = createPostRequest(MOCK_VALID_INPUT)
      await POST(req)

      // queryDomain is undefined -> cache key uses 'all'
      expect(matrixCache.getReport).toHaveBeenCalledWith('hash-abc-123_all_5')
    })
  })
})

// ===========================
// GET tests
// ===========================

describe('GET /api/destiny-matrix/report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ---- Stats endpoint ----

  describe('Stats Format', () => {
    it('should return cache and performance stats when format=stats', async () => {
      const req = createGetRequest('format=stats')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.cache).toBeDefined()
      expect(data.cache.hits).toBe(10)
      expect(data.cache.misses).toBe(5)
      expect(data.cache.hitRate).toBe(0.67)
      expect(data.performance).toBeDefined()
      expect(data.performance.totalRequests).toBe(100)
      expect(data.performance.averageTime).toBe(250)
    })

    it('should call matrixCache.getStats() for stats', async () => {
      const req = createGetRequest('format=stats')
      await GET(req)

      expect(matrixCache.getStats).toHaveBeenCalled()
    })

    it('should call performanceMonitor.getStats() for stats', async () => {
      const req = createGetRequest('format=stats')
      await GET(req)

      expect(performanceMonitor.getStats).toHaveBeenCalled()
    })
  })

  // ---- API Documentation endpoint ----

  describe('API Documentation', () => {
    it('should return OpenAPI documentation when no format specified', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.openapi).toBe('3.0.0')
      expect(data.info.title).toContain('Destiny Fusion Matrix')
      expect(data.info.version).toBe('2.0.0')
    })

    it('should include API description', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.info.description).toBeDefined()
      expect(data.info.contact).toBeDefined()
    })

    it('should include server information', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.servers).toHaveLength(1)
      expect(data.servers[0].url).toBe('/api/destiny-matrix/report')
    })

    it('should include POST path definition', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.paths['/']).toBeDefined()
      expect(data.paths['/'].post).toBeDefined()
      expect(data.paths['/'].post.summary).toBeDefined()
    })

    it('should include GET path definition', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.paths['/'].get).toBeDefined()
      expect(data.paths['/'].get.parameters).toBeDefined()
    })

    it('should include request body schema', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const postDef = data.paths['/'].post
      expect(postDef.requestBody.required).toBe(true)
      expect(postDef.requestBody.content['application/json']).toBeDefined()
    })

    it('should include response definitions', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const responses = data.paths['/'].post.responses
      expect(responses['200']).toBeDefined()
      expect(responses['400']).toBeDefined()
      expect(responses['500']).toBeDefined()
    })

    it('should include component schemas', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const schemas = data.components.schemas
      expect(schemas.ReportRequest).toBeDefined()
      expect(schemas.ReportResponse).toBeDefined()
      expect(schemas.ErrorResponse).toBeDefined()
    })

    it('should define all required properties in ReportRequest schema', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const requestSchema = data.components.schemas.ReportRequest
      expect(requestSchema.required).toContain('dayMasterElement')
      expect(requestSchema.properties.dayMasterElement).toBeDefined()
      expect(requestSchema.properties.geokguk).toBeDefined()
      expect(requestSchema.properties.yongsin).toBeDefined()
      expect(requestSchema.properties.lang).toBeDefined()
      expect(requestSchema.properties.queryDomain).toBeDefined()
      expect(requestSchema.properties.maxInsights).toBeDefined()
      expect(requestSchema.properties.includeVisualizations).toBeDefined()
      expect(requestSchema.properties.includeDetailedData).toBeDefined()
    })

    it('should list valid enum values for dayMasterElement', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const dayMasterProp = data.components.schemas.ReportRequest.properties.dayMasterElement
      expect(dayMasterProp.enum).toEqual(
        expect.arrayContaining(['\uBAA9', '\uD654', '\uD1A0', '\uAE08', '\uC218'])
      )
    })

    it('should list valid queryDomain options', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const queryDomainProp = data.components.schemas.ReportRequest.properties.queryDomain
      expect(queryDomainProp.enum).toEqual(
        expect.arrayContaining([
          'personality',
          'career',
          'relationship',
          'wealth',
          'health',
          'spirituality',
          'timing',
        ])
      )
    })

    it('should define ReportResponse with expected properties', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const responseSchema = data.components.schemas.ReportResponse
      expect(responseSchema.properties.success).toBeDefined()
      expect(responseSchema.properties.cached).toBeDefined()
      expect(responseSchema.properties.report).toBeDefined()
    })

    it('should include an example in the POST definition', async () => {
      const req = createGetRequest()
      const response = await GET(req)
      const data = await response.json()

      const example = data.paths['/'].post.requestBody.content['application/json'].example
      expect(example).toBeDefined()
      expect(example.dayMasterElement).toBe('\uBAA9')
    })

    it('should return docs for any non-stats format param', async () => {
      const req = createGetRequest('format=anything')
      const response = await GET(req)
      const data = await response.json()

      // Non-stats format returns the OpenAPI docs
      expect(response.status).toBe(200)
      expect(data.openapi).toBe('3.0.0')
    })
  })
})
