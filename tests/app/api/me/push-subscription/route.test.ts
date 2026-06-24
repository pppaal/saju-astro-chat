/**
 * /api/me/push-subscription — 구독 등록(upsert)/해제 라우트 테스트.
 * middleware 는 passthrough mock (인증 분기는 세션 mock 으로 검증).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mock middleware as passthrough - must be before route import
// ---------------------------------------------------------------------------
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('@/lib/auth/session')
      const session: any = await (getServerSession as any)()

      if (!session?.user) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'not_authenticated' } },
          { status: 401 }
        )
      }

      const context = {
        userId: session.user.id,
        session,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }

      const result = await handler(req, context, ...args)
      if (result instanceof Response) return result

      if (result.error) {
        const statusMap: Record<string, number> = {
          VALIDATION_ERROR: 422,
          NOT_FOUND: 404,
          INTERNAL_ERROR: 500,
        }
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: statusMap[result.error.code] || 500 }
        )
      }

      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string, details?: any) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pushSubscription: {
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { POST, DELETE } from '@/app/api/me/push-subscription/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

const VALID_BODY = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
  locale: 'ko',
}

function makeRequest(method: 'POST' | 'DELETE', body?: unknown) {
  return new NextRequest('http://localhost:3000/api/me/push-subscription', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function mockSession(userId = 'user-1') {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as any)
}

describe('/api/me/push-subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST (subscribe)', () => {
    it('미인증이면 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null as any)
      const res = await POST(makeRequest('POST', VALID_BODY))
      expect(res.status).toBe(401)
      expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled()
    })

    it('유효한 구독을 endpoint 기준 upsert 하고 성공 응답', async () => {
      mockSession('user-1')
      vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue({
        id: 'sub-1',
        locale: 'ko',
        createdAt: new Date(),
      } as any)

      const res = await POST(makeRequest('POST', VALID_BODY))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.subscribed).toBe(true)
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { endpoint: VALID_BODY.endpoint },
          create: expect.objectContaining({
            userId: 'user-1',
            endpoint: VALID_BODY.endpoint,
            p256dh: 'p256dh-key',
            auth: 'auth-key',
            locale: 'ko',
          }),
          update: expect.objectContaining({
            userId: 'user-1',
            p256dh: 'p256dh-key',
            auth: 'auth-key',
            failCount: 0,
          }),
        })
      )
    })

    it('locale 생략 시 ko 기본값', async () => {
      mockSession()
      vi.mocked(prisma.pushSubscription.upsert).mockResolvedValue({
        id: 'sub-1',
        locale: 'ko',
        createdAt: new Date(),
      } as any)

      const { locale: _omit, ...withoutLocale } = VALID_BODY
      const res = await POST(makeRequest('POST', withoutLocale))
      expect(res.status).toBe(200)
      expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ locale: 'ko' }) })
      )
    })

    it('http endpoint / 잘못된 locale / 키 누락은 VALIDATION_ERROR', async () => {
      mockSession()
      const badBodies = [
        { ...VALID_BODY, endpoint: 'http://insecure.example.com/push' },
        { ...VALID_BODY, locale: 'fr' },
        { endpoint: VALID_BODY.endpoint, keys: { p256dh: 'x' } },
        { ...VALID_BODY, endpoint: `https://example.com/${'a'.repeat(1001)}` },
        // SSRF 방어 — 알려지지 않은 호스트(내부/임의 도메인)는 거부.
        { ...VALID_BODY, endpoint: 'https://169.254.169.254/latest/meta-data' },
        { ...VALID_BODY, endpoint: 'https://internal.example.com/push' },
        // lookalike 도메인(allowlist suffix 의 선행 '.' 로 차단).
        { ...VALID_BODY, endpoint: 'https://evil-googleapis.com/fcm/send/x' },
      ]
      for (const body of badBodies) {
        const res = await POST(makeRequest('POST', body))
        expect(res.status).toBe(422)
      }
      expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled()
    })

    it('JSON 파싱 실패는 VALIDATION_ERROR', async () => {
      mockSession()
      const req = new NextRequest('http://localhost:3000/api/me/push-subscription', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json{',
      })
      const res = await POST(req)
      expect(res.status).toBe(422)
    })
  })

  describe('DELETE (unsubscribe)', () => {
    it('미인증이면 401', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null as any)
      const res = await DELETE(makeRequest('DELETE', { endpoint: VALID_BODY.endpoint }))
      expect(res.status).toBe(401)
    })

    it('본인 구독만 삭제한다 (where 에 userId 포함)', async () => {
      mockSession('user-1')
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 1 } as any)

      const res = await DELETE(makeRequest('DELETE', { endpoint: VALID_BODY.endpoint }))
      const json = await res.json()

      expect(res.status).toBe(200)
      expect(json.data.unsubscribed).toBe(true)
      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: { endpoint: VALID_BODY.endpoint, userId: 'user-1' },
      })
    })

    it('타인 endpoint 면 count 0 → unsubscribed:false (정보 노출 없음)', async () => {
      mockSession('user-2')
      vi.mocked(prisma.pushSubscription.deleteMany).mockResolvedValue({ count: 0 } as any)

      const res = await DELETE(makeRequest('DELETE', { endpoint: VALID_BODY.endpoint }))
      const json = await res.json()
      expect(res.status).toBe(200)
      expect(json.data.unsubscribed).toBe(false)
    })

    it('endpoint 누락은 VALIDATION_ERROR', async () => {
      mockSession()
      const res = await DELETE(makeRequest('DELETE', {}))
      expect(res.status).toBe(422)
      expect(prisma.pushSubscription.deleteMany).not.toHaveBeenCalled()
    })
  })
})
