/**
 * Tests for POST /api/compatibility/share — 무료 궁합 공유 링크 생성.
 *
 * 핵심: 종합 점수(score) + 등급(grade)이 링크 페이로드에 실려, 링크 미리보기
 * (OG/공개 페이지)에서 큰 숫자 후크로 쓰일 수 있게 왕복(round-trip)됨을 잠근다.
 * 점수는 선택 — 없으면 페이로드에 실리지 않고, 범위를 벗어나면 검증 실패.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
}

const ctxOverride: { userId: string | null } = { userId: null }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: ctxOverride.userId,
        session: ctxOverride.userId ? { user: { id: ctxOverride.userId } } : null,
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: Boolean(ctxOverride.userId),
        isPremium: false,
      }
      const result = await handler(req, context, ...args)
      if (result instanceof Response) return result
      if (result?.error) {
        const status = STATUS_MAP[result.error.code] || 500
        return NextResponse.json({ success: false, error: { ...result.error, status } }, { status })
      }
      return NextResponse.json(
        { success: true, data: result.data },
        { status: result.status || 200 }
      )
    }
  }),
  createPublicStreamGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: { VALIDATION_ERROR: 'VALIDATION_ERROR', INTERNAL_ERROR: 'INTERNAL_ERROR' },
}))

vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn(() => NextResponse.json({ error: true }, { status: 429 })),
}))

const createShareLink = vi.fn(async () => 'tok_cmp1')
const siteBaseUrl = vi.fn(() => 'https://destinypal.app')
vi.mock('@/lib/tarot/shareLink', () => ({
  createShareLink: (...a: any[]) => (createShareLink as any)(...a),
  getShareLink: vi.fn(async () => null),
  isCompatShare: (p: any) => p?.kind === 'compatibility',
  siteBaseUrl: () => (siteBaseUrl as any)(),
}))

vi.mock('@/lib/metrics/index', () => ({ recordCounter: vi.fn() }))
vi.mock('@/lib/metrics/shareCounts', () => ({ bumpShareCreated: vi.fn(async () => undefined) }))
vi.mock('@/lib/rateLimit', () => ({ rateLimit: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/request-ip', () => ({ getClientIp: vi.fn(() => '127.0.0.1') }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/compatibility/share/route'

function makeReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/compatibility/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const valid = {
  isKo: true,
  nameA: '지민',
  nameB: '수현',
  verdict: '불꽃은 튀는데 서로 못 참는 조합이에요.',
  verdictTone: 'mixed' as const,
  score: 87,
  grade: '위험할 만큼 잘 맞아',
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  createShareLink.mockResolvedValue('tok_cmp1')
  siteBaseUrl.mockReturnValue('https://destinypal.app')
})

describe('POST /api/compatibility/share — 점수/등급 왕복', () => {
  it('점수·등급이 페이로드에 실린다(링크 미리보기 후크)', async () => {
    const res = await POST(makeReq(valid))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.url).toBe('https://destinypal.app/r/tok_cmp1')
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.kind).toBe('compatibility')
    expect(payload.score).toBe(87)
    expect(payload.grade).toBe('위험할 만큼 잘 맞아')
  })

  it('점수가 없으면 페이로드에 score 키가 없다(선택 필드)', async () => {
    const { score, grade, ...rest } = valid
    await POST(makeReq(rest))
    const payload = createShareLink.mock.calls[0][0] as any
    expect('score' in payload).toBe(false)
    expect('grade' in payload).toBe(false)
  })

  it('점수가 0~100 범위를 벗어나면 검증 실패', async () => {
    const res = await POST(makeReq({ ...valid, score: 150 }))
    expect(res.status).toBe(422)
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it('verdict 누락이면 invalid_share_payload', async () => {
    const { verdict, ...rest } = valid
    const res = await POST(makeReq(rest))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_share_payload')
  })
})
