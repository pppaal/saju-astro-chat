/**
 * Comprehensive tests for /api/cron/daily-fortune-post
 * Tests scheduled fortune posting authentication and error handling
 *
 * Note: Script execution tests are limited due to the complexity of mocking
 * child_process with ESM modules. The route executes an external script,
 * making it difficult to fully mock in unit tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { GET, POST } from '@/app/api/cron/daily-fortune-post/route'

describe('/api/cron/daily-fortune-post', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('GET - Cron Authentication', () => {
    it('should return 401 when CRON_SECRET is set but authorization header is missing', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 401 when CRON_SECRET is set and authorization header is wrong', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject malformed authorization header formats', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const malformedHeaders = [
        'my-secret-key', // Missing 'Bearer '
        'bearer my-secret-key', // Lowercase 'bearer'
        'Basic my-secret-key', // Wrong auth type
        'Bearer  my-secret-key', // Double space
      ]

      for (const authHeader of malformedHeaders) {
        const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
          method: 'GET',
          headers: {
            authorization: authHeader,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })

    it('should handle various secret lengths for timing attack resistance', async () => {
      process.env.CRON_SECRET = 'a'.repeat(64)

      const wrongSecrets = ['b'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '']

      for (const wrongSecret of wrongSecrets) {
        const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
          method: 'GET',
          headers: {
            authorization: `Bearer ${wrongSecret}`,
          },
        })

        const response = await GET(req)
        expect(response.status).toBe(401)
      }
    })

    it('should not expose CRON_SECRET in unauthorized response', async () => {
      process.env.CRON_SECRET = 'super-secret-cron-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-key',
        },
      })

      const response = await GET(req)
      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('super-secret-cron-key')
    })

    it('should handle empty authorization header', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: '',
        },
      })

      const response = await GET(req)
      expect(response.status).toBe(401)
    })

    it('should handle null-like authorization values', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer null',
        },
      })

      const response = await GET(req)
      expect(response.status).toBe(401)
    })

    it('should handle Bearer token with only spaces', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer    ',
        },
      })

      const response = await GET(req)
      expect(response.status).toBe(401)
    })
  })

  describe('POST - Manual Trigger Authentication', () => {
    it('should require ADMIN_API_KEY for POST requests', async () => {
      process.env.ADMIN_API_KEY = 'admin-key-123'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should reject wrong ADMIN_API_KEY', async () => {
      process.env.ADMIN_API_KEY = 'admin-key-123'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': 'wrong-key',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should reject when ADMIN_API_KEY is not configured', async () => {
      delete process.env.ADMIN_API_KEY

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': 'any-key',
        },
      })

      const response = await POST(req)

      expect(response.status).toBe(401)
    })

    it('should not expose ADMIN_API_KEY in unauthorized response', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-admin-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': 'wrong-key',
        },
      })

      const response = await POST(req)
      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('super-secret-admin-key')
    })

    it('should handle empty x-api-key header', async () => {
      process.env.ADMIN_API_KEY = 'admin-key-123'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': '',
        },
      })

      const response = await POST(req)
      expect(response.status).toBe(401)
    })

    it('should handle null-like x-api-key values', async () => {
      process.env.ADMIN_API_KEY = 'admin-key-123'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': 'null',
        },
      })

      const response = await POST(req)
      expect(response.status).toBe(401)
    })

    it('should handle undefined-like x-api-key values', async () => {
      process.env.ADMIN_API_KEY = 'admin-key-123'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'POST',
        headers: {
          'x-api-key': 'undefined',
        },
      })

      const response = await POST(req)
      expect(response.status).toBe(401)
    })

    it('should handle various API key lengths for timing attack resistance', async () => {
      process.env.ADMIN_API_KEY = 'a'.repeat(64)

      const wrongKeys = ['b'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '']

      for (const wrongKey of wrongKeys) {
        const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
          method: 'POST',
          headers: {
            'x-api-key': wrongKey,
          },
        })

        const response = await POST(req)
        expect(response.status).toBe(401)
      }
    })
  })

  describe('Security', () => {
    it('should return generic unauthorized message', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong-secret',
        },
      })

      const response = await GET(req)
      const data = await response.json()

      expect(data.error).toBe('Unauthorized')
      // Should not provide specific info about what was wrong
      expect(data).not.toHaveProperty('details')
      expect(data).not.toHaveProperty('message')
    })

    it('should not leak environment configuration in error responses', async () => {
      process.env.CRON_SECRET = 'my-secret-key'

      const req = new NextRequest('http://localhost:3000/api/cron/daily-fortune-post', {
        method: 'GET',
        headers: {
          authorization: 'Bearer wrong',
        },
      })

      const response = await GET(req)
      const data = await response.json()
      const responseText = JSON.stringify(data)

      expect(responseText).not.toContain('CRON_SECRET')
      expect(responseText).not.toContain('process.env')
      expect(responseText).not.toContain('my-secret-key')
    })
  })
})
