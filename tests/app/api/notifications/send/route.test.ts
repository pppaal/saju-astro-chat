import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockSendNotification = vi.fn()

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: {
          user: { id: 'test-user-id', email: 'test@example.com' },
        },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
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
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    FORBIDDEN: 'FORBIDDEN',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/notifications/sse', () => ({
  sendNotification: mockSendNotification,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────────

function createPostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/notifications/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/notifications/send', {
    method: 'GET',
  })
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    targetUserId: 'test-user-id',
    type: 'system',
    title: 'Hello',
    message: 'Test notification body',
    ...overrides,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('/api/notifications/send', () => {
  let POST: (req: NextRequest) => Promise<Response>
  let GET: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    // Re-import the route handlers so each test starts clean
    const mod = await import('@/app/api/notifications/send/route')
    POST = mod.POST as unknown as (req: NextRequest) => Promise<Response>
    GET = mod.GET as unknown as (req: NextRequest) => Promise<Response>
  })

  // ── POST tests ───────────────────────────────────────────────────────────

  describe('POST', () => {
    it('sends a notification when targetUserId matches the authenticated userId', async () => {
      mockSendNotification.mockResolvedValue(true)

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.sent).toBe(true)
      expect(json.data.message).toBe('Notification sent')

      expect(mockSendNotification).toHaveBeenCalledWith('test-user-id', {
        type: 'system',
        title: 'Hello',
        message: 'Test notification body',
        link: undefined,
        avatar: undefined,
      })
    })

    it('sends a notification when targetUserId matches the authenticated user email', async () => {
      mockSendNotification.mockResolvedValue(true)

      const req = createPostRequest(
        validPayload({ targetUserId: 'test@example.com' })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.sent).toBe(true)
      expect(json.data.message).toBe('Notification sent')

      expect(mockSendNotification).toHaveBeenCalledWith(
        'test@example.com',
        expect.objectContaining({ type: 'system', title: 'Hello' })
      )
    })

    it('returns FORBIDDEN when targetUserId does not match the authenticated user', async () => {
      const req = createPostRequest(
        validPayload({ targetUserId: 'other-user-id' })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(403)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('FORBIDDEN')
      expect(json.error.message).toBe('Cannot send to other users')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when required fields are missing', async () => {
      const req = createPostRequest({ targetUserId: 'test-user-id' })
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')
      expect(json.error.message).toContain('Validation failed')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR for invalid notification type', async () => {
      const req = createPostRequest(
        validPayload({ type: 'invalid_type' })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when title exceeds max length', async () => {
      const req = createPostRequest(
        validPayload({ title: 'x'.repeat(201) })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when message exceeds max length', async () => {
      const req = createPostRequest(
        validPayload({ message: 'x'.repeat(1001) })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('indicates user not connected when sendNotification returns false', async () => {
      mockSendNotification.mockResolvedValue(false)

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.sent).toBe(false)
      expect(json.data.message).toBe(
        'User not connected to notification stream'
      )
    })

    it('returns INTERNAL_ERROR when sendNotification throws', async () => {
      mockSendNotification.mockRejectedValue(new Error('Redis connection lost'))

      const req = createPostRequest(validPayload())
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Failed to send notification')
    })

    it('passes optional link and avatar to sendNotification', async () => {
      mockSendNotification.mockResolvedValue(true)

      const req = createPostRequest(
        validPayload({
          link: '/profile/123',
          avatar: 'https://cdn.example.com/avatar.png',
        })
      )
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)

      expect(mockSendNotification).toHaveBeenCalledWith('test-user-id', {
        type: 'system',
        title: 'Hello',
        message: 'Test notification body',
        link: '/profile/123',
        avatar: 'https://cdn.example.com/avatar.png',
      })
    })

    it('accepts all valid notification types', async () => {
      const validTypes = ['like', 'comment', 'reply', 'mention', 'system']
      mockSendNotification.mockResolvedValue(true)

      for (const type of validTypes) {
        vi.clearAllMocks()
        mockSendNotification.mockResolvedValue(true)

        const req = createPostRequest(validPayload({ type }))
        const res = await POST(req)
        const json = await res.json()

        expect(res.status).toBe(200)
        expect(json.success).toBe(true)
        expect(mockSendNotification).toHaveBeenCalledWith(
          'test-user-id',
          expect.objectContaining({ type })
        )
      }
    })

    it('returns VALIDATION_ERROR when targetUserId is empty', async () => {
      const req = createPostRequest(validPayload({ targetUserId: '' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })

    it('returns VALIDATION_ERROR when title is empty', async () => {
      const req = createPostRequest(validPayload({ title: '' }))
      const res = await POST(req)
      const json = await res.json()

      expect(res.status).toBe(422)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('VALIDATION_ERROR')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })
  })

  // ── GET tests ────────────────────────────────────────────────────────────

  describe('GET', () => {
    it('sends a test system notification to the user email', async () => {
      mockSendNotification.mockResolvedValue(true)

      const req = createGetRequest()
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.sent).toBe(true)
      expect(json.data.message).toBe('Test notification sent')

      expect(mockSendNotification).toHaveBeenCalledWith('test@example.com', {
        type: 'system',
        title: 'Test Notification',
        message: 'This is a test notification from the system',
        link: '/notifications',
      })
    })

    it('indicates user not connected when sendNotification returns false', async () => {
      mockSendNotification.mockResolvedValue(false)

      const req = createGetRequest()
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      expect(json.data.sent).toBe(false)
      expect(json.data.message).toBe('You are not connected to SSE')
    })

    it('returns INTERNAL_ERROR when sendNotification throws', async () => {
      mockSendNotification.mockRejectedValue(new Error('Unexpected failure'))

      const req = createGetRequest()
      const res = await GET(req)
      const json = await res.json()

      expect(res.status).toBe(500)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('INTERNAL_ERROR')
      expect(json.error.message).toBe('Failed to send test notification')
    })
  })

  // ── GET without email (middleware override) ──────────────────────────────

  describe('GET - no email in session', () => {
    it('returns UNAUTHORIZED when session has no email', async () => {
      // Override the middleware mock to provide a session without an email
      const { withApiMiddleware } = await import('@/lib/api/middleware')
      const mockMiddleware = vi.mocked(withApiMiddleware)

      // Temporarily replace the implementation for this test
      mockMiddleware.mockImplementationOnce((handler: any, _options: any) => {
        return async (req: any) => {
          const context = {
            userId: 'test-user-id',
            session: { user: { id: 'test-user-id' } },
            ip: '127.0.0.1',
            locale: 'ko',
            isAuthenticated: true,
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
      })

      // Re-import to pick up the new mock implementation
      vi.resetModules()
      // Re-apply the notification mock since resetModules clears it
      vi.doMock('@/lib/notifications/sse', () => ({
        sendNotification: mockSendNotification,
      }))
      vi.doMock('@/lib/logger', () => ({
        logger: {
          info: vi.fn(),
          warn: vi.fn(),
          error: vi.fn(),
          debug: vi.fn(),
        },
      }))
      vi.doMock('@/lib/api/middleware', () => ({
        withApiMiddleware: vi.fn((handler: any, _options: any) => {
          return async (req: any) => {
            const context = {
              userId: 'test-user-id',
              session: { user: { id: 'test-user-id' } }, // no email
              ip: '127.0.0.1',
              locale: 'ko',
              isAuthenticated: true,
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
        createAuthenticatedGuard: vi.fn(() => ({})),
        apiSuccess: vi.fn((data: any) => ({ data })),
        apiError: vi.fn((code: string, message?: string) => ({
          error: { code, message },
        })),
        ErrorCodes: {
          VALIDATION_ERROR: 'VALIDATION_ERROR',
          FORBIDDEN: 'FORBIDDEN',
          UNAUTHORIZED: 'UNAUTHORIZED',
          INTERNAL_ERROR: 'INTERNAL_ERROR',
        },
      }))

      const noEmailMod = await import('@/app/api/notifications/send/route')
      const GET_noEmail = noEmailMod.GET as unknown as (
        req: NextRequest
      ) => Promise<Response>

      const req = createGetRequest()
      const res = await GET_noEmail(req)
      const json = await res.json()

      expect(res.status).toBe(401)
      expect(json.success).toBe(false)
      expect(json.error.code).toBe('UNAUTHORIZED')
      expect(json.error.message).toBe('Email not available')

      expect(mockSendNotification).not.toHaveBeenCalled()
    })
  })
})
