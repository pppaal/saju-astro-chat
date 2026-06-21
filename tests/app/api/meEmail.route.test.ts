/**
 * Tests for /api/me/email — 결제 직전 이메일 보충(PATCH).
 *
 * 커버:
 *  - 인증 없으면 401
 *  - 잘못된 이메일 형식 → VALIDATION_ERROR (invalid_email)
 *  - 빈 body → VALIDATION_ERROR
 *  - 동일 이메일이면 idempotent no-op (update 안 침)
 *  - 신규 이메일이면 update 호출 + success
 *  - P2002(unique 충돌) → BAD_REQUEST (email_in_use)
 *  - 기타 DB 오류 → INTERNAL_ERROR (update_failed)
 *
 * zod 스키마는 순수(네트워크 없음)라 실제 구현을 사용한다.
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
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { PATCH } from '@/app/api/me/email/route'
import { prisma } from '@/lib/db/prisma'

function patchReq(body: unknown) {
  return new NextRequest('http://localhost:3000/api/me/email', {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_123'
})

describe('PATCH /api/me/email', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await PATCH(patchReq({ email: 'a@b.com' }))
    expect(res.status).toBe(401)
  })

  it('잘못된 이메일 형식이면 VALIDATION_ERROR', async () => {
    const res = await PATCH(patchReq({ email: 'not-an-email' }))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.message).toBe('invalid_email')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('빈 body면 VALIDATION_ERROR', async () => {
    const res = await PATCH(patchReq({}))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('동일 이메일이면 idempotent no-op (update 호출 안 함)', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: 'a@b.com' } as any)
    const res = await PATCH(patchReq({ email: 'a@b.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.email).toBe('a@b.com')
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it('신규 이메일이면 update 호출 + success', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as any)
    vi.mocked(prisma.user.update).mockResolvedValue({} as any)
    const res = await PATCH(patchReq({ email: 'new@b.com' }))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.success).toBe(true)
    expect(data.data.email).toBe('new@b.com')
    const arg = vi.mocked(prisma.user.update).mock.calls[0][0] as any
    expect(arg.where.id).toBe('user_123')
    expect(arg.data.email).toBe('new@b.com')
  })

  it('P2002(unique 충돌)이면 BAD_REQUEST email_in_use', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as any)
    const err = new Error('unique') as Error & { code?: string }
    err.code = 'P2002'
    vi.mocked(prisma.user.update).mockRejectedValue(err)
    const res = await PATCH(patchReq({ email: 'taken@b.com' }))
    const data = await res.json()
    expect(res.status).toBe(400)
    expect(data.error.code).toBe('BAD_REQUEST')
    expect(data.error.message).toBe('email_in_use')
  })

  it('기타 DB 오류면 INTERNAL_ERROR update_failed', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ email: null } as any)
    vi.mocked(prisma.user.update).mockRejectedValue(new Error('boom'))
    const res = await PATCH(patchReq({ email: 'new@b.com' }))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    expect(data.error.message).toBe('update_failed')
  })

  it('findUnique 단계에서 throw해도 INTERNAL_ERROR로 처리', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('db down'))
    const res = await PATCH(patchReq({ email: 'new@b.com' }))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})
