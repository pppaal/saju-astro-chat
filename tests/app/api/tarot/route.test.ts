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

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue(null),
}))

describe('POST /api/tarot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows one anonymous tarot draw and issues guest cookies', async () => {
    const req = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general-insight',
        spreadId: 'quick-reading',
      }),
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.drawnCards).toHaveLength(1)
    expect(response.headers.get('set-cookie') || '').toContain('tarot_guest_reading_used=1')
    expect(response.headers.get('set-cookie') || '').toContain('tarot_guest_interpret_pass=1')
  })

  it('still allows an anonymous draw when the guest reading cookie is set (limit moved to credit service)', async () => {
    // 쿠키 기반 'guest_limit_reached' 차단은 제거됨 — 게스트 한도는 크레딧
    // 서비스가 관리하며 무료 리딩이 확장됨. 쿠키가 있어도 라우트는 막지 않음.
    const req = new NextRequest('http://localhost/api/tarot', {
      method: 'POST',
      body: JSON.stringify({
        categoryId: 'general-insight',
        spreadId: 'quick-reading',
      }),
    })
    Object.defineProperty(req, 'cookies', {
      value: {
        get: (name: string) => (name === 'tarot_guest_reading_used' ? { value: '1' } : undefined),
      },
    })

    const response = await POST(req)

    expect(response.status).toBe(200)
  })
})
