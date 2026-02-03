/**
 * Comprehensive tests for Prisma database client
 * Covers: connection handling, token encryption, reconnection, error handling
 */

import { Prisma } from '@prisma/client'

// Mock dependencies before imports
jest.mock('pg', () => {
  const mockPool = jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue({ rows: [] }),
    end: jest.fn().mockResolvedValue(undefined),
  }))
  return { Pool: mockPool }
})

jest.mock('@prisma/adapter-pg', () => {
  return {
    PrismaPg: jest.fn().mockImplementation(() => ({})),
  }
})

jest.mock('@prisma/client', () => {
  const mockPrismaClient = jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  }))

  return {
    PrismaClient: mockPrismaClient,
    Prisma: {},
  }
})

jest.mock('@/lib/security/tokenCrypto', () => ({
  encryptToken: jest.fn((token) => (token ? `encrypted_${token}` : null)),
  decryptToken: jest.fn((token) => (token ? token.replace('encrypted_', '') : null)),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('Prisma Client - Connection Management', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    jest.clearAllMocks()
    jest.resetModules()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Client Creation', () => {
    it('should create Prisma client with DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

      jest.resetModules()
      const { prisma } = require('@/lib/db/prisma')

      expect(prisma).toBeDefined()
    })

    it('should warn when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL

      jest.resetModules()
      const { logger } = require('@/lib/logger')
      const { prisma } = require('@/lib/db/prisma')

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL not set'))
      expect(prisma).toBeDefined()
    })

    it('should return proxy client when DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL

      jest.resetModules()
      const { prisma } = require('@/lib/db/prisma')

      // Should throw on actual query
      expect(() => prisma.user).toThrow('DATABASE_URL environment variable is not set')
    })

    it('should not treat proxy as thenable', () => {
      delete process.env.DATABASE_URL

      jest.resetModules()
      const { prisma } = require('@/lib/db/prisma')

      // Should not have then method
      expect(prisma.then).toBeUndefined()
    })

    it('should use PostgreSQL adapter', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

      jest.resetModules()
      const { PrismaPg } = require('@prisma/adapter-pg')
      require('@/lib/db/prisma')

      expect(PrismaPg).toHaveBeenCalled()
    })

    it('should create connection pool', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

      jest.resetModules()
      const { Pool } = require('pg')
      require('@/lib/db/prisma')

      expect(Pool).toHaveBeenCalledWith({
        connectionString: 'postgresql://user:pass@localhost:5432/db',
      })
    })

    it('should reuse connection pool in development', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.NODE_ENV = 'development'

      jest.resetModules()
      const { Pool } = require('pg')

      // Import twice
      require('@/lib/db/prisma')
      jest.clearAllMocks()
      require('@/lib/db/prisma')

      // Pool should not be created again in dev (would be reused from global)
      expect(Pool).not.toHaveBeenCalled()
    })

    it('should create new pool in production', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.NODE_ENV = 'production'

      jest.resetModules()
      const { Pool } = require('pg')
      require('@/lib/db/prisma')

      expect(Pool).toHaveBeenCalled()
    })
  })

  describe('Global Singleton', () => {
    it('should reuse Prisma client in development', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.NODE_ENV = 'development'

      jest.resetModules()
      const { prisma: prisma1 } = require('@/lib/db/prisma')
      const { prisma: prisma2 } = require('@/lib/db/prisma')

      expect(prisma1).toBe(prisma2)
    })

    it('should store client in global in development', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.NODE_ENV = 'development'

      jest.resetModules()
      const { prisma } = require('@/lib/db/prisma')
      const global = globalThis as any

      expect(global.prisma).toBe(prisma)
    })

    it('should not store client in global in production', () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
      process.env.NODE_ENV = 'production'

      jest.resetModules()
      require('@/lib/db/prisma')
      const global = globalThis as any

      // Should be undefined or from previous test
      expect(global.prisma).toBeUndefined()
    })
  })
})

describe('Prisma Client - Token Encryption', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('encryptAccountTokens Helper', () => {
    it('should encrypt access_token', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const input = { access_token: 'token123' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('token123')
      expect(result.access_token).toBe('encrypted_token123')
    })

    it('should encrypt refresh_token', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const input = { refresh_token: 'refresh456' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('refresh456')
      expect(result.refresh_token).toBe('encrypted_refresh456')
    })

    it('should encrypt id_token', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const input = { id_token: 'id789' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('id789')
      expect(result.id_token).toBe('encrypted_id789')
    })

    it('should encrypt all token fields', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

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

    it('should preserve non-token fields', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

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

    it('should handle null data', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const result = encryptAccountData(null)

      expect(result).toBeNull()
    })

    it('should handle undefined data', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const result = encryptAccountData(undefined)

      expect(result).toBeUndefined()
    })

    it('should handle non-object data', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      expect(encryptAccountData('string')).toBe('string')
      expect(encryptAccountData(123)).toBe(123)
      expect(encryptAccountData(true)).toBe(true)
    })

    it('should handle empty object', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const result = encryptAccountData({})

      expect(result).toEqual({})
    })

    it('should handle null token values', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

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

    it('should handle undefined token values', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const input = {
        access_token: undefined,
        refresh_token: undefined,
      }
      const result = encryptAccountData(input)

      expect(result.access_token).toBeUndefined()
      expect(result.refresh_token).toBeUndefined()
    })

    it('should only encrypt string tokens', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const input = {
        access_token: 123 as any,
        refresh_token: { nested: 'object' } as any,
      }
      const result = encryptAccountData(input)

      // Should not call encryptToken for non-strings
      expect(encryptToken).not.toHaveBeenCalledWith(123)
      expect(encryptToken).not.toHaveBeenCalledWith({ nested: 'object' })
    })

    it('should handle empty string tokens', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')
      const { encryptToken } = require('@/lib/security/tokenCrypto')

      const input = { access_token: '' }
      const result = encryptAccountData(input)

      expect(encryptToken).toHaveBeenCalledWith('')
    })

    it('should not mutate original object', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const input = { access_token: 'token' }
      const result = encryptAccountData(input)

      expect(input.access_token).toBe('token')
      expect(result.access_token).toBe('encrypted_token')
      expect(result).not.toBe(input)
    })

    it('should handle arrays', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

      const input = [{ access_token: 'token1' }, { access_token: 'token2' }]
      const result = encryptAccountData(input)

      // Should treat array as object
      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle nested objects', () => {
      const { encryptAccountData } = require('@/lib/db/prisma')

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

describe('Prisma Client - Connection Resilience', () => {
  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('ensureDbConnection', () => {
    it('should check connection with SELECT 1', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      await ensureDbConnection()

      expect(prisma.$queryRaw).toHaveBeenCalled()
    })

    it('should reconnect on connection failure', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')
      const { logger } = require('@/lib/logger')

      // Mock connection failure
      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'))

      await ensureDbConnection()

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Connection lost, reconnecting')
      )
      expect(prisma.$disconnect).toHaveBeenCalled()
      expect(prisma.$connect).toHaveBeenCalled()
    })

    it('should not reconnect if connection is healthy', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }])

      await ensureDbConnection()

      expect(prisma.$disconnect).not.toHaveBeenCalled()
      expect(prisma.$connect).not.toHaveBeenCalled()
    })

    it('should handle multiple connection failures', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockRejectedValue(new Error('Connection lost'))

      await ensureDbConnection()
      await ensureDbConnection()

      expect(prisma.$disconnect).toHaveBeenCalledTimes(2)
      expect(prisma.$connect).toHaveBeenCalledTimes(2)
    })

    it('should handle disconnect errors gracefully', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'))
      prisma.$disconnect.mockRejectedValueOnce(new Error('Disconnect failed'))

      // Should not throw
      await expect(ensureDbConnection()).resolves.not.toThrow()
    })

    it('should handle connect errors gracefully', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockRejectedValueOnce(new Error('Connection lost'))
      prisma.$connect.mockRejectedValueOnce(new Error('Connect failed'))

      // Should not throw
      await expect(ensureDbConnection()).resolves.not.toThrow()
    })

    it('should handle timeout errors', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockRejectedValueOnce(new Error('Query timeout'))

      await ensureDbConnection()

      expect(prisma.$disconnect).toHaveBeenCalled()
      expect(prisma.$connect).toHaveBeenCalled()
    })

    it('should handle network errors', async () => {
      const { ensureDbConnection } = require('@/lib/db/prisma')
      const { prisma } = require('@/lib/db/prisma')

      prisma.$queryRaw.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      await ensureDbConnection()

      expect(prisma.$disconnect).toHaveBeenCalled()
      expect(prisma.$connect).toHaveBeenCalled()
    })
  })
})

describe('Prisma Client - Error Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('should handle invalid DATABASE_URL format', () => {
    process.env.DATABASE_URL = 'invalid-url'

    jest.resetModules()

    // Should not throw on import
    expect(() => {
      require('@/lib/db/prisma')
    }).not.toThrow()
  })

  it('should handle missing DATABASE_URL in production', () => {
    delete process.env.DATABASE_URL
    process.env.NODE_ENV = 'production'

    jest.resetModules()
    const { logger } = require('@/lib/logger')
    const { prisma } = require('@/lib/db/prisma')

    expect(logger.warn).toHaveBeenCalled()
    expect(prisma).toBeDefined()
  })

  it('should handle pool creation errors', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

    jest.resetModules()
    jest.doMock('pg', () => {
      const mockPool = jest.fn().mockImplementation(() => {
        throw new Error('Pool creation failed')
      })
      return { Pool: mockPool }
    })

    // Should not throw on import
    expect(() => {
      require('@/lib/db/prisma')
    }).toThrow()
  })

  it('should handle adapter creation errors', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

    jest.resetModules()
    jest.doMock('@prisma/adapter-pg', () => {
      return {
        PrismaPg: jest.fn().mockImplementation(() => {
          throw new Error('Adapter creation failed')
        }),
      }
    })

    // Should throw on import
    expect(() => {
      require('@/lib/db/prisma')
    }).toThrow()
  })
})

describe('Prisma Client - Type Exports', () => {
  it('should export Prisma namespace', () => {
    const { Prisma } = require('@/lib/db/prisma')

    expect(Prisma).toBeDefined()
  })

  it('should export prisma client', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'

    jest.resetModules()
    const { prisma } = require('@/lib/db/prisma')

    expect(prisma).toBeDefined()
  })

  it('should export encryptAccountData helper', () => {
    const { encryptAccountData } = require('@/lib/db/prisma')

    expect(typeof encryptAccountData).toBe('function')
  })

  it('should export ensureDbConnection helper', () => {
    const { ensureDbConnection } = require('@/lib/db/prisma')

    expect(typeof ensureDbConnection).toBe('function')
  })
})

describe('Prisma Client - Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.resetModules()
  })

  it('should handle DATABASE_URL with special characters', () => {
    process.env.DATABASE_URL = 'postgresql://user:p@ss!word@localhost:5432/db?schema=public'

    jest.resetModules()
    const { Pool } = require('pg')
    require('@/lib/db/prisma')

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:p@ss!word@localhost:5432/db?schema=public',
    })
  })

  it('should handle DATABASE_URL with query parameters', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/db?sslmode=require&connect_timeout=10'

    jest.resetModules()
    const { Pool } = require('pg')
    require('@/lib/db/prisma')

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://localhost/db?sslmode=require&connect_timeout=10',
    })
  })

  it('should handle empty DATABASE_URL', () => {
    process.env.DATABASE_URL = ''

    jest.resetModules()
    const { logger } = require('@/lib/logger')
    const { prisma } = require('@/lib/db/prisma')

    expect(logger.warn).toHaveBeenCalled()
    expect(prisma).toBeDefined()
  })

  it('should handle whitespace-only DATABASE_URL', () => {
    process.env.DATABASE_URL = '   '

    jest.resetModules()
    const { prisma } = require('@/lib/db/prisma')

    // Should create client with whitespace URL (will fail on actual use)
    expect(prisma).toBeDefined()
  })

  it('should handle very long DATABASE_URL', () => {
    const longUrl = 'postgresql://user:pass@' + 'a'.repeat(1000) + '.com/db'
    process.env.DATABASE_URL = longUrl

    jest.resetModules()
    const { Pool } = require('pg')
    require('@/lib/db/prisma')

    expect(Pool).toHaveBeenCalledWith({ connectionString: longUrl })
  })

  it('should handle multiple prisma imports', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.NODE_ENV = 'development'

    jest.resetModules()
    const { prisma: prisma1 } = require('@/lib/db/prisma')
    const { prisma: prisma2 } = require('@/lib/db/prisma')
    const { prisma: prisma3 } = require('@/lib/db/prisma')

    // All should be the same instance in dev
    expect(prisma1).toBe(prisma2)
    expect(prisma2).toBe(prisma3)
  })
})
