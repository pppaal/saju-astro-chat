/**
 * Data Retention Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 데이터 보관 정책
 * - 히스토리 삭제
 * - GDPR 준수 데이터 삭제
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

describe('Integration: Data Retention', () => {
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

  describe('History Retention by Plan', () => {
    it('tracks retention period for free plan (7 days)', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.historyRetention).toBe(7)
    })

    it('tracks retention period for starter plan (30 days)', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'starter')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.historyRetention).toBe(30)
    })

    it('tracks retention period for pro plan (90 days)', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'pro')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.historyRetention).toBe(90)
    })

    it('tracks retention period for premium plan (365 days)', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'premium')

      const credits = await testPrisma.userCredits.findUnique({
        where: { userId: user.id },
      })

      expect(credits?.historyRetention).toBe(365)
    })
  })

  describe('Reading History Cleanup', () => {
    it('identifies readings older than retention period', async () => {
      const user = await createTestUserInDb()
      await createTestUserCredits(user.id, 'free') // 7 days retention

      const now = new Date()
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

      // Old reading (should be deleted)
      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: '{}',
          createdAt: tenDaysAgo,
        },
      })

      // Recent reading (should be kept)
      await testPrisma.reading.create({
        data: {
          userId: user.id,
          type: 'saju',
          content: '{}',
          createdAt: fiveDaysAgo,
        },
      })

      const retentionDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const oldReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: { lt: retentionDate },
        },
      })

      const recentReadings = await testPrisma.reading.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: retentionDate },
        },
      })

      expect(oldReadings).toHaveLength(1)
      expect(recentReadings).toHaveLength(1)
    })

    it('deletes readings beyond retention period', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000)

      // Create old readings
      for (let i = 0; i < 5; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'fortune',
            content: '{}',
            createdAt: oldDate,
          },
        })
      }

      // Create recent readings
      for (let i = 0; i < 3; i++) {
        await testPrisma.reading.create({
          data: {
            userId: user.id,
            type: 'fortune',
            content: '{}',
            createdAt: now,
          },
        })
      }

      const retentionDays = 30
      const cutoffDate = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)

      // Delete old readings
      await testPrisma.reading.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: cutoffDate },
        },
      })

      const remainingReadings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })

      expect(remainingReadings).toHaveLength(3)
    })
  })

  describe('Chat Session Cleanup', () => {
    it('cleans up old chat sessions', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oldDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      // Old session
      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'career',
          messages: [],
          createdAt: oldDate,
        },
      })

      // Recent session
      await testPrisma.counselorChatSession.create({
        data: {
          userId: user.id,
          theme: 'love',
          messages: [],
          createdAt: now,
        },
      })

      const cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const oldSessions = await testPrisma.counselorChatSession.findMany({
        where: {
          userId: user.id,
          createdAt: { lt: cutoffDate },
        },
      })

      expect(oldSessions).toHaveLength(1)
      expect(oldSessions[0].theme).toBe('career')
    })
  })

  describe('Consultation History Cleanup', () => {
    it('archives old consultation history', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

      // Old history
      await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: 'saju',
          summary: 'Old consultation',
          content: '{}',
          createdAt: sixMonthsAgo,
        },
      })

      // Recent history
      await testPrisma.consultationHistory.create({
        data: {
          userId: user.id,
          theme: 'tarot',
          summary: 'Recent consultation',
          content: '{}',
          createdAt: now,
        },
      })

      const cutoffDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      const oldHistory = await testPrisma.consultationHistory.findMany({
        where: {
          userId: user.id,
          createdAt: { lt: cutoffDate },
        },
      })

      expect(oldHistory).toHaveLength(1)
    })
  })

  describe('GDPR Data Deletion', () => {
    it('deletes all user data on account deletion', async () => {
      // Create user with test data marker
      const userData = {
        id: `gdpr_test_${Date.now()}`,
        email: `gdpr_${Date.now()}@test.example.com`,
        name: 'GDPR Test User',
      }

      const user = await testPrisma.user.create({ data: userData })

      // Create associated data
      await testPrisma.reading.create({
        data: { userId: user.id, type: 'saju', content: '{}' },
      })

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: 'test', summary: 'test', content: '{}' },
      })

      // Delete user (cascade should delete related data)
      await testPrisma.user.delete({ where: { id: user.id } })

      // Verify all data is deleted
      const readings = await testPrisma.reading.findMany({
        where: { userId: user.id },
      })
      const history = await testPrisma.consultationHistory.findMany({
        where: { userId: user.id },
      })

      expect(readings).toHaveLength(0)
      expect(history).toHaveLength(0)
    })

    it('exports user data before deletion', async () => {
      const user = await createTestUserInDb()

      // Create various data
      await testPrisma.reading.create({
        data: { userId: user.id, type: 'saju', content: JSON.stringify({ data: 'test' }) },
      })

      await testPrisma.consultationHistory.create({
        data: { userId: user.id, theme: 'export_test', summary: 'Export test', content: '{}' },
      })

      // Export user data
      const userData = await testPrisma.user.findUnique({
        where: { id: user.id },
        include: {
          readings: true,
          consultationHistory: true,
        },
      })

      expect(userData).not.toBeNull()
      expect(userData?.readings.length).toBeGreaterThanOrEqual(1)
      expect(userData?.consultationHistory.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Shared Result Expiration', () => {
    it('identifies expired shared results', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Expired share
      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'expired',
          shareCode: `expired_${Date.now()}`,
          resultData: {},
          expiresAt: yesterday,
        },
      })

      // Valid share
      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'valid',
          shareCode: `valid_${Date.now()}`,
          resultData: {},
          expiresAt: tomorrow,
        },
      })

      const expiredShares = await testPrisma.sharedResult.findMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      })

      const validShares = await testPrisma.sharedResult.findMany({
        where: {
          userId: user.id,
          expiresAt: { gte: now },
        },
      })

      expect(expiredShares).toHaveLength(1)
      expect(validShares).toHaveLength(1)
    })

    it('cleans up expired shared results', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const pastDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Create expired shares
      for (let i = 0; i < 5; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'test',
            shareCode: `cleanup_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: pastDate,
          },
        })
      }

      // Delete expired
      await testPrisma.sharedResult.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      })

      const remaining = await testPrisma.sharedResult.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })
  })

  describe('Interaction Log Cleanup', () => {
    it('removes old interaction logs', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oldDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      // Old interactions
      for (let i = 0; i < 10; i++) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'old_action',
            context: {},
            createdAt: oldDate,
          },
        })
      }

      // Recent interactions
      for (let i = 0; i < 5; i++) {
        await testPrisma.userInteraction.create({
          data: {
            userId: user.id,
            interactionType: 'recent_action',
            context: {},
            createdAt: now,
          },
        })
      }

      const cutoffDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

      await testPrisma.userInteraction.deleteMany({
        where: {
          userId: user.id,
          createdAt: { lt: cutoffDate },
        },
      })

      const remaining = await testPrisma.userInteraction.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(5)
      expect(remaining[0].interactionType).toBe('recent_action')
    })
  })

  describe('Email Log Retention', () => {
    it('retains email logs for compliance period', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

      // Very old email
      await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: 'old_notification',
          recipient: user.email!,
          subject: 'Old Email',
          status: 'sent',
          createdAt: oneYearAgo,
        },
      })

      // Recent email
      await testPrisma.emailLog.create({
        data: {
          userId: user.id,
          emailType: 'recent_notification',
          recipient: user.email!,
          subject: 'Recent Email',
          status: 'sent',
          createdAt: sixMonthsAgo,
        },
      })

      // Compliance period: 1 year
      const complianceCutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      const logsToKeep = await testPrisma.emailLog.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: complianceCutoff },
        },
      })

      expect(logsToKeep).toHaveLength(1)
    })
  })
})
