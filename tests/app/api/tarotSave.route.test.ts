/**
 * Tests for PATCH /api/tarot/save/[id] — 저장된 리딩에 보충 카드 / followup
 * 채팅을 늦게 채워넣는 부분 업데이트 엔드포인트.
 *
 * 기존 route.test.ts 는 GET/DELETE 만 커버 → 여기선 미커버 PATCH 분기를 채운다.
 *
 * 커버:
 *  - 인증 없으면 401
 *  - 잘못된 파라미터(빈 id) → VALIDATION_ERROR
 *  - 본문 검증 실패(빈 객체) → VALIDATION_ERROR
 *  - 리딩 없음/타인 소유 → NOT_FOUND
 *  - clarifierCard 만 / followupTurns 만 / 둘 다 정상 업데이트
 *  - P2022(컬럼 누락) → success + skipped:columns_missing
 *  - 그 외 update throw → DATABASE_ERROR
 *  - findFirst throw → DATABASE_ERROR
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth/session'

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({ authOptions: {} }))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    tarotReading: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// idParamSchema / tarotSavePatchSchema mock — 실제 zod 동작을 단순 재현.
vi.mock('@/lib/api/zodValidation', () => ({
  idParamSchema: {
    safeParse: vi.fn((data: Record<string, unknown>) => {
      if (!data.id || typeof data.id !== 'string' || (data.id as string).trim().length === 0) {
        return { success: false, error: { issues: [{ path: ['id'], message: 'ID is required' }] } }
      }
      return { success: true, data: { id: data.id } }
    }),
  },
  tarotSavePatchSchema: {
    safeParse: vi.fn((data: any) => {
      if (!data || typeof data !== 'object') {
        return { success: false, error: { issues: [{ path: [], message: 'invalid' }] } }
      }
      if (data.clarifierCard === undefined && data.followupTurns === undefined) {
        return {
          success: false,
          error: {
            issues: [
              {
                path: [],
                message: 'At least one of clarifierCard or followupTurns must be provided',
              },
            ],
          },
        }
      }
      return { success: true, data }
    }),
  },
  createValidationErrorResponse: vi.fn(
    (error: { issues?: { path: string[]; message: string }[] }) => {
      const { NextResponse } = require('next/server')
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'validation_error' } },
        { status: 400 }
      )
    }
  ),
}))

vi.mock('@/lib/tarot/savedReadingPayload', () => ({
  extractStoredCards: vi.fn((c: any) => c),
  extractStoredQuestionContext: vi.fn(() => null),
}))

// withApiMiddleware passthrough — getServerSession 으로 인증 흉내.
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn(
    (handler: (req: NextRequest, ctx: Record<string, unknown>) => Promise<unknown>) => {
      return async (req: NextRequest, ...args: unknown[]) => {
        const { getServerSession } = await import('@/lib/auth/session')
        const { authOptions } = await import('@/lib/auth/authOptions')
        let session: { user?: { id?: string } } | null = null
        try {
          session = await (getServerSession as any)(authOptions)
        } catch {
          return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', status: 500 } },
            { status: 500 }
          )
        }
        if (!session?.user?.id) {
          return NextResponse.json(
            { success: false, error: { code: 'UNAUTHORIZED', status: 401 } },
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
        try {
          const result = (await handler(req, context as any, ...args)) as any
          if (result instanceof Response) return result
          if (result?.error) {
            const statusMap: Record<string, number> = {
              BAD_REQUEST: 400,
              VALIDATION_ERROR: 422,
              INTERNAL_ERROR: 500,
              NOT_FOUND: 404,
              DATABASE_ERROR: 500,
            }
            return NextResponse.json(
              { success: false, error: { code: result.error.code, message: result.error.message } },
              { status: statusMap[result.error.code] || 500 }
            )
          }
          return NextResponse.json(
            { success: true, data: result?.data },
            { status: result?.status || 200 }
          )
        } catch (err: any) {
          return NextResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: err?.message } },
            { status: 500 }
          )
        }
      }
    }
  ),
  createAuthenticatedGuard: vi.fn((opts: Record<string, unknown>) => ({ ...opts })),
  apiSuccess: vi.fn((data: unknown, options?: { status?: number }) => ({
    data,
    status: options?.status,
  })),
  apiError: vi.fn((code: string, message?: string, details?: unknown) => ({
    error: { code, message, details },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    DATABASE_ERROR: 'DATABASE_ERROR',
  },
}))

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const mockUserId = 'user-123'
const mockReadingId = 'reading-456'

const createRouteContext = (id: string) => ({ params: Promise.resolve({ id }) })

function patchReq(body: unknown) {
  return new Request(`http://localhost:3000/api/tarot/save/${mockReadingId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
    user: { id: mockUserId },
    expires: new Date(Date.now() + 86400000).toISOString(),
  })
})

describe('PATCH /api/tarot/save/[id]', () => {
  it('인증 없으면 401', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(mockReadingId))
    expect(res.status).toBe(401)
  })

  it('빈 id 파라미터면 400 VALIDATION_ERROR', async () => {
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(''))
    expect(res.status).toBe(400)
  })

  it('본문이 빈 객체(둘 다 undefined)면 VALIDATION_ERROR', async () => {
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({}), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.tarotReading.findFirst).not.toHaveBeenCalled()
  })

  it('리딩이 없으면(타인 소유 포함) NOT_FOUND', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(404)
    expect(data.error.code).toBe('NOT_FOUND')
    expect(prisma.tarotReading.update).not.toHaveBeenCalled()
    // 소유권 필터 검증
    expect(prisma.tarotReading.findFirst).toHaveBeenCalledWith({
      where: { id: mockReadingId, userId: mockUserId },
      select: { id: true },
    })
  })

  it('followupTurns 만 정상 업데이트 → updated:[followupTurns]', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    ;(prisma.tarotReading.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(
      patchReq({ followupTurns: [{ role: 'user', content: 'hi' }] }),
      createRouteContext(mockReadingId)
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.updated).toEqual(['followupTurns'])
    expect(prisma.tarotReading.update).toHaveBeenCalledWith({
      where: { id: mockReadingId },
      data: { followupTurns: [{ role: 'user', content: 'hi' }] },
    })
  })

  it('clarifierCard 만 정상 업데이트 → updated:[clarifierCard]', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    ;(prisma.tarotReading.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const card = { name: 'The Fool', isReversed: false }
    const res = await PATCH(patchReq({ clarifierCard: card }), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.updated).toEqual(['clarifierCard'])
  })

  it('clarifierCard + followupTurns 둘 다 업데이트', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    ;(prisma.tarotReading.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(
      patchReq({ clarifierCard: { name: 'X', isReversed: true }, followupTurns: [] }),
      createRouteContext(mockReadingId)
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.updated).toEqual(expect.arrayContaining(['clarifierCard', 'followupTurns']))
  })

  it('P2022(컬럼 누락)면 success + skipped:columns_missing, warn 로그', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    const err = new Error('column missing') as Error & { code?: string }
    err.code = 'P2022'
    ;(prisma.tarotReading.update as ReturnType<typeof vi.fn>).mockRejectedValue(err)
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.skipped).toBe('columns_missing')
    expect(data.data.updated).toEqual([])
    expect(logger.warn).toHaveBeenCalled()
  })

  it('update 가 그 외 에러로 throw 하면 DATABASE_ERROR(500)', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockReadingId,
    })
    ;(prisma.tarotReading.update as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'))
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('DATABASE_ERROR')
    expect(logger.error).toHaveBeenCalled()
  })

  it('findFirst 가 throw 하면 DATABASE_ERROR(500)', async () => {
    ;(prisma.tarotReading.findFirst as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('db down')
    )
    const { PATCH } = await import('@/app/api/tarot/save/[id]/route')
    const res = await PATCH(patchReq({ followupTurns: [] }), createRouteContext(mockReadingId))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('DATABASE_ERROR')
  })
})
