/**
 * Tests for POST /api/calendar/share — 운흐름 캘린더 공유 링크 생성.
 *
 * 핵심: 요약(기간/헤드라인/하이라이트/곡선)만 추측 불가 토큰으로 저장하고
 * 공개 URL(/r/{token})을 왕복. 잘못된 JSON·페이로드·저장 실패 분기 커버.
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

const createShareLink = vi.fn(async () => 'tok_cal1' as string | null)
const siteBaseUrl = vi.fn(() => 'https://destinypal.app')
vi.mock('@/lib/tarot/shareLink', () => ({
  createShareLink: (...a: any[]) => (createShareLink as any)(...a),
  siteBaseUrl: () => (siteBaseUrl as any)(),
}))

const recordCounter = vi.fn()
const bumpShareCreated = vi.fn(async () => undefined)
vi.mock('@/lib/metrics/index', () => ({ recordCounter: (...a: any[]) => recordCounter(...a) }))
vi.mock('@/lib/metrics/shareCounts', () => ({
  bumpShareCreated: (...a: any[]) => bumpShareCreated(...a),
}))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/calendar/share/route'

function makeReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/calendar/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const valid = {
  isKo: true,
  periodLabel: '2026년 7월',
  headline: '이달은 흐름이 크게 열리는 달이에요.',
  highlights: ['7월 7일 좋은 날', '7월 20일 조심'],
  curve: [40, 55, 70, 62, 80],
  markerIndex: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  createShareLink.mockResolvedValue('tok_cal1')
  siteBaseUrl.mockReturnValue('https://destinypal.app')
})

describe('POST /api/calendar/share', () => {
  it('유효 페이로드 → 토큰·경로·URL 왕복 + 집계 호출', async () => {
    const res = await POST(makeReq(valid))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.token).toBe('tok_cal1')
    expect(data.data.path).toBe('/r/tok_cal1')
    expect(data.data.url).toBe('https://destinypal.app/r/tok_cal1')
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.kind).toBe('calendar')
    expect(payload.curve).toEqual([40, 55, 70, 62, 80]) // 반올림 유지
    expect(bumpShareCreated).toHaveBeenCalledWith('calendar')
    expect(recordCounter).toHaveBeenCalledWith('calendar.share.created', 1, { source: 'guest' })
  })

  it('로그인 사용자면 source=user 로 집계', async () => {
    ctxOverride.userId = 'user_1'
    await POST(makeReq(valid))
    expect(recordCounter).toHaveBeenCalledWith('calendar.share.created', 1, { source: 'user' })
  })

  it('선택 필드(highlights/curve/markerIndex) 없이도 성공', async () => {
    const { highlights, curve, markerIndex, ...rest } = valid
    const res = await POST(makeReq(rest))
    expect(res.status).toBe(200)
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.highlights).toBeUndefined()
    expect(payload.curve).toBeUndefined()
  })

  it('잘못된 JSON → invalid_json (422)', async () => {
    const res = await POST(makeReq('{broken', true))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_json')
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it('필수 필드(headline) 누락 → invalid_share_payload (422)', async () => {
    const { headline, ...rest } = valid
    const res = await POST(makeReq(rest))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_share_payload')
  })

  it('저장 실패(createShareLink null) → share_create_failed (500)', async () => {
    createShareLink.mockResolvedValue(null)
    const res = await POST(makeReq(valid))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('share_create_failed')
  })
})
