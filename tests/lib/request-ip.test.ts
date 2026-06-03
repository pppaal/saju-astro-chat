import { describe, it, expect, afterEach } from 'vitest'
import { getClientIp } from '@/lib/request-ip'

describe('getClientIp', () => {
  it('should extract IP from x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should use first IP from x-forwarded-for list', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should trim whitespace in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should fallback to x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should fallback to cf-connecting-ip when cf-ray is present', () => {
    const headers = new Headers({
      'cf-connecting-ip': '172.16.0.1',
      'cf-ray': '8abc1234-DFW',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should NOT trust cf-connecting-ip without cf-ray (spoof guard)', () => {
    // Vercel does not strip client-supplied cf-connecting-ip. Without a
    // matching cf-ray, ignore the header and fall through to other sources.
    const headers = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should prioritize cf-connecting-ip over x-real-ip when cf-ray is present', () => {
    const headers = new Headers({
      'cf-connecting-ip': '172.16.0.1',
      'cf-ray': '8abc1234-DFW',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should fall through to x-forwarded-for when cf-connecting-ip lacks cf-ray', () => {
    const headers = new Headers({
      'cf-connecting-ip': '1.2.3.4',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should still use Vercel-native x-vercel-forwarded-for without any CF headers', () => {
    const headers = new Headers({
      'x-vercel-forwarded-for': '203.0.113.5',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('203.0.113.5')
  })

  it('should prioritize x-real-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'x-real-ip': '10.0.0.1',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should return unknown when no IP headers present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should skip empty values in x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': ' , , 192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })
})

/**
 * Cloudflare trust gating (spoofing protection).
 *
 * These cases simulate a NON-test production deployment that is not behind
 * Vercel or Cloudflare, where the only thing a forged `cf-ray` could do is
 * trick the extractor into trusting attacker-supplied forwarding headers.
 */
describe('getClientIp - Cloudflare trust gating', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV
  const ORIGINAL_VERCEL = process.env.VERCEL
  const ORIGINAL_TRUST_PROXY = process.env.TRUST_PROXY
  const ORIGINAL_TRUST_CLOUDFLARE = process.env.TRUST_CLOUDFLARE

  const restore = (key: string, value: string | undefined) => {
    if (value === undefined) delete (process.env as Record<string, string | undefined>)[key]
    else process.env[key] = value
  }

  afterEach(() => {
    restore('NODE_ENV', ORIGINAL_NODE_ENV)
    restore('VERCEL', ORIGINAL_VERCEL)
    restore('TRUST_PROXY', ORIGINAL_TRUST_PROXY)
    restore('TRUST_CLOUDFLARE', ORIGINAL_TRUST_CLOUDFLARE)
  })

  // Simulate a plain (non-Vercel, non-Cloudflare) production host.
  const enterUntrustedProd = () => {
    process.env.NODE_ENV = 'production'
    delete (process.env as Record<string, string | undefined>).VERCEL
    delete (process.env as Record<string, string | undefined>).TRUST_PROXY
    delete (process.env as Record<string, string | undefined>).TRUST_CLOUDFLARE
  }

  // remoteAddr is a public, non-trusted address so direct-IP fallback applies.
  const UNTRUSTED_REMOTE = '198.51.100.7'

  it('does NOT trust forged x-forwarded-for when cf-ray is forged and TRUST_CLOUDFLARE is unset', () => {
    enterUntrustedProd()

    const headers = new Headers({
      // Attacker forges a Cloudflare ray id on a host NOT behind Cloudflare.
      'cf-ray': '8abc1234-DFW',
      // ...then tries to rotate the rate-limit key with a forged client IP.
      'x-forwarded-for': '1.2.3.4',
    })

    // The forged cf-ray must NOT flip trust, so the real connection IP is used.
    expect(getClientIp(headers, UNTRUSTED_REMOTE)).toBe(UNTRUSTED_REMOTE)
  })

  it('does NOT trust forged x-real-ip when cf-ray is forged and TRUST_CLOUDFLARE is unset', () => {
    enterUntrustedProd()

    const headers = new Headers({
      'cf-ray': '8abc1234-DFW',
      'x-real-ip': '1.2.3.4',
    })

    expect(getClientIp(headers, UNTRUSTED_REMOTE)).toBe(UNTRUSTED_REMOTE)
  })

  it('does NOT trust forged cf-connecting-ip when cf-ray is forged and TRUST_CLOUDFLARE is unset', () => {
    enterUntrustedProd()

    const headers = new Headers({
      'cf-ray': '8abc1234-DFW',
      'cf-connecting-ip': '1.2.3.4',
    })

    expect(getClientIp(headers, UNTRUSTED_REMOTE)).toBe(UNTRUSTED_REMOTE)
  })

  it('falls back to "unknown" (not a forged header) when there is no remote address', () => {
    enterUntrustedProd()

    const headers = new Headers({
      'cf-ray': '8abc1234-DFW',
      'x-forwarded-for': '1.2.3.4',
    })

    expect(getClientIp(headers)).toBe('unknown')
  })

  it('uses the Cloudflare client IP when TRUST_CLOUDFLARE=true and cf headers are present', () => {
    enterUntrustedProd()
    process.env.TRUST_CLOUDFLARE = 'true'

    const headers = new Headers({
      'cf-ray': '8abc1234-DFW',
      'cf-connecting-ip': '203.0.113.9',
      // Lower priority / untrusted; CF IP must win.
      'x-forwarded-for': '1.2.3.4',
    })

    expect(getClientIp(headers, UNTRUSTED_REMOTE)).toBe('203.0.113.9')
  })

  it('with TRUST_CLOUDFLARE=true, trusts forwarding headers from the Cloudflare front', () => {
    enterUntrustedProd()
    process.env.TRUST_CLOUDFLARE = 'true'

    const headers = new Headers({
      'cf-ray': '8abc1234-DFW',
      'x-real-ip': '203.0.113.10',
    })

    expect(getClientIp(headers, UNTRUSTED_REMOTE)).toBe('203.0.113.10')
  })
})
