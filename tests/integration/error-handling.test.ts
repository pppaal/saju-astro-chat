/**
 * Error Handling Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 데이터베이스 제약 조건 위반
 * - 트랜잭션 롤백
 * - 에러 복구 시나리오
 *
 * 실행: npm run test:integration
 * 환경변수 필요: TEST_DATABASE_URL 또는 DATABASE_URL
 */

import { beforeAll, afterAll, afterEach, describe, it, expect } from 'vitest'
import {
  testPrisma,
  createTestUserInDb,
  createTestUserCredits,
  cleanupAllTestUsers,
  checkTestDbConnection,
  connectTestDb,
  disconnectTestDb,
} from './setup'

const hasTestDb = await checkTestDbConnection()

describe('Integration: Error Handling', () => {
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

  describe('Foreign Key Constraints', () => {
    it('fails to create reading for non-existent user', async () => {
      const fakeUserId = 'non_existent_user_12345'

      await expect(
        testPrisma.reading.create({
          data: {
            userId: fakeUserId,
            type: 'saju',
            content: '{}',
          },
        })
      ).rejects.toThrow()
    })

    it('fails to create credits for non-existent user', async () => {
      const fakeUserId = 'fake_user_for_credits'

      await expect(
        testPrisma.userCredits.create({
          data: {
            userId: fakeUserId,
            plan: 'free',
            monthlyCredits: 7,
            usedCredits: 0,
            bonusCredits: 0,
            periodStart: new Date(),
            periodEnd: new Date(),
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('Unique Constraint Violations', () => {
    it('fails to create duplicate user credits', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      await expect(
        testPrisma.userCredits.create({
          data: {
            userId: user.id,
            plan: 'starter',
            monthlyCredits: 25,
            usedCredits: 0,
            bonusCredits: 0,
            periodStart: new Date(),
            periodEnd: new Date(),
          },
        })
      ).rejects.toThrow()
    })

    it('handles duplicate email gracefully with upsert', async () => {
      const email = `unique_test_${Date.now()}@example.com`

      const user1 = await testPrisma.user.create({
        data: {
          id: `user1_${Date.now()}`,
          email,
          name: 'First User',
        },
      })

      // Upsert should update, not fail
      const upserted = await testPrisma.user.upsert({
        where: { email },
        create: {
          id: `user2_${Date.now()}`,
          email,
          name: 'Second User',
        },
        update: {
          name: 'Updated First User',
        },
      })

      expect(upserted.id).toBe(user1.id)
      expect(upserted.name).toBe('Updated First User')

      // Cleanup
      await testPrisma.user.delete({ where: { id: user1.id } })
    })
  })

  describe('Transaction Rollback', () => {
    it('rolls back entire transaction on error', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      const initialCredits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      try {
        await testPrisma.$transaction(async (tx) => {
          // First operation succeeds
          await tx.userCredits.update({
            where: { userId: user.id },
            data: { usedCredits: { increment: 5 } },
          })

          // Second operation fails - reference non-existent user
          await tx.reading.create({
            data: {
              userId: 'non_existent_user',
              type: 'saju',
              content: '{}',
            },
          })
        })
      } catch {
        // Expected to fail
      }

      // Verify rollback - credits should be unchanged
      const finalCredits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(finalCredits?.usedCredits).toBe(initialCredits?.usedCredits)
    })

    it('preserves data integrity on failed multi-step operation', async () => {
      const user = await createTestUserInDb()

      const initialReadingCount = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      try {
        await testPrisma.$transaction(async (tx) => {
          // Create first reading
          await tx.reading.create({
            data: { userId: user.id, type: 'saju', content: '{}' },
          })

          // Create second reading
          await tx.reading.create({
            data: { userId: user.id, type: 'tarot', content: '{}' },
          })

          // Force error
          throw new Error('Simulated error')
        })
      } catch {
        // Expected
      }

      const finalReadingCount = await testPrisma.reading.count({
        where: { userId: user.id },
      })

      expect(finalReadingCount).toBe(initialReadingCount)
    })
  })

  describe('Data Validation', () => {
    it('handles null values in optional fields', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: '{}',
          // Optional fields left null
        },
      })

      expect(reading).toBeDefined()
      expect(reading.userId).toBe(user.id)
    })

    it('handles empty JSON content', async () => {
      const user = await createTestUserInDb()

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'test',
          content: '{}',
        },
      })

      expect(reading.content).toBe('{}')
    })

    it('handles large JSON content', async () => {
      const user = await createTestUserInDb()

      const largeContent = JSON.stringify({
        data: Array(100)
          .fill(null)
          .map((_, i) => ({
            index: i,
            value: `Item ${i}`,
            nested: { deep: { value: i * 100 } },
          })),
      })

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'large',
          content: largeContent,
        },
      })

      const parsed = JSON.parse(reading.content as string)
      expect(parsed.data).toHaveLength(100)
    })
  })

  describe('Concurrent Modification', () => {
    it('handles optimistic concurrency', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      // Simulate two concurrent updates
      const update1 = testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      })

      const update2 = testPrisma.userCredits.update({
        where: { userId: user.id },
        data: { usedCredits: { increment: 1 } },
      })

      await Promise.all([update1, update2])

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.usedCredits).toBe(2)
    })

    it('serializes conflicting transactions', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const results: number[] = []

      // Run 5 increment operations
      for (let i = 0; i < 5; i++) {
        await testPrisma.userCredits.update({
          where: { userId: user.id },
          data: { usedCredits: { increment: 1 } },
        })

        const current = await testPrisma.userCredits.findUnique({
          where: { userId: user.id },
        })
        results.push(current?.usedCredits || 0)
      }

      expect(results).toEqual([1, 2, 3, 4, 5])
    })
  })

  describe('Not Found Handling', () => {
    it('returns null for non-existent record', async () => {
      const nonExistent = await testPrisma.user.findUnique({
        where: { id: 'definitely_not_exists' },
      })

      expect(nonExistent).toBeNull()
    })

    it('throws on update of non-existent record', async () => {
      await expect(
        testPrisma.user.update({
          where: { id: 'non_existent_user' },
          data: { name: 'New Name' },
        })
      ).rejects.toThrow()
    })

    it('handles updateMany with no matches gracefully', async () => {
      const result = await testPrisma.reading.updateMany({
        where: { userId: 'non_existent_user' },
        data: { type: 'updated' },
      })

      expect(result.count).toBe(0)
    })

    it('handles deleteMany with no matches gracefully', async () => {
      const result = await testPrisma.reading.deleteMany({
        where: { userId: 'non_existent_user' },
      })

      expect(result.count).toBe(0)
    })
  })

  describe('Recovery Scenarios', () => {
    it('recovers from partial failure with retry', async () => {
      const user = await createTestUserInDb()
      let attempts = 0

      const createWithRetry = async () => {
        attempts++
        if (attempts < 3) {
          throw new Error('Simulated transient error')
        }
        return testPrisma.reading.create({
          data: { userId: user.id, type: 'retry_test', content: '{}' },
        })
      }

      let result
      for (let i = 0; i < 5; i++) {
        try {
          result = await createWithRetry()
          break
        } catch {
          // Retry
        }
      }

      expect(result).toBeDefined()
      expect(attempts).toBe(3)
    })

    it('cleans up on partial operation failure', async () => {
      const user = await createTestUserInDb()

      try {
        // Create reading
        const reading = await testPrisma.reading.create({
          data: { userId: user.id, type: 'cleanup_test', content: '{}' },
        })

        // Simulate failure in subsequent operation
        throw new Error('Subsequent operation failed')

        // This won't execute, but in real scenario,
        // you'd want to clean up the reading
      } catch {
        // Clean up partial results
        await testPrisma.reading.deleteMany({
          where: { userId: user.id, type: 'cleanup_test' },
        })
      }

      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id, type: 'cleanup_test' },
      })

      expect(readings).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('handles very long strings', async () => {
      const user = await createTestUserInDb()
      const longString = 'A'.repeat(10000)

      const history = await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: 'test',
          summary: 'Long content test',
          content: longString,
        },
      })

      expect(history.content).toHaveLength(10000)
    })

    it('handles special characters in content', async () => {
      const user = await createTestUserInDb()
      const specialContent = JSON.stringify({
        text: '한글 테스트 🎉 émojis & <special> "chars"',
        unicode: '\u0000\u001F',
      })

      const reading = await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'special',
          content: specialContent,
        },
      })

      expect(reading.content).toBe(specialContent)
    })

    it('handles date edge cases', async () => {
      const user = await createTestUserInDb()

      // Very old date
      const oldDate = '1900-01-01'

      // Future date
      const futureDate = '2099-12-31'

      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: oldDate, title: 'Old Event' },
      })

      await testPrisma.savedCalendarDate.create({
        data: { userId: user.id, date: futureDate, title: 'Future Event' },
      })

      const dates = await testPrisma.savedCalendarDate.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
      })

      expect(dates[0].date).toBe(oldDate)
      expect(dates[1].date).toBe(futureDate)
    })
  })
})
