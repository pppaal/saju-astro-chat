/**
 * Tests for src/proxy.ts (Next 16 middleware — CSRF + locale + CSP).
 *
 * 커버: 삭제 서비스 경로 리다이렉트, API 라우트의 CSRF(메서드/스킵/오리진),
 * HTML 응답의 CSP/로케일 헤더와 로케일 쿠키.
 */

import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

const ORIGIN = 'http://localhost:3000'

function req(
  path: string,
  init?: { method?: string; headers?: Record<string, string>; cookies?: Record<string, string> }
) {
  const r = new NextRequest(`${ORIGIN}${path}`, { method: init?.method ?? 'GET' })
  // undici strips forbidden header names (origin/host) from the Request
  // constructor in this environment, so set them after construction.
  for (const [k, v] of Object.entries(init?.headers ?? {})) {
    r.headers.set(k, v)
  }
  if (init?.cookies) {
    for (const [k, v] of Object.entries(init.cookies)) {
      r.cookies.set(k, v)
    }
  }
  return r
}

describe('proxy — removed service routes', () => {
  it('삭제된 공개 서비스 경로는 홈으로 307 리다이렉트', () => {
    const res = proxy(req('/astrology'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`${ORIGIN}/`)
  })

  it('삭제 서비스의 하위 경로도 리다이렉트', () => {
    const res = proxy(req('/saju/result'))
    expect(res.status).toBe(307)
  })

  it('삭제 서비스 prefix 와 같은 이름의 API 경로는 리다이렉트하지 않는다', () => {
    const res = proxy(req('/api/astrology', { method: 'GET' }))
    expect(res.status).not.toBe(307)
  })
})

describe('proxy — API CSRF gating', () => {
  it('비변경 메서드(GET)는 통과한다', () => {
    const res = proxy(req('/api/me/foo', { method: 'GET' }))
    expect(res.status).not.toBe(403)
  })

  it('CSRF 스킵 라우트(stripe webhook)는 origin 없이도 통과', () => {
    const res = proxy(req('/api/webhook/stripe', { method: 'POST' }))
    expect(res.status).not.toBe(403)
  })

  it('CSRF 스킵 prefix(/api/auth/...)는 통과', () => {
    const res = proxy(req('/api/auth/callback/google', { method: 'POST' }))
    expect(res.status).not.toBe(403)
  })

  it('변경 메서드(POST)에 유효하지 않은 origin 이면 403', () => {
    const res = proxy(
      req('/api/me/push-subscription', {
        method: 'POST',
        headers: { origin: 'https://evil.example.com', host: 'localhost:3000' },
      })
    )
    expect(res.status).toBe(403)
  })

  it('변경 메서드라도 동일 호스트 origin 이면 통과', () => {
    const res = proxy(
      req('/api/me/push-subscription', {
        method: 'POST',
        headers: { origin: ORIGIN, host: 'localhost:3000' },
      })
    )
    expect(res.status).not.toBe(403)
  })

  it('DELETE 도 변경 메서드로 origin 검증 대상', () => {
    const res = proxy(
      req('/api/me/push-subscription', {
        method: 'DELETE',
        headers: { origin: 'https://evil.example.com', host: 'localhost:3000' },
      })
    )
    expect(res.status).toBe(403)
  })
})

describe('proxy — non-API requests', () => {
  it('HTML 이 아닌 요청은 헤더 가공 없이 통과', () => {
    const res = proxy(req('/some.png', { headers: { accept: 'image/png' } }))
    expect(res.headers.get('Content-Security-Policy')).toBeNull()
  })

  it('HTML 요청에 CSP / Content-Language / Vary 헤더를 붙인다', () => {
    const res = proxy(
      req('/', { headers: { accept: 'text/html', 'accept-language': 'ko-KR,ko;q=0.9' } })
    )
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain('script-src')
    expect(csp).toContain('nonce-')
    expect(res.headers.get('Content-Language')).toBe('ko')
    expect(res.headers.get('Vary')).toBe('Cookie, Accept-Language')
  })

  it('Accept-Language 기반 로케일을 첫 방문 시 쿠키로 저장한다', () => {
    const res = proxy(
      req('/', { headers: { accept: 'text/html', 'accept-language': 'ko-KR,ko;q=0.9' } })
    )
    const cookie = res.cookies.get('locale')
    expect(cookie?.value).toBe('ko')
  })

  it('지원하지 않는 Accept-Language 는 기본 로케일(en)로 폴백', () => {
    const res = proxy(
      req('/', { headers: { accept: 'text/html', 'accept-language': 'fr-FR,fr;q=0.9' } })
    )
    expect(res.headers.get('Content-Language')).toBe('en')
  })

  it('Accept-Language 헤더가 없으면 기본 로케일(en)', () => {
    const res = proxy(req('/', { headers: { accept: 'text/html' } }))
    expect(res.headers.get('Content-Language')).toBe('en')
  })

  it('locale 쿠키가 이미 있으면 그 값을 쓰고 쿠키를 다시 굽지 않는다', () => {
    const res = proxy(
      req('/', {
        headers: { accept: 'text/html', 'accept-language': 'en-US' },
        cookies: { locale: 'ko' },
      })
    )
    expect(res.headers.get('Content-Language')).toBe('ko')
    // fromCookie=true 이므로 Set-Cookie 를 다시 굽지 않는다
    expect(res.cookies.get('locale')).toBeUndefined()
  })

  it('/admin HTML 경로는 CSP 에 unsafe-eval 을 허용한다', () => {
    const res = proxy(req('/admin/dashboard', { headers: { accept: 'text/html' } }))
    const csp = res.headers.get('Content-Security-Policy')
    expect(csp).toContain("'unsafe-eval'")
  })

  // NOTE: 비프로덕션(test) 빌드에서는 _isProd=false 라 공개 경로의 script-src
  // 에도 'unsafe-eval' 이 포함된다(dev 편의). 따라서 admin 전용 분기는 prod
  // 빌드에서만 의미가 있으며, 여기서는 admin 경로가 CSP 를 생성하는지만 검증.
  it('admin 경로도 정상적으로 CSP / 로케일 헤더를 생성한다', () => {
    const res = proxy(req('/admin/dashboard', { headers: { accept: 'text/html' } }))
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'self'")
    expect(res.headers.get('Content-Language')).toBeTruthy()
  })
})

describe('proxy config', () => {
  it('matcher 는 모든 경로를 대상으로 한다', async () => {
    const { config } = await import('@/proxy')
    expect(config.matcher).toBe('/:path*')
  })
})
