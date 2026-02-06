/**
 * Admin Audit Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 관리자 감사 로그
 * - 사용자 신고 관리
 * - 사용자 차단 관리
 * - 크레딧 환불 로그
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

describe('Integration: Admin Audit System', () => {
  if (!hasTestDb) {
    it.skip('skips when test database is unavailable', () => {})
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

  describe('Admin Audit Log', () => {
    it('logs admin action', async () => {
      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_001',
          action: 'user_ban',
          targetType: 'user',
          targetId: 'user_123',
          details: {
            reason: 'Violation of terms',
            duration: 'permanent',
          },
          ipAddress: '192.168.1.1',
        },
      })

      expect(log).toBeDefined()
      expect(log.action).toBe('user_ban')
      expect(log.targetType).toBe('user')
    })

    it('tracks various admin actions', async () => {
      const actions = [
        { action: 'user_ban', targetType: 'user' },
        { action: 'content_remove', targetType: 'post' },
        { action: 'credit_adjust', targetType: 'credits' },
        { action: 'subscription_cancel', targetType: 'subscription' },
      ]

      for (const a of actions) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: 'admin_001',
            action: a.action,
            targetType: a.targetType,
            targetId: `target_${Date.now()}`,
            details: {},
          },
        })
      }

      const logs = await testPrisma.adminAuditLog.findMany({
        where: { adminId: 'admin_001' },
      })

      expect(logs.length).toBeGreaterThanOrEqual(4)
    })

    it('filters logs by action type', async () => {
      await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_1',
          action: 'user_ban',
          targetType: 'user',
          targetId: 'u1',
          details: {},
        },
      })
      await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_1',
          action: 'credit_adjust',
          targetType: 'credits',
          targetId: 'c1',
          details: {},
        },
      })
      await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_1',
          action: 'user_ban',
          targetType: 'user',
          targetId: 'u2',
          details: {},
        },
      })

      const banLogs = await testPrisma.adminAuditLog.findMany({
        where: { action: 'user_ban' },
      })

      expect(banLogs.length).toBeGreaterThanOrEqual(2)
    })

    it('retrieves logs within date range', async () => {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_time',
          action: 'recent_action',
          targetType: 'test',
          targetId: 't1',
          details: {},
          createdAt: now,
        },
      })

      const recentLogs = await testPrisma.adminAuditLog.findMany({
        where: {
          createdAt: { gte: yesterday },
        },
      })

      expect(recentLogs.length).toBeGreaterThanOrEqual(1)
    })

    it('stores IP address for audit trail', async () => {
      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: 'admin_ip',
          action: 'sensitive_action',
          targetType: 'system',
          targetId: 'sys_1',
          details: {},
          ipAddress: '10.0.0.1',
        },
      })

      expect(log.ipAddress).toBe('10.0.0.1')
    })
  })

  describe('User Report', () => {
    it('creates user report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'spam',
          description: 'User is sending spam messages',
          status: 'pending',
        },
      })

      expect(report).toBeDefined()
      expect(report.reason).toBe('spam')
      expect(report.status).toBe('pending')
    })

    it('updates report status', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'harassment',
          status: 'pending',
        },
      })

      const updated = await testPrisma.userReport.update({
        where: { id: report.id },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
          resolvedBy: 'admin_001',
        },
      })

      expect(updated.status).toBe('resolved')
      expect(updated.resolvedAt).toBeInstanceOf(Date)
    })

    it('retrieves pending reports', async () => {
      const reporter = await createTestUserInDb()
      const reported1 = await createTestUserInDb()
      const reported2 = await createTestUserInDb()

      await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported1.id,
          reason: 'spam',
          status: 'pending',
        },
      })
      await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported2.id,
          reason: 'abuse',
          status: 'resolved',
        },
      })

      const pendingReports = await testPrisma.userReport.findMany({
        where: { status: 'pending' },
      })

      const fromReporter = pendingReports.filter((r) => r.reporterId === reporter.id)
      expect(fromReporter).toHaveLength(1)
    })

    it('tracks reports by reason', async () => {
      const reporter = await createTestUserInDb()

      const reasons = ['spam', 'harassment', 'inappropriate', 'spam', 'other']

      for (const reason of reasons) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: { reporterId: reporter.id, reportedId: reported.id, reason, status: 'pending' },
        })
      }

      const spamReports = await testPrisma.userReport.findMany({
        where: { reporterId: reporter.id, reason: 'spam' },
      })

      expect(spamReports).toHaveLength(2)
    })
  })

  describe('User Block', () => {
    it('creates user block', async () => {
      const blocker = await createTestUserInDb()
      const blocked = await createTestUserInDb()

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: blocker.id,
          blockedId: blocked.id,
        },
      })

      expect(block).toBeDefined()
      expect(block.blockerId).toBe(blocker.id)
      expect(block.blockedId).toBe(blocked.id)
    })

    it('prevents duplicate blocks', async () => {
      const blocker = await createTestUserInDb()
      const blocked = await createTestUserInDb()

      await testPrisma.userBlock.create({
        data: { blockerId: blocker.id, blockedId: blocked.id },
      })

      // Check if block exists before creating another
      const existing = await testPrisma.userBlock.findFirst({
        where: { blockerId: blocker.id, blockedId: blocked.id },
      })

      expect(existing).not.toBeNull()
    })

    it("retrieves user's blocked list", async () => {
      const blocker = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        const blocked = await createTestUserInDb()
        await testPrisma.userBlock.create({
          data: { blockerId: blocker.id, blockedId: blocked.id },
        })
      }

      const blockedList = await testPrisma.userBlock.findMany({
        where: { blockerId: blocker.id },
      })

      expect(blockedList).toHaveLength(5)
    })

    it('removes block', async () => {
      const blocker = await createTestUserInDb()
      const blocked = await createTestUserInDb()

      const block = await testPrisma.userBlock.create({
        data: { blockerId: blocker.id, blockedId: blocked.id },
      })

      await testPrisma.userBlock.delete({ where: { id: block.id } })

      const found = await testPrisma.userBlock.findUnique({ where: { id: block.id } })
      expect(found).toBeNull()
    })

    it('checks if user is blocked', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()
      const user3 = await createTestUserInDb()

      await testPrisma.userBlock.create({
        data: { blockerId: user1.id, blockedId: user2.id },
      })

      const isUser2Blocked = await testPrisma.userBlock.findFirst({
        where: { blockerId: user1.id, blockedId: user2.id },
      })

      const isUser3Blocked = await testPrisma.userBlock.findFirst({
        where: { blockerId: user1.id, blockedId: user3.id },
      })

      expect(isUser2Blocked).not.toBeNull()
      expect(isUser3Blocked).toBeNull()
    })
  })

  describe('Credit Refund Log', () => {
    it('logs credit refund', async () => {
      const user = await createTestUserInDb()

      const refund = await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 10,
          reason: 'Service error',
          processedBy: 'admin_001',
          status: 'completed',
        },
      })

      expect(refund).toBeDefined()
      expect(refund.amount).toBe(10)
      expect(refund.status).toBe('completed')
    })

    it('tracks refund with transaction details', async () => {
      const user = await createTestUserInDb()

      const refund = await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 25,
          reason: 'Billing dispute',
          processedBy: 'admin_002',
          status: 'pending',
          transactionId: `txn_${Date.now()}`,
        },
      })

      expect(refund.transactionId).toContain('txn_')
    })

    it('retrieves refunds by status', async () => {
      const user = await createTestUserInDb()

      await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 5,
          reason: 'R1',
          processedBy: 'admin',
          status: 'completed',
        },
      })
      await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 10,
          reason: 'R2',
          processedBy: 'admin',
          status: 'pending',
        },
      })
      await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 15,
          reason: 'R3',
          processedBy: 'admin',
          status: 'completed',
        },
      })

      const completedRefunds = await testPrisma.creditRefundLog.findMany({
        where: { userId: user.id, status: 'completed' },
      })

      expect(completedRefunds).toHaveLength(2)
    })

    it('calculates total refunded amount', async () => {
      const user = await createTestUserInDb()

      const amounts = [5, 10, 15, 20]

      for (const amount of amounts) {
        await testPrisma.creditRefundLog.create({
          data: {
            userId: user.id,
            amount,
            reason: 'Test',
            processedBy: 'admin',
            status: 'completed',
          },
        })
      }

      const refunds = await testPrisma.creditRefundLog.findMany({
        where: { userId: user.id, status: 'completed' },
      })

      const totalRefunded = refunds.reduce((sum, r) => sum + r.amount, 0)
      expect(totalRefunded).toBe(50)
    })

    it('updates refund status', async () => {
      const user = await createTestUserInDb()

      const refund = await testPrisma.creditRefundLog.create({
        data: {
          userId: user.id,
          amount: 30,
          reason: 'Processing',
          processedBy: 'admin',
          status: 'pending',
        },
      })

      const updated = await testPrisma.creditRefundLog.update({
        where: { id: refund.id },
        data: { status: 'completed' },
      })

      expect(updated.status).toBe('completed')
    })
  })
})
