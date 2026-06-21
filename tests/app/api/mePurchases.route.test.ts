/**
 * Tests for /api/me/purchases — 최근 BonusCreditPurchase(크레딧 팩/보상) 조회.
 *
 * 커버:
 *  - 인증 없으면 401
 *  - purchases 반환 (take:30, userId 강제, orderBy desc)
 *  - 컬럼 없음(P2022 / 메시지 패턴)이면 빈 배열 graceful
 *  - 기타 DB 오류는 500 INTERNAL_ERROR
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  INTERNAL_ERROR: 500,
  UNAUTHORIZED: 401,
}

const ctxOverride: { userId: string | null } = { userId: 'user_123' }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      if (!ctxOverride.userId) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', status: 401 } },
          { status: 401 }
        )
      }
      const context = {
        userId: ctxOverride.userId,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      }
      try {
        const result = await handler(req, context, ...args)
        if (result instanceof Response) return result
        if (result?.error) {
          const status = STATUS_MAP[result.error.code] || 500
          return NextResponse.json(
            { success: false, error: { ...result.error, status } },
            { status }
          )
        }
        return NextResponse.json(
          { success: true, data: result.data },
          { status: result.status || 200 }
        )
      } catch {
        return NextResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', status: 500 } },
          { status: 500 }
        )
      }
    }
  }),
  createAuthenticatedGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET } from '@/app/api/me/purchases/route'
import { prisma } from '@/lib/db/prisma'

function getReq() {
  return new NextRequest('http://localhost:3000/api/me/purchases')
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_123'
})

describe('GET /api/me/purchases', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('purchases 반환, userId 강제 + take:30 + desc', async () => {
    const purchases = [
      {
        id: 'p1',
        createdAt: new Date(),
        amount: 40,
        remaining: 40,
        expiresAt: null,
        expired: false,
        source: 'purchase',
      },
    ]
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue(purchases as any)

    const res = await GET(getReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.purchases).toHaveLength(1)
    expect(data.data.purchases[0].source).toBe('purchase')
    const arg = vi.mocked(prisma.bonusCreditPurchase.findMany).mock.calls[0][0] as any
    expect(arg.where.userId).toBe('user_123')
    expect(arg.take).toBe(30)
    expect(arg.orderBy).toEqual({ createdAt: 'desc' })
  })

  it('빈 결과도 정상 반환', async () => {
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue([] as any)
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.purchases).toEqual([])
  })

  it('컬럼 없음(P2022 code)이면 빈 배열 graceful', async () => {
    const err = new Error('missing') as Error & { code?: string }
    err.code = 'P2022'
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(err)

    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.purchases).toEqual([])
  })

  it('컬럼 없음(메시지 패턴)이면 빈 배열 graceful', async () => {
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(
      new Error('column "remaining" does not exist')
    )
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.purchases).toEqual([])
  })

  it('기타 DB 오류는 500 INTERNAL_ERROR', async () => {
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(new Error('boom'))
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})
