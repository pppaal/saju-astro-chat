/**
 * Tests for POST /api/tarot/share — 공유 링크 생성.
 *
 * 게스트/유저 모두 생성 가능(바이럴 루프). 본문을 zod 로 검증하고 공유자
 * 실명을 redact 한 뒤 토큰을 만들어 공개 URL 을 돌려준다.
 *
 * 커버:
 *  - JSON 파싱 실패 → invalid_json
 *  - zod 검증 실패(빈 cards / 잘못된 image / 필수 누락) → invalid_share_payload
 *  - 정상 생성(게스트) → token/path/url + source:guest 카운트
 *  - 정상 생성(로그인) → 실명 redact + source:user 카운트
 *  - createShareLink 가 null 이면 INTERNAL_ERROR(share_create_failed)
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

const getUserDisplayName = vi.fn(async () => null)
vi.mock('@/lib/user/displayName', () => ({
  getUserDisplayName: (...a: any[]) => (getUserDisplayName as any)(...a),
}))

const recordCounter = vi.fn()
vi.mock('@/lib/metrics/index', () => ({
  recordCounter: (...a: any[]) => (recordCounter as any)(...a),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { POST } from '@/app/api/tarot/share/route'

function makeReq(body: unknown, raw = false) {
  return new NextRequest('http://localhost:3000/api/tarot/share', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw ? (body as string) : JSON.stringify(body),
  })
}

const validBody = {
  isKo: true,
  question: '내 연애운은?',
  spreadTitle: '쓰리 카드',
  cards: [{ name: 'The Fool', image: '/images/tarot/fool.webp', isReversed: false }],
  keyMessage: '새로운 시작이 찾아옵니다',
  body: '카드가 변화를 말합니다',
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  createShareLink.mockResolvedValue('tok_abc123')
  getUserDisplayName.mockResolvedValue(null)
  siteBaseUrl.mockReturnValue('https://destinypal.app')
})

describe('POST /api/tarot/share', () => {
  it('JSON 파싱 실패면 VALIDATION_ERROR(invalid_json)', async () => {
    const res = await POST(makeReq('{not json', true))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toBe('invalid_json')
    expect(createShareLink).not.toHaveBeenCalled()
  })

  it('빈 cards 배열이면 invalid_share_payload', async () => {
    const res = await POST(makeReq({ ...validBody, cards: [] }))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toBe('invalid_share_payload')
  })

  it('필수 필드(question) 누락이면 invalid_share_payload', async () => {
    const { question, ...rest } = validBody
    const res = await POST(makeReq(rest))
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toBe('invalid_share_payload')
  })

  it('same-origin 아닌 이미지 경로면 invalid_share_payload', async () => {
    const res = await POST(
      makeReq({
        ...validBody,
        cards: [{ name: 'X', image: 'https://evil.com/x.png', isReversed: false }],
      })
    )
    const data = await res.json()
    expect(res.status).toBe(422)
    expect(data.error.message).toBe('invalid_share_payload')
  })

  it('경로 탈출(..) 이미지면 invalid_share_payload', async () => {
    const res = await POST(
      makeReq({
        ...validBody,
        cards: [{ name: 'X', image: '/images/tarot/../../secret.png', isReversed: false }],
      })
    )
    expect((await res.json()).error.message).toBe('invalid_share_payload')
  })

  it('게스트 정상 생성 → token/path/url + source:guest 카운트', async () => {
    const res = await POST(makeReq(validBody))
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.token).toBe('tok_abc123')
    expect(data.data.path).toBe('/r/tok_abc123')
    expect(data.data.url).toBe('https://destinypal.app/r/tok_abc123')
    expect(recordCounter).toHaveBeenCalledWith('tarot.share.created', 1, { source: 'guest' })
    expect(getUserDisplayName).toHaveBeenCalledWith(null)
  })

  it('로그인 사용자 → source:user 카운트 + 실명 redact 적용', async () => {
    ctxOverride.userId = 'user_9'
    getUserDisplayName.mockResolvedValue('이준영')

    const res = await POST(
      makeReq({
        ...validBody,
        keyMessage: '이준영님, 새로운 시작이 찾아옵니다',
        body: '이준영님께서 변화를 맞이합니다',
      })
    )
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(recordCounter).toHaveBeenCalledWith('tarot.share.created', 1, { source: 'user' })
    expect(getUserDisplayName).toHaveBeenCalledWith('user_9')

    // createShareLink 에 넘어간 payload 에서 실명이 제거됐는지 검증.
    const payload = createShareLink.mock.calls[0][0] as any
    expect(payload.keyMessage).not.toContain('이준영')
    expect(payload.body).not.toContain('이준영')
    expect(payload.v).toBe(1)
  })

  it('createShareLink 가 null 이면 INTERNAL_ERROR(share_create_failed)', async () => {
    createShareLink.mockResolvedValue(null as any)
    const res = await POST(makeReq(validBody))
    const data = await res.json()
    expect(res.status).toBe(500)
    expect(data.error.message).toBe('share_create_failed')
  })

  it('keyMessage 없이도(기본 빈 문자열) 생성 가능', async () => {
    const { keyMessage, body, ...rest } = validBody
    const res = await POST(makeReq(rest))
    expect(res.status).toBe(200)
  })
})
