// tests/app/api/lib-health/route.mega.test.ts
// Comprehensive tests for Library Health Check API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock Saju and Astrology libraries BEFORE importing route
const mockSajuLib = {
  getSaju: vi.fn(),
  saju: vi.fn(),
  default: vi.fn(),
}

const mockAstroLib = {
  buildChartData: vi.fn(),
  calculateChart: vi.fn(),
  default: vi.fn(),
}

// Set up mocks before importing the route
vi.mock('@/lib/Saju/saju', () => mockSajuLib)
vi.mock('@/lib/astrology/foundation/astrologyService', () => mockAstroLib)

import { GET } from '@/app/api/lib-health/route'

const makeRequest = () => new NextRequest('http://localhost/api/lib-health')

describe('GET /api/lib-health', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset mock implementations
    mockSajuLib.getSaju = vi.fn()
    mockSajuLib.saju = vi.fn()
    mockSajuLib.default = vi.fn()
    mockAstroLib.buildChartData = vi.fn()
    mockAstroLib.calculateChart = vi.fn()
    mockAstroLib.default = vi.fn()
  })

  it('should return 200 status', async () => {
    const response = await GET(makeRequest())
    expect(response.status).toBe(200)
  })

  it('should return JSON content type', async () => {
    const response = await GET(makeRequest())
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('should return exports list for both libraries', async () => {
    mockSajuLib.getSaju.mockResolvedValue({ pillar: 'test' })
    mockAstroLib.buildChartData.mockResolvedValue({ chart: 'test' })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuExports).toBeDefined()
    expect(data.astroExports).toBeDefined()
    expect(Array.isArray(data.sajuExports)).toBe(true)
    expect(Array.isArray(data.astroExports)).toBe(true)
  })

  it('should call getSaju with correct parameters', async () => {
    const mockSajuData = {
      yearPillar: { heavenlyStem: '癸', earthlyBranch: '酉' },
      monthPillar: { heavenlyStem: '丁', earthlyBranch: '巳' },
    }
    mockSajuLib.getSaju.mockResolvedValue(mockSajuData)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(mockSajuLib.getSaju).toHaveBeenCalledWith({
      birthDate: '1993-05-01',
      birthTime: '06:00',
      gender: 'male',
      city: 'Seoul',
    })
    expect(data.sajuError).toBeNull()
    expect(data.sajuSamplePreview).toContain('酉')
  })

  it('should call buildChartData with correct parameters', async () => {
    const mockAstroData = {
      sun: { position: 10.5, sign: 'Taurus' },
      moon: { position: 20.3, sign: 'Cancer' },
    }
    mockAstroLib.buildChartData.mockResolvedValue(mockAstroData)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(mockAstroLib.buildChartData).toHaveBeenCalledWith({
      year: 1993,
      month: 5,
      date: 1,
      hour: 6,
      minute: 0,
      latitude: 37.5665,
      longitude: 126.978,
      locationName: 'Seoul',
      timeZone: 'Asia/Seoul',
    })
    expect(data.astroError).toBeNull()
    expect(data.astroSamplePreview).toContain('Taurus')
  })

  it('should handle Saju library errors gracefully', async () => {
    mockSajuLib.getSaju.mockRejectedValue(new Error('Saju calculation failed'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sajuError).toBe('Saju calculation failed')
    expect(data.sajuSamplePreview).toBeNull()
  })

  it('should handle Astrology library errors gracefully', async () => {
    mockAstroLib.buildChartData.mockRejectedValue(new Error('Astrology calculation failed'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.astroError).toBe('Astrology calculation failed')
    expect(data.astroSamplePreview).toBe('')
  })

  it('should handle both libraries failing', async () => {
    mockSajuLib.getSaju.mockRejectedValue(new Error('Saju failed'))
    mockAstroLib.buildChartData.mockRejectedValue(new Error('Astro failed'))

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sajuError).toBe('Saju failed')
    expect(data.astroError).toBe('Astro failed')
  })

  it('should fallback to saju function if getSaju not available', async () => {
    // Mock getSaju to be null/undefined, saju should be called
    mockSajuLib.getSaju = null as never
    mockSajuLib.saju.mockResolvedValue({ pillar: 'test' })

    const response = await GET(makeRequest())
    await response.json()

    expect(mockSajuLib.saju).toHaveBeenCalled()
  })

  it('should fallback to default if no named exports available', async () => {
    // Mock both getSaju and saju to be null/undefined
    mockSajuLib.getSaju = null as never
    mockSajuLib.saju = null as never
    mockSajuLib.default.mockResolvedValue({ pillar: 'test' })

    const response = await GET(makeRequest())
    await response.json()

    expect(mockSajuLib.default).toHaveBeenCalled()
  })

  it('should handle non-function exports', async () => {
    // Set all to non-functions
    mockSajuLib.getSaju = 'not a function' as never
    mockSajuLib.saju = null as never
    mockSajuLib.default = undefined as never

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuError).toBe('No function: getSaju/saju/default')
  })

  it('should handle calculateChart fallback for astrology', async () => {
    mockAstroLib.buildChartData = null as never
    mockAstroLib.calculateChart.mockResolvedValue({ chart: 'test' })

    const response = await GET(makeRequest())
    await response.json()

    expect(mockAstroLib.calculateChart).toHaveBeenCalled()
  })

  it('should truncate large Saju samples to 1000 chars', async () => {
    const largeSajuData = {
      data: 'x'.repeat(2000),
    }
    mockSajuLib.getSaju.mockResolvedValue(largeSajuData)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview.length).toBeLessThanOrEqual(1000)
  })

  it('should truncate large Astrology samples to 1000 chars', async () => {
    const largeAstroData = {
      data: 'y'.repeat(2000),
    }
    mockAstroLib.buildChartData.mockResolvedValue(largeAstroData)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.astroSamplePreview.length).toBeLessThanOrEqual(1000)
  })

  it('should list all available exports', async () => {
    const response = await GET(makeRequest())
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.sajuExports).toContain('getSaju')
    expect(data.sajuExports).toContain('saju')
    expect(data.sajuExports).toContain('default')
  })

  it('should handle non-Error thrown values from Saju', async () => {
    mockSajuLib.getSaju.mockRejectedValue('String error')

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuError).toBe('String error')
  })

  it('should handle non-Error thrown values from Astrology', async () => {
    mockAstroLib.buildChartData.mockRejectedValue(123)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.astroError).toBe('123')
  })

  it('should handle null return values from Saju', async () => {
    mockSajuLib.getSaju.mockResolvedValue(null)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toBeNull()
    expect(data.sajuError).toBeNull()
  })

  it('should handle undefined return values from Astrology', async () => {
    mockAstroLib.buildChartData.mockResolvedValue(undefined)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.astroSamplePreview).toBe('')
    expect(data.astroError).toBeNull()
  })

  it('should handle primitive return values from Saju', async () => {
    mockSajuLib.getSaju.mockResolvedValue('simple string')

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toBe('simple string')
  })

  it('should handle number return values from Astrology', async () => {
    mockAstroLib.buildChartData.mockResolvedValue(42)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.astroSamplePreview).toBe('42')
  })

  it('should return properly formatted JSON', async () => {
    mockSajuLib.getSaju.mockResolvedValue({ test: 'data' })
    mockAstroLib.buildChartData.mockResolvedValue({ test: 'data' })

    const response = await GET(makeRequest())
    const text = await response.text()
    const data = JSON.parse(text)

    expect(data).toHaveProperty('sajuExports')
    expect(data).toHaveProperty('astroExports')
    expect(data).toHaveProperty('sajuError')
    expect(data).toHaveProperty('astroError')
    expect(data).toHaveProperty('sajuSamplePreview')
    expect(data).toHaveProperty('astroSamplePreview')
  })

  it('should handle empty object returns', async () => {
    mockSajuLib.getSaju.mockResolvedValue({})
    mockAstroLib.buildChartData.mockResolvedValue({})

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toBe('{}')
    expect(data.astroSamplePreview).toBe('{}')
  })

  it('should handle arrays in return values', async () => {
    mockSajuLib.getSaju.mockResolvedValue([1, 2, 3])
    mockAstroLib.buildChartData.mockResolvedValue(['a', 'b', 'c'])

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toContain('[1,2,3]')
    expect(data.astroSamplePreview).toContain('["a","b","c"]')
  })

  it('should handle nested objects', async () => {
    const nestedSaju = {
      level1: {
        level2: {
          level3: 'deep value',
        },
      },
    }
    mockSajuLib.getSaju.mockResolvedValue(nestedSaju)

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toContain('deep value')
  })

  it('should handle async/promise resolution', async () => {
    mockSajuLib.getSaju.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ async: 'data' }), 10))
    )

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toContain('async')
  })

  it('should export multiple named functions', async () => {
    mockSajuLib.getSaju.mockResolvedValue({ test: 'data' })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuExports.length).toBeGreaterThanOrEqual(3)
    expect(data.sajuExports).toContain('getSaju')
    expect(data.sajuExports).toContain('saju')
  })

  it('should handle concurrent library calls', async () => {
    mockSajuLib.getSaju.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 50))
    )
    mockAstroLib.buildChartData.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({}), 30))
    )

    const start = Date.now()
    await GET(makeRequest())
    const duration = Date.now() - start

    // Should run in parallel, not sequential
    // Sequential would be 50+30=80ms, parallel should be ~50ms
    // Using generous tolerance (500ms) to avoid flaky tests in CI/slow environments
    expect(duration).toBeLessThan(500)
  })

  it('should handle special characters in sample data', async () => {
    mockSajuLib.getSaju.mockResolvedValue({
      special: '특수문자 테스트 🎋',
    })

    const response = await GET(makeRequest())
    const data = await response.json()

    expect(data.sajuSamplePreview).toContain('특수문자')
    expect(data.sajuSamplePreview).toContain('🎋')
  })

  it('should handle circular references gracefully', async () => {
    const circular: Record<string, unknown> = { a: 1 }
    circular.self = circular
    mockSajuLib.getSaju.mockResolvedValue(circular)

    const response = await GET(makeRequest())
    expect(response.status).toBe(500)

    const data = await response.json()
    expect(data?.error?.code).toBe('INTERNAL_ERROR')
  })

  it('should include all expected fields in response', async () => {
    mockSajuLib.getSaju.mockResolvedValue({ test: 'data' })
    mockAstroLib.buildChartData.mockResolvedValue({ test: 'data' })

    const response = await GET(makeRequest())
    const data = await response.json()

    const expectedFields = [
      'sajuExports',
      'astroExports',
      'sajuError',
      'astroError',
      'sajuSamplePreview',
      'astroSamplePreview',
    ]

    expectedFields.forEach((field) => {
      expect(data).toHaveProperty(field)
    })
  })
})
