import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Track if rate limit should block the request
let mockRateLimitBlocked = false
let mockAuthBlocked = false

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      // Simulate rate limit check
      if (mockRateLimitBlocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests. Please wait a moment.',
              status: 429,
            },
          },
          {
            status: 429,
            headers: {
              'Retry-After': '60',
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': '0',
            },
          }
        )
      }

      // Simulate auth check
      if (mockAuthBlocked) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Please log in to continue.',
              status: 401,
            },
          },
          { status: 401 }
        )
      }

      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id', email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 422,
          FORBIDDEN: 403,
          UNAUTHORIZED: 401,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json(
        { success: true, data: result.data },
        { status: 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn((options: any) => ({
    route: options?.route || '/api/push/send',
    requireAuth: true,
    rateLimit: {
      limit: options?.limit || 10,
      windowSeconds: options?.windowSeconds || 60,
    },
  })),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
  },
}))

vi.mock('@/lib/notifications/pushService', () => ({
  sendPushNotification: vi.fn(),
  sendTestNotification: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  pushSendRequestSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: Array<{ message: string; path: string[] }> = []

      // title is required and must be 1-200 chars
      if (!data?.title || data.title.trim().length === 0) {
        errors.push({ message: 'Title is required', path: ['title'] })
      } else if (data.title.length > 200) {
        errors.push({ message: 'Title must be at most 200 characters', path: ['title'] })
      }

      // message is required and must be 1-1000 chars
      if (!data?.message || data.message.trim().length === 0) {
        errors.push({ message: 'Message is required', path: ['message'] })
      } else if (data.message.length > 1000) {
        errors.push({ message: 'Message must be at most 1000 characters', path: ['message'] })
      }

      // targetUserId is optional but if present must be max 200 chars
      if (data?.targetUserId && data.targetUserId.length > 200) {
        errors.push({ message: 'Target user ID must be at most 200 characters', path: ['targetUserId'] })
      }

      // icon is optional but if present must be max 500 chars
      if (data?.icon && data.icon.length > 500) {
        errors.push({ message: 'Icon URL must be at most 500 characters', path: ['icon'] })
      }

      // url is optional but if present must be max 500 chars
      if (data?.url && data.url.length > 500) {
        errors.push({ message: 'URL must be at most 500 characters', path: ['url'] })
      }

      // tag is optional but if present must be max 100 chars
      if (data?.tag && data.tag.length > 100) {
        errors.push({ message: 'Tag must be at most 100 characters', path: ['tag'] })
      }

      // test is optional boolean
      if (data?.test !== undefined && typeof data.test !== 'boolean') {
        errors.push({ message: 'Test must be a boolean', path: ['test'] })
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: {
          targetUserId: data.targetUserId,
          title: data.title.trim(),
          message: data.message.trim(),
          icon: data.icon,
          url: data.url,
          tag: data.tag,
          test: data.test,
        },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/push/send/route'
import { sendPushNotification, sendTestNotification } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Test Notification',
    message: 'This is a test push notification',
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests -- POST /api/push/send
// ---------------------------------------------------------------------------

describe('POST /api/push/send', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRateLimitBlocked = false
    mockAuthBlocked = false
    vi.mocked(sendPushNotification).mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
    })
    vi.mocked(sendTestNotification).mockResolvedValue({
      success: true,
      sent: 1,
      failed: 0,
    })
  })

  // =========================================================================
  // 1. Authentication Requirements
  // =========================================================================

  describe('Authentication requirements', () => {
    it('should return 401 UNAUTHORIZED when user is not authenticated', async () => {
      mockAuthBlocked = true

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('UNAUTHORIZED')
      expect(json.error.message).toBe('Please log in to continue.')

      expect(sendPushNotification).not.toHaveBeenCalled()
      expect(sendTestNotification).not.toHaveBeenCalled()
    })

    it('should allow authenticated users to send notifications', async () => {
      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(sendPushNotification).toHaveBeenCalledOnce()
    })
  })

  // =========================================================================
  // 2. Validation of Push Notification Data
  // =========================================================================

  describe('Validation of push notification data', () => {
    it('should return VALIDATION_ERROR when title is missing', async () => {
      const req = createPostRequest({ message: 'Test message' })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Title is required')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR when message is missing', async () => {
      const req = createPostRequest({ title: 'Test Title' })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Message is required')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR when title exceeds max length (200 chars)', async () => {
      const req = createPostRequest(validPayload({ title: 'x'.repeat(201) }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Title must be at most 200 characters')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR when message exceeds max length (1000 chars)', async () => {
      const req = createPostRequest(validPayload({ message: 'x'.repeat(1001) }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Message must be at most 1000 characters')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR when title is empty string', async () => {
      const req = createPostRequest(validPayload({ title: '' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should return VALIDATION_ERROR when message is empty string', async () => {
      const req = createPostRequest(validPayload({ message: '' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should log warning when validation fails', async () => {
      const req = createPostRequest({ title: '', message: '' })
      await POST(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[push/send] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should accept valid optional fields (icon, url, tag)', async () => {
      const req = createPostRequest(
        validPayload({
          icon: '/custom-icon.png',
          url: '/notifications/123',
          tag: 'custom-tag',
        })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          icon: '/custom-icon.png',
          tag: 'custom-tag',
          data: expect.objectContaining({ url: '/notifications/123' }),
        })
      )
    })
  })

  // =========================================================================
  // 3. Sending to Specific Users
  // =========================================================================

  describe('Sending to specific users', () => {
    it('should send notification to self when no targetUserId specified', async () => {
      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)
      expect(json.data.sent).toBe(1)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          title: 'Test Notification',
          message: 'This is a test push notification',
        })
      )
    })

    it('should send notification to self when targetUserId matches context userId', async () => {
      const req = createPostRequest(validPayload({ targetUserId: 'test-user-id' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.any(Object)
      )
    })

    it('should return FORBIDDEN when targetUserId is different from authenticated user', async () => {
      const req = createPostRequest(validPayload({ targetUserId: 'other-user-id' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
      expect(json.error.message).toBe('Cannot send to other users')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should send test notification when test flag is true', async () => {
      const req = createPostRequest(validPayload({ test: true }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)

      expect(sendTestNotification).toHaveBeenCalledWith('test-user-id')
      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should use default icon when not specified', async () => {
      const req = createPostRequest(validPayload())
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          icon: '/icon-192.png',
        })
      )
    })

    it('should use default tag when not specified', async () => {
      const req = createPostRequest(validPayload())
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          tag: 'destinypal',
        })
      )
    })

    it('should use default URL when not specified', async () => {
      const req = createPostRequest(validPayload())
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          data: expect.objectContaining({ url: '/notifications' }),
        })
      )
    })
  })

  // =========================================================================
  // 4. Error Handling for Failed Sends
  // =========================================================================

  describe('Error handling for failed sends', () => {
    it('should return INTERNAL_ERROR when sendPushNotification throws', async () => {
      vi.mocked(sendPushNotification).mockRejectedValue(new Error('VAPID configuration error'))

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Internal server error')
    })

    it('should log error when push notification fails', async () => {
      const testError = new Error('Push service unavailable')
      vi.mocked(sendPushNotification).mockRejectedValue(testError)

      const req = createPostRequest(validPayload())
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        'Error sending push notification:',
        testError
      )
    })

    it('should return INTERNAL_ERROR when sendTestNotification throws', async () => {
      vi.mocked(sendTestNotification).mockRejectedValue(new Error('Test notification failed'))

      const req = createPostRequest(validPayload({ test: true }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle partial send failures gracefully', async () => {
      vi.mocked(sendPushNotification).mockResolvedValue({
        success: true,
        sent: 2,
        failed: 1,
        error: 'Some subscriptions failed',
      })

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(true)
      expect(json.data.sent).toBe(2)
      expect(json.data.failed).toBe(1)
      expect(json.data.error).toBe('Some subscriptions failed')
    })

    it('should return success false when no subscriptions exist', async () => {
      vi.mocked(sendPushNotification).mockResolvedValue({
        success: false,
        sent: 0,
        failed: 0,
        error: 'No active subscriptions',
      })

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(false)
      expect(json.data.error).toBe('No active subscriptions')
    })

    it('should handle VAPID not configured error', async () => {
      vi.mocked(sendPushNotification).mockResolvedValue({
        success: false,
        sent: 0,
        failed: 0,
        error: 'VAPID not configured',
      })

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.success).toBe(false)
      expect(json.data.error).toBe('VAPID not configured')
    })
  })

  // =========================================================================
  // 5. Rate Limiting
  // =========================================================================

  describe('Rate limiting', () => {
    it('should return 429 RATE_LIMITED when rate limit is exceeded', async () => {
      mockRateLimitBlocked = true

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(429)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('RATE_LIMITED')
      expect(json.error.message).toBe('Too many requests. Please wait a moment.')

      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should include rate limit headers in 429 response', async () => {
      mockRateLimitBlocked = true

      const req = createPostRequest(validPayload())
      const res = await POST(req)

      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBe('60')
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
    })

    it('should allow requests when rate limit is not exceeded', async () => {
      // mockRateLimitBlocked is false by default
      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(sendPushNotification).toHaveBeenCalled()
    })
  })

  // =========================================================================
  // Additional Edge Cases
  // =========================================================================

  describe('Additional edge cases', () => {
    it('should trim whitespace from title and message', async () => {
      const req = createPostRequest({
        title: '  Trimmed Title  ',
        message: '  Trimmed Message  ',
      })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          title: 'Trimmed Title',
          message: 'Trimmed Message',
        })
      )
    })

    it('should handle concurrent test and regular notification flags correctly', async () => {
      // When test: true, should use sendTestNotification regardless of other fields
      const req = createPostRequest(
        validPayload({
          test: true,
          targetUserId: 'test-user-id',
        })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      expect(sendTestNotification).toHaveBeenCalledWith('test-user-id')
      expect(sendPushNotification).not.toHaveBeenCalled()
    })

    it('should handle custom icon override correctly', async () => {
      const req = createPostRequest(
        validPayload({
          icon: '/custom/icon.png',
        })
      )
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          icon: '/custom/icon.png',
        })
      )
    })

    it('should handle custom tag override correctly', async () => {
      const req = createPostRequest(
        validPayload({
          tag: 'urgent',
        })
      )
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          tag: 'urgent',
        })
      )
    })

    it('should handle custom url in notification data correctly', async () => {
      const req = createPostRequest(
        validPayload({
          url: '/specific/page/123',
        })
      )
      await POST(req)

      expect(sendPushNotification).toHaveBeenCalledWith(
        'test-user-id',
        expect.objectContaining({
          data: expect.objectContaining({ url: '/specific/page/123' }),
        })
      )
    })

    it('should return all result fields from sendPushNotification', async () => {
      vi.mocked(sendPushNotification).mockResolvedValue({
        success: true,
        sent: 3,
        failed: 1,
        error: 'One device expired',
      })

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual({
        success: true,
        sent: 3,
        failed: 1,
        error: 'One device expired',
      })
    })

    it('should return all result fields from sendTestNotification', async () => {
      vi.mocked(sendTestNotification).mockResolvedValue({
        success: true,
        sent: 1,
        failed: 0,
        error: undefined,
      })

      const req = createPostRequest(validPayload({ test: true }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data).toEqual({
        success: true,
        sent: 1,
        failed: 0,
        error: undefined,
      })
    })
  })
})
