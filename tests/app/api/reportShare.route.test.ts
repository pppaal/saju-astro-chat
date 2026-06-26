/**
 * Tests for POST /api/report/share — 무료 통합 리포트 공유 링크 생성.
 *
 * 게스트/유저 모두 생성(바이럴 루프). 본문을 zod 로 검증하고(유형 별명 + 소름
 * 한 줄, PII 아님) 토큰을 만들어 공개 URL 을 돌려준다.
 *
 * 커버: invalid_json / 검증 실패 / 정상(게스트·유저) / emoji 기본값 /
 *       createShareLink null → share_create_failed.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
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
  createPublicStreamGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
  },
}))

const createShareLink = vi.fn(async () => 'tok_rep1')
const siteBaseUrl = vi.fn(() => 'https://destinypal.app')
vi.mock('@/lib/tarot/shareLink', () => ({
  createShareLink: (...a: any[]) => (createShareLink as any)(...a),
  siteBaseUrl: () => (siteBaseUrl as any)(),
}))

const recordCounter = vi.fn()
vi.mock('@/lib/metrics/index', () => ({
  recordCounter: (...a: any[]) => (recordCounter as any)(...a),
}))

const bumpShareCreated = vi.fn(async () => undefined)
vi.mock('@/lib/metrics/shareCounts', () => ({
  bumpShareCreated: (...a: any[]) => (bumpShareCreated as any)(...a),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/report/share/route'

const URL_ = 'http://localhost:3000/api/report/share'
function makeReq(body: unknown, raw = false) {
  return new NextRequest(URL_, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const valid = {
  isKo: true,
  emoji: '🌊',
  typeName: '물 위를 걷는 전략가',
  oneLiner: '흩어진 것 같아도 결국 한 방향으로 흐르는 사람.',
  resonant: ['재물', '인연'],
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  createShareLink.mockResolvedValue('tok_rep1')
  siteBaseUrl.mockReturnValue('https://destinypal.app')
})

describe('POST /api/report/share', () => {
  it('JSON 파싱 실패면 invalid_json', async () => {
    const res = await POST(makeReq('{nope', true))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_json')
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it('필수(typeName) 누락이면 invalid_share_payload', async () => {
    const { typeName, ...rest } = valid
    const res = await POST(makeReq(rest))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_share_payload')
  })

  it('oneLiner 길이 초과면 invalid_share_payload', async () => {
    const res = await POST(makeReq({ ...valid, oneLiner: 'x'.repeat(281) }))
    expect(res.status).toBe(422)
  })

  it('게스트 정상 생성 → token/url + source:guest + kind=report + bumpShareCreated', async () => {
    const res = await POST(makeReq(valid))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.url).toBe('https://destinypal.app/r/tok_rep1')
    expect(recordCounter).toHaveBeenCalledWith('report.share.created', 1, { source: 'guest' })
    expect(bumpShareCreated).toHaveBeenCalledWith('report')
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.kind).toBe('report')
    expect(payload.emoji).toBe('🌊')
  })

  it('emoji 없으면 기본값 🔮', async () => {
    const { emoji, ...rest } = valid
    await POST(makeReq(rest))
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.emoji).toBe('🔮')
  })

  it('로그인 사용자 → source:user', async () => {
    ctxOverride.userId = 'user_9'
    await POST(makeReq(valid))
    expect(recordCounter).toHaveBeenCalledWith('report.share.created', 1, { source: 'user' })
  })

  it('createShareLink null → share_create_failed', async () => {
    createShareLink.mockResolvedValue(null as any)
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('share_create_failed')
  })
})
