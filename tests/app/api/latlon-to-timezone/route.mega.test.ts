// tests/app/api/latlon-to-timezone/route.mega.test.ts
// Comprehensive tests for Latitude/Longitude to Timezone API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(),
}))

// Mock tz-lookup
vi.mock('tz-lookup', async () => {
  return {
    default: vi.fn(),
  }
})

import { POST } from '@/app/api/latlon-to-timezone/route'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { requirePublicToken } from '@/lib/auth/publicToken'
import tzLookup from 'tz-lookup'

const mockRateLimit = vi.mocked(rateLimit)
const mockGetClientIp = vi.mocked(getClientIp)
const mockCaptureServerError = vi.mocked(captureServerError)
const mockRequirePublicToken = vi.mocked(requirePublicToken)
const mockTzLookup = vi.mocked(tzLookup)

describe('POST /api/latlon-to-timezone', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: new Headers([
        ['X-RateLimit-Limit', '60'],
        ['X-RateLimit-Remaining', '59'],
      ]),
    })
    mockRequirePublicToken.mockReturnValue({ valid: true })
    mockTzLookup.mockReturnValue('Asia/Seoul')
  })

  it('should return timezone for valid Seoul coordinates', async () => {
    mockTzLookup.mockReturnValue('Asia/Seoul')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5665, lon: 126.978 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.timeZone).toBe('Asia/Seoul')
    expect(mockTzLookup).toHaveBeenCalledWith(37.5665, 126.978)
  })

  it('should return timezone for New York coordinates', async () => {
    mockTzLookup.mockReturnValue('America/New_York')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 40.7128, lon: -74.006 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(data.timeZone).toBe('America/New_York')
    expect(mockTzLookup).toHaveBeenCalledWith(40.7128, -74.006)
  })

  it('should enforce rate limiting', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: new Headers([
        ['X-RateLimit-Limit', '60'],
        ['X-RateLimit-Remaining', '0'],
        ['Retry-After', '60'],
      ]),
    })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error).toBe('Too many requests')
  })

  it('should require valid public token', async () => {
    mockRequirePublicToken.mockReturnValue({ valid: false })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should validate latitude range (-90 to 90)', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 91, lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should validate latitude minimum bound', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: -91, lon: 0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should validate longitude range (-180 to 180)', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 181 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should validate longitude minimum bound', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 0, lon: -181 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should accept boundary latitude values', async () => {
    mockTzLookup.mockReturnValue('Antarctica/McMurdo')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: -90, lon: 0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(-90, 0)
  })

  it('should accept boundary longitude values', async () => {
    mockTzLookup.mockReturnValue('Pacific/Auckland')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 0, lon: 180 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(0, 180)
  })

  it('should reject non-numeric latitude', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 'invalid', lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject non-numeric longitude', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 'invalid' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should reject NaN latitude', async () => {
    // JSON.stringify converts NaN to null, which then becomes NaN when Number(null) = 0
    // But we can test by sending the string "NaN"
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: '{"lat": NaN, "lon": 127.0}',
    })

    const response = await POST(req)
    const data = await response.json()

    // Invalid JSON will cause server error
    expect(response.status).toBe(500)
  })

  it('should reject Infinity values', async () => {
    // JSON.stringify converts Infinity to null
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: '{"lat": Infinity, "lon": 127.0}',
    })

    const response = await POST(req)
    const data = await response.json()

    // Invalid JSON will cause server error
    expect(response.status).toBe(500)
  })

  it('should handle string numbers by converting them', async () => {
    mockTzLookup.mockReturnValue('Asia/Tokyo')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: '35.6762', lon: '139.6503' }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.timeZone).toBe('Asia/Tokyo')
    expect(mockTzLookup).toHaveBeenCalledWith(35.6762, 139.6503)
  })

  it('should handle equator coordinates', async () => {
    mockTzLookup.mockReturnValue('Africa/Libreville')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 0, lon: 9.4673 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(0, 9.4673)
  })

  it('should handle prime meridian coordinates', async () => {
    mockTzLookup.mockReturnValue('Europe/London')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 51.5074, lon: 0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(51.5074, 0)
  })

  it('should use client IP for rate limiting', async () => {
    mockGetClientIp.mockReturnValue('192.168.1.100')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    await POST(req)

    expect(mockGetClientIp).toHaveBeenCalledWith(req.headers)
    expect(mockRateLimit).toHaveBeenCalledWith('tz:192.168.1.100', {
      limit: 60,
      windowSeconds: 60,
    })
  })

  it('should include rate limit headers in response', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)

    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
  })

  it('should handle tz-lookup errors gracefully', async () => {
    mockTzLookup.mockImplementation(() => {
      throw new Error('Timezone database error')
    })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Timezone database error')
    expect(mockCaptureServerError).toHaveBeenCalled()
  })

  it('should handle invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: 'invalid json',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toContain('Unexpected token')
  })

  it('should handle missing lat field', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should handle missing lon field', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should handle null coordinates', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: null, lon: null }),
    })

    const response = await POST(req)
    const data = await response.json()

    // Number(null) = 0, which is valid, so it will succeed
    // unless tz-lookup throws an error
    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(0, 0)
  })

  it('should handle very precise coordinates', async () => {
    mockTzLookup.mockReturnValue('Europe/Paris')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 48.856614, lon: 2.3522219 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(48.856614, 2.3522219)
  })

  it('should handle negative coordinates', async () => {
    mockTzLookup.mockReturnValue('America/Sao_Paulo')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: -23.5505, lon: -46.6333 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(-23.5505, -46.6333)
  })

  it('should handle zero coordinates', async () => {
    mockTzLookup.mockReturnValue('Atlantic/St_Helena')

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 0, lon: 0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(mockTzLookup).toHaveBeenCalledWith(0, 0)
  })

  it('should capture server errors with route context', async () => {
    const error = new Error('Database error')
    mockTzLookup.mockImplementation(() => {
      throw error
    })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    await POST(req)

    expect(mockCaptureServerError).toHaveBeenCalledWith(error, {
      route: '/api/latlon-to-timezone',
    })
  })

  it('should handle non-Error thrown values', async () => {
    mockTzLookup.mockImplementation(() => {
      throw 'String error'
    })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('server error')
  })

  it('should return different timezones for different locations', async () => {
    const testCases = [
      { lat: 37.5665, lon: 126.978, expected: 'Asia/Seoul' },
      { lat: 51.5074, lon: -0.1278, expected: 'Europe/London' },
      { lat: -33.8688, lon: 151.2093, expected: 'Australia/Sydney' },
    ]

    for (const testCase of testCases) {
      mockTzLookup.mockReturnValue(testCase.expected)

      const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
        method: 'POST',
        body: JSON.stringify({ lat: testCase.lat, lon: testCase.lon }),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.timeZone).toBe(testCase.expected)
    }
  })

  it('should include rate limit headers even on error', async () => {
    mockRequirePublicToken.mockReturnValue({ valid: false })

    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    const response = await POST(req)

    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
  })

  it('should handle empty request body', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('validation_failed')
  })

  it('should call requirePublicToken for authentication', async () => {
    const req = new NextRequest('http://localhost:3000/api/latlon-to-timezone', {
      method: 'POST',
      body: JSON.stringify({ lat: 37.5, lon: 127.0 }),
    })

    await POST(req)

    expect(mockRequirePublicToken).toHaveBeenCalledWith(req)
  })
})
