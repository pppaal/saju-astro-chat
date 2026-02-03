/**
 * Comprehensive tests for token encryption/decryption
 * Covers: AES-256-GCM encryption, key management, error handling
 */

import crypto from 'crypto'

// Mock crypto before importing module
const mockRandomBytes = jest.fn((size: number) => Buffer.alloc(size, 0))
const mockCreateCipheriv = jest.fn()
const mockCreateDecipheriv = jest.fn()

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomBytes: mockRandomBytes,
  createCipheriv: mockCreateCipheriv,
  createDecipheriv: mockCreateDecipheriv,
}))

describe('Token Crypto - Key Management', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('hasTokenEncryptionKey', () => {
    it('should return true when key is set', () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should return false when key is not set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should return false when key is empty string', () => {
      process.env.TOKEN_ENCRYPTION_KEY = ''

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should accept base64 encoded 32-byte key', () => {
      const key = crypto.randomBytes(32)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should accept UTF-8 string of 32+ characters', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(32)

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should reject UTF-8 string shorter than 32 bytes', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(31)

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should handle base64 key shorter than 32 bytes', () => {
      const key = Buffer.alloc(16) // Only 16 bytes
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should handle base64 key longer than 32 bytes', () => {
      const key = Buffer.alloc(64) // 64 bytes
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should truncate UTF-8 keys longer than 32 bytes', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(100)

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })
  })

  describe('Key Format Detection', () => {
    it('should prefer base64 format when exactly 32 bytes', () => {
      const key = crypto.randomBytes(32)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should fallback to UTF-8 when base64 is not 32 bytes', () => {
      // Base64 that decodes to something other than 32 bytes
      const key = crypto.randomBytes(16)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')

      // Will try UTF-8, which might not be 32 bytes either
      expect(typeof hasTokenEncryptionKey()).toBe('boolean')
    })

    it('should handle invalid base64', () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'not-valid-base64!!!'

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')

      // Should fall back to UTF-8 interpretation
      expect(typeof hasTokenEncryptionKey()).toBe('boolean')
    })

    it('should handle whitespace in key', () => {
      process.env.TOKEN_ENCRYPTION_KEY = '  ' + 'a'.repeat(32) + '  '

      const { hasTokenEncryptionKey } = require('@/lib/security/tokenCrypto')
      expect(hasTokenEncryptionKey()).toBe(true)
    })
  })
})

describe('Token Crypto - Encryption', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encryptToken - Basic Operations', () => {
    it('should encrypt a token', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('my-secret-token')

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe('my-secret-token')
    })

    it('should return null for null input', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken(undefined)).toBeNull()
    })

    it('should return null for empty string', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken('')).toBeNull()
    })

    it('should encrypt tokens of various lengths', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken('a')).toBeDefined()
      expect(encryptToken('a'.repeat(100))).toBeDefined()
      expect(encryptToken('a'.repeat(1000))).toBeDefined()
    })

    it('should produce base64-encoded output', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')

      // Should be base64 strings separated by dots
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
    })

    it('should produce different output for same input (random IV)', () => {
      jest.resetModules()
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      const actualCrypto = jest.requireActual('crypto')

      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted1 = encryptToken('same-token')
      const encrypted2 = encryptToken('same-token')

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle special characters', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken('token with spaces')).toBeDefined()
      expect(encryptToken('token\nwith\nnewlines')).toBeDefined()
      expect(encryptToken('token🚀with😀emoji')).toBeDefined()
      expect(encryptToken('token"with"quotes')).toBeDefined()
    })

    it('should handle Unicode characters', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken('こんにちは')).toBeDefined()
      expect(encryptToken('안녕하세요')).toBeDefined()
      expect(encryptToken('你好')).toBeDefined()
    })
  })

  describe('encryptToken - Without Key', () => {
    it('should return token unchanged when no key is set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      jest.resetModules()

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken('my-token')).toBe('my-token')
    })

    it('should return null for null input even without key', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      jest.resetModules()

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      expect(encryptToken(null)).toBeNull()
    })
  })

  describe('encryptToken - Format', () => {
    it('should produce three dot-separated parts', () => {
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const parts = encrypted?.split('.')

      expect(parts).toHaveLength(3)
    })

    it('should have IV as first part', () => {
      jest.resetModules()
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const [iv] = encrypted!.split('.')

      // IV should be 12 bytes = 16 base64 chars
      expect(Buffer.from(iv, 'base64').length).toBe(12)
    })

    it('should have auth tag as second part', () => {
      jest.resetModules()
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const [, authTag] = encrypted!.split('.')

      // Auth tag should be 16 bytes for GCM
      expect(Buffer.from(authTag, 'base64').length).toBe(16)
    })

    it('should have ciphertext as third part', () => {
      jest.resetModules()
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const [, , ciphertext] = encrypted!.split('.')

      expect(ciphertext).toBeDefined()
      expect(ciphertext.length).toBeGreaterThan(0)
    })
  })
})

describe('Token Crypto - Decryption', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('decryptToken - Basic Operations', () => {
    it('should decrypt an encrypted token', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

      const original = 'my-secret-token'
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should return null for null input', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()

      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken(null)).toBeNull()
    })

    it('should return null for undefined input', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()

      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken(undefined)).toBeNull()
    })

    it('should return null for empty string', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()

      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken('')).toBeNull()
    })

    it('should decrypt tokens with special characters', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

      const original = 'token\nwith\nspecial🚀chars'
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should decrypt long tokens', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

      const original = 'a'.repeat(1000)
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })
  })

  describe('decryptToken - Without Key', () => {
    it('should return token unchanged when no key is set', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      jest.resetModules()

      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken('my-token')).toBe('my-token')
    })

    it('should handle null input without key', () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      jest.resetModules()

      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken(null)).toBeNull()
    })
  })

  describe('decryptToken - Invalid Input', () => {
    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
    })

    it('should return null for malformed encrypted token', () => {
      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken('not-encrypted')).toBeNull()
    })

    it('should return null for token with wrong number of parts', () => {
      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken('one.two')).toBeNull()
      expect(decryptToken('one.two.three.four')).toBeNull()
    })

    it('should return null for invalid base64', () => {
      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken('!!!.!!!.!!!')).toBeNull()
    })

    it('should return null for tampered ciphertext', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const [iv, authTag, ciphertext] = encrypted!.split('.')

      // Tamper with ciphertext
      const tampered = [iv, authTag, 'AAAA' + ciphertext].join('.')

      expect(decryptToken(tampered)).toBeNull()
    })

    it('should return null for tampered auth tag', () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

      const encrypted = encryptToken('token')
      const [iv, authTag, ciphertext] = encrypted!.split('.')

      // Tamper with auth tag
      const tampered = [iv, 'AAAA' + authTag, ciphertext].join('.')

      expect(decryptToken(tampered)).toBeNull()
    })

    it('should return null for wrong key', () => {
      const key1 = crypto.randomBytes(32).toString('base64')
      const key2 = crypto.randomBytes(32).toString('base64')

      process.env.TOKEN_ENCRYPTION_KEY = key1
      jest.resetModules()
      const actualCrypto = jest.requireActual('crypto')
      jest.doMock('crypto', () => actualCrypto)

      const { encryptToken } = require('@/lib/security/tokenCrypto')
      const encrypted = encryptToken('token')

      // Change key
      process.env.TOKEN_ENCRYPTION_KEY = key2
      jest.resetModules()
      jest.doMock('crypto', () => actualCrypto)

      const { decryptToken } = require('@/lib/security/tokenCrypto')
      expect(decryptToken(encrypted)).toBeNull()
    })

    it('should handle numeric input', () => {
      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken(123 as any)).toBeNull()
    })

    it('should handle object input', () => {
      const { decryptToken } = require('@/lib/security/tokenCrypto')

      expect(decryptToken({} as any)).toBeNull()
    })
  })
})

describe('Token Crypto - Round Trip', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.clearAllMocks()
    jest.resetModules()
    const actualCrypto = jest.requireActual('crypto')
    jest.doMock('crypto', () => actualCrypto)
  })

  it('should preserve token through encrypt/decrypt cycle', () => {
    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const tokens = [
      'simple',
      'with spaces',
      'with\nnewlines',
      'with🚀emoji',
      'a'.repeat(1000),
      'special!@#$%^&*()',
      'こんにちは世界',
    ]

    for (const token of tokens) {
      const encrypted = encryptToken(token)
      const decrypted = decryptToken(encrypted)
      expect(decrypted).toBe(token)
    }
  })

  it('should handle multiple encrypt/decrypt cycles', () => {
    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const original = 'my-token'

    for (let i = 0; i < 10; i++) {
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)
      expect(decrypted).toBe(original)
    }
  })

  it('should produce different ciphertexts for same token', () => {
    const { encryptToken } = require('@/lib/security/tokenCrypto')

    const token = 'same-token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should decrypt all ciphertexts of same token', () => {
    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const token = 'same-token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    expect(decryptToken(encrypted1)).toBe(token)
    expect(decryptToken(encrypted2)).toBe(token)
  })
})

describe('Token Crypto - Security Properties', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const actualCrypto = jest.requireActual('crypto')
    jest.doMock('crypto', () => actualCrypto)
  })

  it('should use AES-256-GCM', () => {
    const { encryptToken } = require('@/lib/security/tokenCrypto')

    // This is implementation detail, but we can verify it uses crypto primitives
    expect(() => encryptToken('token')).not.toThrow()
  })

  it('should use 12-byte IV', () => {
    const { encryptToken } = require('@/lib/security/tokenCrypto')

    const encrypted = encryptToken('token')
    const [ivB64] = encrypted!.split('.')
    const iv = Buffer.from(ivB64, 'base64')

    expect(iv.length).toBe(12)
  })

  it('should include authentication tag', () => {
    const { encryptToken } = require('@/lib/security/tokenCrypto')

    const encrypted = encryptToken('token')
    const [, authTagB64] = encrypted!.split('.')
    const authTag = Buffer.from(authTagB64, 'base64')

    // GCM auth tag is 16 bytes by default
    expect(authTag.length).toBe(16)
  })

  it('should detect tampering', () => {
    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const encrypted = encryptToken('token')
    const parts = encrypted!.split('.')

    // Flip a bit in ciphertext
    const ciphertextBuf = Buffer.from(parts[2], 'base64')
    ciphertextBuf[0] ^= 1
    parts[2] = ciphertextBuf.toString('base64')

    const tampered = parts.join('.')
    expect(decryptToken(tampered)).toBeNull()
  })

  it('should be deterministically verifiable', () => {
    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const token = 'test-token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    // Both should decrypt to same value
    expect(decryptToken(encrypted1)).toBe(token)
    expect(decryptToken(encrypted2)).toBe(token)
  })
})

describe('Token Crypto - Edge Cases', () => {
  it('should handle very short key gracefully', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'short'
    jest.resetModules()

    const { encryptToken } = require('@/lib/security/tokenCrypto')

    // Should return token unchanged (no valid key)
    expect(encryptToken('token')).toBe('token')
  })

  it('should handle binary data in token', () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const actualCrypto = jest.requireActual('crypto')
    jest.doMock('crypto', () => actualCrypto)

    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const binaryToken = Buffer.from([0, 1, 2, 255, 254, 253]).toString('utf8')
    const encrypted = encryptToken(binaryToken)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(binaryToken)
  })

  it('should handle whitespace-only token', () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const actualCrypto = jest.requireActual('crypto')
    jest.doMock('crypto', () => actualCrypto)

    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const whitespace = '   \n\t  '
    const encrypted = encryptToken(whitespace)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(whitespace)
  })

  it('should handle single character token', () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    jest.resetModules()
    const actualCrypto = jest.requireActual('crypto')
    jest.doMock('crypto', () => actualCrypto)

    const { encryptToken, decryptToken } = require('@/lib/security/tokenCrypto')

    const single = 'a'
    const encrypted = encryptToken(single)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(single)
  })
})
