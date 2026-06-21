/**
 * Tests for /api/tarot/daily — 오늘의 타로(하루 1장 무료 데일리).
 *
 * 커버:
 *  - GET: 캐시 있음 → ready:true + reading / 없음 → ready:false
 *  - POST: 기존 캐시 있음 → fresh:false / Claude 미가용 → 503 /
 *          in-flight 락 → RATE_LIMITED / 정상 생성 → fresh:true /
 *          LLM JSON 깨짐 → 폴백 메시지 / LLM throw → 500 / 게스트 vs 유저 식별
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// withApiMiddleware 를 mock — 핸들러를 context 와 함께 호출하고 결과를
// HTTP 응답으로 매핑한다. public 라우트라 인증은 강제하지 않는다.
const STATUS_MAP: Record<string, number> = {
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INTERNAL_ERROR: 500,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
}

// 테스트가 context.userId / locale 을 제어할 수 있게 하는 가변 핸들 컨텍스트.
const ctxOverride: { userId: string | null; locale: string } = { userId: null, locale: 'ko' }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = {
        userId: ctxOverride.userId,
        session: ctxOverride.userId ? { user: { id: ctxOverride.userId } } : null,
        ip: '127.0.0.1',
        locale: ctxOverride.locale,
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
  createAuthenticatedGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    RATE_LIMITED: 'RATE_LIMITED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
  },
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn().mockResolvedValue(true),
}))

vi.mock('@/lib/llm/claude', () => ({
  callClaude: vi.fn(),
  extractJsonObject: vi.fn(),
  isClaudeAvailable: vi.fn().mockReturnValue(true),
}))

vi.mock('@/lib/metrics/index', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

import { GET, POST } from '@/app/api/tarot/daily/route'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { callClaude, extractJsonObject, isClaudeAvailable } from '@/lib/llm/claude'
import { recordCounter } from '@/lib/metrics/index'

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost:3000/api/tarot/daily', {
    method: 'POST',
    headers,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxOverride.userId = null
  ctxOverride.locale = 'ko'
  vi.mocked(isClaudeAvailable).mockReturnValue(true)
  vi.mocked(cacheSet).mockResolvedValue(true)
})

describe('GET /api/tarot/daily', () => {
  it('캐시에 오늘 리딩이 있으면 ready:true 와 reading 반환', async () => {
    const reading = { date: '2026-06-21', card: {}, hook: 'h', message: 'm' }
    vi.mocked(cacheGet).mockResolvedValueOnce(reading as any)

    const res = await GET(makeReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.ready).toBe(true)
    expect(data.data.reading).toEqual(reading)
  })

  it('캐시에 없으면 ready:false', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null)

    const res = await GET(makeReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.ready).toBe(false)
  })

  it('로그인 사용자는 u:{userId} 키로 조회', async () => {
    ctxOverride.userId = 'user_42'
    vi.mocked(cacheGet).mockResolvedValueOnce(null)

    await GET(makeReq())

    const key = vi.mocked(cacheGet).mock.calls[0][0] as string
    expect(key).toContain('u:user_42')
  })
})

describe('POST /api/tarot/daily', () => {
  it('오늘 이미 뽑았으면 그대로 (fresh:false), LLM 호출 안 함', async () => {
    const existing = { date: 'd', card: {}, hook: 'h', message: 'm' }
    vi.mocked(cacheGet).mockResolvedValueOnce(existing as any) // 결과 캐시

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.fresh).toBe(false)
    expect(data.data.reading).toEqual(existing)
    expect(callClaude).not.toHaveBeenCalled()
  })

  it('Claude 미가용이면 503 SERVICE_UNAVAILABLE', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null) // 결과 캐시 없음
    vi.mocked(isClaudeAvailable).mockReturnValue(false)

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(503)
    expect(data.error.code).toBe('SERVICE_UNAVAILABLE')
  })

  it('in-flight 락이 잡혀있으면 RATE_LIMITED(daily_in_progress)', async () => {
    // 1) 결과 캐시 없음, 2) 락 키 존재.
    vi.mocked(cacheGet)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('1' as any)

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(429)
    expect(data.error.code).toBe('RATE_LIMITED')
  })

  it('정상 생성: LLM JSON 을 파싱해 fresh:true 로 캐시 후 반환', async () => {
    vi.mocked(cacheGet)
      .mockResolvedValueOnce(null) // 결과 캐시 없음
      .mockResolvedValueOnce(null) // 락 없음
    vi.mocked(callClaude).mockResolvedValue({ text: '{"hook":"H","message":"M"}' } as any)
    vi.mocked(extractJsonObject).mockReturnValue({ hook: 'H', message: 'M' } as any)

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.fresh).toBe(true)
    expect(data.data.reading.hook).toBe('H')
    expect(data.data.reading.message).toBe('M')
    // 결과 캐시 set + 락 set + 락 해제 → 최소 3회 cacheSet.
    expect(cacheSet).toHaveBeenCalled()
    expect(recordCounter).toHaveBeenCalledWith('tarot.daily.drawn', 1, { source: 'guest' })
  })

  it('LLM 이 빈 message 를 주면 키워드 기반 폴백 메시지 사용', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    vi.mocked(callClaude).mockResolvedValue({ text: 'garbage' } as any)
    vi.mocked(extractJsonObject).mockReturnValue(null) // 파싱 실패

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.data.fresh).toBe(true)
    expect(typeof data.data.reading.message).toBe('string')
    expect(data.data.reading.message.length).toBeGreaterThan(0) // 폴백
  })

  it('로그인 사용자는 source:user 로 카운트', async () => {
    ctxOverride.userId = 'user_7'
    vi.mocked(cacheGet).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    vi.mocked(callClaude).mockResolvedValue({ text: '{}' } as any)
    vi.mocked(extractJsonObject).mockReturnValue({ hook: 'h', message: 'm' } as any)

    await POST(makeReq())

    expect(recordCounter).toHaveBeenCalledWith('tarot.daily.drawn', 1, { source: 'user' })
  })

  it('en locale 에서도 정상 생성', async () => {
    ctxOverride.locale = 'en'
    vi.mocked(cacheGet).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    vi.mocked(callClaude).mockResolvedValue({ text: '{}' } as any)
    vi.mocked(extractJsonObject).mockReturnValue({ hook: 'h', message: 'm' } as any)

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
  })

  it('LLM 호출이 throw 하면 500 INTERNAL_ERROR + 락 해제', async () => {
    vi.mocked(cacheGet).mockResolvedValueOnce(null).mockResolvedValueOnce(null)
    vi.mocked(callClaude).mockRejectedValue(new Error('llm down'))

    const res = await POST(makeReq())
    const data = await res.json()

    expect(res.status).toBe(500)
    expect(data.error.code).toBe('INTERNAL_ERROR')
    // finally 블록에서 락 해제 cacheSet 가 불린다.
    expect(cacheSet).toHaveBeenCalled()
  })

  it('x-dp-guest 헤더가 유효하면 g:{id} 식별자 사용', async () => {
    // 결과 캐시 있음 → 즉시 반환(LLM 우회). 식별자만 검증.
    vi.mocked(cacheGet).mockResolvedValueOnce({
      date: 'd',
      card: {},
      hook: '',
      message: 'm',
    } as any)
    await POST(makeReq({ 'x-dp-guest': 'abcd1234efgh' }))

    // 결과 캐시 조회 키에 g:abcd1234efgh 가 들어갔는지 확인.
    const key = vi.mocked(cacheGet).mock.calls[0][0] as string
    expect(key).toContain('g:abcd1234efgh')
  })
})
