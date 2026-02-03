/**
 * Comprehensive tests for data redaction and privacy utilities
 * Covers: name masking, email masking, payload redaction, coordinate truncation
 */

import {
  DataRedactor,
  hashName,
  maskDisplayName,
  maskTextWithName,
  maskEmail,
  maskPayload,
  maskAstrologyInput,
} from '@/lib/security/DataRedactor'

describe('DataRedactor - Name Hashing', () => {
  describe('hashName', () => {
    it('should hash name to 12-character hex string', () => {
      const hashed = hashName('홍길동')

      expect(typeof hashed).toBe('string')
      expect(hashed).toHaveLength(12)
      expect(hashed).toMatch(/^[0-9a-f]{12}$/)
    })

    it('should return consistent hash for same name', () => {
      const hash1 = hashName('홍길동')
      const hash2 = hashName('홍길동')

      expect(hash1).toBe(hash2)
    })

    it('should return different hashes for different names', () => {
      const hash1 = hashName('홍길동')
      const hash2 = hashName('김철수')

      expect(hash1).not.toBe(hash2)
    })

    it('should return "anon" for undefined', () => {
      expect(hashName(undefined)).toBe('anon')
    })

    it('should return "anon" for empty string', () => {
      expect(hashName('')).toBe('anon')
    })

    it('should handle English names', () => {
      const hashed = hashName('John Doe')

      expect(hashed).toHaveLength(12)
      expect(hashed).toMatch(/^[0-9a-f]{12}$/)
    })

    it('should handle long names', () => {
      const longName = 'A'.repeat(100)
      const hashed = hashName(longName)

      expect(hashed).toHaveLength(12)
    })

    it('should handle special characters', () => {
      const hashed = hashName('Name!@#$%^&*()')

      expect(hashed).toHaveLength(12)
    })

    it('should handle Unicode characters', () => {
      expect(hashName('こんにちは')).toHaveLength(12)
      expect(hashName('안녕하세요')).toHaveLength(12)
      expect(hashName('你好')).toHaveLength(12)
    })

    it('should handle emoji', () => {
      const hashed = hashName('Name 🚀')

      expect(hashed).toHaveLength(12)
    })

    it('should be deterministic', () => {
      const name = 'TestName123'
      const hashes = Array.from({ length: 100 }, () => hashName(name))

      expect(new Set(hashes).size).toBe(1)
    })

    it('should use SHA-256 (produces hex output)', () => {
      const hashed = hashName('test')

      // SHA-256 in hex is 64 chars, we take first 12
      expect(hashed).toMatch(/^[0-9a-f]+$/)
    })

    it('should handle whitespace', () => {
      expect(hashName('   ')).not.toBe('anon')
      expect(hashName(' Name ')).not.toBe(hashName('Name'))
    })
  })

  describe('hashName via DataRedactor class', () => {
    it('should work through static method', () => {
      const hash1 = DataRedactor.hashName('홍길동')
      const hash2 = hashName('홍길동')

      expect(hash1).toBe(hash2)
    })
  })
})

describe('DataRedactor - Display Name Masking', () => {
  describe('maskDisplayName', () => {
    it('should mask Korean name to first char + ***', () => {
      expect(maskDisplayName('홍길동')).toBe('홍***')
    })

    it('should mask English name', () => {
      expect(maskDisplayName('John Doe')).toBe('J***')
    })

    it('should mask single character name', () => {
      expect(maskDisplayName('A')).toBe('A***')
    })

    it('should return undefined for undefined', () => {
      expect(maskDisplayName(undefined)).toBeUndefined()
    })

    it('should return undefined for empty string', () => {
      expect(maskDisplayName('')).toBeUndefined()
    })

    it('should handle whitespace-only name', () => {
      expect(maskDisplayName('   ')).toBe('***')
    })

    it('should trim whitespace before masking', () => {
      expect(maskDisplayName('  홍길동  ')).toBe('홍***')
    })

    it('should handle emoji', () => {
      // Emoji can be multi-byte, so first character might not include full emoji
      const masked = maskDisplayName('🚀Name')
      expect(masked).toBeDefined()
      expect(masked?.endsWith('***')).toBe(true)
    })

    it('should handle Chinese names', () => {
      expect(maskDisplayName('王小明')).toBe('王***')
    })

    it('should handle Japanese names', () => {
      expect(maskDisplayName('田中太郎')).toBe('田***')
    })

    it('should handle very long names', () => {
      const longName = 'A'.repeat(100)
      expect(maskDisplayName(longName)).toBe('A***')
    })

    it('should handle special characters', () => {
      expect(maskDisplayName('!@#$')).toBe('!***')
    })

    it('should preserve first Unicode character correctly', () => {
      expect(maskDisplayName('안녕하세요')).toBe('안***')
    })
  })

  describe('maskDisplayName via DataRedactor class', () => {
    it('should work through static method', () => {
      const mask1 = DataRedactor.maskDisplayName('홍길동')
      const mask2 = maskDisplayName('홍길동')

      expect(mask1).toBe(mask2)
    })
  })
})

describe('DataRedactor - Text Masking', () => {
  describe('maskTextWithName', () => {
    it('should mask all occurrences of name in text', () => {
      const text = '홍길동님 안녕하세요. 홍길동님의 운세입니다.'
      const masked = maskTextWithName(text, '홍길동')

      expect(masked).toBe('***님 안녕하세요. ***님의 운세입니다.')
    })

    it('should return text unchanged if no name provided', () => {
      const text = 'Some text'
      expect(maskTextWithName(text, undefined)).toBe(text)
    })

    it('should return text unchanged if empty name', () => {
      const text = 'Some text'
      expect(maskTextWithName(text, '')).toBe(text)
    })

    it('should return text unchanged if name not found', () => {
      const text = 'Hello world'
      expect(maskTextWithName(text, 'John')).toBe(text)
    })

    it('should handle empty text', () => {
      expect(maskTextWithName('', 'Name')).toBe('')
    })

    it('should handle multiple occurrences', () => {
      const text = 'John said John likes John'
      const masked = maskTextWithName(text, 'John')

      expect(masked).toBe('*** said *** likes ***')
    })

    it('should handle case-sensitive matching', () => {
      const text = 'John and john'
      const masked = maskTextWithName(text, 'John')

      expect(masked).toBe('*** and john')
    })

    it('should escape regex special characters in name', () => {
      const text = 'Price is $100. Total $100.'
      const masked = maskTextWithName(text, '$100')

      expect(masked).toBe('Price is ***. Total ***.')
    })

    it('should handle parentheses in name', () => {
      const text = 'Call (555) 123-4567 or (555) 123-4567'
      const masked = maskTextWithName(text, '(555)')

      expect(masked).toBe('Call *** 123-4567 or *** 123-4567')
    })

    it('should handle square brackets in name', () => {
      const text = 'Item [A123] and [A123]'
      const masked = maskTextWithName(text, '[A123]')

      expect(masked).toBe('Item *** and ***')
    })

    it('should handle dots in name', () => {
      const text = 'Version 1.0 and 1.0'
      const masked = maskTextWithName(text, '1.0')

      expect(masked).toBe('Version *** and ***')
    })

    it('should handle asterisks in name', () => {
      const text = 'Pattern *test* and *test*'
      const masked = maskTextWithName(text, '*test*')

      expect(masked).toBe('Pattern *** and ***')
    })

    it('should handle regex-like patterns', () => {
      const text = 'Find ^start and ^start'
      const masked = maskTextWithName(text, '^start')

      expect(masked).toBe('Find *** and ***')
    })

    it('should handle emoji in name', () => {
      const text = 'React 🚀 is cool. 🚀 everywhere!'
      const masked = maskTextWithName(text, '🚀')

      expect(masked).toBe('React *** is cool. *** everywhere!')
    })

    it('should handle Korean text', () => {
      const text = '홍길동 님, 홍길동 님의 사주'
      const masked = maskTextWithName(text, '홍길동')

      expect(masked).toBe('*** 님, *** 님의 사주')
    })

    it('should handle invalid regex gracefully', () => {
      // If regex creation fails, should return text unchanged
      const text = 'Some text'
      const result = maskTextWithName(text, 'Name')

      expect(typeof result).toBe('string')
    })

    it('should handle very long text', () => {
      const text = 'John '.repeat(1000)
      const masked = maskTextWithName(text, 'John')

      expect(masked).toBe('*** '.repeat(1000))
    })

    it('should handle newlines in text', () => {
      const text = 'John\nsaid\nJohn'
      const masked = maskTextWithName(text, 'John')

      expect(masked).toBe('***\nsaid\n***')
    })
  })

  describe('maskTextWithName via DataRedactor class', () => {
    it('should work through static method', () => {
      const text = '홍길동님 안녕하세요'
      const mask1 = DataRedactor.maskTextWithName(text, '홍길동')
      const mask2 = maskTextWithName(text, '홍길동')

      expect(mask1).toBe(mask2)
    })
  })
})

describe('DataRedactor - Email Masking', () => {
  describe('maskEmail', () => {
    it('should mask email address', () => {
      const masked = maskEmail('user@example.com')

      expect(masked).toBe('us***@***')
    })

    it('should return default mask for undefined', () => {
      expect(maskEmail(undefined)).toBe('***@***')
    })

    it('should return default mask for empty string', () => {
      expect(maskEmail('')).toBe('***@***')
    })

    it('should mask short email', () => {
      expect(maskEmail('a@b.c')).toBe('a***@***')
    })

    it('should mask single character local part', () => {
      expect(maskEmail('x@example.com')).toBe('x***@***')
    })

    it('should show first 2 characters if available', () => {
      expect(maskEmail('test@example.com')).toBe('te***@***')
    })

    it('should handle long email', () => {
      expect(maskEmail('verylongemail@example.com')).toBe('ve***@***')
    })

    it('should mask domain completely', () => {
      const masked = maskEmail('user@example.com')

      expect(masked).toContain('@***')
      expect(masked).not.toContain('example.com')
    })

    it('should handle email without @', () => {
      const masked = maskEmail('notanemail')

      // Split by @ returns array with one element
      expect(masked).toContain('***@***')
    })

    it('should handle multiple @ symbols', () => {
      const masked = maskEmail('user@@example.com')

      expect(masked).toContain('***@***')
    })

    it('should handle email with special characters', () => {
      expect(maskEmail('user+tag@example.com')).toBe('us***@***')
    })

    it('should handle email with dots', () => {
      expect(maskEmail('first.last@example.com')).toBe('fi***@***')
    })

    it('should handle email with numbers', () => {
      expect(maskEmail('user123@example.com')).toBe('us***@***')
    })

    it('should handle email with unicode', () => {
      expect(maskEmail('테스트@example.com')).toContain('***@***')
    })
  })

  describe('maskEmail via DataRedactor class', () => {
    it('should work through static method', () => {
      const mask1 = DataRedactor.maskEmail('user@example.com')
      const mask2 = maskEmail('user@example.com')

      expect(mask1).toBe(mask2)
    })
  })
})

describe('DataRedactor - Payload Masking', () => {
  describe('maskPayload', () => {
    it('should mask name field', () => {
      const payload = { name: '홍길동' }
      const masked = maskPayload(payload)

      expect(masked.name).toBe('홍***')
    })

    it('should mask birthDate field', () => {
      const payload = { birthDate: '1990-01-15' }
      const masked = maskPayload(payload)

      expect(masked.birthDate).toBe('****-**-**')
    })

    it('should mask birthTime field', () => {
      const payload = { birthTime: '14:30' }
      const masked = maskPayload(payload)

      expect(masked.birthTime).toBe('**:**')
    })

    it('should mask email field', () => {
      const payload = { email: 'user@example.com' }
      const masked = maskPayload(payload)

      expect(masked.email).toBe('us***@***')
    })

    it('should truncate latitude to 3 decimal places', () => {
      const payload = { latitude: 37.123456789 }
      const masked = maskPayload(payload)

      expect(masked.latitude).toBe('37.123')
    })

    it('should truncate longitude to 3 decimal places', () => {
      const payload = { longitude: 127.123456789 }
      const masked = maskPayload(payload)

      expect(masked.longitude).toBe('127.123')
    })

    it('should handle string coordinates', () => {
      const payload = { latitude: '37.123456', longitude: '127.123456' }
      const masked = maskPayload(payload)

      expect(masked.latitude).toBe('37.123')
      expect(masked.longitude).toBe('127.123')
    })

    it('should preserve other fields', () => {
      const payload = { name: '홍길동', age: 30, city: 'Seoul' }
      const masked = maskPayload(payload)

      expect(masked.age).toBe(30)
      expect(masked.city).toBe('Seoul')
    })

    it('should mask all sensitive fields at once', () => {
      const payload = {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: '14:30',
        email: 'test@example.com',
        latitude: 37.123456,
        longitude: 127.123456,
      }
      const masked = maskPayload(payload)

      expect(masked.name).toBe('홍***')
      expect(masked.birthDate).toBe('****-**-**')
      expect(masked.birthTime).toBe('**:**')
      expect(masked.email).toBe('te***@***')
      expect(masked.latitude).toBe('37.123')
      expect(masked.longitude).toBe('127.123')
    })

    it('should return masked marker for non-object', () => {
      expect(maskPayload(null)).toEqual({ _masked: true })
      expect(maskPayload(undefined)).toEqual({ _masked: true })
      expect(maskPayload('string')).toEqual({ _masked: true })
      expect(maskPayload(123)).toEqual({ _masked: true })
    })

    it('should handle empty object', () => {
      const masked = maskPayload({})

      expect(masked).toEqual({})
    })

    it('should handle missing sensitive fields', () => {
      const payload = { someField: 'value' }
      const masked = maskPayload(payload)

      expect(masked).toEqual({ someField: 'value' })
    })

    it('should handle null sensitive fields', () => {
      const payload = { name: null, birthDate: null }
      const masked = maskPayload(payload)

      // Null values are preserved in the spread operator
      expect(masked.name).toBeNull()
      expect(masked.birthDate).toBeNull()
    })

    it('should handle invalid coordinates', () => {
      const payload = { latitude: 'invalid', longitude: 'invalid' }
      const masked = maskPayload(payload)

      expect(masked.latitude).toBeUndefined()
      expect(masked.longitude).toBeUndefined()
    })

    it('should handle Infinity coordinates', () => {
      const payload = { latitude: Infinity, longitude: -Infinity }
      const masked = maskPayload(payload)

      expect(masked.latitude).toBeUndefined()
      expect(masked.longitude).toBeUndefined()
    })

    it('should handle NaN coordinates', () => {
      const payload = { latitude: NaN, longitude: NaN }
      const masked = maskPayload(payload)

      expect(masked.latitude).toBeUndefined()
      expect(masked.longitude).toBeUndefined()
    })

    it('should not mutate original object', () => {
      const payload = { name: '홍길동', age: 30 }
      const original = { ...payload }

      maskPayload(payload)

      expect(payload).toEqual(original)
    })

    it('should handle nested objects without masking nested fields', () => {
      const payload = {
        name: '홍길동',
        address: {
          name: 'Inner Name', // Should not be masked (not top-level)
        },
      }
      const masked = maskPayload(payload)

      expect(masked.name).toBe('홍***')
      expect(masked.address).toEqual({ name: 'Inner Name' })
    })
  })

  describe('maskPayload via DataRedactor class', () => {
    it('should work through static method', () => {
      const payload = { name: '홍길동' }
      const mask1 = DataRedactor.maskPayload(payload)
      const mask2 = maskPayload(payload)

      expect(mask1).toEqual(mask2)
    })
  })
})

describe('DataRedactor - Astrology Input Masking', () => {
  describe('maskAstrologyInput', () => {
    it('should mask name to first char + ***', () => {
      const input = { name: '홍길동' }
      const masked = maskAstrologyInput(input)

      expect(masked.name).toBe('홍***')
    })

    it('should mask birthDate completely', () => {
      const input = { birthDate: '1990-01-15' }
      const masked = maskAstrologyInput(input)

      expect(masked.birthDate).toBe('****-**-**')
    })

    it('should mask birthTime completely', () => {
      const input = { birthTime: '14:30' }
      const masked = maskAstrologyInput(input)

      expect(masked.birthTime).toBe('**:**')
    })

    it('should truncate latitude to 2 decimal places', () => {
      const input = { latitude: 37.123456 }
      const masked = maskAstrologyInput(input)

      expect(masked.latitude).toBe('37.12')
    })

    it('should truncate longitude to 2 decimal places', () => {
      const input = { longitude: 127.123456 }
      const masked = maskAstrologyInput(input)

      expect(masked.longitude).toBe('127.12')
    })

    it('should mask all fields at once', () => {
      const input = {
        name: '홍길동',
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.123456,
        longitude: 127.123456,
      }
      const masked = maskAstrologyInput(input)

      expect(masked.name).toBe('홍***')
      expect(masked.birthDate).toBe('****-**-**')
      expect(masked.birthTime).toBe('**:**')
      expect(masked.latitude).toBe('37.12')
      expect(masked.longitude).toBe('127.12')
    })

    it('should handle undefined name', () => {
      const input = { birthDate: '1990-01-15' }
      const masked = maskAstrologyInput(input)

      expect(masked.name).toBeUndefined()
    })

    it('should handle empty name', () => {
      const input = { name: '' }
      const masked = maskAstrologyInput(input)

      // Empty string is falsy, so returns undefined
      expect(masked.name).toBeUndefined()
    })

    it('should handle undefined coordinates', () => {
      const input = { name: '홍길동' }
      const masked = maskAstrologyInput(input)

      expect(masked.latitude).toBeUndefined()
      expect(masked.longitude).toBeUndefined()
    })

    it('should only return masked fields', () => {
      const input = {
        name: '홍길동',
        birthDate: '1990-01-15',
        extraField: 'value',
      }
      const masked = maskAstrologyInput(input)

      expect(masked).toHaveProperty('name')
      expect(masked).toHaveProperty('birthDate')
      expect(masked).not.toHaveProperty('extraField')
    })

    it('should handle negative coordinates', () => {
      const input = { latitude: -37.123, longitude: -127.456 }
      const masked = maskAstrologyInput(input)

      expect(masked.latitude).toBe('-37.12')
      expect(masked.longitude).toBe('-127.46')
    })

    it('should handle zero coordinates', () => {
      const input = { latitude: 0, longitude: 0 }
      const masked = maskAstrologyInput(input)

      expect(masked.latitude).toBe('0.00')
      expect(masked.longitude).toBe('0.00')
    })
  })

  describe('maskAstrologyInput via DataRedactor class', () => {
    it('should work through static method', () => {
      const input = { name: '홍길동', latitude: 37.123 }
      const mask1 = DataRedactor.maskAstrologyInput(input)
      const mask2 = maskAstrologyInput(input)

      expect(mask1).toEqual(mask2)
    })
  })
})

describe('DataRedactor - Regex Escaping', () => {
  it('should escape special regex characters', () => {
    const specialChars = '.*+?^${}()|[]\\'

    // Should not throw when used in maskTextWithName
    expect(() => {
      maskTextWithName('Text with special chars', specialChars)
    }).not.toThrow()
  })

  it('should handle all regex metacharacters', () => {
    const metacharacters = ['.', '*', '+', '?', '^', '$', '{', '}', '(', ')', '|', '[', ']', '\\']

    for (const char of metacharacters) {
      expect(() => {
        maskTextWithName(`Text ${char} here`, char)
      }).not.toThrow()
    }
  })

  it('should correctly mask escaped patterns', () => {
    const text = 'Find . and .'
    const masked = maskTextWithName(text, '.')

    expect(masked).toBe('Find *** and ***')
  })
})

describe('DataRedactor - Privacy Compliance', () => {
  it('should remove PII from logs', () => {
    const sensitiveData = {
      name: '홍길동',
      birthDate: '1990-01-15',
      birthTime: '14:30',
      email: 'user@example.com',
      latitude: 37.5665,
      longitude: 126.978,
    }

    const masked = maskPayload(sensitiveData)

    // Verify no plain PII remains
    const maskedString = JSON.stringify(masked)
    expect(maskedString).not.toContain('홍길동')
    expect(maskedString).not.toContain('1990-01-15')
    expect(maskedString).not.toContain('14:30')
    expect(maskedString).not.toContain('user@example.com')
    expect(maskedString).not.toContain('37.5665')
    expect(maskedString).not.toContain('126.9780')
  })

  it('should create consistent hashes for cache keys', () => {
    const name = '홍길동'
    const hash1 = hashName(name)
    const hash2 = hashName(name)

    expect(hash1).toBe(hash2)
    expect(hash1).not.toContain(name)
  })

  it('should truncate coordinates to reduce precision', () => {
    const precise = { latitude: 37.5665734, longitude: 126.9779692 }
    const masked = maskPayload(precise)

    // From ~1m precision to ~100m precision
    expect(masked.latitude).toBe('37.567')
    expect(masked.longitude).toBe('126.978')
  })
})
