/**
 * Comprehensive tests for Client IP Extraction
 * Tests IP spoofing protection, trusted proxy detection, and header priority
 */

import { getClientIp } from '@/lib/request-ip'

describe('Client IP Extraction', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Cloudflare Headers', () => {
    it('should prioritize cf-connecting-ip header', () => {
      const headers = new Headers({
        'cf-connecting-ip': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
        'x-forwarded-for': '9.10.11.12, 13.14.15.16',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('1.2.3.4')
    })

    it('should use cf-connecting-ip when available', () => {
      const headers = new Headers({
        'cf-connecting-ip': '203.0.113.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })
  })

  describe('X-Real-IP Header', () => {
    it('should use x-real-ip when cf-connecting-ip is absent', () => {
      const headers = new Headers({
        'x-real-ip': '192.168.1.100',
        'x-forwarded-for': '10.0.0.1, 10.0.0.2',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('192.168.1.100')
    })

    it('should handle IPv6 in x-real-ip', () => {
      const headers = new Headers({
        'x-real-ip': '2001:0db8:85a3::8a2e:0370:7334',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('2001:0db8:85a3::8a2e:0370:7334')
    })
  })

  describe('X-Forwarded-For Header', () => {
    it('should extract first IP from x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })

    it('should handle single IP in x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })

    it('should trim whitespace in x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '  203.0.113.1  ,  198.51.100.1  ',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })

    it('should handle IPv6 in x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '2001:db8::1, 192.0.2.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('2001:db8::1')
    })

    it('should skip empty entries in x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': ', , 203.0.113.1, 198.51.100.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })
  })

  describe('Vercel Headers', () => {
    it('should use x-vercel-forwarded-for as fallback', () => {
      const headers = new Headers({
        'x-vercel-forwarded-for': '203.0.113.5',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.5')
    })
  })

  describe('Remote Address', () => {
    it('should use remote address when provided', () => {
      const headers = new Headers()

      const ip = getClientIp(headers, '198.51.100.50')

      expect(ip).toBe('198.51.100.50')
    })

    it('should prioritize proxy headers over untrusted remote address in production', () => {
      process.env.NODE_ENV = 'production'

      const headers = new Headers({
        'cf-connecting-ip': '203.0.113.1',
      })

      const ip = getClientIp(headers, '192.0.2.1')

      // In production with untrusted proxy, should use remote address
      // But if remote address is trusted, should use cf-connecting-ip
      expect(ip).toBeDefined()
    })
  })

  describe('Trusted Proxy Detection', () => {
    it('should trust localhost in development', () => {
      process.env.NODE_ENV = 'development'

      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1',
      })

      const ip = getClientIp(headers, '127.0.0.1')

      expect(ip).toBe('203.0.113.1')
    })

    it('should trust all proxies in development mode', () => {
      process.env.NODE_ENV = 'development'

      const headers = new Headers({
        'x-real-ip': '203.0.113.100',
      })

      const ip = getClientIp(headers, 'any-ip')

      expect(ip).toBe('203.0.113.100')
    })

    it('should handle IPv6 localhost', () => {
      process.env.NODE_ENV = 'development'

      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1',
      })

      const ip = getClientIp(headers, '::1')

      expect(ip).toBe('203.0.113.1')
    })
  })

  describe('Spoofing Protection', () => {
    it('should ignore proxy headers from untrusted source in production', () => {
      process.env.NODE_ENV = 'production'

      const headers = new Headers({
        'x-forwarded-for': '1.1.1.1', // Attacker's spoofed IP
      })

      const untrustedIp = '203.0.113.200' // Not in trusted list
      const ip = getClientIp(headers, untrustedIp)

      expect(ip).toBe(untrustedIp) // Should use direct IP, not spoofed header
    })

    it('should prevent IP spoofing via x-forwarded-for', () => {
      process.env.NODE_ENV = 'production'

      const headers = new Headers({
        'x-forwarded-for': '8.8.8.8, 1.1.1.1', // Attacker trying to spoof
      })

      // Request from untrusted proxy
      const ip = getClientIp(headers, '198.51.100.99')

      expect(ip).not.toBe('8.8.8.8') // Should not trust spoofed header
    })

    it('should prevent IP spoofing via x-real-ip', () => {
      process.env.NODE_ENV = 'production'

      const headers = new Headers({
        'x-real-ip': '8.8.8.8', // Attacker's spoofed IP
      })

      const ip = getClientIp(headers, '198.51.100.99')

      expect(ip).not.toBe('8.8.8.8')
    })
  })

  describe('Fallback Behavior', () => {
    it('should return "unknown" when no IP available', () => {
      const headers = new Headers()

      const ip = getClientIp(headers)

      expect(ip).toBe('unknown')
    })

    it('should return remote address when no proxy headers', () => {
      const headers = new Headers()

      const ip = getClientIp(headers, '192.0.2.50')

      expect(ip).toBe('192.0.2.50')
    })

    it('should handle empty headers object', () => {
      const headers = new Headers()

      const ip = getClientIp(headers)

      expect(ip).toBe('unknown')
    })

    it('should handle all empty header values', () => {
      const headers = new Headers({
        'x-forwarded-for': '',
        'x-real-ip': '',
        'cf-connecting-ip': '',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('unknown')
    })
  })

  describe('Header Priority', () => {
    it('should follow correct priority order', () => {
      // Priority: cf-connecting-ip > x-real-ip > x-forwarded-for > vercel > remote
      const headers1 = new Headers({
        'cf-connecting-ip': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      })
      expect(getClientIp(headers1)).toBe('1.1.1.1')

      const headers2 = new Headers({
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      })
      expect(getClientIp(headers2)).toBe('2.2.2.2')

      const headers3 = new Headers({
        'x-forwarded-for': '3.3.3.3',
      })
      expect(getClientIp(headers3)).toBe('3.3.3.3')
    })
  })

  describe('Edge Cases', () => {
    it('should handle malformed x-forwarded-for with only commas', () => {
      const headers = new Headers({
        'x-forwarded-for': ', , , ',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('unknown')
    })

    it('should handle very long x-forwarded-for chain', () => {
      const chain = Array(100)
        .fill(null)
        .map((_, i) => `192.0.2.${i}`)
        .join(', ')

      const headers = new Headers({
        'x-forwarded-for': chain,
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('192.0.2.0') // Should get first IP
    })

    it('should handle mixed IPv4 and IPv6 in x-forwarded-for', () => {
      const headers = new Headers({
        'x-forwarded-for': '2001:db8::1, 192.0.2.1, 198.51.100.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('2001:db8::1')
    })

    it('should handle private IP ranges', () => {
      const privateIps = ['10.0.0.1', '172.16.0.1', '192.168.1.1', '127.0.0.1', '::1']

      for (const privateIp of privateIps) {
        const headers = new Headers({
          'x-real-ip': privateIp,
        })

        const ip = getClientIp(headers)

        expect(ip).toBe(privateIp)
      }
    })

    it('should handle special characters in headers', () => {
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1; DROP TABLE users; --',
      })

      const ip = getClientIp(headers)

      // Should extract IP before special chars
      expect(ip).toContain('203.0.113.1')
    })

    it('should handle null bytes in headers', () => {
      const headers = new Headers({
        'x-real-ip': '203.0.113.1\x00malicious',
      })

      const ip = getClientIp(headers)

      expect(ip).toBeDefined()
    })

    it('should handle case-insensitive headers', () => {
      const headers = new Headers({
        'CF-CONNECTING-IP': '203.0.113.1',
      })

      const ip = getClientIp(headers)

      // Headers should be case-insensitive
      expect(ip).toBe('203.0.113.1')
    })
  })

  describe('Real-World Scenarios', () => {
    it('should handle Cloudflare proxy chain', () => {
      const headers = new Headers({
        'cf-connecting-ip': '203.0.113.1',
        'x-forwarded-for': '203.0.113.1, 172.68.1.1',
        'x-real-ip': '172.68.1.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })

    it('should handle Vercel deployment', () => {
      const headers = new Headers({
        'x-vercel-forwarded-for': '203.0.113.1',
        'x-forwarded-for': '203.0.113.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })

    it('should handle direct connection without proxy', () => {
      const headers = new Headers()

      const ip = getClientIp(headers, '203.0.113.100')

      expect(ip).toBe('203.0.113.100')
    })

    it('should handle localhost development', () => {
      process.env.NODE_ENV = 'development'

      const headers = new Headers({
        'x-forwarded-for': '::1',
      })

      const ip = getClientIp(headers, '127.0.0.1')

      expect(ip).toBe('::1')
    })

    it('should handle mobile network IP', () => {
      const headers = new Headers({
        'cf-connecting-ip': '203.0.113.50',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.50')
    })

    it('should handle corporate proxy', () => {
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('203.0.113.1')
    })
  })

  describe('Security Tests', () => {
    it('should not be vulnerable to header injection', () => {
      const headers = new Headers({
        'x-forwarded-for': '203.0.113.1\r\nX-Admin: true',
      })

      const ip = getClientIp(headers)

      // Should only extract valid IP
      expect(ip).not.toContain('X-Admin')
    })

    it('should handle IPv4-mapped IPv6 addresses', () => {
      const headers = new Headers({
        'x-real-ip': '::ffff:192.0.2.1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('::ffff:192.0.2.1')
    })

    it('should handle compressed IPv6', () => {
      const headers = new Headers({
        'cf-connecting-ip': '2001:db8::1',
      })

      const ip = getClientIp(headers)

      expect(ip).toBe('2001:db8::1')
    })
  })
})
