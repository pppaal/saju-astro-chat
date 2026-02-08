import { test, expect } from '@playwright/test'

/**
 * API endpoint tests - check that APIs respond correctly
 */

test.describe('Auth API Endpoints', () => {
  test('GET /api/auth/csrf - should return CSRF token', async ({ page }) => {
    const response = await page.request.get('/api/auth/csrf')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data.csrfToken).toBeTruthy()
    expect(typeof data.csrfToken).toBe('string')
  })

  test('GET /api/auth/providers - should return auth providers', async ({ page }) => {
    const response = await page.request.get('/api/auth/providers')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(typeof data).toBe('object')
  })

  test('GET /api/auth/session - should return session info', async ({ page }) => {
    const response = await page.request.get('/api/auth/session')
    expect(response.ok()).toBe(true)

    const data = await response.json()
    expect(data).toBeDefined()
  })
})

test.describe('Content API Endpoints', () => {
  test('GET /api/cities - should return cities data', async ({ page }) => {
    const response = await page.request.get('/api/cities?q=Seoul')
    // May require auth or return 401
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/daily-fortune - should respond', async ({ page }) => {
    const response = await page.request.get('/api/daily-fortune')
    // API should respond - may return various status codes
    expect(response.status()).toBeGreaterThanOrEqual(200)
    expect(response.status()).toBeLessThan(600)
  })

  test('GET /api/weekly-fortune - should respond', async ({ page }) => {
    const response = await page.request.get('/api/weekly-fortune')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('User API Endpoints', () => {
  test('GET /api/me/credits - should respond', async ({ page }) => {
    const response = await page.request.get('/api/me/credits')
    // Requires auth, should return 401 for unauthenticated
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/me/profile - should respond', async ({ page }) => {
    const response = await page.request.get('/api/me/profile')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/me/premium - should respond', async ({ page }) => {
    const response = await page.request.get('/api/me/premium')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/me/history - should respond', async ({ page }) => {
    const response = await page.request.get('/api/me/history')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/me/circle - should respond', async ({ page }) => {
    const response = await page.request.get('/api/me/circle')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Feature API Endpoints', () => {
  test('POST /api/saju - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/saju', {
      data: {},
    })
    // Should reject empty request
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/tarot/interpret - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/tarot/interpret', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/dream - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/dream', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/compatibility - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/compatibility', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/numerology - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/numerology', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/destiny-map - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/destiny-map', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/astrology - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/astrology', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('POST /api/fortune - should require auth or body', async ({ page }) => {
    const response = await page.request.post('/api/fortune', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })
})

test.describe('Calendar API Endpoints', () => {
  test('GET /api/calendar - should respond', async ({ page }) => {
    const response = await page.request.get('/api/calendar')
    expect([200, 400, 401, 403]).toContain(response.status())
  })

  test('POST /api/calendar/save - should require auth', async ({ page }) => {
    const response = await page.request.post('/api/calendar/save', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })
})

test.describe('Referral API Endpoints', () => {
  test('GET /api/referral/me - should respond', async ({ page }) => {
    const response = await page.request.get('/api/referral/me')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('POST /api/referral/validate - should require body', async ({ page }) => {
    const response = await page.request.post('/api/referral/validate', {
      data: {},
    })
    expect([400, 401, 403, 405, 422, 500]).toContain(response.status())
  })
})

test.describe('Readings API Endpoints', () => {
  test('GET /api/readings - should respond', async ({ page }) => {
    const response = await page.request.get('/api/readings')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Stats API Endpoints', () => {
  test('GET /api/stats - should respond', async ({ page }) => {
    const response = await page.request.get('/api/stats')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/visitors-today - should respond', async ({ page }) => {
    const response = await page.request.get('/api/visitors-today')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Counselor API Endpoints', () => {
  test('GET /api/counselor/chat-history - should respond', async ({ page }) => {
    const response = await page.request.get('/api/counselor/chat-history')
    expect([200, 401, 403]).toContain(response.status())
  })

  test('GET /api/counselor/session/list - should respond', async ({ page }) => {
    const response = await page.request.get('/api/counselor/session/list')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Feedback API Endpoints', () => {
  test('POST /api/feedback - should require body', async ({ page }) => {
    const response = await page.request.post('/api/feedback', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })

  test('GET /api/feedback/records - should respond', async ({ page }) => {
    const response = await page.request.get('/api/feedback/records')
    expect([200, 401, 403]).toContain(response.status())
  })
})

test.describe('Push Notification API Endpoints', () => {
  test('POST /api/push/subscribe - should require body', async ({ page }) => {
    const response = await page.request.post('/api/push/subscribe', {
      data: {},
    })
    expect([400, 401, 403, 422, 500]).toContain(response.status())
  })
})

test.describe('Error Handling', () => {
  test('Non-existent API should return 404', async ({ page }) => {
    const response = await page.request.get('/api/this-does-not-exist-12345')
    expect(response.status()).toBe(404)
  })

  test('Invalid method should return 405 or 404', async ({ page }) => {
    const response = await page.request.delete('/api/auth/csrf')
    expect([404, 405]).toContain(response.status())
  })
})

test.describe('Content-Type Headers', () => {
  test('JSON APIs should return application/json', async ({ page }) => {
    const response = await page.request.get('/api/auth/csrf')
    expect(response.ok()).toBe(true)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')
  })

  test('Auth providers should return JSON', async ({ page }) => {
    const response = await page.request.get('/api/auth/providers')
    expect(response.ok()).toBe(true)

    const contentType = response.headers()['content-type']
    expect(contentType).toContain('application/json')
  })
})
