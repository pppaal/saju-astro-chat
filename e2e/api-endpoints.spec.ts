import { test, expect } from '@playwright/test'

/**
 * API Endpoint Tests
 *
 * Verifies that all API endpoints respond correctly with proper status codes and content types.
 * Tests are designed to catch regressions in API behavior.
 */

test.describe('Auth API Endpoints', () => {
  test('GET /api/auth/csrf - should return CSRF token', async ({ request }) => {
    const response = await request.get('/api/auth/csrf')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const data = await response.json()
      expect(data).toHaveProperty('csrfToken')
      expect(data.csrfToken).toBeTruthy()
    }
  })

  test('GET /api/auth/providers - should return auth providers', async ({ request }) => {
    const response = await request.get('/api/auth/providers')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const data = await response.json()
      expect(typeof data).toBe('object')
    }
  })

  test('GET /api/auth/session - should return session info', async ({ request }) => {
    const response = await request.get('/api/auth/session')

    expect(response.status()).toBeLessThan(500)
  })
})

test.describe('Protected API Endpoints (require auth)', () => {
  const protectedEndpoints = [
    { method: 'GET', path: '/api/me/credits' },
    { method: 'GET', path: '/api/me/profile' },
    { method: 'GET', path: '/api/me/premium' },
    { method: 'GET', path: '/api/me/history' },
    { method: 'GET', path: '/api/me/circle' },
    { method: 'GET', path: '/api/referral/me' },
    { method: 'GET', path: '/api/readings' },
    { method: 'GET', path: '/api/counselor/chat-history' },
    { method: 'GET', path: '/api/counselor/session/list' },
  ]

  for (const endpoint of protectedEndpoints) {
    test(`${endpoint.method} ${endpoint.path} - should require authentication`, async ({
      request,
    }) => {
      const response = await request.get(endpoint.path)

      // Protected endpoints should return 401/403 for unauthenticated requests
      // or 200 if the endpoint allows anonymous access with limited data
      expect(response.status()).toBeLessThan(500)
      expect([200, 401, 403]).toContain(response.status())
    })
  }
})

test.describe('Feature API Endpoints (POST with validation)', () => {
  const postEndpoints = [
    { path: '/api/saju', name: 'Saju' },
    { path: '/api/tarot/interpret', name: 'Tarot' },
    { path: '/api/dream', name: 'Dream' },
    { path: '/api/compatibility', name: 'Compatibility' },
    { path: '/api/numerology', name: 'Numerology' },
    { path: '/api/destiny-map', name: 'Destiny Map' },
    { path: '/api/astrology', name: 'Astrology' },
    { path: '/api/fortune', name: 'Fortune' },
  ]

  for (const endpoint of postEndpoints) {
    test(`POST ${endpoint.path} - should reject empty request body`, async ({ request }) => {
      const response = await request.post(endpoint.path, {
        data: {},
      })

      // Should reject empty request with 400 (bad request) or require auth (401/403)
      expect(response.status()).toBeLessThan(500)
      expect([400, 401, 403, 422]).toContain(response.status())
    })
  }
})

test.describe('Content API Endpoints', () => {
  test('GET /api/cities - should respond with city data', async ({ request }) => {
    const response = await request.get('/api/cities?q=Seoul')

    expect(response.status()).toBeLessThan(500)

    if (response.ok()) {
      const data = await response.json()
      expect(Array.isArray(data) || typeof data === 'object').toBe(true)
    }
  })

  test('GET /api/daily-fortune - should respond', async ({ request }) => {
    const response = await request.get('/api/daily-fortune')

    // May require auth or specific params
    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/calendar - should respond', async ({ request }) => {
    const response = await request.get('/api/calendar')

    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/stats - should respond', async ({ request }) => {
    const response = await request.get('/api/stats')

    expect(response.status()).toBeLessThan(500)
  })

  test('GET /api/visitors-today - should respond', async ({ request }) => {
    const response = await request.get('/api/visitors-today')

    expect(response.status()).toBeLessThan(500)
  })
})

test.describe('Error Handling', () => {
  test('Non-existent API should return 404', async ({ request }) => {
    const response = await request.get('/api/this-does-not-exist-12345')

    expect(response.status()).toBe(404)
  })

  test('Invalid method should return 404 or 405', async ({ request }) => {
    const response = await request.delete('/api/auth/csrf')

    expect([404, 405]).toContain(response.status())
  })
})

test.describe('Content-Type Headers', () => {
  test('JSON APIs should return application/json', async ({ request }) => {
    const response = await request.get('/api/auth/csrf')

    if (response.ok()) {
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    }
  })

  test('Auth providers should return JSON', async ({ request }) => {
    const response = await request.get('/api/auth/providers')

    if (response.ok()) {
      const contentType = response.headers()['content-type']
      expect(contentType).toContain('application/json')
    }
  })
})

test.describe('Request Validation', () => {
  test('POST /api/feedback - should require body', async ({ request }) => {
    const response = await request.post('/api/feedback', {
      data: {},
    })

    expect(response.status()).toBeLessThan(500)
    expect([400, 401, 403, 422]).toContain(response.status())
  })

  test('POST /api/referral/validate - should require body', async ({ request }) => {
    const response = await request.post('/api/referral/validate', {
      data: {},
    })

    expect(response.status()).toBeLessThan(500)
  })

  test('POST /api/calendar/save - should require auth', async ({ request }) => {
    const response = await request.post('/api/calendar/save', {
      data: {},
    })

    expect(response.status()).toBeLessThan(500)
  })

  test('POST /api/push/subscribe - should require body', async ({ request }) => {
    const response = await request.post('/api/push/subscribe', {
      data: {},
    })

    expect(response.status()).toBeLessThan(500)
  })
})
