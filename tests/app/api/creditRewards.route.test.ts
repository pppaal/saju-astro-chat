/**
 * Tests for /api/me/credit-rewards — 자동 지급 보너스(미확인) 조회 + acknowledge.
 *
 * 커버:
 *  - GET: 인증 없으면 401 / rewards 반환 / acknowledgedAt 컬럼 없음(P2022) graceful /
 *         메시지 패턴 fallback / 기타 DB 오류는 throw → 500
 *  - POST: 잘못된 JSON / ids 검증 / 빈 배열 / 50개 초과 / 정상 updateMany /
 *          컬럼 없음 graceful
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
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
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    bonusCreditPurchase: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET, POST } from '@/app/api/me/credit-rewards/route'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

function getReq() {
  return new NextRequest('http://localhost:3000/api/me/credit-rewards')
}
function postReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/me/credit-rewards', {
    method: 'POST',
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_123'
})

describe('GET /api/me/credit-rewards', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('미확인 rewards 를 반환', async () => {
    const rewards = [{ id: 'b1', amount: 5, source: 'referral', createdAt: new Date() }]
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockResolvedValue(rewards as any)

    const res = await GET(getReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.rewards).toHaveLength(1)
    expect(data.data.rewards[0].source).toBe('referral')
    // where 에 source != purchase, acknowledgedAt null, userId 강제 확인.
    const arg = vi.mocked(prisma.bonusCreditPurchase.findMany).mock.calls[0][0] as any
    expect(arg.where.userId).toBe('user_123')
    expect(arg.where.acknowledgedAt).toBeNull()
    expect(arg.where.source).toEqual({ not: 'purchase' })
  })

  it('acknowledgedAt 컬럼 없음(P2022)이면 빈 배열로 graceful', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('column missing', {
      code: 'P2022',
      clientVersion: '7.0.0',
    })
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(err)

    const res = await GET(getReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.rewards).toEqual([])
  })

  it('메시지 패턴(column ... does not exist + acknowledged)으로도 graceful', async () => {
    const err = new Error('column "acknowledgedAt" does not exist')
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(err)

    const res = await GET(getReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.rewards).toEqual([])
  })

  it('관련 없는 DB 오류는 throw → 500', async () => {
    vi.mocked(prisma.bonusCreditPurchase.findMany).mockRejectedValue(new Error('boom'))
    const res = await GET(getReq())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/me/credit-rewards', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await POST(postReq({ ids: ['a'] }))
    expect(res.status).toBe(401)
  })

  it('잘못된 JSON 이면 422 VALIDATION_ERROR', async () => {
    const res = await POST(postReq('{not json', true))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('ids 가 배열이 아니면 422', async () => {
    const res = await POST(postReq({ ids: 'nope' }))
    expect(res.status).toBe(422)
  })

  it('ids 에 문자열 아닌 값이 섞이면 422', async () => {
    const res = await POST(postReq({ ids: ['a', 1] }))
    expect(res.status).toBe(422)
  })

  it('ids 가 빈 배열이면 acknowledged:0 (DB 미접근)', async () => {
    const res = await POST(postReq({ ids: [] }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.acknowledged).toBe(0)
    expect(prisma.bonusCreditPurchase.updateMany).not.toHaveBeenCalled()
  })

  it('ids 50개 초과면 422', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id${i}`)
    const res = await POST(postReq({ ids }))
    expect(res.status).toBe(422)
  })

  it('정상 acknowledge → updateMany count 반환, userId 강제', async () => {
    vi.mocked(prisma.bonusCreditPurchase.updateMany).mockResolvedValue({ count: 2 } as any)

    const res = await POST(postReq({ ids: ['a', 'b'] }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.acknowledged).toBe(2)
    const arg = vi.mocked(prisma.bonusCreditPurchase.updateMany).mock.calls[0][0] as any
    expect(arg.where.userId).toBe('user_123')
    expect(arg.where.id).toEqual({ in: ['a', 'b'] })
    expect(arg.where.acknowledgedAt).toBeNull()
  })

  it('컬럼 없음(P2022)이면 acknowledged:0 graceful', async () => {
    const err = new Prisma.PrismaClientKnownRequestError('column missing', {
      code: 'P2022',
      clientVersion: '7.0.0',
    })
    vi.mocked(prisma.bonusCreditPurchase.updateMany).mockRejectedValue(err)

    const res = await POST(postReq({ ids: ['a'] }))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.acknowledged).toBe(0)
  })

  it('관련 없는 DB 오류는 throw → 500', async () => {
    vi.mocked(prisma.bonusCreditPurchase.updateMany).mockRejectedValue(new Error('boom'))
    const res = await POST(postReq({ ids: ['a'] }))
    expect(res.status).toBe(500)
  })
})
