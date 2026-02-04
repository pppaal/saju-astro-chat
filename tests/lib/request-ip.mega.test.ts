/**
 * Request IP MEGA Test Suite
 * Comprehensive IP extraction testing with all edge cases
 */
import { describe, it, expect } from 'vitest'
import { getClientIp } from '@/lib/request-ip'

describe('request-ip MEGA - IPv4 variations', () => {
  describe('Private IP ranges', () => {
    const privateIPs = [
      '10.0.0.1',
      '10.255.255.254',
      '172.16.0.1',
      '172.31.255.254',
      '192.168.0.1',
      '192.168.255.254',
      '127.0.0.1',
      '127.0.0.2',
    ]

    privateIPs.forEach((ip) => {
      it(`should handle private IP ${ip}`, () => {
        const headers = new Headers({ 'x-forwarded-for': ip })
        expect(getClientIp(headers)).toBe(ip)
      })
    })
  })

  describe('Public IP ranges', () => {
    const publicIPs = [
      '8.8.8.8',
      '1.1.1.1',
      '208.67.222.222',
      '9.9.9.9',
      '4.4.4.4',
      '64.6.64.6',
      '74.82.42.42',
      '156.154.70.1',
      '198.18.0.1',
      '203.0.113.1',
    ]

    publicIPs.forEach((ip) => {
      it(`should handle public IP ${ip}`, () => {
        const headers = new Headers({ 'x-forwarded-for': ip })
        expect(getClientIp(headers)).toBe(ip)
      })
    })
  })

  describe('Edge case IPv4 addresses', () => {
    it('should handle 0.0.0.0', () => {
      const headers = new Headers({ 'x-forwarded-for': '0.0.0.0' })
      expect(getClientIp(headers)).toBe('0.0.0.0')
    })

    it('should handle 255.255.255.255', () => {
      const headers = new Headers({ 'x-forwarded-for': '255.255.255.255' })
      expect(getClientIp(headers)).toBe('255.255.255.255')
    })

    it('should handle 1.0.0.1', () => {
      const headers = new Headers({ 'x-forwarded-for': '1.0.0.1' })
      expect(getClientIp(headers)).toBe('1.0.0.1')
    })

    it('should handle 254.254.254.254', () => {
      const headers = new Headers({ 'x-forwarded-for': '254.254.254.254' })
      expect(getClientIp(headers)).toBe('254.254.254.254')
    })
  })
})

describe('request-ip MEGA - IPv6 variations', () => {
  const ipv6Addresses = [
    '::1',
    '::',
    '2001:db8::1',
    '2001:0db8:0000:0000:0000:0000:0000:0001',
    'fe80::1',
    'fe80::dead:beef',
    '2001:db8:85a3::8a2e:370:7334',
    '::ffff:192.0.2.1',
    '::ffff:c000:0201',
    '2001:db8::8a2e:370:7334',
    'fd00::1',
    'fc00::1',
  ]

  ipv6Addresses.forEach((ip) => {
    it(`should handle IPv6 ${ip}`, () => {
      const headers = new Headers({ 'x-forwarded-for': ip })
      expect(getClientIp(headers)).toBe(ip)
    })
  })
})

describe('request-ip MEGA - x-forwarded-for multiple IPs', () => {
  it('should extract first from 2 IPs', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should extract first from 3 IPs', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should extract first from 5 IPs', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3, 4.4.4.4, 5.5.5.5',
    })
    expect(getClientIp(headers)).toBe('1.1.1.1')
  })

  it('should extract first from 10 IPs', () => {
    const ips = Array.from({ length: 10 }, (_, i) => `${i}.${i}.${i}.${i}`).join(', ')
    const headers = new Headers({ 'x-forwarded-for': ips })
    expect(getClientIp(headers)).toBe('0.0.0.0')
  })
})

describe('request-ip MEGA - whitespace handling', () => {
  it('should trim leading spaces', () => {
    const headers = new Headers({ 'x-forwarded-for': '   192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should trim trailing spaces', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1   ' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should trim both sides', () => {
    const headers = new Headers({ 'x-forwarded-for': '   192.168.1.1   ' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle tabs', () => {
    const headers = new Headers({ 'x-forwarded-for': '\t\t192.168.1.1\t\t' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle mixed whitespace', () => {
    const headers = new Headers({ 'x-forwarded-for': ' \t 192.168.1.1 \t ' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle spaces around commas', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1 , 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle multiple spaces around commas', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1   ,   10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle no spaces around commas', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1,10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })
})

describe('request-ip MEGA - empty value handling', () => {
  it('should skip single empty value', () => {
    const headers = new Headers({ 'x-forwarded-for': ', 192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should skip multiple empty values', () => {
    const headers = new Headers({ 'x-forwarded-for': ', , , 192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should skip trailing empty values', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, , , ' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should skip empty values in middle', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1, , 10.0.0.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should return unknown for all empty', () => {
    const headers = new Headers({ 'x-forwarded-for': ', , , ' })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should return unknown for just spaces', () => {
    const headers = new Headers({ 'x-forwarded-for': '   ' })
    expect(getClientIp(headers)).toBe('unknown')
  })
})

describe('request-ip MEGA - header priority', () => {
  // Actual priority: cf-connecting-ip > x-real-ip > x-forwarded-for
  it('should prefer cf-connecting-ip over x-real-ip', () => {
    const headers = new Headers({
      'cf-connecting-ip': '172.16.0.1',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should prefer cf-connecting-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'cf-connecting-ip': '172.16.0.1',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should prefer x-real-ip over x-forwarded-for', () => {
    const headers = new Headers({
      'x-real-ip': '10.0.0.1',
      'x-forwarded-for': '192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should use x-real-ip when x-forwarded-for is empty', () => {
    const headers = new Headers({
      'x-forwarded-for': '',
      'x-real-ip': '10.0.0.1',
    })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should use cf-connecting-ip when others are empty', () => {
    const headers = new Headers({
      'x-forwarded-for': '',
      'x-real-ip': '',
      'cf-connecting-ip': '172.16.0.1',
    })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should use all three headers with cf-connecting-ip winning', () => {
    const headers = new Headers({
      'x-forwarded-for': '1.1.1.1',
      'x-real-ip': '2.2.2.2',
      'cf-connecting-ip': '3.3.3.3',
    })
    expect(getClientIp(headers)).toBe('3.3.3.3')
  })
})

describe('request-ip MEGA - x-real-ip fallback', () => {
  it('should use x-real-ip when available', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should handle x-real-ip with spaces', () => {
    const headers = new Headers({ 'x-real-ip': '  10.0.0.1  ' })
    expect(getClientIp(headers)).toBe('  10.0.0.1  ')
  })

  it('should use x-real-ip for IPv6', () => {
    const headers = new Headers({ 'x-real-ip': '::1' })
    expect(getClientIp(headers)).toBe('::1')
  })

  it('should use x-real-ip for localhost', () => {
    const headers = new Headers({ 'x-real-ip': '127.0.0.1' })
    expect(getClientIp(headers)).toBe('127.0.0.1')
  })
})

describe('request-ip MEGA - cf-connecting-ip fallback', () => {
  it('should use cf-connecting-ip when available', () => {
    const headers = new Headers({ 'cf-connecting-ip': '172.16.0.1' })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should handle cf-connecting-ip with spaces', () => {
    const headers = new Headers({ 'cf-connecting-ip': '  172.16.0.1  ' })
    expect(getClientIp(headers)).toBe('  172.16.0.1  ')
  })

  it('should use cf-connecting-ip for IPv6', () => {
    const headers = new Headers({ 'cf-connecting-ip': '2001:db8::1' })
    expect(getClientIp(headers)).toBe('2001:db8::1')
  })

  it('should use cf-connecting-ip for Cloudflare IPv6', () => {
    const headers = new Headers({ 'cf-connecting-ip': '2606:4700::1111' })
    expect(getClientIp(headers)).toBe('2606:4700::1111')
  })
})

describe('request-ip MEGA - unknown fallback', () => {
  it('should return unknown with no headers', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should return unknown with empty x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '' })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should return unknown with only commas', () => {
    const headers = new Headers({ 'x-forwarded-for': ',,,' })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should return unknown with unrelated headers', () => {
    const headers = new Headers({
      'user-agent': 'Mozilla/5.0',
      accept: 'text/html',
    })
    expect(getClientIp(headers)).toBe('unknown')
  })
})

describe('request-ip MEGA - header case sensitivity', () => {
  it('should handle lowercase x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle uppercase X-FORWARDED-FOR', () => {
    const headers = new Headers({ 'X-FORWARDED-FOR': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle mixed case X-Forwarded-For', () => {
    const headers = new Headers({ 'X-Forwarded-For': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle lowercase x-real-ip', () => {
    const headers = new Headers({ 'x-real-ip': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should handle uppercase X-REAL-IP', () => {
    const headers = new Headers({ 'X-REAL-IP': '10.0.0.1' })
    expect(getClientIp(headers)).toBe('10.0.0.1')
  })

  it('should handle lowercase cf-connecting-ip', () => {
    const headers = new Headers({ 'cf-connecting-ip': '172.16.0.1' })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })

  it('should handle uppercase CF-CONNECTING-IP', () => {
    const headers = new Headers({ 'CF-CONNECTING-IP': '172.16.0.1' })
    expect(getClientIp(headers)).toBe('172.16.0.1')
  })
})

describe('request-ip MEGA - real-world scenarios', () => {
  it('should handle Cloudflare proxy chain', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1, 198.41.128.1',
      'cf-connecting-ip': '203.0.113.1',
    })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('should handle nginx proxy', () => {
    const headers = new Headers({
      'x-forwarded-for': '192.168.1.100',
      'x-real-ip': '192.168.1.100',
    })
    expect(getClientIp(headers)).toBe('192.168.1.100')
  })

  it('should handle AWS ALB', () => {
    const headers = new Headers({
      'x-forwarded-for': '54.240.0.1, 192.168.1.1',
    })
    expect(getClientIp(headers)).toBe('54.240.0.1')
  })

  it('should handle multiple proxy hops', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
    })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })

  it('should handle direct connection (no proxies)', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.1',
    })
    expect(getClientIp(headers)).toBe('203.0.113.1')
  })
})

describe('request-ip MEGA - edge cases', () => {
  it('should handle very long IP list', () => {
    const ips = Array.from({ length: 100 }, (_, i) => `${i}.0.0.1`).join(', ')
    const headers = new Headers({ 'x-forwarded-for': ips })
    expect(getClientIp(headers)).toBe('0.0.0.1')
  })

  it('should handle single IP with no commas', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should handle all headers empty', () => {
    const headers = new Headers({
      'x-forwarded-for': '',
      'x-real-ip': '',
      'cf-connecting-ip': '',
    })
    expect(getClientIp(headers)).toBe('unknown')
  })

  it('should handle malformed but valid IPs', () => {
    const headers = new Headers({ 'x-forwarded-for': '001.002.003.004' })
    expect(getClientIp(headers)).toBe('001.002.003.004')
  })
})

describe('request-ip MEGA - Headers instance variations', () => {
  it('should work with Headers constructor object', () => {
    const headers = new Headers({ 'x-forwarded-for': '192.168.1.1' })
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should work with Headers set method', () => {
    const headers = new Headers()
    headers.set('x-forwarded-for', '192.168.1.1')
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should work with Headers append method', () => {
    const headers = new Headers()
    headers.append('x-forwarded-for', '192.168.1.1')
    expect(getClientIp(headers)).toBe('192.168.1.1')
  })

  it('should work with empty Headers', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('unknown')
  })
})
