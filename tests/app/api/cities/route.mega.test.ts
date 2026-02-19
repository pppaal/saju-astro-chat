// tests/app/api/cities/route.mega.test.ts
// Comprehensive tests for Cities Search API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.setConfig({ testTimeout: 60000 })
import { NextRequest } from 'next/server'
import fs from 'fs/promises'

// Mock dependencies BEFORE importing the route
vi.mock('fs/promises')
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/cities/formatter', () => ({
  getCityNameInKorean: vi.fn((name: string) => {
    const map: Record<string, string> = {
      Seoul: '서울',
      Busan: '부산',
      Tokyo: '도쿄',
      London: '런던',
      Paris: '파리',
    }
    return map[name] || null
  }),
  getCountryNameInKorean: vi.fn((country: string) => {
    const map: Record<string, string> = {
      'South Korea': '대한민국',
      Korea: '한국',
      Japan: '일본',
      'United Kingdom': '영국',
      France: '프랑스',
    }
    return map[country] || null
  }),
  getCityNameFromKorean: vi.fn((name: string) => {
    const map: Record<string, string> = {
      서울: 'Seoul',
      대한민국: 'South Korea',
      한국: 'South Korea',
    }
    return map[name] || null
  }),
}))

import { logger } from '@/lib/logger'

describe('GET /api/cities', () => {
  const mockCities = [
    { name: 'Seoul', country: 'South Korea', lat: 37.5665, lon: 126.978 },
    { name: 'Busan', country: 'South Korea', lat: 35.1796, lon: 129.0756 },
    { name: 'Tokyo', country: 'Japan', lat: 35.6762, lon: 139.6503 },
    { name: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 },
    { name: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522 },
    { name: 'Seattle', country: 'United States', lat: 47.6062, lon: -122.3321 },
    { name: 'Seoul Station', country: 'South Korea', lat: 37.5547, lon: 126.9707 },
  ]

  beforeEach(async () => {
    vi.clearAllMocks()

    // Reset module cache to clear the cachedCities variable
    vi.resetModules()

    // Mock file system
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockCities))
  })

  afterEach(() => {
    vi.resetModules()
  })

  it('should search cities by English name (starts with)', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=Seou', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBeGreaterThanOrEqual(1)
    expect(data.results[0].name).toBe('Seoul')
    // Seoul Station may or may not be included depending on matching logic
    const hasSeoulStation = data.results.some(
      (c: (typeof mockCities)[0]) => c.name === 'Seoul Station'
    )
    if (hasSeoulStation) {
      expect(data.results.length).toBe(2)
    }
  })

  it('should search cities by Korean name', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=서울', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results.some((c: (typeof mockCities)[0]) => c.name === 'Seoul')).toBe(true)
  })

  it('should search cities by country name', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=south%20korea', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBeGreaterThan(0)
    expect(data.results.every((c: (typeof mockCities)[0]) => c.country === 'South Korea')).toBe(
      true
    )
  })

  it('should search by Korean country name', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=대한민국', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should match South Korea cities
    const hasKoreanCities = data.results.some(
      (c: (typeof mockCities)[0]) => c.country === 'South Korea'
    )
    expect(hasKoreanCities).toBe(true)
  })

  it('should prioritize exact starts-with matches', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results[0].name).toBe('Seoul') // Exact match should be first
  })

  it('should return validation error for empty query', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod schema requires q to be min(1), so empty string fails validation
    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should return validation error for no query param', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod schema requires q field, so missing q fails validation
    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should limit results to specified limit', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=s&limit=2', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBeLessThanOrEqual(2)
  })

  it('should reject limit of 0 via Zod validation (min 1)', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul&limit=0', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod schema enforces min(1) for limit, so 0 fails validation
    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject limit above max of 50 via Zod validation', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=a&limit=1000', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod schema enforces max(50) for limit, so 1000 fails validation
    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should default to limit 10 when not specified', async () => {
    // Create a large cities array
    const largeCities = Array.from({ length: 250 }, (_, i) => ({
      name: `City${i}`,
      country: 'Country',
      lat: i,
      lon: i,
    }))

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(largeCities))

    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=city', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // Zod schema defaults limit to 10
    expect(data.results.length).toBeLessThanOrEqual(10)
  })

  it('should set cache control header', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)

    expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400')
  })

  it('should handle file read errors', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // File read errors are caught by middleware and returned as 500 Internal Server Error
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('should handle invalid JSON in cities file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('invalid json')

    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    // JSON parse errors are caught by middleware and returned as 500 Internal Server Error
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBeDefined()
  })

  it('should handle BOM in JSON file', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('\uFEFF' + JSON.stringify(mockCities))

    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.length).toBeGreaterThan(0)
  })

  it('should handle non-array JSON data', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ invalid: 'data' }))

    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results).toEqual([]) // Should return empty array
  })

  it('should cache loaded cities for subsequent requests', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req1 = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })
    const req2 = new NextRequest('http://localhost:3000/api/cities?q=busan', {
      method: 'GET',
    })

    await GET(req1)
    await GET(req2)

    // File should only be read once due to caching
    expect(fs.readFile).toHaveBeenCalledTimes(1)
  })

  it('should be case insensitive', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=SEOUL', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.some((c: (typeof mockCities)[0]) => c.name === 'Seoul')).toBe(true)
  })

  it('should match partial city names', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=ok', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.some((c: (typeof mockCities)[0]) => c.name === 'Tokyo')).toBe(true)
  })

  it('should include lat and lon in results', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results[0]).toHaveProperty('lat')
    expect(data.results[0]).toHaveProperty('lon')
    expect(typeof data.results[0].lat).toBe('number')
    expect(typeof data.results[0].lon).toBe('number')
  })

  it('should search by city-country pair', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=tokyo%2C%20japan', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    const tokyo = data.results.find((c: (typeof mockCities)[0]) => c.name === 'Tokyo')
    expect(tokyo).toBeDefined()
  })

  it('should handle special characters in query', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul%20station', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.results.some((c: (typeof mockCities)[0]) => c.name === 'Seoul Station')).toBe(true)
  })

  it('should log search queries', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul&limit=5', {
      method: 'GET',
    })

    await GET(req)

    expect(logger.info).toHaveBeenCalledWith(
      '[cities API] Query:',
      expect.objectContaining({ query: 'seoul', limit: 5 })
    )
  })

  it('should log results count', async () => {
    const { GET } = await import('@/app/api/cities/route')

    const req = new NextRequest('http://localhost:3000/api/cities?q=seoul', {
      method: 'GET',
    })

    await GET(req)

    expect(logger.info).toHaveBeenCalledWith(
      '[cities API] Found results:',
      expect.objectContaining({ count: expect.any(Number) })
    )
  })
})
