/**
 * Regression: 410-Gone subscription leak (B3).
 *
 * When FCM/APNs returns 410 (expired/revoked) or 404, the old handler
 * only flipped `isActive: false`. The row persisted forever, and if
 * the browser ever re-enrolled with the same endpoint string, the
 * unique index on PushSubscription.endpoint blocked the new subscribe.
 *
 * Fix: delete the row outright on 410/404. Wrap in try/catch P2025 for
 * idempotency (another concurrent send may have already deleted it).
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

const mockSendNotification = vi.fn()
const mockSetVapidDetails = vi.fn()
vi.mock('web-push', () => ({
  default: {
    sendNotification: mockSendNotification,
    setVapidDetails: mockSetVapidDetails,
  },
}))

const mockPushSubscription = {
  findMany: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pushSubscription: mockPushSubscription,
  },
}))

describe('sendPushNotification — B3 410-Gone deletion', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
      VAPID_SUBJECT: 'mailto:test@example.com',
    }
  })

  it('deletes the subscription row on 410 Gone', async () => {
    mockPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/sub1',
        p256dh: 'key1',
        auth: 'auth1',
        failCount: 0,
      },
    ])
    const err = new Error('Gone') as Error & { statusCode?: number }
    err.statusCode = 410
    mockSendNotification.mockRejectedValueOnce(err)
    mockPushSubscription.delete.mockResolvedValueOnce({})

    const { sendPushNotification } = await import('@/lib/notifications/pushService')
    const result = await sendPushNotification('user-123', {
      title: 'Test',
      message: 'Test body',
    })

    expect(result.sent).toBe(0)
    expect(result.failed).toBe(1)
    expect(mockPushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
    })
    // No flag-only update — the row must be GONE.
    expect(mockPushSubscription.update).not.toHaveBeenCalled()
  })

  it('deletes the subscription row on 404 Not Found', async () => {
    mockPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-2',
        endpoint: 'https://push.example.com/sub2',
        p256dh: 'key2',
        auth: 'auth2',
        failCount: 0,
      },
    ])
    const err = new Error('Not Found') as Error & { statusCode?: number }
    err.statusCode = 404
    mockSendNotification.mockRejectedValueOnce(err)
    mockPushSubscription.delete.mockResolvedValueOnce({})

    const { sendPushNotification } = await import('@/lib/notifications/pushService')
    await sendPushNotification('user-123', { title: 'T', message: 'M' })

    expect(mockPushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-2' },
    })
    expect(mockPushSubscription.update).not.toHaveBeenCalled()
  })

  it('idempotently swallows P2025 if the row was already deleted', async () => {
    mockPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-3',
        endpoint: 'https://push.example.com/sub3',
        p256dh: 'key3',
        auth: 'auth3',
        failCount: 0,
      },
    ])
    const sendErr = new Error('Gone') as Error & { statusCode?: number }
    sendErr.statusCode = 410
    mockSendNotification.mockRejectedValueOnce(sendErr)

    const notFound = new Error('Record not found') as Error & { code?: string }
    notFound.code = 'P2025'
    mockPushSubscription.delete.mockRejectedValueOnce(notFound)

    const { sendPushNotification } = await import('@/lib/notifications/pushService')
    const result = await sendPushNotification('user-123', { title: 'T', message: 'M' })

    // No throw, normal failure accounting.
    expect(result.failed).toBe(1)
    expect(mockPushSubscription.delete).toHaveBeenCalled()
  })

  it('non-410/404 errors still bump failCount via update (unchanged behavior)', async () => {
    mockPushSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-4',
        endpoint: 'https://push.example.com/sub4',
        p256dh: 'key4',
        auth: 'auth4',
        failCount: 2,
      },
    ])
    mockSendNotification.mockRejectedValueOnce(new Error('Network error'))
    mockPushSubscription.update.mockResolvedValueOnce({})

    const { sendPushNotification } = await import('@/lib/notifications/pushService')
    await sendPushNotification('user-123', { title: 'T', message: 'M' })

    expect(mockPushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-4' },
      data: { failCount: 3, isActive: true },
    })
    expect(mockPushSubscription.delete).not.toHaveBeenCalled()
  })
})
