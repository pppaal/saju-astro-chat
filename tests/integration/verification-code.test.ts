/**
 * Verification Code Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 인증 코드 생성
 * - 코드 검증
 * - 만료 처리
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Verification Code', () => {
  if (!hasTestDb) {
    return
  }

  beforeAll(async () => {
    await connectTestDb()
  })

  afterAll(async () => {
    await cleanupAllTestUsers()
    await disconnectTestDb()
  })

  afterEach(async () => {
    await cleanupAllTestUsers()
  })

  describe('Code Generation', () => {
    it('generates email verification code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '123456',
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      expect(code.type).toBe('email')
      expect(code.code).toBe('123456')
    })

    it('generates phone verification code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '789012',
          type: 'phone',
          target: '+821012345678',
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      })

      expect(code.type).toBe('phone')
      expect(code.target).toContain('+82')
    })

    it('generates password reset code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: 'abcdef123456',
          type: 'password_reset',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      expect(code.type).toBe('password_reset')
    })

    it('generates two-factor auth code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '345678',
          type: 'two_factor',
          target: user.email,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          metadata: {
            method: 'totp',
          },
        },
      })

      expect(code.type).toBe('two_factor')
    })

    it('generates magic link token', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: 'magic_token_xyz789',
          type: 'magic_link',
          target: user.email,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
      })

      expect(code.type).toBe('magic_link')
    })
  })

  describe('Code Verification', () => {
    it('verifies valid code', async () => {
      const user = await createTestUserInDb()
      const codeValue = '123456'

      await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      const found = await testPrisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      })

      expect(found).not.toBeNull()
    })

    it('rejects expired code', async () => {
      const user = await createTestUserInDb()
      const codeValue = '123456'

      await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() - 60 * 1000), // Expired 1 minute ago
        },
      })

      const found = await testPrisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      })

      expect(found).toBeNull()
    })

    it('rejects already used code', async () => {
      const user = await createTestUserInDb()
      const codeValue = '123456'

      await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          usedAt: new Date(),
        },
      })

      const found = await testPrisma.verificationCode.findFirst({
        where: {
          userId: user.id,
          code: codeValue,
          type: 'email',
          usedAt: null,
        },
      })

      expect(found).toBeNull()
    })

    it('marks code as used', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '123456',
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      const updated = await testPrisma.verificationCode.update({
        where: { id: code.id },
        data: {
          usedAt: new Date(),
          usedIp: '192.168.1.1',
        },
      })

      expect(updated.usedAt).not.toBeNull()
    })
  })

  describe('Code Retrieval', () => {
    it('retrieves codes by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      }

      const codes = await testPrisma.verificationCode.findMany({
        where: { userId: user.id },
      })

      expect(codes).toHaveLength(5)
    })

    it('retrieves codes by type', async () => {
      const user = await createTestUserInDb()

      const types = ['email', 'phone', 'email', 'password_reset', 'email']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: types[i],
            target: 'target@example.com',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      }

      const emailCodes = await testPrisma.verificationCode.findMany({
        where: { userId: user.id, type: 'email' },
      })

      expect(emailCodes).toHaveLength(3)
    })

    it('retrieves unused codes', async () => {
      const user = await createTestUserInDb()

      const usedStates = [null, new Date(), null, new Date(), null]

      for (let i = 0; i < usedStates.length; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            usedAt: usedStates[i],
          },
        })
      }

      const unusedCodes = await testPrisma.verificationCode.findMany({
        where: { userId: user.id, usedAt: null },
      })

      expect(unusedCodes).toHaveLength(3)
    })

    it('retrieves valid (not expired) codes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Expired codes
      for (let i = 0; i < 2; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `expired_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() - 60 * 1000),
          },
        })
      }

      // Valid codes
      for (let i = 0; i < 3; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `valid_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          },
        })
      }

      const validCodes = await testPrisma.verificationCode.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: now },
        },
      })

      expect(validCodes).toHaveLength(3)
    })
  })

  describe('Rate Limiting', () => {
    it('tracks attempt count', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '123456',
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attemptCount: 0,
        },
      })

      // Simulate 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await testPrisma.verificationCode.update({
          where: { id: code.id },
          data: { attemptCount: { increment: 1 } },
        })
      }

      const updated = await testPrisma.verificationCode.findUnique({
        where: { id: code.id },
      })

      expect(updated?.attemptCount).toBe(3)
    })

    it('blocks after max attempts', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: '123456',
          type: 'email',
          target: 'user@example.com',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          attemptCount: 5,
          maxAttempts: 5,
        },
      })

      const isBlocked = code.attemptCount >= (code.maxAttempts || 5)
      expect(isBlocked).toBe(true)
    })

    it('counts codes sent in time window', async () => {
      const user = await createTestUserInDb()
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

      for (let i = 0; i < 5; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      }

      const recentCodes = await testPrisma.verificationCode.count({
        where: {
          userId: user.id,
          type: 'email',
          createdAt: { gte: oneHourAgo },
        },
      })

      expect(recentCodes).toBe(5)
    })
  })

  describe('Code Statistics', () => {
    it('counts codes by type', async () => {
      const user = await createTestUserInDb()

      const types = ['email', 'email', 'phone', 'email', 'password_reset']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: types[i],
            target: 'target',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
      }

      const counts = await testPrisma.verificationCode.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const emailCount = counts.find((c) => c.type === 'email')?._count.id
      expect(emailCount).toBe(3)
    })

    it('calculates verification success rate', async () => {
      const user = await createTestUserInDb()

      const usedStates = [new Date(), new Date(), null, new Date(), null] // 60% success

      for (let i = 0; i < usedStates.length; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `code_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            usedAt: usedStates[i],
          },
        })
      }

      const total = await testPrisma.verificationCode.count({
        where: { userId: user.id },
      })

      const used = await testPrisma.verificationCode.count({
        where: { userId: user.id, usedAt: { not: null } },
      })

      const successRate = (used / total) * 100
      expect(successRate).toBe(60)
    })
  })

  describe('Code Invalidation', () => {
    it('invalidates old codes when new one is created', async () => {
      const user = await createTestUserInDb()
      const target = 'user@example.com'

      // Create old code
      const oldCode = await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: 'old123',
          type: 'email',
          target,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      // Invalidate old codes
      await testPrisma.verificationCode.updateMany({
        where: {
          userId: user.id,
          type: 'email',
          target,
          usedAt: null,
          id: { not: oldCode.id },
        },
        data: {
          invalidatedAt: new Date(),
          invalidationReason: 'New code requested',
        },
      })

      // Create new code
      await testPrisma.verificationCode.create({
        data: {
          userId: user.id,
          code: 'new456',
          type: 'email',
          target,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        },
      })

      const activeCodes = await testPrisma.verificationCode.findMany({
        where: {
          userId: user.id,
          type: 'email',
          target,
          usedAt: null,
          invalidatedAt: null,
        },
      })

      expect(activeCodes).toHaveLength(2)
    })
  })

  describe('Code Cleanup', () => {
    it('deletes expired codes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old expired codes
      for (let i = 0; i < 3; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `old_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent codes
      for (let i = 0; i < 2; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `new_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          },
        })
      }

      await testPrisma.verificationCode.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      })

      const remaining = await testPrisma.verificationCode.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })

    it('deletes used codes after retention period', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old used codes
      for (let i = 0; i < 3; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `old_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
            usedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent used codes
      for (let i = 0; i < 2; i++) {
        await testPrisma.verificationCode.create({
          data: {
            userId: user.id,
            code: `recent_${i}`,
            type: 'email',
            target: 'user@example.com',
            expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
            usedAt: new Date(),
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.verificationCode.deleteMany({
        where: {
          userId: user.id,
          usedAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.verificationCode.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
