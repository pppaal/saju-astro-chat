/**
 * B1 회귀 테스트 — 커플 타로 보너스 차감이 BonusCreditPurchase.remaining 도
 * 함께 줄이는지 검증.
 *
 * 이전 버그: 라우트가 `tx.userCredits.update({ bonusCredits: { decrement: 1 }})`
 * 만 호출하고 `BonusCreditPurchase.remaining` 은 손대지 않아 시스템 invariant
 * (sum(remaining where !expired) == UserCredits.bonusCredits) 가 매번 깨졌다.
 * 다음 차례에 consumeBonusCreditsFromPurchasesInTx 가 도는 순간 remaining 합이
 * 실제 보너스보다 많아 over-grant 가 발생.
 *
 * fix: consumeBonusCreditOnceInTx 헬퍼로 두 테이블을 같은 트랜잭션 안에서
 * atomic 하게 함께 줄임.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() =>
    Promise.resolve({
      user: { name: 'Test User', email: 'test@example.com', id: 'user-123' },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
  ),
}))

vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), delete: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    userCredits: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    matchConnection: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    bonusCreditPurchase: { findFirst: vi.fn(), updateMany: vi.fn() },
    // CreditTransaction (CONSUME/BONUS|COMPATIBILITY) audit row.
    creditTransaction: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ allowed: true, remaining: 10, headers: new Headers() }),
}))

vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn().mockReturnValue('127.0.0.1') }))

vi.mock('@/lib/notifications/pushService', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/api/zodValidation', () => ({
  coupleTarotReadingPostSchema: {
    safeParse: vi.fn((data: any) => ({ success: true, data })),
  },
  coupleTarotReadingDeleteSchema: {
    safeParse: vi.fn((data: any) => ({ success: true, data })),
  },
  coupleTarotReadingQuerySchema: {
    safeParse: vi.fn((data: any) => ({ success: true, data })),
  },
}))

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const { getServerSession } = await import('next-auth')
      const { authOptions } = await import('@/lib/auth/authOptions')
      const session: any = await (getServerSession as any)(authOptions)
      if (!session?.user?.id) {
        return NextResponse.json(
          { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
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
      if (result?.error) {
        const statusMap: Record<string, number> = {
          BAD_REQUEST: 400,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          NOT_FOUND: 404,
          DATABASE_ERROR: 500,
          FORBIDDEN: 403,
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
  createAuthenticatedGuard: vi.fn((opts: any) => ({ ...opts, requireAuth: true })),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
    FORBIDDEN: 'FORBIDDEN',
  },
}))

describe('couple-reading bonus FIFO drift (B1)', () => {
  const mockUserId = 'user-123'
  const mockPartnerId = 'partner-456'
  const mockConnectionId = 'connection-789'

  const validData = {
    connectionId: mockConnectionId,
    spreadId: 'couple-spread',
    spreadTitle: 'Couple Love Spread',
    cards: [{ cardId: 'major-0', name: 'The Lovers', isReversed: false, position: 'A' }],
    overallMessage: 'msg',
  }

  beforeEach(async () => {
    vi.clearAllMocks()
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: mockUserId },
      expires: new Date(Date.now() + 86400000).toISOString(),
    })

    const { prisma } = await import('@/lib/db/prisma')
    ;(prisma.matchConnection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockConnectionId,
      status: 'active',
      user1Profile: { userId: mockUserId },
      user2Profile: { userId: mockPartnerId },
    })
    ;(prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockUserId,
      name: 'Test',
    })
  })

  it('B1: bonus consumption decrements BOTH BonusCreditPurchase.remaining AND UserCredits.bonusCredits', async () => {
    const { prisma } = await import('@/lib/db/prisma')
    // compat 한도 다 씀 → bonus 만 남음
    ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: mockUserId,
      compatibilityLimit: 10,
      compatibilityUsed: 10,
      bonusCredits: 3,
    })

    // 트랜잭션 안의 모든 호출을 캡처해 어떤 모델이 어떤 데이터로 update 됐는지 확인
    const calls: Array<{ model: string; method: string; args: any }> = []
    const trackedTxFactory = () => ({
      userCredits: {
        update: vi.fn().mockImplementation((args) => {
          calls.push({ model: 'userCredits', method: 'update', args })
          return Promise.resolve({})
        }),
        updateMany: vi.fn().mockImplementation((args) => {
          calls.push({ model: 'userCredits', method: 'updateMany', args })
          // compat 시도 (count: 0) → 한도 다 씀 → bonus path 로 떨어짐.
          // bonus path 의 user updateMany 는 count: 1 으로 성공.
          if (args.where?.compatibilityUsed) return Promise.resolve({ count: 0 })
          if (args.where?.bonusCredits) return Promise.resolve({ count: 1 })
          return Promise.resolve({ count: 1 })
        }),
      },
      bonusCreditPurchase: {
        findFirst: vi.fn().mockImplementation((args) => {
          calls.push({ model: 'bonusCreditPurchase', method: 'findFirst', args })
          return Promise.resolve({ id: 'bp-oldest' })
        }),
        updateMany: vi.fn().mockImplementation((args) => {
          calls.push({ model: 'bonusCreditPurchase', method: 'updateMany', args })
          return Promise.resolve({ count: 1 })
        }),
      },
      tarotReading: {
        create: vi.fn().mockResolvedValue({ id: 'reading-1' }),
      },
      matchConnection: {
        update: vi.fn().mockResolvedValue({}),
      },
      // CreditTransaction (CONSUME/BONUS) — consumeBonusCreditOnceInTx 가 emit.
      creditTransaction: {
        create: vi.fn().mockImplementation((args) => {
          calls.push({ model: 'creditTransaction', method: 'create', args })
          return Promise.resolve({})
        }),
      },
    })

    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
      return cb(trackedTxFactory())
    })

    const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
      method: 'POST',
      body: JSON.stringify(validData),
    })
    const { POST } = await import('@/app/api/tarot/couple-reading/route')
    const response = await POST(req)

    expect(response.status).toBe(200)

    // 핵심: BonusCreditPurchase.remaining 이 차감됐어야 한다 (이전 버그에서는 없음).
    const purchaseDecrement = calls.find(
      (c) =>
        c.model === 'bonusCreditPurchase' &&
        c.method === 'updateMany' &&
        c.args?.data?.remaining?.decrement === 1
    )
    expect(purchaseDecrement).toBeDefined()

    // 그리고 UserCredits.bonusCredits 도 차감.
    const userBonusDecrement = calls.find(
      (c) =>
        c.model === 'userCredits' &&
        c.method === 'updateMany' &&
        c.args?.data?.bonusCredits?.decrement === 1
    )
    expect(userBonusDecrement).toBeDefined()

    // 두 차감이 같은 양 (1) 이어서 invariant 유지.
    expect(purchaseDecrement!.args.data.remaining.decrement).toBe(
      userBonusDecrement!.args.data.bonusCredits.decrement
    )
  })

  it('B1: returns 403 if no eligible bonus purchase exists (no UserCredits.bonusCredits decrement)', async () => {
    const { prisma } = await import('@/lib/db/prisma')
    ;(prisma.userCredits.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: mockUserId,
      compatibilityLimit: 10,
      compatibilityUsed: 10,
      // bonusCredits > 0 인데 BonusCreditPurchase 가 매칭 없는 drift 상황 시뮬레이션.
      // 이 경우에도 invariant 어그러뜨리지 않도록 차감을 안 하고 INSUFFICIENT 으로 떨어져야 한다.
      bonusCredits: 5,
    })

    const userBonusDecrements: any[] = []
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (cb: any) => {
      const tx = {
        userCredits: {
          update: vi.fn().mockResolvedValue({}),
          updateMany: vi.fn().mockImplementation((args) => {
            if (args.where?.bonusCredits) {
              userBonusDecrements.push(args)
            }
            return Promise.resolve({ count: 0 })
          }),
        },
        bonusCreditPurchase: {
          // 매칭 purchase 없음 → consumeBonusCreditOnceInTx 가 false 반환.
          findFirst: vi.fn().mockResolvedValue(null),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        tarotReading: { create: vi.fn().mockResolvedValue({ id: 'r1' }) },
        matchConnection: { update: vi.fn().mockResolvedValue({}) },
      }
      try {
        return await cb(tx)
      } catch (err) {
        throw err
      }
    })

    const req = new NextRequest('http://localhost:3000/api/tarot/couple-reading', {
      method: 'POST',
      body: JSON.stringify(validData),
    })
    const { POST } = await import('@/app/api/tarot/couple-reading/route')
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error.message).toContain('크레딧이 부족합니다')
    // invariant 보호: purchase 가 없으면 UserCredits.bonusCredits 도 안 줄여야 한다.
    expect(userBonusDecrements.length).toBe(0)
  })
})
