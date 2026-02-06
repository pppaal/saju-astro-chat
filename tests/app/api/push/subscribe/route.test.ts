import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
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
        const statusMap: Record<string, number> = { VALIDATION_ERROR: 422 }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  parseJsonBody: vi.fn(async (req: any) => req.json()),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: { VALIDATION_ERROR: 'VALIDATION_ERROR' },
}))

vi.mock('@/lib/notifications/pushService', () => ({
  savePushSubscription: vi.fn(),
  removePushSubscription: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  pushSubscribeSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data?.endpoint || !data?.keys?.p256dh || !data?.keys?.auth)
        return {
          success: false,
          error: {
            issues: [{ message: 'Invalid subscription', path: ['endpoint'] }],
          },
        }
      return { success: true, data }
    }),
  },
  pushUnsubscribeSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data?.endpoint)
        return {
          success: false,
          error: { issues: [{ message: 'Endpoint required' }] },
        }
      return { success: true, data }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST, DELETE } from '@/app/api/push/subscribe/route'
import { savePushSubscription, removePushSubscription } from '@/lib/notifications/pushService'
import { logger } from '@/lib/logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPostRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): NextRequest {
  return new NextRequest('http://localhost:3000/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

function createDeleteRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/push/subscribe', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const VALID_SUBSCRIPTION = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfWRk',
    auth: 'tBHItJI5svbpC7htGd2dGA',
  },
}

// ---------------------------------------------------------------------------
// Tests -- POST /api/push/subscribe
// ---------------------------------------------------------------------------

describe('POST /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(savePushSubscription).mockResolvedValue(undefined as any)
  })

  it('should save a valid push subscription and return success', async () => {
    const req = createPostRequest(VALID_SUBSCRIPTION)
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      success: true,
      message: 'Subscription saved successfully',
    })

    expect(savePushSubscription).toHaveBeenCalledOnce()
  })

  it('should return validation error when subscription body is invalid', async () => {
    const req = createPostRequest({ endpoint: '' })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toBe('Invalid subscription')
    expect(json.error.details).toBeDefined()

    expect(savePushSubscription).not.toHaveBeenCalled()
  })

  it('should capture and forward the user-agent header', async () => {
    const userAgent = 'Mozilla/5.0 (Linux; Android 12) Chrome/100.0'
    const req = createPostRequest(VALID_SUBSCRIPTION, { 'user-agent': userAgent })
    await POST(req)

    expect(savePushSubscription).toHaveBeenCalledWith(
      'test-user-id',
      {
        endpoint: VALID_SUBSCRIPTION.endpoint,
        keys: {
          p256dh: VALID_SUBSCRIPTION.keys.p256dh,
          auth: VALID_SUBSCRIPTION.keys.auth,
        },
      },
      userAgent
    )
  })

  it('should pass the authenticated userId from context', async () => {
    const req = createPostRequest(VALID_SUBSCRIPTION)
    await POST(req)

    // First argument must be the userId from the middleware context
    const callArgs = vi.mocked(savePushSubscription).mock.calls[0]
    expect(callArgs[0]).toBe('test-user-id')
    expect(callArgs[1]).toEqual(
      expect.objectContaining({ endpoint: VALID_SUBSCRIPTION.endpoint })
    )
  })

  it('should pass undefined as userAgent when header is absent', async () => {
    // NextRequest without an explicit user-agent header
    const req = new NextRequest('http://localhost:3000/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(VALID_SUBSCRIPTION),
    })
    await POST(req)

    expect(savePushSubscription).toHaveBeenCalledWith(
      'test-user-id',
      expect.objectContaining({ endpoint: VALID_SUBSCRIPTION.endpoint }),
      undefined
    )
  })

  it('should return validation error when keys are missing', async () => {
    const req = createPostRequest({
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
      // keys object is entirely absent
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')

    expect(savePushSubscription).not.toHaveBeenCalled()
  })

  it('should propagate error when savePushSubscription throws', async () => {
    vi.mocked(savePushSubscription).mockRejectedValue(new Error('DB write failed'))

    const req = createPostRequest(VALID_SUBSCRIPTION)
    await expect(POST(req)).rejects.toThrow('DB write failed')
  })

  it('should log a warning when validation fails', async () => {
    const req = createPostRequest({ endpoint: '' })
    await POST(req)

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Push subscribe] validation failed'),
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })
})

// ---------------------------------------------------------------------------
// Tests -- DELETE /api/push/subscribe
// ---------------------------------------------------------------------------

describe('DELETE /api/push/subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(removePushSubscription).mockResolvedValue(undefined as any)
  })

  it('should remove a subscription by endpoint and return success', async () => {
    const req = createDeleteRequest({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc123' })
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data).toEqual({
      success: true,
      message: 'Subscription removed successfully',
    })

    expect(removePushSubscription).toHaveBeenCalledOnce()
  })

  it('should return validation error when endpoint is missing', async () => {
    const req = createDeleteRequest({})
    const res = await DELETE(req)
    const json = await res.json()

    expect(res.status).toBe(422)
    expect(json.success).toBe(false)
    expect(json.error.code).toBe('VALIDATION_ERROR')
    expect(json.error.message).toBe('Endpoint required')

    expect(removePushSubscription).not.toHaveBeenCalled()
  })

  it('should call removePushSubscription with the exact endpoint value', async () => {
    const endpoint = 'https://updates.push.services.mozilla.com/wpush/v2/some-token'
    const req = createDeleteRequest({ endpoint })
    await DELETE(req)

    expect(removePushSubscription).toHaveBeenCalledWith(endpoint)
  })

  it('should propagate error when removePushSubscription throws', async () => {
    vi.mocked(removePushSubscription).mockRejectedValue(new Error('DB delete failed'))

    const req = createDeleteRequest({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc123' })
    await expect(DELETE(req)).rejects.toThrow('DB delete failed')
  })
})
