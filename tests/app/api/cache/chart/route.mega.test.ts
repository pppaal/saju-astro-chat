// tests/app/api/cache/chart/route.mega.test.ts
// Comprehensive tests for Chart Cache API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies BEFORE imports
vi.mock('@/lib/cache/chart-cache-server', () => ({
  loadChartData: vi.fn(),
  saveChartData: vi.fn(),
  clearChartCache: vi.fn(),
}))

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: Function, _options?: unknown) => async (req: NextRequest) => {
    const result = await handler(req)
    // The handler returns apiSuccess or apiError responses directly
    return NextResponse.json(result)
  },
  apiSuccess: (data: unknown) => ({ success: true, data }),
  apiError: (code: string, message: string) => ({ success: false, error: { code, message } }),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

import { GET, POST, DELETE } from '@/app/api/cache/chart/route'
import { loadChartData, saveChartData, clearChartCache } from '@/lib/cache/chart-cache-server'

const mockLoadChartData = vi.mocked(loadChartData)
const mockSaveChartData = vi.mocked(saveChartData)
const mockClearChartCache = vi.mocked(clearChartCache)

describe('GET /api/cache/chart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should load cached chart data successfully', async () => {
    const cachedData = {
      saju: { pillars: {} },
      astro: { sun: {} },
    }
    mockLoadChartData.mockResolvedValue(cachedData)

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=37.5&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.cached).toBe(true)
    expect(data.data.data).toEqual(cachedData)
    expect(mockLoadChartData).toHaveBeenCalledWith('1990-01-01', '10:00', 37.5, 127.0)
  })

  it('should return uncached when no data found', async () => {
    mockLoadChartData.mockResolvedValue(null)

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=37.5&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.cached).toBe(false)
    expect(data.data.data).toBeNull()
  })

  it('should require birthDate parameter', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthTime=10:00&latitude=37.5&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('Validation failed')
  })

  it('should require birthTime parameter', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&latitude=37.5&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should default latitude to 0 when not provided', async () => {
    mockLoadChartData.mockResolvedValue(null)

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    // z.coerce.number() coerces null to 0, which passes validation
    expect(data.success).toBe(true)
    expect(mockLoadChartData).toHaveBeenCalledWith('1990-01-01', '10:00', 0, 127.0)
  })

  it('should default longitude to 0 when not provided', async () => {
    mockLoadChartData.mockResolvedValue(null)

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=37.5'
    )

    const response = await GET(req)
    const data = await response.json()

    // z.coerce.number() coerces null to 0, which passes validation
    expect(data.success).toBe(true)
    expect(mockLoadChartData).toHaveBeenCalledWith('1990-01-01', '10:00', 37.5, 0)
  })

  it('should validate latitude as number', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=invalid&longitude=127.0'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toContain('Validation failed')
  })

  it('should validate longitude as number', async () => {
    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=37.5&longitude=invalid'
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should handle different birth dates', async () => {
    mockLoadChartData.mockResolvedValue({ saju: {} })

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=2000-12-31&birthTime=23:59&latitude=40.7&longitude=-74.0'
    )

    await GET(req)

    expect(mockLoadChartData).toHaveBeenCalledWith('2000-12-31', '23:59', 40.7, -74.0)
  })

  it('should handle negative coordinates', async () => {
    mockLoadChartData.mockResolvedValue(null)

    const req = new NextRequest(
      'http://localhost:3000/api/cache/chart?birthDate=1990-01-01&birthTime=10:00&latitude=-33.8&longitude=-70.6'
    )

    await GET(req)

    expect(mockLoadChartData).toHaveBeenCalledWith('1990-01-01', '10:00', -33.8, -70.6)
  })
})

describe('POST /api/cache/chart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should save chart data successfully', async () => {
    mockSaveChartData.mockResolvedValue(true)

    const chartData = {
      calculatedAt: '2024-01-15T10:30:00Z',
    }

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 37.5,
        longitude: 127.0,
        data: chartData,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)
    expect(mockSaveChartData).toHaveBeenCalledWith('1990-01-01', '10:00', 37.5, 127.0, chartData)
  })

  it('should return error when save fails', async () => {
    mockSaveChartData.mockResolvedValue(false)

    const chartData = {
      calculatedAt: '2024-01-15T10:30:00Z',
    }

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 37.5,
        longitude: 127.0,
        data: chartData,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toContain('Failed to save')
  })

  it('should require birthDate field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthTime: '10:00',
        latitude: 37.5,
        longitude: 127.0,
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should require birthTime field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        latitude: 37.5,
        longitude: 127.0,
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should require latitude field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        longitude: 127.0,
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should require longitude field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 37.5,
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should require data field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 37.5,
        longitude: 127.0,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should validate latitude as number type', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: '37.5',
        longitude: 127.0,
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should validate longitude as number type', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 37.5,
        longitude: '127.0',
        data: {},
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should accept zero as valid latitude', async () => {
    mockSaveChartData.mockResolvedValue(true)

    const chartData = {
      calculatedAt: '2024-01-15T10:30:00Z',
    }

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'POST',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
        latitude: 0,
        longitude: 0,
        data: chartData,
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(mockSaveChartData).toHaveBeenCalledWith('1990-01-01', '10:00', 0, 0, chartData)
  })
})

describe('DELETE /api/cache/chart', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should clear chart cache successfully', async () => {
    mockClearChartCache.mockResolvedValue(true)

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'DELETE',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
      }),
    })

    const response = await DELETE(req)
    const data = await response.json()

    expect(data.success).toBe(true)
    expect(data.data.success).toBe(true)
    expect(mockClearChartCache).toHaveBeenCalledWith('1990-01-01', '10:00')
  })

  it('should return error when clear fails', async () => {
    mockClearChartCache.mockResolvedValue(false)

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'DELETE',
      body: JSON.stringify({
        birthDate: '1990-01-01',
        birthTime: '10:00',
      }),
    })

    const response = await DELETE(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toContain('Failed to clear')
  })

  it('should require birthDate field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'DELETE',
      body: JSON.stringify({
        birthTime: '10:00',
      }),
    })

    const response = await DELETE(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should require birthTime field', async () => {
    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'DELETE',
      body: JSON.stringify({
        birthDate: '1990-01-01',
      }),
    })

    const response = await DELETE(req)
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should handle different birth dates', async () => {
    mockClearChartCache.mockResolvedValue(true)

    const req = new NextRequest('http://localhost:3000/api/cache/chart', {
      method: 'DELETE',
      body: JSON.stringify({
        birthDate: '2000-12-31',
        birthTime: '23:59',
      }),
    })

    await DELETE(req)

    expect(mockClearChartCache).toHaveBeenCalledWith('2000-12-31', '23:59')
  })
})
