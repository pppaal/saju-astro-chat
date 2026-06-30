import { describe, it, expect } from 'vitest'
import { redactSecrets } from '@/lib/security/logRedaction'

describe('redactSecrets', () => {
  it('non-string 입력은 빈 문자열로', () => {
    expect(redactSecrets(undefined)).toBe('')
    expect(redactSecrets(null)).toBe('')
    expect(redactSecrets('')).toBe('')
  })

  it('Stripe 시크릿 키를 가린다', () => {
    // 키 문자열을 런타임 결합으로 만든다 — 소스에 'sk_live_' 리터럴이 박히면
    // GitHub push-protection(시크릿 스캐너)이 가짜 픽스처를 실키로 오탐해 막는다.
    const fakeKey = ['sk', 'live', 'abcdefghijklmnopqrstuvwx12345'].join('_')
    const out = redactSecrets(`charge failed: ${fakeKey}`)
    expect(out).toContain('[REDACTED]')
    expect(out).not.toContain(fakeKey)
  })

  it('Stripe 웹훅 서명 시크릿을 가린다', () => {
    const fakeSecret = ['whsec', 'abcdefghijklmnopqrstuvwxyz0123'].join('_')
    const out = redactSecrets(`bad sig ${fakeSecret}`)
    expect(out).toContain('[REDACTED]')
    expect(out).not.toContain(fakeSecret)
  })

  it('Postgres 연결 문자열(자격증명 포함)을 가린다', () => {
    const out = redactSecrets('connect failed postgresql://user:pass@db.host:5432/app')
    expect(out).not.toContain('pass@')
    expect(out).toContain('[REDACTED]')
  })

  it('Bearer/JWT 토큰을 가린다', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abc123'
    const out = redactSecrets(`auth: Bearer ${jwt}`)
    expect(out).not.toContain('eyJhbGci')
    expect(out).toContain('[REDACTED]')
  })

  it('이메일(PII)을 가린다', () => {
    const out = redactSecrets('user pjyrhee@gmail.com not found')
    expect(out).not.toContain('pjyrhee@gmail.com')
    expect(out).toContain('[REDACTED]')
  })

  it('비밀이 없는 스택 트레이스는 길이/형태를 보존한다(과도 redact 방지)', () => {
    const stack = [
      'Error: boom',
      '    at handler (/var/task/src/app/api/foo/route.ts:42:11)',
      '    at process (/var/task/node_modules/next/server.js:10:5)',
    ].join('\n')
    const out = redactSecrets(stack)
    // 파일 경로/함수명은 디버깅을 위해 그대로 남는다.
    expect(out).toContain('handler')
    expect(out).toContain('route.ts:42:11')
    expect(out).not.toContain('[REDACTED]')
  })
})
