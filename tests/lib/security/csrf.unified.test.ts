/**
 * Unified CSRF validator tests
 *
 * Asserts the SINGLE shared validateOrigin (src/lib/security/csrf.ts) now used
 * by BOTH the edge middleware (middleware.ts) and the API context layer
 * (src/lib/api/middleware/context.ts). Focuses on the consolidated ruleset:
 *  - same-origin / same-host requests are allowed (incl. x-forwarded-host)
 *  - cross-origin requests are blocked
 *  - the STRICT dev localhost allowlist (explicit ports only, DNS-rebinding safe)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { validateOrigin } from '@/lib/security/csrf'

describe('CSRF unified validator', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('same-origin allowed', () => {
    it('allows when origin host matches the Host header', () => {
      const headers = new Headers({
        origin: 'https://destinypal.com',
        host: 'destinypal.com',
      })
      expect(validateOrigin(headers)).toBe(true)
    })

    it('allows when origin matches NEXT_PUBLIC_BASE_URL (no host header)', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_BASE_URL = 'https://destinypal.com'
      const headers = new Headers({ origin: 'https://destinypal.com' })
      expect(validateOrigin(headers)).toBe(true)
    })

    it('allows when origin host matches an x-forwarded-host value', () => {
      const headers = new Headers({
        origin: 'https://preview.destinypal.com',
        host: 'internal-edge.local',
        'x-forwarded-host': 'preview.destinypal.com',
      })
      expect(validateOrigin(headers)).toBe(true)
    })

    it('allows via referer fallback when origin is absent', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_BASE_URL = 'https://destinypal.com'
      const headers = new Headers({ referer: 'https://destinypal.com/dashboard' })
      expect(validateOrigin(headers)).toBe(true)
    })
  })

  describe('cross-origin blocked', () => {
    it('blocks a foreign origin even when the Host header is ours', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_BASE_URL = 'https://destinypal.com'
      const headers = new Headers({
        origin: 'https://attacker.com',
        host: 'destinypal.com',
      })
      expect(validateOrigin(headers)).toBe(false)
    })

    it('blocks a foreign referer when origin is absent', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_BASE_URL = 'https://destinypal.com'
      const headers = new Headers({ referer: 'https://attacker.com/phish' })
      expect(validateOrigin(headers)).toBe(false)
    })

    it('blocks missing origin AND referer in production', () => {
      process.env.NODE_ENV = 'production'
      const headers = new Headers({ host: 'destinypal.com' })
      expect(validateOrigin(headers)).toBe(false)
    })
  })

  describe('strict dev localhost allowlist (DNS-rebinding protection)', () => {
    it('allows localhost on an allowlisted dev port with no origin/referer', () => {
      process.env.NODE_ENV = 'development'
      for (const host of ['localhost:3000', 'localhost:3001', 'localhost:4000']) {
        expect(validateOrigin(new Headers({ host }))).toBe(true)
      }
    })

    it('allows 127.0.0.1 on an allowlisted dev port', () => {
      process.env.NODE_ENV = 'development'
      expect(validateOrigin(new Headers({ host: '127.0.0.1:3000' }))).toBe(true)
    })

    it('blocks localhost on a NON-allowlisted dev port (tightened)', () => {
      process.env.NODE_ENV = 'development'
      // The previous loose lib check (host.startsWith("localhost")) would have
      // allowed these; the unified strict allowlist must reject them.
      for (const host of ['localhost:5173', 'localhost:8080', 'localhost']) {
        expect(validateOrigin(new Headers({ host }))).toBe(false)
      }
    })

    it('blocks a host that merely starts with localhost (DNS-rebinding)', () => {
      process.env.NODE_ENV = 'development'
      // e.g. attacker-controlled "localhost.evil.com:3000"
      expect(validateOrigin(new Headers({ host: 'localhost.evil.com:3000' }))).toBe(
        false
      )
      expect(
        validateOrigin(new Headers({ host: '127.0.0.1.evil.com:3000' }))
      ).toBe(false)
    })

    it('does not apply the dev allowlist in production', () => {
      process.env.NODE_ENV = 'production'
      expect(validateOrigin(new Headers({ host: 'localhost:3000' }))).toBe(false)
    })
  })
})
