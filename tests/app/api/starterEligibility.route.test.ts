/**
 * Tests for GET /api/me/starter-eligibility — 첫구매 스타터팩 자격 조회.
 * eligible=true → 팩 정보 노출, false → pack:null, 조회 예외 → 500.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const STATUS_MAP: Record<string, number> = { INTERNAL_ERROR: 500 }

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any) => {
    return async (req: any, ...args: any[]) => {
      const context = { userId: 'user_1', isAuthenticated: true, ip: '127.0.0.1', locale: 'ko' }
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
  createAuthenticatedGuard: vi.fn((opts: any) => ({ ...opts })),
  apiSuccess: vi.fn((data: any, options?: any) => ({ data, status: options?.status })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: { INTERNAL_ERROR: 'INTERNAL_ERROR' },
}))

const isStarterEligible = vi.fn(async () => true)
vi.mock('@/lib/credits/starterPack', () => ({
  isStarterEligible: (...a: any[]) => (isStarterEligible as any)(...a),
  STARTER_PACK: { id: 'starter', credits: 8, pricing: { krw: 2900, usd: 2.5 } },
}))
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }))

import { GET } from '@/app/api/me/starter-eligibility/route'

const req = () => new NextRequest('http://localhost:3000/api/me/starter-eligibility')

beforeEach(() => {
  vi.clearAllMocks()
  isStarterEligible.mockResolvedValue(true)
})

describe('GET /api/me/starter-eligibility', () => {
  it('자격 있으면 eligible:true + 팩 정보', async () => {
    const data = await (await GET(req())).json()
    expect(data.data.eligible).toBe(true)
    expect(data.data.pack).toEqual({ id: 'starter', credits: 8, krw: 2900, usd: 2.5 })
  })

  it('자격 없으면 eligible:false + pack:null', async () => {
    isStarterEligible.mockResolvedValue(false)
    const data = await (await GET(req())).json()
    expect(data.data.eligible).toBe(false)
    expect(data.data.pack).toBeNull()
  })

  it('조회 예외면 500 eligibility_check_failed', async () => {
    isStarterEligible.mockRejectedValue(new Error('db down'))
    const res = await GET(req())
    expect(res.status).toBe(500)
    expect((await res.json()).error.message).toBe('eligibility_check_failed')
  })
})
