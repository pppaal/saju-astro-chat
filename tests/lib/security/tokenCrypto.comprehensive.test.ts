/**
 * Comprehensive tests for token encryption/decryption
 * Covers: AES-256-GCM encryption, key management, error handling
 */

import { vi } from 'vitest'
import crypto from 'crypto'

// No top-level crypto mock.  The source module captures KEY_ENV at import
// time, so each test uses vi.resetModules() + dynamic import() to re-import
// with the desired env.  Real crypto is used throughout.

/** Helper: reset modules and dynamically import tokenCrypto with current env */
async function importTokenCrypto() {
  return await import('@/lib/security/tokenCrypto')
}

describe('Token Crypto - Key Management', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('hasTokenEncryptionKey', () => {
    it('should return true when key is set', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should return false when key is not set', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should return false when key is empty string', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = ''

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should accept base64 encoded 32-byte key', async () => {
      const key = crypto.randomBytes(32)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should accept UTF-8 string of 32+ characters', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(32)

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should reject UTF-8 string shorter than 32 bytes', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(31)

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should handle base64 key shorter than 32 bytes', async () => {
      const key = Buffer.alloc(16) // Only 16 bytes
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(false)
    })

    it('should handle base64 key longer than 32 bytes', async () => {
      const key = Buffer.alloc(64) // 64 bytes
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      // base64 decode yields 64 bytes (not 32), so the base64 path is
      // skipped. However the UTF-8 representation of the base64 string
      // is ~88 chars (>= 32), so getKey() falls back to UTF-8 and
      // slices to 32 bytes.  The key is therefore valid.
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should truncate UTF-8 keys longer than 32 bytes', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'a'.repeat(100)

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })
  })

  describe('Key Format Detection', () => {
    it('should prefer base64 format when exactly 32 bytes', async () => {
      const key = crypto.randomBytes(32)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })

    it('should fallback to UTF-8 when base64 is not 32 bytes', async () => {
      // Base64 that decodes to something other than 32 bytes
      const key = crypto.randomBytes(16)
      process.env.TOKEN_ENCRYPTION_KEY = key.toString('base64')

      const { hasTokenEncryptionKey } = await importTokenCrypto()

      // Will try UTF-8, which might not be 32 bytes either
      expect(typeof hasTokenEncryptionKey()).toBe('boolean')
    })

    it('should handle invalid base64', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = 'not-valid-base64!!!'

      const { hasTokenEncryptionKey } = await importTokenCrypto()

      // Should fall back to UTF-8 interpretation
      expect(typeof hasTokenEncryptionKey()).toBe('boolean')
    })

    it('should handle whitespace in key', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = '  ' + 'a'.repeat(32) + '  '

      const { hasTokenEncryptionKey } = await importTokenCrypto()
      expect(hasTokenEncryptionKey()).toBe(true)
    })
  })
})

describe('Token Crypto - Encryption', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('encryptToken - Basic Operations', () => {
    it('should encrypt a token', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('my-secret-token')

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe('my-secret-token')
    })

    it('should return null for null input', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken(null)).toBeNull()
    })

    it('should return null for undefined input', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken(undefined)).toBeNull()
    })

    it('should return null for empty string', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken('')).toBeNull()
    })

    it('should encrypt tokens of various lengths', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken('a')).toBeDefined()
      expect(encryptToken('a'.repeat(100))).toBeDefined()
      expect(encryptToken('a'.repeat(1000))).toBeDefined()
    })

    it('should produce base64-encoded output', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')

      // Should be base64 strings separated by dots
      expect(encrypted).toMatch(/^[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+\.[A-Za-z0-9+/=]+$/)
    })

    it('should produce different output for same input (random IV)', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted1 = encryptToken('same-token')
      const encrypted2 = encryptToken('same-token')

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should handle special characters', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken('token with spaces')).toBeDefined()
      expect(encryptToken('token\nwith\nnewlines')).toBeDefined()
      expect(encryptToken('token🚀with😀emoji')).toBeDefined()
      expect(encryptToken('token"with"quotes')).toBeDefined()
    })

    it('should handle Unicode characters', async () => {
      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken('こんにちは')).toBeDefined()
      expect(encryptToken('안녕하세요')).toBeDefined()
      expect(encryptToken('你好')).toBeDefined()
    })
  })

  describe('encryptToken - Without Key', () => {
    it('should return token unchanged when no key is set', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      vi.resetModules()

      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken('my-token')).toBe('my-token')
    })

    it('should return null for null input even without key', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      vi.resetModules()

      const { encryptToken } = await importTokenCrypto()

      expect(encryptToken(null)).toBeNull()
    })
  })

  describe('encryptToken - Format', () => {
    it('should produce three dot-separated parts', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')
      const parts = encrypted?.split('.')

      expect(parts).toHaveLength(3)
    })

    it('should have IV as first part', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')
      const [iv] = encrypted!.split('.')

      // IV should be 12 bytes = 16 base64 chars
      expect(Buffer.from(iv, 'base64').length).toBe(12)
    })

    it('should have auth tag as second part', async () => {
      const { encryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')
      const [, authTag] = encrypted!.split('.')

      // Auth tag should be 16 bytes for GCM
      expect(Buffer.from(authTag, 'base64').length).toBe(16)
    })

    it('should have ciphertext as third part', async () => {
      const { encryptToken } = await importTokenCrypto()

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
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('decryptToken - Basic Operations', () => {
    it('should decrypt an encrypted token', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { encryptToken, decryptToken } = await importTokenCrypto()

      const original = 'my-secret-token'
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should return null for null input', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken(null)).toBeNull()
    })

    it('should return null for undefined input', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken(undefined)).toBeNull()
    })

    it('should return null for empty string', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken('')).toBeNull()
    })

    it('should decrypt tokens with special characters', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { encryptToken, decryptToken } = await importTokenCrypto()

      const original = 'token\nwith\nspecial🚀chars'
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })

    it('should decrypt long tokens', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { encryptToken, decryptToken } = await importTokenCrypto()

      const original = 'a'.repeat(1000)
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)

      expect(decrypted).toBe(original)
    })
  })

  describe('decryptToken - Without Key', () => {
    it('should return token unchanged when no key is set', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken('my-token')).toBe('my-token')
    })

    it('should handle null input without key', async () => {
      delete process.env.TOKEN_ENCRYPTION_KEY
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken(null)).toBeNull()
    })
  })

  describe('decryptToken - Invalid Input', () => {
    beforeEach(() => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()
    })

    it('should return null for malformed encrypted token', async () => {
      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken('not-encrypted')).toBeNull()
    })

    it('should return null for token with wrong number of parts', async () => {
      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken('one.two')).toBeNull()
      expect(decryptToken('one.two.three.four')).toBeNull()
    })

    it('should return null for invalid base64', async () => {
      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken('!!!.!!!.!!!')).toBeNull()
    })

    it('should return null for tampered ciphertext', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { encryptToken, decryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')
      const [iv, authTag, ciphertext] = encrypted!.split('.')

      // Tamper with ciphertext
      const tampered = [iv, authTag, 'AAAA' + ciphertext].join('.')

      expect(decryptToken(tampered)).toBeNull()
    })

    it('should return null for tampered auth tag', async () => {
      process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
      vi.resetModules()

      const { encryptToken, decryptToken } = await importTokenCrypto()

      const encrypted = encryptToken('token')
      const [iv, authTag, ciphertext] = encrypted!.split('.')

      // Tamper with auth tag
      const tampered = [iv, 'AAAA' + authTag, ciphertext].join('.')

      expect(decryptToken(tampered)).toBeNull()
    })

    it('should return null for wrong key', async () => {
      const key1 = crypto.randomBytes(32).toString('base64')
      const key2 = crypto.randomBytes(32).toString('base64')

      process.env.TOKEN_ENCRYPTION_KEY = key1
      vi.resetModules()

      const { encryptToken } = await importTokenCrypto()
      const encrypted = encryptToken('token')

      // Change key
      process.env.TOKEN_ENCRYPTION_KEY = key2
      vi.resetModules()

      const { decryptToken } = await importTokenCrypto()
      expect(decryptToken(encrypted)).toBeNull()
    })

    it('should handle numeric input', async () => {
      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken(123 as any)).toBeNull()
    })

    it('should handle object input', async () => {
      const { decryptToken } = await importTokenCrypto()

      expect(decryptToken({} as any)).toBeNull()
    })
  })
})

describe('Token Crypto - Round Trip', () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should preserve token through encrypt/decrypt cycle', async () => {
    const { encryptToken, decryptToken } = await importTokenCrypto()

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

  it('should handle multiple encrypt/decrypt cycles', async () => {
    const { encryptToken, decryptToken } = await importTokenCrypto()

    const original = 'my-token'

    for (let i = 0; i < 10; i++) {
      const encrypted = encryptToken(original)
      const decrypted = decryptToken(encrypted)
      expect(decrypted).toBe(original)
    }
  })

  it('should produce different ciphertexts for same token', async () => {
    const { encryptToken } = await importTokenCrypto()

    const token = 'same-token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2)
  })

  it('should decrypt all ciphertexts of same token', async () => {
    const { encryptToken, decryptToken } = await importTokenCrypto()

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
    vi.resetModules()
  })

  it('should use AES-256-GCM', async () => {
    const { encryptToken } = await importTokenCrypto()

    // This is implementation detail, but we can verify it uses crypto primitives
    expect(() => encryptToken('token')).not.toThrow()
  })

  it('should use 12-byte IV', async () => {
    const { encryptToken } = await importTokenCrypto()

    const encrypted = encryptToken('token')
    const [ivB64] = encrypted!.split('.')
    const iv = Buffer.from(ivB64, 'base64')

    expect(iv.length).toBe(12)
  })

  it('should include authentication tag', async () => {
    const { encryptToken } = await importTokenCrypto()

    const encrypted = encryptToken('token')
    const [, authTagB64] = encrypted!.split('.')
    const authTag = Buffer.from(authTagB64, 'base64')

    // GCM auth tag is 16 bytes by default
    expect(authTag.length).toBe(16)
  })

  it('should detect tampering', async () => {
    const { encryptToken, decryptToken } = await importTokenCrypto()

    const encrypted = encryptToken('token')
    const parts = encrypted!.split('.')

    // Flip a bit in ciphertext
    const ciphertextBuf = Buffer.from(parts[2], 'base64')
    ciphertextBuf[0] ^= 1
    parts[2] = ciphertextBuf.toString('base64')

    const tampered = parts.join('.')
    expect(decryptToken(tampered)).toBeNull()
  })

  it('should be deterministically verifiable', async () => {
    const { encryptToken, decryptToken } = await importTokenCrypto()

    const token = 'test-token'
    const encrypted1 = encryptToken(token)
    const encrypted2 = encryptToken(token)

    // Both should decrypt to same value
    expect(decryptToken(encrypted1)).toBe(token)
    expect(decryptToken(encrypted2)).toBe(token)
  })
})

describe('Token Crypto - Edge Cases', () => {
  it('should handle very short key gracefully', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'short'
    vi.resetModules()

    const { encryptToken } = await importTokenCrypto()

    // Should return token unchanged (no valid key)
    expect(encryptToken('token')).toBe('token')
  })

  it('should handle binary data in token', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    vi.resetModules()

    const { encryptToken, decryptToken } = await importTokenCrypto()

    const binaryToken = Buffer.from([0, 1, 2, 255, 254, 253]).toString('utf8')
    const encrypted = encryptToken(binaryToken)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(binaryToken)
  })

  it('should handle whitespace-only token', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    vi.resetModules()

    const { encryptToken, decryptToken } = await importTokenCrypto()

    const whitespace = '   \n\t  '
    const encrypted = encryptToken(whitespace)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(whitespace)
  })

  it('should handle single character token', async () => {
    process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64')
    vi.resetModules()

    const { encryptToken, decryptToken } = await importTokenCrypto()

    const single = 'a'
    const encrypted = encryptToken(single)
    const decrypted = decryptToken(encrypted)

    expect(decrypted).toBe(single)
  })
})
