// tests/app/api/me/premium/route.test.ts
// Comprehensive tests for Premium Status API

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock holders for test control
const { mockHolder } = vi.hoisted(() => ({
  mockHolder: {
    customersList: vi.fn(),
    subscriptionsList: vi.fn(),
    cacheGet: vi.fn(),
    cacheSet: vi.fn(),
  },
}))

// Mock withApiMiddleware to control context injection
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _guard: any) => {
    return async (req: any, contextOverride?: any) => {
      // Allow tests to override context
      const context = contextOverride || {
        userId: null,
        session: null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
        isPremium: false,
      }
      return handler(req, context)
    }
  }),
  createSimpleGuard: vi.fn(() => ({})),
}))

// Mock Redis cache with hoisted holder
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: (...args: any[]) => mockHolder.cacheGet(...args),
  cacheSet: (...args: any[]) => mockHolder.cacheSet(...args),
}))

// Mock Stripe with controllable behavior
vi.mock('stripe', () => {
  return {
    default: vi.fn(() => ({
      customers: {
        list: (...args: any[]) => mockHolder.customersList(...args),
      },
      subscriptions: {
        list: (...args: any[]) => mockHolder.subscriptionsList(...args),
      },
    })),
  }
})

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

// Helper to create authenticated context
function createAuthenticatedContext(email: string, userId = 'user-123') {
  return {
    userId,
    session: {
      user: {
        id: userId,
        email,
        name: 'Test User',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
    ip: '127.0.0.1',
    locale: 'ko',
    isAuthenticated: true,
    isPremium: false,
  }
}

// Helper to create unauthenticated context
function createUnauthenticatedContext() {
  return {
    userId: null,
    session: null,
    ip: '127.0.0.1',
    locale: 'ko',
    isAuthenticated: false,
    isPremium: false,
  }
}

// Helper to create mock request
function createMockRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/me/premium', {
    method: 'GET',
  })
}

// Helper to create Stripe customer response
function createStripeCustomer(id: string, email: string) {
  return {
    id,
    email: email.toLowerCase(),
    name: 'Test Customer',
    metadata: {},
  }
}

// Helper to create Stripe subscription response
function createStripeSubscription(
  id: string,
  customerId: string,
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid'
) {
  return {
    id,
    customer: customerId,
    status,
    items: {
      data: [
        {
          price: {
            id: 'price_123',
            product: 'prod_123',
          },
        },
      ],
    },
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
  }
}

describe('GET /api/me/premium', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset environment variable
    process.env.STRIPE_SECRET_KEY = 'sk_test_123456789'

    // Reset mock implementations
    mockHolder.customersList.mockReset()
    mockHolder.subscriptionsList.mockReset()
    mockHolder.cacheGet.mockReset()
    mockHolder.cacheSet.mockReset()

    // Default mock behaviors
    mockHolder.cacheGet.mockResolvedValue(null) // No cache by default
    mockHolder.cacheSet.mockResolvedValue(true)
    mockHolder.customersList.mockResolvedValue({ data: [] })
    mockHolder.subscriptionsList.mockResolvedValue({ data: [] })
  })

  // ============================================================
  // Test 1: Returns isLoggedIn: false when no session
  // ============================================================
  describe('Unauthenticated access', () => {
    it('should return isLoggedIn: false when no session exists', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createUnauthenticatedContext()

      const response = await GET(req, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isLoggedIn).toBe(false)
      expect(data.isPremium).toBe(false)
    })

    it('should return isLoggedIn: false when userId is null', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = {
        userId: null,
        session: { user: { email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: false,
        isPremium: false,
      }

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(false)
      expect(data.isPremium).toBe(false)
    })

    it('should return isLoggedIn: false when session has no email', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = {
        userId: 'user-123',
        session: { user: { id: 'user-123', name: 'Test' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(false)
      expect(data.isPremium).toBe(false)
    })

    it('should not call Stripe when user is not authenticated', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createUnauthenticatedContext()

      await GET(req, context)

      expect(mockHolder.customersList).not.toHaveBeenCalled()
      expect(mockHolder.subscriptionsList).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // Test 2: Returns isPremium: false when no active subscription
  // ============================================================
  describe('No active subscription', () => {
    it('should return isPremium: false when customer has no subscriptions', async () => {
      const email = 'user@example.com'
      const customerId = 'cus_123'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false when no customers found in Stripe', async () => {
      const email = 'newuser@example.com'

      mockHolder.customersList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false when subscription is canceled', async () => {
      const email = 'canceled@example.com'
      const customerId = 'cus_canceled'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_canceled', customerId, 'canceled')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false when subscription is incomplete', async () => {
      const email = 'incomplete@example.com'
      const customerId = 'cus_incomplete'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_incomplete', customerId, 'incomplete')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false when subscription is unpaid', async () => {
      const email = 'unpaid@example.com'
      const customerId = 'cus_unpaid'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_unpaid', customerId, 'unpaid')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
    })
  })

  // ============================================================
  // Test 3: Returns isPremium: true when active subscription exists
  // ============================================================
  describe('Active subscription', () => {
    it('should return isPremium: true when subscription status is active', async () => {
      const email = 'premium@example.com'
      const customerId = 'cus_premium'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_active', customerId, 'active')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(true)
    })

    it('should normalize email to lowercase when querying Stripe', async () => {
      const email = 'UPPERCASE@EXAMPLE.COM'
      const customerId = 'cus_uppercase'

      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email.toLowerCase())],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_active', customerId, 'active')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
      expect(mockHolder.customersList).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'uppercase@example.com',
        })
      )
    })

    it('should find active subscription among multiple customers', async () => {
      const email = 'multi@example.com'

      mockHolder.customersList.mockResolvedValue({
        data: [
          createStripeCustomer('cus_1', email),
          createStripeCustomer('cus_2', email),
        ],
      })

      // First customer has no active subscription
      mockHolder.subscriptionsList
        .mockResolvedValueOnce({ data: [] })
        // Second customer has active subscription
        .mockResolvedValueOnce({
          data: [createStripeSubscription('sub_active', 'cus_2', 'active')],
        })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
    })
  })

  // ============================================================
  // Test 4: Uses cached premium status when available
  // ============================================================
  describe('Cache usage', () => {
    it('should return cached isPremium: true without calling Stripe', async () => {
      const email = 'cached@example.com'

      mockHolder.cacheGet.mockResolvedValue({ isPremium: true })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
      expect(mockHolder.cacheGet).toHaveBeenCalledWith(`premium:${email.toLowerCase()}`)
      expect(mockHolder.customersList).not.toHaveBeenCalled()
      expect(mockHolder.subscriptionsList).not.toHaveBeenCalled()
    })

    it('should return cached isPremium: false without calling Stripe', async () => {
      const email = 'cached-free@example.com'

      mockHolder.cacheGet.mockResolvedValue({ isPremium: false })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
      expect(mockHolder.customersList).not.toHaveBeenCalled()
    })

    it('should use lowercase email for cache key', async () => {
      const email = 'MIXED.Case@Example.COM'

      mockHolder.cacheGet.mockResolvedValue({ isPremium: true })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.cacheGet).toHaveBeenCalledWith('premium:mixed.case@example.com')
    })
  })

  // ============================================================
  // Test 5: Caches premium status after Stripe check
  // ============================================================
  describe('Cache population', () => {
    it('should cache isPremium: true after Stripe confirms subscription', async () => {
      const email = 'newpremium@example.com'
      const customerId = 'cus_new'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_new', customerId, 'active')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.cacheSet).toHaveBeenCalledWith(
        `premium:${email.toLowerCase()}`,
        { isPremium: true },
        300 // 5 minutes TTL
      )
    })

    it('should cache isPremium: false after Stripe confirms no subscription', async () => {
      const email = 'newfree@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.cacheSet).toHaveBeenCalledWith(
        `premium:${email.toLowerCase()}`,
        { isPremium: false },
        300
      )
    })

    it('should set cache with correct TTL (5 minutes)', async () => {
      const email = 'ttl-test@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      // TTL should be 300 seconds (5 minutes)
      expect(mockHolder.cacheSet).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        300
      )
    })
  })

  // ============================================================
  // Test 6: Returns isPremium: false for invalid email format
  // ============================================================
  describe('Email validation', () => {
    it('should return isPremium: false for email without @ symbol', async () => {
      const invalidEmail = 'invalidemail.com'

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(invalidEmail)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
      expect(mockHolder.customersList).not.toHaveBeenCalled()
    })

    it('should return isPremium: false for email without domain', async () => {
      const invalidEmail = 'user@'

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(invalidEmail)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false for email without TLD', async () => {
      const invalidEmail = 'user@domain'

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(invalidEmail)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
    })

    it('should return isPremium: false for email exceeding 254 characters', async () => {
      // Make it exceed 254 characters
      const tooLongEmail = `${'a'.repeat(250)}@example.com`

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(tooLongEmail)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)
      expect(mockHolder.customersList).not.toHaveBeenCalled()
    })

    it('should return isPremium: false for email with special injection characters', async () => {
      const maliciousEmail = "test'; DROP TABLE users;--@example.com"

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(maliciousEmail)

      const response = await GET(req, context)
      const data = await response.json()

      // Email regex should reject this
      expect(data.isPremium).toBe(false)
    })

    it('should accept valid email with plus sign', async () => {
      const validEmail = 'user+tag@example.com'
      const customerId = 'cus_plus'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, validEmail)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_plus', customerId, 'active')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(validEmail)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
      expect(mockHolder.customersList).toHaveBeenCalled()
    })

    it('should accept valid email with subdomain', async () => {
      const validEmail = 'user@mail.example.co.uk'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(validEmail)

      await GET(req, context)

      expect(mockHolder.customersList).toHaveBeenCalled()
    })
  })

  // ============================================================
  // Test 7: Handles trialing subscription status
  // ============================================================
  describe('Trialing subscription', () => {
    it('should return isPremium: true for trialing subscription', async () => {
      const email = 'trial@example.com'
      const customerId = 'cus_trial'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_trial', customerId, 'trialing')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(true)
    })

    it('should cache trialing status as premium', async () => {
      const email = 'trial-cache@example.com'
      const customerId = 'cus_trial_cache'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_trial', customerId, 'trialing')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.cacheSet).toHaveBeenCalledWith(
        `premium:${email.toLowerCase()}`,
        { isPremium: true },
        300
      )
    })
  })

  // ============================================================
  // Test 8: Handles past_due subscription status
  // ============================================================
  describe('Past due subscription', () => {
    it('should return isPremium: true for past_due subscription', async () => {
      const email = 'pastdue@example.com'
      const customerId = 'cus_pastdue'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_pastdue', customerId, 'past_due')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(true)
    })

    it('should treat past_due as premium (grace period)', async () => {
      const email = 'grace@example.com'
      const customerId = 'cus_grace'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [createStripeSubscription('sub_pastdue', customerId, 'past_due')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      // past_due should still count as premium to give grace period
      expect(data.isPremium).toBe(true)
    })
  })

  // ============================================================
  // Additional Tests: Edge cases and error handling
  // ============================================================
  describe('Stripe API error handling', () => {
    it('should propagate error when Stripe customer list throws', async () => {
      const email = 'stripe-error@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockRejectedValue(new Error('Stripe API error'))

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      // Note: Current implementation does not catch Stripe errors
      // The error will propagate up
      await expect(GET(req, context)).rejects.toThrow('Stripe API error')
    })

    it('should propagate error when Stripe subscription list throws', async () => {
      const email = 'sub-error@example.com'
      const customerId = 'cus_sub_error'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockRejectedValue(new Error('Subscription API error'))

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      // Note: Current implementation does not catch Stripe errors
      // The error will propagate up
      await expect(GET(req, context)).rejects.toThrow('Subscription API error')
    })
  })

  describe('Missing Stripe configuration', () => {
    it('should return isPremium: false when STRIPE_SECRET_KEY is not set', async () => {
      // Remove Stripe key
      const originalKey = process.env.STRIPE_SECRET_KEY
      delete process.env.STRIPE_SECRET_KEY

      const email = 'nostripe@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isLoggedIn).toBe(true)
      expect(data.isPremium).toBe(false)
      expect(mockHolder.customersList).not.toHaveBeenCalled()

      // Restore
      process.env.STRIPE_SECRET_KEY = originalKey
    })

    it('should return isPremium: false when STRIPE_SECRET_KEY is empty', async () => {
      const originalKey = process.env.STRIPE_SECRET_KEY
      process.env.STRIPE_SECRET_KEY = ''

      const email = 'emptystripe@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(false)

      process.env.STRIPE_SECRET_KEY = originalKey
    })
  })

  describe('Multiple subscription scenarios', () => {
    it('should return isPremium: true if any subscription is active among mixed statuses', async () => {
      const email = 'mixed@example.com'
      const customerId = 'cus_mixed'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({
        data: [
          createStripeSubscription('sub_canceled', customerId, 'canceled'),
          createStripeSubscription('sub_active', customerId, 'active'),
          createStripeSubscription('sub_incomplete', customerId, 'incomplete'),
        ],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
    })

    it('should stop checking after finding first active subscription', async () => {
      const email = 'early-exit@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [
          createStripeCustomer('cus_1', email),
          createStripeCustomer('cus_2', email),
          createStripeCustomer('cus_3', email),
        ],
      })

      // First customer has active subscription
      mockHolder.subscriptionsList.mockResolvedValueOnce({
        data: [createStripeSubscription('sub_active', 'cus_1', 'active')],
      })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data.isPremium).toBe(true)
      // Should only call subscriptions list once (early exit)
      expect(mockHolder.subscriptionsList).toHaveBeenCalledTimes(1)
    })
  })

  describe('Response format', () => {
    it('should return correct JSON structure for authenticated premium user', async () => {
      const email = 'structure@example.com'

      mockHolder.cacheGet.mockResolvedValue({ isPremium: true })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      const response = await GET(req, context)
      const data = await response.json()

      expect(data).toEqual({
        isLoggedIn: true,
        isPremium: true,
      })
      expect(Object.keys(data)).toHaveLength(2)
    })

    it('should return correct JSON structure for unauthenticated user', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createUnauthenticatedContext()

      const response = await GET(req, context)
      const data = await response.json()

      expect(data).toEqual({
        isLoggedIn: false,
        isPremium: false,
      })
    })

    it('should return JSON content type', async () => {
      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createUnauthenticatedContext()

      const response = await GET(req, context)
      const contentType = response.headers.get('content-type')

      expect(contentType).toContain('application/json')
    })
  })

  describe('Stripe API parameters', () => {
    it('should query customers with email and limit 3', async () => {
      const email = 'params@example.com'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.customersList).toHaveBeenCalledWith({
        email: email.toLowerCase(),
        limit: 3,
      })
    })

    it('should query subscriptions with customer ID and status all', async () => {
      const email = 'subparams@example.com'
      const customerId = 'cus_params'

      mockHolder.cacheGet.mockResolvedValue(null)
      mockHolder.customersList.mockResolvedValue({
        data: [createStripeCustomer(customerId, email)],
      })
      mockHolder.subscriptionsList.mockResolvedValue({ data: [] })

      const { GET } = await import('@/app/api/me/premium/route')
      const req = createMockRequest()
      const context = createAuthenticatedContext(email)

      await GET(req, context)

      expect(mockHolder.subscriptionsList).toHaveBeenCalledWith({
        customer: customerId,
        status: 'all',
        limit: 5,
      })
    })
  })
})
