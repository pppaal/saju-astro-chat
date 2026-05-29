/**
 * GET /api/me/credits/history 회귀 가드.
 *
 * - 인증된 사용자: 최근 50 건의 CreditTransaction 을 createdAt DESC 로 반환.
 * - 응답에 sourceRef / metadata 가 노출되지 않아야 한다 (PII / 보안).
 * - 미인증: 401.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: unknown) => {
    return async (req: unknown) => {
      const { getServerSession } = await import('next-auth')
      const session = (await (getServerSession as unknown as () => Promise<unknown>)()) as
        | { user?: { id?: string } }
        | null
      if (!session?.user?.id) {
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
      const result = await (handler as (r: unknown, c: unknown) => Promise<unknown>)(req, context)
      if (result instanceof Response) return result
      const r = result as {
        data?: unknown
        error?: { code: string; message?: string }
        status?: number
      }
      if (r.error) {
        return NextResponse.json(
          { success: false, error: r.error },
          { status: r.error.code === 'UNAUTHORIZED' ? 401 : 500 }
        )
      }
      return NextResponse.json({ success: true, data: r.data }, { status: r.status ?? 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: unknown) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('next-auth', () => ({ getServerSession: vi.fn() }))
vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

const findManyMock = vi.fn()
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    creditTransaction: { findMany: findManyMock },
  },
}))

describe('GET /api/me/credits/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const { getServerSession } = await import('next-auth')
    ;(getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const { GET } = await import('@/app/api/me/credits/history/route')
    const req = new NextRequest('http://localhost/api/me/credits/history')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('returns the last 50 transactions ordered DESC for the authenticated user', async () => {
    const { getServerSession } = await import('next-auth')
    ;(getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user_h1' },
    })

    findManyMock.mockResolvedValue([
      {
        id: 'ctx_1',
        type: 'CONSUME',
        pool: 'BONUS',
        amount: -1,
        reason: 'consume_reading',
        createdAt: new Date('2026-05-29T10:00:00Z'),
      },
      {
        id: 'ctx_0',
        type: 'GRANT',
        pool: 'BONUS',
        amount: 10,
        reason: 'grant_purchase',
        createdAt: new Date('2026-05-28T10:00:00Z'),
      },
    ])

    const { GET } = await import('@/app/api/me/credits/history/route')
    const req = new NextRequest('http://localhost/api/me/credits/history')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.data.transactions).toHaveLength(2)
    expect(body.data.transactions[0].id).toBe('ctx_1')
    expect(body.data.transactions[0].amount).toBe(-1)
  })

  it('does not expose sourceRef or metadata in response', async () => {
    const { getServerSession } = await import('next-auth')
    ;(getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user_h2' },
    })

    findManyMock.mockResolvedValue([
      {
        id: 'ctx_only',
        type: 'GRANT',
        pool: 'BONUS',
        amount: 5,
        reason: 'grant_purchase',
        createdAt: new Date(),
      },
    ])

    const { GET } = await import('@/app/api/me/credits/history/route')
    const req = new NextRequest('http://localhost/api/me/credits/history')
    const res = await GET(req)
    const body = await res.json()
    const row = body.data.transactions[0]
    expect(row).not.toHaveProperty('sourceRef')
    expect(row).not.toHaveProperty('metadata')

    // 또한 prisma select 자체에 sourceRef / metadata 가 없어야 한다 (방어층).
    const selectArg = findManyMock.mock.calls[0][0].select
    expect(selectArg).not.toHaveProperty('sourceRef')
    expect(selectArg).not.toHaveProperty('metadata')
  })

  it('queries by authenticated userId and limits to 50, ordered DESC', async () => {
    const { getServerSession } = await import('next-auth')
    ;(getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: 'user_h3' },
    })

    findManyMock.mockResolvedValue([])

    const { GET } = await import('@/app/api/me/credits/history/route')
    const req = new NextRequest('http://localhost/api/me/credits/history')
    await GET(req)
    const args = findManyMock.mock.calls[0][0]
    expect(args.where).toEqual({ userId: 'user_h3' })
    expect(args.take).toBe(50)
    expect(args.orderBy).toEqual({ createdAt: 'desc' })
  })
})
