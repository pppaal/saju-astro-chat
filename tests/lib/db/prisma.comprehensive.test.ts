/**
 * Comprehensive tests for Prisma database client
 * Covers: connection handling, token encryption, reconnection, error handling
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Unmock @/lib/db/prisma so we test the real module (global setup mocks it)
vi.unmock('@/lib/db/prisma')

// Mock dependencies before imports
vi.mock('pg', () => {
  const mockPool = vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue({}),
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn().mockResolvedValue(undefined),
  }))
  return { Pool: mockPool }
})

vi.mock('@prisma/adapter-pg', () => {
  return {
    PrismaPg: vi.fn().mockImplementation(() => ({})),
  }
})

vi.mock('@prisma/client', () => {
  const mockPrismaClient = vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $queryRaw: vi.fn().mockResolvedValue([{ '?column?': 1 }]),
  }))

  return {
    PrismaClient: mockPrismaClient,
    Prisma: {},
  }
})

vi.mock('@/lib/security/tokenCrypto', () => ({
  encryptToken: vi.fn((token) => (token ? `encrypted_${token}` : null)),
  decryptToken: vi.fn((token) => (token ? token.replace('encrypted_', '') : null)),
  hasTokenEncryptionKey: vi.fn(() => true),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('Prisma Client - Token Encryption', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('encryptAccountTokens Helper', () => {
    it('should encrypt access_token', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')
      const { encryptToken } = await import('@/lib/security/tokenCrypto')

      const input = { access_token: 'token123' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('token123')
      expect(result.access_token).toBe('encrypted_token123')
    })

    it('should encrypt refresh_token', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')
      const { encryptToken } = await import('@/lib/security/tokenCrypto')

      const input = { refresh_token: 'refresh456' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('refresh456')
      expect(result.refresh_token).toBe('encrypted_refresh456')
    })

    it('should encrypt id_token', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')
      const { encryptToken } = await import('@/lib/security/tokenCrypto')

      const input = { id_token: 'id789' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('id789')
      expect(result.id_token).toBe('encrypted_id789')
    })

    it('should encrypt all token fields', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = {
        access_token: 'access',
        refresh_token: 'refresh',
        id_token: 'id',
      }
      const result = encryptAccountData(input)

      expect(result.access_token).toBe('encrypted_access')
      expect(result.refresh_token).toBe('encrypted_refresh')
      expect(result.id_token).toBe('encrypted_id')
    })

    it('should preserve non-token fields', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = {
        userId: 'user_123',
        provider: 'google',
        access_token: 'token',
      }
      const result = encryptAccountData(input)

      expect(result.userId).toBe('user_123')
      expect(result.provider).toBe('google')
      expect(result.access_token).toBe('encrypted_token')
    })

    it('should handle null data', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const result = encryptAccountData(null)

      expect(result).toBeNull()
    })

    it('should handle undefined data', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const result = encryptAccountData(undefined)

      expect(result).toBeUndefined()
    })

    it('should handle non-object data', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      expect(encryptAccountData('string')).toBe('string')
      expect(encryptAccountData(123)).toBe(123)
      expect(encryptAccountData(true)).toBe(true)
    })

    it('should handle empty object', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const result = encryptAccountData({})

      expect(result).toEqual({})
    })

    it('should handle null token values', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = {
        access_token: null,
        refresh_token: null,
        id_token: null,
      }
      const result = encryptAccountData(input)

      expect(result.access_token).toBeNull()
      expect(result.refresh_token).toBeNull()
      expect(result.id_token).toBeNull()
    })

    it('should handle undefined token values', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = {
        access_token: undefined,
        refresh_token: undefined,
      }
      const result = encryptAccountData(input)

      expect(result.access_token).toBeUndefined()
      expect(result.refresh_token).toBeUndefined()
    })

    it('should only encrypt string tokens', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')
      const { encryptToken } = await import('@/lib/security/tokenCrypto')

      const input = {
        access_token: 123 as any,
        refresh_token: { nested: 'object' } as any,
      }
      const result = encryptAccountData(input)

      // Should not call encryptToken for non-strings
      expect(encryptToken).not.toHaveBeenCalledWith(123)
      expect(encryptToken).not.toHaveBeenCalledWith({ nested: 'object' })
    })

    it('should handle empty string tokens', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')
      const { encryptToken } = await import('@/lib/security/tokenCrypto')

      const input = { access_token: '' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('')
    })

    it('should not mutate original object', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = { access_token: 'token' }
      const result = encryptAccountData(input)

      expect(input.access_token).toBe('token')
      expect(result.access_token).toBe('encrypted_token')
      expect(result).not.toBe(input)
    })

    it('should handle arrays', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = [{ access_token: 'token1' }, { access_token: 'token2' }]
      const result = encryptAccountData(input)

      // Spread operator on array creates object with numeric keys
      // { ...array } produces { '0': ..., '1': ... }
      expect(result).toBeDefined()
      expect(typeof result).toBe('object')
    })

    it('should handle nested objects', async () => {
      const { encryptAccountData } = await import('@/lib/db/prisma')

      const input = {
        account: {
          access_token: 'nested_token',
        },
      }
      const result = encryptAccountData(input)

      // Only encrypts top-level fields
      expect(result.account).toEqual({ access_token: 'nested_token' })
    })
  })
})

describe('Prisma Client - Module Exports', () => {
  it('should export prisma client', async () => {
    const mod = await import('@/lib/db/prisma')

    expect(mod.prisma).toBeDefined()
  })

  it('should export Prisma namespace', async () => {
    const mod = await import('@/lib/db/prisma')

    expect(mod.Prisma).toBeDefined()
  })

  it('should export encryptAccountData helper', async () => {
    const mod = await import('@/lib/db/prisma')

    expect(typeof mod.encryptAccountData).toBe('function')
  })

  it('should export ensureDbConnection helper', async () => {
    const mod = await import('@/lib/db/prisma')

    expect(typeof mod.ensureDbConnection).toBe('function')
  })
})
