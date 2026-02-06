/**
 * Comprehensive tests for /api/cron/weekly-fortune
 * Tests weekly fortune image generation and storage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/replicate', () => ({
  generateWeeklyFortuneImage: vi.fn(),
}))

vi.mock('@/lib/weeklyFortune', () => ({
  saveWeeklyFortuneImage: vi.fn(),
  getWeekNumber: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/weekly-fortune/route'
import { generateWeeklyFortuneImage } from '@/lib/replicate'
import { saveWeeklyFortuneImage, getWeekNumber } from '@/lib/weeklyFortune'

describe('/api/cron/weekly-fortune', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    // Default to development for most tests
    process.env.NODE_ENV = 'development'
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('GET - Cron Authentication', () => {
    it('should return 401 in production when CRON_SECRET is set but authorization is wrong', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 401 in production when authorization header is missing', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should accept valid Bearer token in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'my-secret-key'

      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(3)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
        headers: {
          authorization: 'Bearer my-secret-key',
        },
      })

      const response = await GET(req)

      expect(response.status).toBe(200)
    })

    it('should allow requests in production when CRON_SECRET is not set', async () => {
      process.env.NODE_ENV = 'production'
      delete process.env.CRON_SECRET

      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(3)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)

      expect(response.status).toBe(200)
    })

    it('should allow requests in development without authentication', async () => {
      process.env.NODE_ENV = 'development'
      process.env.CRON_SECRET = 'my-secret-key'

      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(3)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
        // No authorization header
      })

      const response = await GET(req)

      // In development, auth is skipped
      expect(response.status).toBe(200)
    })

    it('should reject malformed authorization headers in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'my-secret-key'

      const malformedHeaders = [
        'my-secret-key', // Missing 'Bearer '
        'bearer my-secret-key', // Lowercase 'bearer'
        'Basic my-secret-key', // Wrong auth type
      ]

      for (const authHeader of malformedHeaders) {
        const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
          method: 'GET',
          headers: {
            authorization: authHeader,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })
  })

  describe('GET - Image Generation Success', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should generate and save weekly fortune image', async () => {
      const imageUrl = 'https://replicate.delivery/image123.png'
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue(imageUrl)
      vi.mocked(getWeekNumber).mockReturnValue(5)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.imageUrl).toBe(imageUrl)
      expect(data.weekNumber).toBe(5)
      expect(data.generatedAt).toBeDefined()
    })

    it('should include correct theme based on week number', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(0) // First theme
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.theme).toBe('golden sunrise over mountains')
    })

    it('should cycle through themes correctly', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      // Week 12 should cycle back to theme index 0 (12 % 12 = 0)
      vi.mocked(getWeekNumber).mockReturnValue(12)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.theme).toBe('golden sunrise over mountains')
    })

    it('should call saveWeeklyFortuneImage with correct data', async () => {
      const imageUrl = 'https://example.com/image.png'
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue(imageUrl)
      vi.mocked(getWeekNumber).mockReturnValue(7)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      await GET(req)

      expect(saveWeeklyFortuneImage).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl,
          weekNumber: 7,
          theme: 'serene zen garden with flowing water', // Theme at index 7
          generatedAt: expect.any(String),
        })
      )
    })

    it('should still succeed even if Redis save fails', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(3)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(false) // Save fails

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      // Should still return success since image was generated
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should include ISO timestamp in response', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(1)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })
  })

  describe('GET - Error Handling', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should return 500 when image generation fails with null', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('')
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to generate weekly fortune image')
    })

    it('should return 500 when generateWeeklyFortuneImage throws', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockRejectedValue(
        new Error('Replicate API failed')
      )
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to generate weekly fortune image')
    })

    it('should handle API rate limit errors', async () => {
      const rateLimitError = new Error('Rate limit exceeded')
      vi.mocked(generateWeeklyFortuneImage).mockRejectedValue(rateLimitError)
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to generate weekly fortune image')
    })

    it('should not expose internal error details in response', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockRejectedValue(
        new Error('API key: sk-secret123 is invalid')
      )
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      // Should not expose sensitive error details
      expect(JSON.stringify(data)).not.toContain('sk-secret123')
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle non-Error exceptions', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockRejectedValue('String error')
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(data.error.message).toBe('Failed to generate weekly fortune image')
    })

    it('should handle getWeekNumber errors', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockImplementation(() => {
        throw new Error('Date calculation failed')
      })

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)

      expect(response.status).toBe(500)
    })
  })

  describe('POST - Manual Trigger', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should support POST requests as alias for GET', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(5)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'POST',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should enforce same authentication for POST in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'test-secret'

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'POST',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should return same results for POST as GET', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(5)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const getReq = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const getResponse = await GET(getReq)
      const getData = await getResponse.json()

      // Reset mocks and call POST
      vi.clearAllMocks()
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(5)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const postReq = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'POST',
      })

      const postResponse = await POST(postReq)
      const postData = await postResponse.json()

      expect(getData.success).toBe(postData.success)
      expect(getData.weekNumber).toBe(postData.weekNumber)
      expect(getData.theme).toBe(postData.theme)
    })
  })

  describe('Security', () => {
    it('should not expose CRON_SECRET in responses', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'super-secret-cron-key'
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(1)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
        headers: {
          authorization: 'Bearer super-secret-cron-key',
        },
      })

      const response = await GET(req)
      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('super-secret-cron-key')
    })

    it('should handle various secret lengths for timing attack resistance', async () => {
      process.env.NODE_ENV = 'production'
      process.env.CRON_SECRET = 'a'.repeat(64)

      const wrongSecrets = ['b'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '']

      for (const wrongSecret of wrongSecrets) {
        const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${wrongSecret}`,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })
  })

  describe('Response Format', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should return proper success response structure', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(getWeekNumber).mockReturnValue(5)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data).toHaveProperty('success', true)
      expect(data).toHaveProperty('imageUrl')
      expect(data).toHaveProperty('weekNumber')
      expect(data).toHaveProperty('theme')
      expect(data).toHaveProperty('generatedAt')
    })

    it('should return proper error response structure', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockRejectedValue(new Error('Failed'))
      vi.mocked(getWeekNumber).mockReturnValue(1)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data).toHaveProperty('success', false)
      expect(data).toHaveProperty('error')
      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
      expect(data.error).toHaveProperty('status')
    })

    it('should return valid image URL format', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue(
        'https://replicate.delivery/pbxt/abc123/image.png'
      )
      vi.mocked(getWeekNumber).mockReturnValue(1)
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.imageUrl).toMatch(/^https:\/\//)
    })
  })

  describe('Theme Selection', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    const WEEKLY_THEMES = [
      'golden sunrise over mountains',
      'mystical full moon over calm ocean',
      'cherry blossoms floating in spring breeze',
      'northern lights dancing in arctic sky',
      'ancient temple under starry night',
      'crystal cave with glowing gems',
      'phoenix rising from golden flames',
      'serene zen garden with flowing water',
      'cosmic nebula with swirling galaxies',
      'enchanted forest with fairy lights',
      'lotus flower blooming on still pond',
      'majestic waterfall in misty mountains',
    ]

    it('should select correct theme for each week number', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)

      for (let week = 0; week < WEEKLY_THEMES.length; week++) {
        vi.mocked(getWeekNumber).mockReturnValue(week)

        const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
          method: 'GET',
        })

        const response = await GET(req)
        const data = await response.json()

        expect(data.theme).toBe(WEEKLY_THEMES[week])
      }
    })

    it('should handle week numbers larger than theme count', async () => {
      vi.mocked(generateWeeklyFortuneImage).mockResolvedValue('https://example.com/image.png')
      vi.mocked(saveWeeklyFortuneImage).mockResolvedValue(true)
      vi.mocked(getWeekNumber).mockReturnValue(52) // Week 52, 52 % 12 = 4

      const req = new NextRequest('http://localhost:3000/api/cron/weekly-fortune', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.theme).toBe(WEEKLY_THEMES[52 % WEEKLY_THEMES.length])
    })
  })
})
