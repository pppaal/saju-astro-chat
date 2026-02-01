// tests/app/api/numerology/route.mega.test.ts
// Comprehensive tests for Numerology Analysis API

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '@/app/api/numerology/route'

// Mock dependencies
vi.mock('@/lib/api', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/csrf', () => ({
  csrfGuard: vi.fn(() => null),
}))

import { apiClient } from '@/lib/api'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { logger } from '@/lib/logger'

describe.skip('POST /api/numerology', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mocks
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, reset: 0 })
  })

  describe('Analyze action', () => {
    it('should analyze numerology for single person', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
        englishName: 'John Doe',
        locale: 'ko',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 8 },
            expression: { expression: 5 },
            soul_urge: { soul_urge: 3 },
            personality: { personality: 2 },
            personal_year: { personal_year: 7, calculation: '2024 cycle' },
            personal_month: { personal_month: 9 },
            personal_day: { personal_day: 1 },
          },
          interpretations: {
            life_path: { meaning: 'Leader', description: 'Natural leadership' },
            expression: { meaning: 'Freedom', description: 'Seeks adventure' },
            soul_urge: { meaning: 'Creative', description: 'Artistic soul' },
            personality: { meaning: 'Diplomatic', description: 'Peaceful' },
            personal_year: { theme: 'Spiritual growth' },
            personal_month: { theme: 'Completion' },
            personal_day: { theme: 'New beginnings' },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.lifePath).toEqual({
        number: 8,
        meaning: 'Leader',
        description: 'Natural leadership',
      })
      expect(data.expression).toEqual({
        number: 5,
        meaning: 'Freedom',
        description: 'Seeks adventure',
      })
      expect(data.personalYear).toEqual({
        number: 7,
        theme: 'Spiritual growth',
      })
    })

    it('should handle Korean name analysis', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
        koreanName: '김철수',
        locale: 'ko',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 5 },
            korean_name_number: { name_number: 8, total_strokes: 24 },
          },
          interpretations: {
            life_path: { meaning: 'Freedom', description: 'Adventurous' },
            korean_name: { meaning: 'Prosperity' },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.koreanName).toEqual({
        number: 8,
        strokes: 24,
        meaning: 'Prosperity',
      })
    })

    it('should default to analyze action when not specified', async () => {
      const body = {
        birthDate: '1990-05-15',
        locale: 'en',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 3 },
          },
          interpretations: {
            life_path: { meaning: 'Creative', description: 'Artistic' },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      expect(response.status).toBe(200)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/numerology/analyze',
        expect.objectContaining({
          birthDate: '1990-05-15',
          locale: 'en',
        }),
        expect.any(Object)
      )
    })

    it('should reject missing birthDate', async () => {
      const body = {
        action: 'analyze',
        englishName: 'John Doe',
      }

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('birthDate is required')
    })

    it('should handle minimal profile response', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 1 },
          },
          interpretations: {
            life_path: { meaning: 'Independent' },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.lifePath.number).toBe(1)
      expect(data.expression).toBeUndefined()
      expect(data.soulUrge).toBeUndefined()
      expect(data.personality).toBeUndefined()
    })

    it('should handle missing interpretations', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 9 },
            expression: { expression: 6 },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.lifePath.meaning).toBe('')
      expect(data.lifePath.description).toBe('')
      expect(data.expression!.meaning).toBe('')
    })

    it('should use calculation as fallback for personal year theme', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: {
            life_path: { life_path: 2 },
            personal_year: { personal_year: 5, calculation: '2024-05-15 = 5' },
          },
          interpretations: {
            life_path: { meaning: 'Partnership' },
          },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data.personalYear!.theme).toBe('2024-05-15 = 5')
    })
  })

  describe('Compatibility action', () => {
    it('should analyze compatibility for two people', async () => {
      const body = {
        action: 'compatibility',
        person1: {
          birthDate: '1990-05-15',
          name: 'Alice',
        },
        person2: {
          birthDate: '1992-08-20',
          name: 'Bob',
        },
        locale: 'ko',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          compatibility_score: 85,
          analysis: 'Great compatibility!',
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.compatibility_score).toBe(85)
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/numerology/compatibility',
        {
          person1: { birthDate: '1990-05-15', name: 'Alice' },
          person2: { birthDate: '1992-08-20', name: 'Bob' },
          locale: 'ko',
        },
        expect.any(Object)
      )
    })

    it('should reject missing person1 birthDate', async () => {
      const body = {
        action: 'compatibility',
        person1: { name: 'Alice' },
        person2: { birthDate: '1992-08-20', name: 'Bob' },
      }

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Both person1.birthDate and person2.birthDate are required')
    })

    it('should reject missing person2 birthDate', async () => {
      const body = {
        action: 'compatibility',
        person1: { birthDate: '1990-05-15', name: 'Alice' },
        person2: { name: 'Bob' },
      }

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('Both person1.birthDate and person2.birthDate are required')
    })
  })

  describe('Input validation', () => {
    it('should reject invalid action', async () => {
      const body = {
        action: 'invalid',
        birthDate: '1990-05-15',
      }

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid action')
    })

    it('should reject invalid JSON', async () => {
      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
    })

    it('should reject null body', async () => {
      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: null,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid JSON body')
    })
  })

  describe('Rate limiting', () => {
    it('should apply rate limit', async () => {
      vi.mocked(rateLimit).mockResolvedValue({ allowed: false, retryAfter: 30 })

      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error.code).toBe('RATE_LIMITED')
      expect(data.error.message).toBe('Too many requests. Please wait a moment.')
      expect(response.headers.get('Retry-After')).toBe('30')
    })

    it('should use IP-based rate limit key', async () => {
      vi.mocked(getClientIp).mockReturnValue('192.168.1.1')

      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          profile: { life_path: { life_path: 1 } },
          interpretations: { life_path: { meaning: 'Leader' } },
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      await POST(req)

      expect(rateLimit).toHaveBeenCalledWith('api:/api/numerology:192.168.1.1', {
        limit: 30,
        windowSeconds: 60,
      })
    })
  })

  describe('Backend error handling', () => {
    it('should handle backend error response', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 503,
        error: 'Service unavailable',
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fromFallback).toBe(true)
      expect(data.lifePath).toBeDefined()
      expect(logger.error).toHaveBeenCalledWith(
        '[Numerology API] Backend error:',
        expect.objectContaining({ status: 503 })
      )
    })

    it('should handle thrown errors', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Internal Server Error')
      expect(data.error).toContain('Network error')
    })

    it('should handle non-Error throws', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockRejectedValue('String error')

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('Unknown error')
    })

    it('should return raw data when no profile in analyze response', async () => {
      const body = {
        action: 'analyze',
        birthDate: '1990-05-15',
      }

      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          someOtherData: 'value',
        },
      })

      const req = new NextRequest('http://localhost:3000/api/numerology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const response = await POST(req)
      const data = await response.json()

      expect(data).toEqual({ someOtherData: 'value' })
    })
  })
})

describe.skip('GET /api/numerology', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getClientIp).mockReturnValue('127.0.0.1')
    vi.mocked(rateLimit).mockResolvedValue({ allowed: true, reset: 0 })
  })

  it('should analyze numerology via GET request', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        profile: {
          life_path: { life_path: 7 },
          expression: { expression: 4 },
        },
        interpretations: {
          life_path: { meaning: 'Seeker', description: 'Analytical' },
          expression: { meaning: 'Builder', description: 'Practical' },
        },
      },
    })

    const req = new NextRequest(
      'http://localhost:3000/api/numerology?birthDate=1990-05-15&name=John%20Doe&locale=en',
      { method: 'GET' }
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.lifePath.number).toBe(7)
    expect(data.expression!.number).toBe(4)
  })

  it('should handle koreanName parameter', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        profile: {
          life_path: { life_path: 3 },
          korean_name_number: { name_number: 6, total_strokes: 18 },
        },
        interpretations: {
          life_path: { meaning: 'Creative' },
          korean_name: { meaning: 'Harmony' },
        },
      },
    })

    const req = new NextRequest(
      'http://localhost:3000/api/numerology?birthDate=1990-05-15&koreanName=%EA%B9%80%EC%B2%A0%EC%88%98',
      { method: 'GET' }
    )

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.koreanName!.number).toBe(6)
    expect(data.koreanName!.strokes).toBe(18)
  })

  it('should use englishName param as alias for name', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        profile: { life_path: { life_path: 2 } },
        interpretations: { life_path: { meaning: 'Diplomat' } },
      },
    })

    const req = new NextRequest(
      'http://localhost:3000/api/numerology?birthDate=1990-05-15&englishName=Jane%20Smith',
      { method: 'GET' }
    )

    await GET(req)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/numerology/analyze',
      expect.objectContaining({
        englishName: 'Jane Smith',
      })
    )
  })

  it('should default locale to ko', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        profile: { life_path: { life_path: 1 } },
        interpretations: { life_path: { meaning: 'Leader' } },
      },
    })

    const req = new NextRequest('http://localhost:3000/api/numerology?birthDate=1990-05-15', {
      method: 'GET',
    })

    await GET(req)

    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/numerology/analyze',
      expect.objectContaining({
        locale: 'ko',
      })
    )
  })

  it('should reject missing birthDate', async () => {
    const req = new NextRequest('http://localhost:3000/api/numerology?name=John', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('birthDate query param is required')
  })

  it('should apply rate limit (60/min)', async () => {
    vi.mocked(rateLimit).mockResolvedValue({ allowed: false, retryAfter: 45 })

    const req = new NextRequest('http://localhost:3000/api/numerology?birthDate=1990-05-15', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.error.code).toBe('RATE_LIMITED')
    expect(data.error.message).toBe('Too many requests. Please wait a moment.')
    expect(rateLimit).toHaveBeenCalledWith('api:/api/numerology:127.0.0.1', {
      limit: 60,
      windowSeconds: 60,
    })
    expect(response.headers.get('Retry-After')).toBe('45')
  })

  it('should handle backend error', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: false,
      status: 500,
      error: 'Internal error',
    })

    const req = new NextRequest('http://localhost:3000/api/numerology?birthDate=1990-05-15', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Backend service error')
  })

  it('should handle thrown errors', async () => {
    vi.mocked(apiClient.post).mockRejectedValue(new Error('Timeout'))

    const req = new NextRequest('http://localhost:3000/api/numerology?birthDate=1990-05-15', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal Server Error')
    expect(logger.error).toHaveBeenCalledWith('[API /api/numerology GET] Error:', expect.any(Error))
  })

  it('should return raw data when no profile', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        rawData: 'some value',
      },
    })

    const req = new NextRequest('http://localhost:3000/api/numerology?birthDate=1990-05-15', {
      method: 'GET',
    })

    const response = await GET(req)
    const data = await response.json()

    expect(data).toEqual({ rawData: 'some value' })
  })

  it('should handle all optional fields in response', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        profile: {
          life_path: { life_path: 11 },
          expression: { expression: 22 },
          soul_urge: { soul_urge: 33 },
          personality: { personality: 1 },
          personal_year: { personal_year: 8, calculation: '2024 = 8' },
          personal_month: { personal_month: 3 },
          personal_day: { personal_day: 5 },
          korean_name_number: { name_number: 9, total_strokes: 27 },
        },
        interpretations: {
          life_path: { meaning: 'Master number', description: 'Spiritual' },
          expression: { meaning: 'Master builder', description: 'Visionary' },
          soul_urge: { meaning: 'Master teacher', description: 'Enlightened' },
          personality: { meaning: 'Leader', description: 'Independent' },
          personal_year: { theme: 'Power and abundance' },
          personal_month: { theme: 'Creativity' },
          personal_day: { theme: 'Change' },
          korean_name: { meaning: 'Completion' },
        },
      },
    })

    const req = new NextRequest(
      'http://localhost:3000/api/numerology?birthDate=1990-05-15&name=Test&koreanName=테스트',
      { method: 'GET' }
    )

    const response = await GET(req)
    const data = await response.json()

    expect(data.lifePath.number).toBe(11)
    expect(data.expression!.number).toBe(22)
    expect(data.soulUrge!.number).toBe(33)
    expect(data.personality!.number).toBe(1)
    expect(data.personalYear!.number).toBe(8)
    expect(data.personalMonth!.number).toBe(3)
    expect(data.personalDay!.number).toBe(5)
    expect(data.koreanName!.number).toBe(9)
  })
})
