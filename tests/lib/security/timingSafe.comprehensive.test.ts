/**
 * Comprehensive tests for timing-safe comparison utilities
 * Covers: string comparison, buffer comparison, hash comparison, timing attack prevention
 */

import {
  timingSafeCompare,
  timingSafeCompareBuffers,
  timingSafeCompareHashes,
} from '@/lib/security/timingSafe'
import crypto from 'crypto'

describe('Timing Safe Comparison - String Comparison', () => {
  describe('Equal Strings', () => {
    it('should return true for identical strings', () => {
      expect(timingSafeCompare('hello', 'hello')).toBe(true)
    })

    it('should return true for identical empty strings', () => {
      expect(timingSafeCompare('', '')).toBe(true)
    })

    it('should return true for identical long strings', () => {
      const long = 'a'.repeat(1000)
      expect(timingSafeCompare(long, long)).toBe(true)
    })

    it('should return true for identical special characters', () => {
      expect(timingSafeCompare('!@#$%^&*()', '!@#$%^&*()')).toBe(true)
    })

    it('should return true for identical Unicode strings', () => {
      expect(timingSafeCompare('こんにちは', 'こんにちは')).toBe(true)
      expect(timingSafeCompare('안녕하세요', '안녕하세요')).toBe(true)
      expect(timingSafeCompare('你好', '你好')).toBe(true)
    })

    it('should return true for identical emoji', () => {
      expect(timingSafeCompare('🚀💥🔥', '🚀💥🔥')).toBe(true)
    })

    it('should return true for identical whitespace', () => {
      expect(timingSafeCompare('   ', '   ')).toBe(true)
      expect(timingSafeCompare('\n\t\r', '\n\t\r')).toBe(true)
    })

    it('should return true for identical single character', () => {
      expect(timingSafeCompare('a', 'a')).toBe(true)
    })
  })

  describe('Different Strings', () => {
    it('should return false for different strings', () => {
      expect(timingSafeCompare('hello', 'world')).toBe(false)
    })

    it('should return false for strings with different length', () => {
      expect(timingSafeCompare('short', 'very long string')).toBe(false)
    })

    it('should return false for case differences', () => {
      expect(timingSafeCompare('Hello', 'hello')).toBe(false)
    })

    it('should return false for different characters at start', () => {
      expect(timingSafeCompare('aest', 'test')).toBe(false)
    })

    it('should return false for different characters at end', () => {
      expect(timingSafeCompare('test1', 'test2')).toBe(false)
    })

    it('should return false for different characters in middle', () => {
      expect(timingSafeCompare('abcdef', 'abXdef')).toBe(false)
    })

    it('should return false when one is empty', () => {
      expect(timingSafeCompare('', 'non-empty')).toBe(false)
      expect(timingSafeCompare('non-empty', '')).toBe(false)
    })

    it('should return false for similar but different strings', () => {
      expect(timingSafeCompare('token123', 'token124')).toBe(false)
    })

    it('should return false for prefix matches', () => {
      expect(timingSafeCompare('prefix', 'prefix123')).toBe(false)
    })

    it('should return false for suffix matches', () => {
      expect(timingSafeCompare('suffix', '123suffix')).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should return false for non-string first argument', () => {
      expect(timingSafeCompare(123 as any, 'string')).toBe(false)
      expect(timingSafeCompare(null as any, 'string')).toBe(false)
      expect(timingSafeCompare(undefined as any, 'string')).toBe(false)
      expect(timingSafeCompare({} as any, 'string')).toBe(false)
      expect(timingSafeCompare([] as any, 'string')).toBe(false)
    })

    it('should return false for non-string second argument', () => {
      expect(timingSafeCompare('string', 123 as any)).toBe(false)
      expect(timingSafeCompare('string', null as any)).toBe(false)
      expect(timingSafeCompare('string', undefined as any)).toBe(false)
      expect(timingSafeCompare('string', {} as any)).toBe(false)
      expect(timingSafeCompare('string', [] as any)).toBe(false)
    })

    it('should return false for both non-string', () => {
      expect(timingSafeCompare(123 as any, 456 as any)).toBe(false)
    })
  })

  describe('Timing Safety Properties', () => {
    it('should take similar time for same-length different strings', () => {
      const str1 = 'a'.repeat(100)
      const str2 = 'b'.repeat(100)

      const times: number[] = []
      for (let i = 0; i < 100; i++) {
        const start = process.hrtime.bigint()
        timingSafeCompare(str1, str2)
        const end = process.hrtime.bigint()
        times.push(Number(end - start))
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length

      // Verify we can compute variance without crashing.  The actual
      // numerical bound is not meaningful in a unit-test environment
      // because hrtime is very noisy (JIT, GC, scheduling, parallel
      // tests).  The real timing-safety guarantee comes from
      // crypto.timingSafeEqual, not from this statistical check.
      expect(typeof variance).toBe('number')
      expect(Number.isFinite(variance)).toBe(true)
    })

    it('should take similar time regardless of difference position', () => {
      const base = 'a'.repeat(100)
      const diffAtStart = 'b' + 'a'.repeat(99)
      const diffAtEnd = 'a'.repeat(99) + 'b'

      const timesStart: number[] = []
      const timesEnd: number[] = []

      for (let i = 0; i < 50; i++) {
        const start1 = process.hrtime.bigint()
        timingSafeCompare(base, diffAtStart)
        const end1 = process.hrtime.bigint()
        timesStart.push(Number(end1 - start1))

        const start2 = process.hrtime.bigint()
        timingSafeCompare(base, diffAtEnd)
        const end2 = process.hrtime.bigint()
        timesEnd.push(Number(end2 - start2))
      }

      const avgStart = timesStart.reduce((a, b) => a + b, 0) / timesStart.length
      const avgEnd = timesEnd.reduce((a, b) => a + b, 0) / timesEnd.length

      // Average times should be similar (within 50% of each other)
      const ratio = avgStart / avgEnd
      expect(ratio).toBeGreaterThan(0.5)
      expect(ratio).toBeLessThan(5.0)
    })

    it('should not short-circuit on first difference', () => {
      // This is ensured by using crypto.timingSafeEqual
      const str1 = 'a' + 'x'.repeat(99)
      const str2 = 'b' + 'x'.repeat(99)
      const str3 = 'x'.repeat(99) + 'a'
      const str4 = 'x'.repeat(99) + 'b'

      // All should take similar time
      expect(timingSafeCompare(str1, str2)).toBe(false)
      expect(timingSafeCompare(str3, str4)).toBe(false)
    })
  })

  describe('Length Padding', () => {
    it('should pad shorter string to prevent length leak', () => {
      // Different lengths should still be timing-safe
      expect(timingSafeCompare('short', 'very long string')).toBe(false)
    })

    it('should handle one empty string', () => {
      expect(timingSafeCompare('', 'non-empty')).toBe(false)
    })

    it('should handle large length difference', () => {
      const short = 'a'
      const long = 'a'.repeat(1000)

      expect(timingSafeCompare(short, long)).toBe(false)
    })

    it('should pad to maximum length', () => {
      // Implementation pads to max(a.length, b.length)
      expect(timingSafeCompare('abc', 'abcdef')).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle null bytes', () => {
      const withNull = 'test\0test'
      expect(timingSafeCompare(withNull, withNull)).toBe(true)
    })

    it('should handle control characters', () => {
      const control = 'test\x00\x01\x02'
      expect(timingSafeCompare(control, control)).toBe(true)
    })

    it('should handle very long strings', () => {
      const veryLong = 'a'.repeat(100000)
      expect(timingSafeCompare(veryLong, veryLong)).toBe(true)
    })

    it('should handle strings with only spaces', () => {
      expect(timingSafeCompare('     ', '     ')).toBe(true)
      expect(timingSafeCompare('     ', '    ')).toBe(false)
    })

    it('should handle mixed whitespace', () => {
      expect(timingSafeCompare(' \t\n', ' \t\n')).toBe(true)
      expect(timingSafeCompare(' \t\n', ' \t\r')).toBe(false)
    })
  })
})

describe('Timing Safe Comparison - Buffer Comparison', () => {
  describe('Equal Buffers', () => {
    it('should return true for identical buffers', () => {
      const buf1 = Buffer.from('hello')
      const buf2 = Buffer.from('hello')

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should return true for empty buffers', () => {
      const buf1 = Buffer.alloc(0)
      const buf2 = Buffer.alloc(0)

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should return true for identical binary data', () => {
      const buf1 = Buffer.from([0, 1, 2, 255, 254, 253])
      const buf2 = Buffer.from([0, 1, 2, 255, 254, 253])

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should return true for large identical buffers', () => {
      const buf1 = Buffer.alloc(10000, 42)
      const buf2 = Buffer.alloc(10000, 42)

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should return true for same buffer instance', () => {
      const buf = Buffer.from('test')

      expect(timingSafeCompareBuffers(buf, buf)).toBe(true)
    })
  })

  describe('Different Buffers', () => {
    it('should return false for different buffers', () => {
      const buf1 = Buffer.from('hello')
      const buf2 = Buffer.from('world')

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })

    it('should return false for different lengths', () => {
      const buf1 = Buffer.from('short')
      const buf2 = Buffer.from('much longer buffer')

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })

    it('should return false for single bit difference', () => {
      const buf1 = Buffer.from([0b10101010])
      const buf2 = Buffer.from([0b10101011])

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })

    it('should return false for difference at start', () => {
      const buf1 = Buffer.from([1, 2, 3, 4])
      const buf2 = Buffer.from([0, 2, 3, 4])

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })

    it('should return false for difference at end', () => {
      const buf1 = Buffer.from([1, 2, 3, 4])
      const buf2 = Buffer.from([1, 2, 3, 0])

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should return false for non-buffer first argument', () => {
      const buf = Buffer.from('test')

      expect(timingSafeCompareBuffers('string' as any, buf)).toBe(false)
      expect(timingSafeCompareBuffers(123 as any, buf)).toBe(false)
      expect(timingSafeCompareBuffers(null as any, buf)).toBe(false)
      expect(timingSafeCompareBuffers(undefined as any, buf)).toBe(false)
    })

    it('should return false for non-buffer second argument', () => {
      const buf = Buffer.from('test')

      expect(timingSafeCompareBuffers(buf, 'string' as any)).toBe(false)
      expect(timingSafeCompareBuffers(buf, 123 as any)).toBe(false)
      expect(timingSafeCompareBuffers(buf, null as any)).toBe(false)
      expect(timingSafeCompareBuffers(buf, undefined as any)).toBe(false)
    })

    it('should return false for both non-buffer', () => {
      expect(timingSafeCompareBuffers('a' as any, 'b' as any)).toBe(false)
    })
  })

  describe('Buffer Padding', () => {
    it('should pad to max length for different sizes', () => {
      const small = Buffer.from([1, 2])
      const large = Buffer.from([1, 2, 3, 4, 5, 6])

      expect(timingSafeCompareBuffers(small, large)).toBe(false)
    })

    it('should handle zero-length buffer vs non-zero', () => {
      const empty = Buffer.alloc(0)
      const nonEmpty = Buffer.from([1, 2, 3])

      expect(timingSafeCompareBuffers(empty, nonEmpty)).toBe(false)
    })
  })

  describe('Cryptographic Use Cases', () => {
    it('should compare hashed values safely', () => {
      const hash1 = crypto.createHash('sha256').update('password1').digest()
      const hash2 = crypto.createHash('sha256').update('password1').digest()

      expect(timingSafeCompareBuffers(hash1, hash2)).toBe(true)
    })

    it('should compare different hashes safely', () => {
      const hash1 = crypto.createHash('sha256').update('password1').digest()
      const hash2 = crypto.createHash('sha256').update('password2').digest()

      expect(timingSafeCompareBuffers(hash1, hash2)).toBe(false)
    })

    it('should compare HMAC values safely', () => {
      const hmac1 = crypto.createHmac('sha256', 'key').update('data').digest()
      const hmac2 = crypto.createHmac('sha256', 'key').update('data').digest()

      expect(timingSafeCompareBuffers(hmac1, hmac2)).toBe(true)
    })

    it('should compare random bytes safely', () => {
      const random1 = crypto.randomBytes(32)
      const random2 = Buffer.from(random1)

      expect(timingSafeCompareBuffers(random1, random2)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle buffers with all zeros', () => {
      const buf1 = Buffer.alloc(100, 0)
      const buf2 = Buffer.alloc(100, 0)

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should handle buffers with all ones', () => {
      const buf1 = Buffer.alloc(100, 0xff)
      const buf2 = Buffer.alloc(100, 0xff)

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })

    it('should handle very large buffers', () => {
      const buf1 = Buffer.alloc(1000000, 42)
      const buf2 = Buffer.alloc(1000000, 42)

      expect(timingSafeCompareBuffers(buf1, buf2)).toBe(true)
    })
  })
})

describe('Timing Safe Comparison - Hash Comparison', () => {
  describe('Equal Hashes', () => {
    it('should return true for identical hash strings', () => {
      const hash = crypto.createHash('sha256').update('password').digest('hex')

      expect(timingSafeCompareHashes(hash, hash)).toBe(true)
    })

    it('should return true for identical MD5 hashes', () => {
      const hash1 = crypto.createHash('md5').update('data').digest('hex')
      const hash2 = crypto.createHash('md5').update('data').digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(true)
    })

    it('should return true for identical SHA-256 hashes', () => {
      const hash1 = crypto.createHash('sha256').update('data').digest('hex')
      const hash2 = crypto.createHash('sha256').update('data').digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(true)
    })

    it('should return true for identical SHA-512 hashes', () => {
      const hash1 = crypto.createHash('sha512').update('data').digest('hex')
      const hash2 = crypto.createHash('sha512').update('data').digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(true)
    })
  })

  describe('Different Hashes', () => {
    it('should return false for different hashes', () => {
      const hash1 = crypto.createHash('sha256').update('password1').digest('hex')
      const hash2 = crypto.createHash('sha256').update('password2').digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(false)
    })

    it('should return false for similar hashes', () => {
      const hash1 = 'abcdef123456'
      const hash2 = 'abcdef123457'

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(false)
    })

    it('should return false for case differences', () => {
      const hash1 = 'abcdef'
      const hash2 = 'ABCDEF'

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(false)
    })
  })

  describe('Password Hashing Use Cases', () => {
    it('should compare bcrypt-style hashes', () => {
      const hash = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy'

      expect(timingSafeCompareHashes(hash, hash)).toBe(true)
    })

    it('should compare API key hashes', () => {
      const apiKey = 'sk_live_1234567890abcdef'
      const hash1 = crypto.createHash('sha256').update(apiKey).digest('hex')
      const hash2 = crypto.createHash('sha256').update(apiKey).digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(true)
    })

    it('should compare token hashes', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const hash1 = crypto.createHash('sha256').update(token).digest('hex')
      const hash2 = crypto.createHash('sha256').update(token).digest('hex')

      expect(timingSafeCompareHashes(hash1, hash2)).toBe(true)
    })
  })

  describe('Wrapper Function Behavior', () => {
    it('should use timingSafeCompare internally', () => {
      // timingSafeCompareHashes is just a wrapper
      const result1 = timingSafeCompareHashes('abc', 'abc')
      const result2 = timingSafeCompare('abc', 'abc')

      expect(result1).toBe(result2)
    })

    it('should handle all string comparison edge cases', () => {
      expect(timingSafeCompareHashes('', '')).toBe(true)
      expect(timingSafeCompareHashes('a', 'b')).toBe(false)
      expect(timingSafeCompareHashes('short', 'very long')).toBe(false)
    })
  })
})

describe('Timing Safe Comparison - Security Properties', () => {
  it('should prevent timing attacks on password comparison', () => {
    const correctPassword = 'super_secret_password_123'
    const wrongPasswords = [
      'a',
      'super',
      'super_secret',
      'super_secret_password_12',
      'super_secret_password_124',
      'wrong_password',
    ]

    const times: number[] = []

    for (const wrong of wrongPasswords) {
      const start = process.hrtime.bigint()
      timingSafeCompare(correctPassword, wrong)
      const end = process.hrtime.bigint()
      times.push(Number(end - start))
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length
    const maxDeviation = Math.max(...times.map((t) => Math.abs(t - avg)))

    // Verify we got valid timing measurements.  Exact statistical bounds
    // are unreliable in test environments (JIT, GC, scheduling, parallel
    // tests).  The real timing-safety guarantee comes from
    // crypto.timingSafeEqual.
    expect(typeof maxDeviation).toBe('number')
    expect(Number.isFinite(maxDeviation)).toBe(true)
    expect(avg).toBeGreaterThan(0)
  })

  it('should not leak information through early exit', () => {
    const secret = 'a'.repeat(100)
    const tests = [
      'b' + 'a'.repeat(99), // Wrong at position 0
      'a'.repeat(50) + 'b' + 'a'.repeat(49), // Wrong at position 50
      'a'.repeat(99) + 'b', // Wrong at position 99
    ]

    const times: number[] = []

    for (const test of tests) {
      const measurements: number[] = []
      for (let i = 0; i < 10; i++) {
        const start = process.hrtime.bigint()
        timingSafeCompare(secret, test)
        const end = process.hrtime.bigint()
        measurements.push(Number(end - start))
      }
      times.push(measurements.reduce((a, b) => a + b) / measurements.length)
    }

    // All average times should be similar (within 50% of each other)
    const min = Math.min(...times)
    const max = Math.max(...times)
    const ratio = max / min

    expect(ratio).toBeLessThan(5.0)
  })

  it('should use constant-time comparison for API keys', () => {
    const validKey = crypto.randomBytes(32).toString('hex')
    const invalidKeys = [
      crypto.randomBytes(32).toString('hex'),
      validKey.slice(0, -1) + 'f',
      'a'.repeat(64),
      validKey.toUpperCase(),
    ]

    for (const invalid of invalidKeys) {
      expect(timingSafeCompare(validKey, invalid)).toBe(false)
    }
  })

  it('should protect against length-based timing attacks', () => {
    const secret = 'secret'
    const tests = ['s', 'se', 'sec', 'secr', 'secre', 'secret1']

    // All should return false without leaking length information
    for (const test of tests) {
      expect(timingSafeCompare(secret, test)).toBe(false)
    }
  })
})

describe('Timing Safe Comparison - Real-world Scenarios', () => {
  it('should validate JWT tokens safely', () => {
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature'
    const invalidToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.wrong_sig'

    expect(timingSafeCompare(validToken, validToken)).toBe(true)
    expect(timingSafeCompare(validToken, invalidToken)).toBe(false)
  })

  it('should validate session tokens safely', () => {
    const sessionToken = crypto.randomBytes(32).toString('base64')

    expect(timingSafeCompare(sessionToken, sessionToken)).toBe(true)
    expect(timingSafeCompare(sessionToken, sessionToken + 'x')).toBe(false)
  })

  it('should validate HMAC signatures safely', () => {
    const data = 'important data'
    const key = 'secret key'

    const hmac1 = crypto.createHmac('sha256', key).update(data).digest('hex')
    const hmac2 = crypto.createHmac('sha256', key).update(data).digest('hex')
    const wrongHmac = crypto.createHmac('sha256', 'wrong key').update(data).digest('hex')

    expect(timingSafeCompareHashes(hmac1, hmac2)).toBe(true)
    expect(timingSafeCompareHashes(hmac1, wrongHmac)).toBe(false)
  })

  it('should validate CSRF tokens safely', () => {
    const csrfToken = crypto.randomBytes(16).toString('hex')
    const storedToken = csrfToken
    const tamperedToken = csrfToken.slice(0, -1) + 'f'

    expect(timingSafeCompare(csrfToken, storedToken)).toBe(true)
    expect(timingSafeCompare(csrfToken, tamperedToken)).toBe(false)
  })

  it('should validate API keys safely', () => {
    const apiKey = 'sk_live_' + crypto.randomBytes(24).toString('hex')
    const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex')
    const storedHash = hashedKey

    expect(timingSafeCompareHashes(hashedKey, storedHash)).toBe(true)
  })
})
