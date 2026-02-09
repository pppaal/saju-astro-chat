/**
 * Destiny Map Report Service 테스트
 * - 리포트 생성 로직
 * - 캐싱
 * - 보안 (이름 마스킹)
 * - 백엔드 폴백
 */

import { vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock redis cache
const mockCacheGet = vi.fn()
const mockCacheSet = vi.fn()
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: mockCacheGet,
  cacheSet: mockCacheSet,
  makeCacheKey: vi.fn((prefix, params) => `${prefix}:${JSON.stringify(params)}`),
}))

// Mock text guards
vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text, limit) => text?.slice(0, limit) || ''),
  containsForbidden: vi.fn(() => false),
  safetyMessage: vi.fn((lang) => (lang === 'ko' ? '안전 메시지' : 'Safety message')),
}))

// Mock security
vi.mock('@/lib/security', () => ({
  hashName: vi.fn((name) => (name ? `hash_${name}` : 'hash_unknown')),
  maskDisplayName: vi.fn((name) => (name ? `${name.charAt(0)}**` : '익명')),
  maskTextWithName: vi.fn((text, name) => text),
}))

// Mock local report generator
const mockGenerateLocalReport = vi.fn()
const mockGenerateLocalStructuredReport = vi.fn()
vi.mock('@/lib/destiny-map/local-report-generator', () => ({
  generateLocalReport: mockGenerateLocalReport,
  generateLocalStructuredReport: mockGenerateLocalStructuredReport,
}))

// Mock report helpers
vi.mock('@/lib/destiny-map/report-helpers', () => ({
  cleanseText: vi.fn((text) => text),
  getDateInTimezone: vi.fn(() => '2024-01-15'),
  extractDefaultElements: vi.fn(() => ({ elements: {} })),
  validateSections: vi.fn(() => []),
}))

// Mock astrology engine
const mockComputeDestinyMap = vi.fn()
vi.mock('@/lib/destiny-map/astrologyengine', () => ({
  computeDestinyMap: mockComputeDestinyMap,
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Report Service', () => {
  const originalEnv = process.env

  const defaultParams = {
    name: '테스트',
    birthDate: '1990-05-15',
    birthTime: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    gender: 'male' as const,
    theme: 'general',
    lang: 'ko',
    userTimezone: 'Asia/Seoul',
  }

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    mockComputeDestinyMap.mockResolvedValue({
      saju: { dayMaster: '甲', pillars: {} },
      astrology: { planets: [], aspects: [] },
      summary: '테스트 요약',
      meta: {},
    })
    mockGenerateLocalReport.mockReturnValue('로컬 생성 리포트')
    mockGenerateLocalStructuredReport.mockReturnValue('{"themeSummary":"local structured report"}')
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Cache Behavior', () => {
    it('returns cached result when available', async () => {
      const cachedResult = {
        meta: { generator: 'cached', generatedAt: '2024-01-01' },
        summary: '캐시된 요약',
        report: '캐시된 리포트',
        raw: { saju: { dayMaster: '甲' } },
      }
      mockCacheGet.mockResolvedValueOnce(cachedResult)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(mockCacheGet).toHaveBeenCalled()
      expect(result).toEqual(cachedResult)
      expect(mockComputeDestinyMap).not.toHaveBeenCalled()
    })

    it('computes fresh result on cache miss', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      await generateReport(defaultParams)

      expect(mockComputeDestinyMap).toHaveBeenCalled()
    })

    it('caches result after computation', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      await generateReport(defaultParams)

      expect(mockCacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          meta: expect.any(Object),
          report: expect.any(String),
        }),
        86400 // 24시간 TTL
      )
    })
  })

  describe('Local Template Generation', () => {
    it('uses local template when no backend URL', async () => {
      delete process.env.AI_BACKEND_URL
      delete process.env.NEXT_PUBLIC_AI_BACKEND
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(mockGenerateLocalStructuredReport).toHaveBeenCalled()
      expect(result.meta.modelUsed).toBe('local-template')
    })

    it('falls back to local template on backend error', async () => {
      process.env.AI_BACKEND_URL = 'http://backend.test'
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)
      mockFetch.mockRejectedValueOnce(new Error('Backend unavailable'))

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(mockGenerateLocalStructuredReport).toHaveBeenCalled()
      expect(result.meta.modelUsed).toBe('local-template')
      expect(result.meta.backendAvailable).toBe(false)
    })
  })

  describe('Backend Integration', () => {
    it('calls backend with correct parameters', async () => {
      process.env.AI_BACKEND_URL = 'http://backend.test'
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              fusion_layer: '백엔드 생성 리포트',
              model: 'gpt-4',
            },
          }),
      })

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      await generateReport(defaultParams)

      expect(mockFetch).toHaveBeenCalledWith(
        'http://backend.test/ask',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('includes API token in headers when available', async () => {
      process.env.AI_BACKEND_URL = 'http://backend.test'
      process.env.ADMIN_API_TOKEN = 'secret-token'
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: { fusion_layer: 'report' } }),
      })

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      await generateReport(defaultParams)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': 'secret-token',
          }),
        })
      )
    })

    it('handles non-ok response from backend', async () => {
      process.env.AI_BACKEND_URL = 'http://backend.test'
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(result.meta.modelUsed).toBe('local-template')
    })
  })

  describe('Security: Forbidden Content', () => {
    it('returns safety message for forbidden content', async () => {
      const { containsForbidden } = await import('@/lib/textGuards')
      ;(containsForbidden as ReturnType<typeof vi.fn>).mockReturnValueOnce(true)
      mockCacheGet.mockResolvedValueOnce(null)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport({
        ...defaultParams,
        extraPrompt: 'forbidden content here',
      })

      expect(result.report).toBe('안전 메시지')
      expect(result.meta.modelUsed).toBe('filtered')
    })
  })

  describe('Name Masking', () => {
    it('masks name in output', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport({
        ...defaultParams,
        name: '홍길동',
      })

      const { maskDisplayName } = await import('@/lib/security')
      expect(maskDisplayName).toHaveBeenCalledWith('홍길동')
    })
  })

  describe('Report Output Structure', () => {
    it('returns complete ReportOutput structure', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(result).toHaveProperty('meta')
      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('report')
      expect(result).toHaveProperty('raw')
      expect(result.meta).toHaveProperty('generator')
      expect(result.meta).toHaveProperty('generatedAt')
      expect(result.meta).toHaveProperty('theme', 'general')
      expect(result.meta).toHaveProperty('lang', 'ko')
    })

    it('includes validation warnings in meta', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport(defaultParams)

      expect(result.meta).toHaveProperty('validationWarnings')
      expect(result.meta).toHaveProperty('validationPassed')
    })
  })

  describe('Extra Prompt Handling', () => {
    it('trims extra prompt when too long', async () => {
      const longPrompt = 'a'.repeat(2000)
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { guardText } = await import('@/lib/textGuards')
      ;(guardText as ReturnType<typeof vi.fn>).mockReturnValueOnce(longPrompt)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport({
        ...defaultParams,
        extraPrompt: longPrompt,
      })

      // promptTrimmed should be true for prompts > 1200 chars
      // (guardText limits to 2000, then slice to 1200)
      expect(result.meta.promptTrimmed).toBe(true)
    })
  })

  describe('Gender Parameter', () => {
    it('accepts male gender', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport({
        ...defaultParams,
        gender: 'male',
      })

      expect(result.meta.gender).toBe('male')
    })

    it('accepts female gender', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      const result = await generateReport({
        ...defaultParams,
        gender: 'female',
      })

      expect(result.meta.gender).toBe('female')
    })
  })

  describe('Timezone Handling', () => {
    it('passes user timezone to compute function', async () => {
      mockCacheGet.mockResolvedValueOnce(null)
      mockCacheSet.mockResolvedValueOnce(undefined)

      const { generateReport } = await import('@/lib/destiny-map/reportService')
      await generateReport({
        ...defaultParams,
        userTimezone: 'America/New_York',
      })

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({
          userTimezone: 'America/New_York',
        })
      )
    })
  })
})

describe('ReportOutput Interface', () => {
  it('validates ReportOutput structure', () => {
    interface ReportOutput {
      meta: {
        generator: string
        generatedAt: string
        theme: string
        lang: string
        name?: string
        gender?: string
        modelUsed?: string
        validationWarnings?: string[]
        validationPassed?: boolean
        backendAvailable?: boolean
        promptTrimmed?: boolean
      }
      summary: string
      report: string
      raw: Record<string, unknown>
      crossHighlights?: { summary: string; points?: string[] }
      themes?: Record<string, unknown>
    }

    const validOutput: ReportOutput = {
      meta: {
        generator: 'DestinyMap_Report',
        generatedAt: new Date().toISOString(),
        theme: 'love',
        lang: 'ko',
        name: '홍**',
        gender: 'male',
        modelUsed: 'local-template',
        validationWarnings: [],
        validationPassed: true,
        backendAvailable: true,
      },
      summary: '운세 요약',
      report: '상세 리포트 내용...',
      raw: { saju: {}, astrology: {} },
    }

    expect(validOutput.meta.generator).toBeDefined()
    expect(validOutput.summary).toBeDefined()
    expect(validOutput.report).toBeDefined()
  })
})
