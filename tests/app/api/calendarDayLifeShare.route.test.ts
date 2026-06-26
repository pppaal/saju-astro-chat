/**
 * Tests for POST /api/calendar/day/share and POST /api/life/share.
 *
 * 하루(일진)·인생(대운) 곡선 공유 링크 생성. 게스트/유저 모두 생성 가능
 * (바이럴 루프). 본문을 zod 로 검증하고(점수·곡선 숫자·라벨만 — 원국 미전송)
 * 토큰을 만들어 공개 URL 을 돌려준다.
 *
 * 커버:
 *  - JSON 파싱 실패 → invalid_json
 *  - zod 검증 실패(점수 범위/곡선 길이/필수 누락) → invalid_share_payload
 *  - 정상 생성(게스트/유저) → token/path/url + source 카운트 + payload 모양
 *  - createShareLink null → INTERNAL_ERROR(share_create_failed)
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

const createShareLink = vi.fn(async () => 'tok_abc123')
const siteBaseUrl = vi.fn(() => 'https://destinypal.app')
vi.mock('@/lib/tarot/shareLink', () => ({
  createShareLink: (...a: any[]) => (createShareLink as any)(...a),
  siteBaseUrl: () => (siteBaseUrl as any)(),
}))

const recordCounter = vi.fn()
vi.mock('@/lib/metrics/index', () => ({
  recordCounter: (...a: any[]) => (recordCounter as any)(...a),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST as POST_DAY } from '@/app/api/calendar/day/share/route'
import { POST as POST_LIFE } from '@/app/api/life/share/route'

function makeReq(url: string, body: unknown, raw = false) {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const DAY_URL = 'http://localhost:3000/api/calendar/day/share'
const LIFE_URL = 'http://localhost:3000/api/life/share'

const validDay = {
  isKo: true,
  dateLabel: '6월 15일 토',
  score: 87,
  tone: 'positive',
  headline: '먼저 움직여. 오늘은 네가 이겨.',
  subline: '미뤄둔 그 일, 지금 꺼내도 통하는 날.',
  curve: [40, 55, 60, 87, 70.4, 65],
  markerIndex: 3,
}

const validLife = {
  isKo: true,
  rangeLabel: '1994–2078',
  headline: '마흔에, 판이 한 번 뒤집힌다.',
  curve: [30, 45, 40, 70, 88.2, 60],
  axisLabels: ['1994', '2022', '2050', '2078'],
  markerIndex: 2,
  peakIndex: 4,
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  createShareLink.mockResolvedValue('tok_abc123')
  siteBaseUrl.mockReturnValue('https://destinypal.app')
})

describe('POST /api/calendar/day/share', () => {
  it('JSON 파싱 실패면 invalid_json', async () => {
    const res = await POST_DAY(makeReq(DAY_URL, '{nope', true))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_json')
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it('점수 범위 초과면 invalid_share_payload', async () => {
    const res = await POST_DAY(makeReq(DAY_URL, { ...validDay, score: 150 }))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_share_payload')
  })

  it('잘못된 tone 이면 invalid_share_payload', async () => {
    const res = await POST_DAY(makeReq(DAY_URL, { ...validDay, tone: 'great' }))
    expect(res.status).toBe(422)
  })

  it('필수(headline) 누락이면 invalid_share_payload', async () => {
    const { headline, ...rest } = validDay
    const res = await POST_DAY(makeReq(DAY_URL, rest))
    expect(res.status).toBe(422)
  })

  it('게스트 정상 생성 → token/path/url + source:guest + 곡선 반올림', async () => {
    const res = await POST_DAY(makeReq(DAY_URL, validDay))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.url).toBe('https://destinypal.app/r/tok_abc123')
    expect(recordCounter).toHaveBeenCalledWith('calendar.dayShare.created', 1, { source: 'guest' })
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.kind).toBe('day')
    expect(payload.curve).toEqual([40, 55, 60, 87, 70, 65]) // 70.4 → 70
  })

  it('로그인 사용자 → source:user', async () => {
    ctxOverride.userId = 'user_9'
    await POST_DAY(makeReq(DAY_URL, validDay))
    expect(recordCounter).toHaveBeenCalledWith('calendar.dayShare.created', 1, { source: 'user' })
  })

  it('곡선 없이도 생성 가능', async () => {
    const { curve, markerIndex, ...rest } = validDay
    const res = await POST_DAY(makeReq(DAY_URL, rest))
    expect(res.status).toBe(200)
  })

  it('createShareLink null → share_create_failed', async () => {
    createShareLink.mockResolvedValue(null as any)
    const res = await POST_DAY(makeReq(DAY_URL, validDay))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('share_create_failed')
  })
})

describe('POST /api/life/share', () => {
  it('JSON 파싱 실패면 invalid_json', async () => {
    const res = await POST_LIFE(makeReq(LIFE_URL, '{nope', true))
    expect(res.status).toBe(422)
    expect((await res.json()).error.message).toBe('invalid_json')
  })

  it('곡선 2개 미만이면 invalid_share_payload', async () => {
    const res = await POST_LIFE(makeReq(LIFE_URL, { ...validLife, curve: [50] }))
    expect(res.status).toBe(422)
  })

  it('필수(curve) 누락이면 invalid_share_payload', async () => {
    const { curve, ...rest } = validLife
    const res = await POST_LIFE(makeReq(LIFE_URL, rest))
    expect(res.status).toBe(422)
  })

  it('게스트 정상 생성 → token + source:guest + 곡선 반올림 + kind=life', async () => {
    const res = await POST_LIFE(makeReq(LIFE_URL, validLife))
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.data.path).toBe('/r/tok_abc123')
    expect(recordCounter).toHaveBeenCalledWith('life.share.created', 1, { source: 'guest' })
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.kind).toBe('life')
    expect(payload.curve).toEqual([30, 45, 40, 70, 88, 60]) // 88.2 → 88
    expect(payload.axisLabels).toEqual(['1994', '2022', '2050', '2078'])
  })

  it('로그인 사용자 → source:user', async () => {
    ctxOverride.userId = 'user_9'
    await POST_LIFE(makeReq(LIFE_URL, validLife))
    expect(recordCounter).toHaveBeenCalledWith('life.share.created', 1, { source: 'user' })
  })

  it('축 라벨 없이도 생성 가능', async () => {
    const { axisLabels, ...rest } = validLife
    const res = await POST_LIFE(makeReq(LIFE_URL, rest))
    expect(res.status).toBe(200)
  })

  it('createShareLink null → share_create_failed', async () => {
    createShareLink.mockResolvedValue(null as any)
    const res = await POST_LIFE(makeReq(LIFE_URL, validLife))
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('share_create_failed')
  })
})
