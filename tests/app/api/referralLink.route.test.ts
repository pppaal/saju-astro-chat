/**
 * Tests for /api/referral/link — 추천 코드(dp_ref 쿠키) → 추천인 보상 링크.
 *
 * 커버:
 *  - 인증 없으면 401
 *  - dp_ref 쿠키 없으면 linked:false reason:no_code
 *  - user 없으면 404
 *  - 이미 referrerId 있으면 already_linked
 *  - 가입 24h 초과면 not_new_user
 *  - linkReferrer 성공/실패 매핑
 *  - 핸들러 내부 throw → 500
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

const ctxOverride: { userId: string | null } = { userId: 'user_new' }

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
    NOT_FOUND: 'NOT_FOUND',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/referral', () => ({
  linkReferrer: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/referral/link/route'
import { prisma } from '@/lib/db/prisma'
import { linkReferrer } from '@/lib/referral'

// dp_ref 쿠키를 가진 요청을 만든다.
function reqWithCookie(code?: string) {
  const req = new NextRequest('http://localhost:3000/api/referral/link', { method: 'POST' })
  Object.defineProperty(req, 'cookies', {
    value: {
      get: (name: string) =>
        name === 'dp_ref' && code !== undefined ? { value: code } : undefined,
    },
  })
  return req
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_new'
})

describe('POST /api/referral/link', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await POST(reqWithCookie('CODE1234'))
    expect(res.status).toBe(401)
  })

  it('dp_ref 쿠키가 없으면 linked:false reason:no_code', async () => {
    const res = await POST(reqWithCookie(undefined))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.linked).toBe(false)
    expect(data.data.reason).toBe('no_code')
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it('쿠키 값이 공백뿐이면 no_code (trim 후 빈 문자열)', async () => {
    const res = await POST(reqWithCookie('   '))
    const data = await res.json()
    expect(data.data.reason).toBe('no_code')
  })

  it('user 가 없으면 404', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(reqWithCookie('CODE1234'))
    const data = await res.json()
    expect(res.status).toBe(404)
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('이미 referrerId 있으면 already_linked', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      referrerId: 'someone',
      createdAt: new Date(),
    } as any)
    const res = await POST(reqWithCookie('CODE1234'))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.linked).toBe(false)
    expect(data.data.reason).toBe('already_linked')
    expect(linkReferrer).not.toHaveBeenCalled()
  })

  it('가입 24h 초과면 not_new_user', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      referrerId: null,
      createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    } as any)
    const res = await POST(reqWithCookie('CODE1234'))
    const data = await res.json()
    expect(data.data.linked).toBe(false)
    expect(data.data.reason).toBe('not_new_user')
    expect(linkReferrer).not.toHaveBeenCalled()
  })

  it('신규 사용자 + 코드 → linkReferrer 성공이면 linked:true', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      referrerId: null,
      createdAt: new Date(),
    } as any)
    vi.mocked(linkReferrer).mockResolvedValue({ success: true, referrerId: 'ref1' } as any)

    const res = await POST(reqWithCookie('CODE1234'))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.linked).toBe(true)
    expect(data.data.reason).toBeUndefined()
    expect(linkReferrer).toHaveBeenCalledWith('user_new', 'CODE1234')
  })

  it('linkReferrer 실패면 linked:false + reason 전달', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      referrerId: null,
      createdAt: new Date(),
    } as any)
    vi.mocked(linkReferrer).mockResolvedValue({
      success: false,
      error: 'invalid_code',
    } as any)

    const res = await POST(reqWithCookie('BADCODE'))
    const data = await res.json()

    expect(data.data.linked).toBe(false)
    expect(data.data.reason).toBe('invalid_code')
  })

  it('내부 오류(prisma throw)면 500 INTERNAL_ERROR', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('db down'))
    const res = await POST(reqWithCookie('CODE1234'))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })
})
