import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/tarot/route'

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    headers: new Headers(),
  }),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/auth/session', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

describe('POST /api/tarot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // 게스트(비로그인) 무료 리딩 폐지 — 익명 draw 는 로그인 필수(401). (audit 2026-06)
  it('blocks anonymous tarot draw — login required (guests removed)', async () => {
    const req = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general-insight',
        spreadId: 'quick-reading',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.code).toBe('not_authenticated')
  })

  it('blocks anonymous draw even with legacy guest cookies present', async () => {
    const req = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general-insight',
        spreadId: 'quick-reading',
      }),
    })
    // 옛 게스트 쿠키가 남아 있어도 더 이상 무료 리딩을 주지 않는다.
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) => (name === 'tarot_guest_reading_used' ? { value: '0' } : undefined),
      },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.code).toBe('not_authenticated')
  })
})
