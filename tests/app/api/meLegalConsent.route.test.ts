/**
 * Tests for /api/me/legal-consent — 법령 동의 상태 조회(GET) + 기록(POST).
 *
 * 커버:
 *  GET
 *   - 인증 없으면 401
 *   - 동의 없음 → needsConsent:true
 *   - 현재 버전 동의 + 나이 확인 → needsConsent:false
 *   - settings 없음 → needsConsent:true
 *   - P2022(컬럼 없음) → graceful needsConsent:false
 *   - 기타 DB 오류 → 500
 *  POST
 *   - 인증 없으면 401
 *   - 잘못된 JSON → VALIDATION_ERROR
 *   - 동의 필드 누락(셋 중 하나 false) → VALIDATION_ERROR
 *   - 셋 다 true → upsert 호출 + version 응답
 *   - P2022(컬럼 없음) → ok:true persisted:false (graceful)
 *   - 기타 DB 오류 → 500
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

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
    userSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET, POST } from '@/app/api/me/legal-consent/route'
import { prisma } from '@/lib/db/prisma'
import { LEGAL_VERSION } from '@/lib/legal/consentVersion'

function getReq() {
  return new NextRequest('http://localhost:3000/api/me/legal-consent')
}

function postReq(body: unknown, rawText?: string) {
  return new NextRequest('http://localhost:3000/api/me/legal-consent', {
    method: 'POST',
    body: rawText !== undefined ? rawText : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

// P2022 가짜 에러 생성기 (Prisma.PrismaClientKnownRequestError instanceof 체크 통과용)
function p2022Error() {
  return new Prisma.PrismaClientKnownRequestError('column does not exist', {
    code: 'P2022',
    clientVersion: 'test',
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = 'user_123'
})

describe('GET /api/me/legal-consent', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('동의 기록 없으면 needsConsent:true', async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue(null as any)
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.needsConsent).toBe(true)
    expect(data.data.currentVersion).toBe(LEGAL_VERSION)
    expect(data.data.legalAcceptedVersion).toBeNull()
  })

  it('현재 버전 동의 + 나이 확인 → needsConsent:false', async () => {
    const now = new Date()
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      legalAcceptedAt: now,
      legalAcceptedVersion: LEGAL_VERSION,
      ageConfirmedAt: now,
    } as any)
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.needsConsent).toBe(false)
  })

  it('나이 확인 없으면 needsConsent:true', async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      legalAcceptedAt: new Date(),
      legalAcceptedVersion: LEGAL_VERSION,
      ageConfirmedAt: null,
    } as any)
    const res = await GET(getReq())
    const data = await res.json()
    expect(data.data.needsConsent).toBe(true)
  })

  it('구버전 동의면 needsConsent:true', async () => {
    vi.mocked(prisma.userSettings.findUnique).mockResolvedValue({
      legalAcceptedAt: new Date(),
      legalAcceptedVersion: '2000-01-01',
      ageConfirmedAt: new Date(),
    } as any)
    const res = await GET(getReq())
    const data = await res.json()
    expect(data.data.needsConsent).toBe(true)
  })

  it('P2022(컬럼 없음)이면 graceful needsConsent:false', async () => {
    vi.mocked(prisma.userSettings.findUnique).mockRejectedValue(p2022Error())
    const res = await GET(getReq())
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.needsConsent).toBe(false)
    expect(data.data.legalAcceptedVersion).toBeNull()
  })

  it('기타 DB 오류는 500', async () => {
    vi.mocked(prisma.userSettings.findUnique).mockRejectedValue(new Error('boom'))
    const res = await GET(getReq())
    expect(res.status).toBe(500)
  })
})

describe('POST /api/me/legal-consent', () => {
  it('인증 없으면 401', async () => {
    ctxOverride.userId = null
    const res = await POST(
      postReq({ acceptedTerms: true, acceptedPrivacy: true, ageConfirmed: true })
    )
    expect(res.status).toBe(401)
  })

  it('잘못된 JSON이면 VALIDATION_ERROR', async () => {
    const res = await POST(postReq(undefined, 'not-json{'))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('동의 필드 하나라도 false면 VALIDATION_ERROR', async () => {
    const res = await POST(
      postReq({ acceptedTerms: true, acceptedPrivacy: false, ageConfirmed: true })
    )
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(prisma.userSettings.upsert).not.toHaveBeenCalled()
  })

  it('빈 body면 VALIDATION_ERROR (필드 누락)', async () => {
    const res = await POST(postReq({}))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('셋 다 true면 upsert 호출 + version 응답', async () => {
    vi.mocked(prisma.userSettings.upsert).mockResolvedValue({} as any)
    const res = await POST(
      postReq({ acceptedTerms: true, acceptedPrivacy: true, ageConfirmed: true })
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.ok).toBe(true)
    expect(data.data.version).toBe(LEGAL_VERSION)
    const arg = vi.mocked(prisma.userSettings.upsert).mock.calls[0][0] as any
    expect(arg.where.userId).toBe('user_123')
    expect(arg.create.legalAcceptedVersion).toBe(LEGAL_VERSION)
    expect(arg.update.legalAcceptedVersion).toBe(LEGAL_VERSION)
  })

  it('P2022(컬럼 없음)이면 ok:true persisted:false (graceful)', async () => {
    vi.mocked(prisma.userSettings.upsert).mockRejectedValue(p2022Error())
    const res = await POST(
      postReq({ acceptedTerms: true, acceptedPrivacy: true, ageConfirmed: true })
    )
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.ok).toBe(true)
    expect(data.data.persisted).toBe(false)
  })

  it('기타 DB 오류는 500', async () => {
    vi.mocked(prisma.userSettings.upsert).mockRejectedValue(new Error('boom'))
    const res = await POST(
      postReq({ acceptedTerms: true, acceptedPrivacy: true, ageConfirmed: true })
    )
    expect(res.status).toBe(500)
  })
})
