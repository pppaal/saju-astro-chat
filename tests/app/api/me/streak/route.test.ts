/**
 * /api/me/streak — 방문 스트릭 체크인 라우트 테스트.
 * middleware 는 passthrough mock (push-subscription 테스트와 동일 패턴).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

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
        return NextResponse.json(
          { success: false, error: { code: result.error.code, message: result.error.message } },
          { status: result.error.code === 'VALIDATION_ERROR' ? 422 : 500 }
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
    visitStreak: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/me/streak/route'
import { getServerSession } from '@/lib/auth/session'
import { prisma } from '@/lib/db/prisma'

/** 오늘(UTC) 'YYYY-MM-DD' — 서버 ±2일 상한 안에 안전하게 든다. */
const TODAY = new Date().toISOString().slice(0, 10)
/** 어제(UTC). */
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

function makeRequest(body?: unknown) {
  return new NextRequest('http://localhost:3000/api/me/streak', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function mockSession(userId = 'user-1') {
  vi.mocked(getServerSession).mockResolvedValue({ user: { id: userId } } as any)
}

describe('/api/me/streak POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('미인증이면 401 (DB 미접근)', async () => {
    vi.mocked(getServerSession).mockResolvedValue(null as any)
    const res = await POST(makeRequest({ today: TODAY }))
    expect(res.status).toBe(401)
    expect(prisma.visitStreak.upsert).not.toHaveBeenCalled()
  })

  it('형식 불량 today 는 422', async () => {
    mockSession()
    const res = await POST(makeRequest({ today: '2026/07/04' }))
    expect(res.status).toBe(422)
    expect(prisma.visitStreak.upsert).not.toHaveBeenCalled()
  })

  it('서버 날짜 ±2일 밖(조작)은 422', async () => {
    mockSession()
    const res = await POST(makeRequest({ today: '2000-01-01' }))
    expect(res.status).toBe(422)
    expect(prisma.visitStreak.upsert).not.toHaveBeenCalled()
  })

  it('첫 체크인 — count 1 로 생성', async () => {
    mockSession('user-1')
    vi.mocked(prisma.visitStreak.findUnique).mockResolvedValue(null as any)
    vi.mocked(prisma.visitStreak.upsert).mockResolvedValue({ count: 1, longest: 1 } as any)

    const res = await POST(makeRequest({ today: TODAY }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.count).toBe(1)
    expect(prisma.visitStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({ userId: 'user-1', last: TODAY, count: 1, longest: 1 }),
      })
    )
  })

  it('어제에 이어 체크인 — count +1, longest 갱신', async () => {
    mockSession('user-1')
    vi.mocked(prisma.visitStreak.findUnique).mockResolvedValue({
      userId: 'user-1',
      last: YESTERDAY,
      count: 4,
      longest: 4,
    } as any)
    vi.mocked(prisma.visitStreak.upsert).mockResolvedValue({ count: 5, longest: 5 } as any)

    const res = await POST(makeRequest({ today: TODAY }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ count: 5, longest: 5 })
    expect(prisma.visitStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ last: TODAY, count: 5, longest: 5 }),
      })
    )
  })

  it('같은 날 재호출은 count 유지(멱등)', async () => {
    mockSession('user-1')
    vi.mocked(prisma.visitStreak.findUnique).mockResolvedValue({
      userId: 'user-1',
      last: TODAY,
      count: 3,
      longest: 7,
    } as any)
    vi.mocked(prisma.visitStreak.upsert).mockResolvedValue({ count: 3, longest: 7 } as any)

    const res = await POST(makeRequest({ today: TODAY }))
    expect(res.status).toBe(200)
    expect(prisma.visitStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ count: 3, longest: 7 }),
      })
    )
  })

  it('공백 후 체크인 — 1 로 리셋하되 longest 는 보존', async () => {
    mockSession('user-1')
    vi.mocked(prisma.visitStreak.findUnique).mockResolvedValue({
      userId: 'user-1',
      last: '2026-01-01',
      count: 9,
      longest: 9,
    } as any)
    vi.mocked(prisma.visitStreak.upsert).mockResolvedValue({ count: 1, longest: 9 } as any)

    const res = await POST(makeRequest({ today: TODAY }))
    expect(res.status).toBe(200)
    expect(prisma.visitStreak.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ count: 1, longest: 9 }),
      })
    )
  })
})
