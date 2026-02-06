/**
 * Admin Audit Log Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 관리자 활동 감사 로그
 * - 보안 이벤트 추적
 * - 감사 보고서 생성
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

describe('Integration: Admin Audit Log', () => {
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

  describe('Audit Log Creation', () => {
    it('logs admin login', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'LOGIN',
          resource: 'admin_panel',
          description: 'Admin logged in',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      })

      expect(log.action).toBe('LOGIN')
    })

    it('logs user modification', async () => {
      const admin = await createTestUserInDb()
      const targetUser = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'UPDATE_USER',
          resource: 'user',
          resourceId: targetUser.id,
          description: 'Updated user subscription',
          changes: {
            before: { subscription: 'free' },
            after: { subscription: 'premium' },
          },
        },
      })

      expect(log.action).toBe('UPDATE_USER')
      const changes = log.changes as { before: { subscription: string } }
      expect(changes.before.subscription).toBe('free')
    })

    it('logs content deletion', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'DELETE',
          resource: 'reading',
          resourceId: 'reading_123',
          description: 'Deleted inappropriate content',
          reason: 'Policy violation',
        },
      })

      expect(log.action).toBe('DELETE')
      expect(log.reason).toBe('Policy violation')
    })

    it('logs refund processing', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'PROCESS_REFUND',
          resource: 'payment',
          resourceId: 'payment_456',
          description: 'Processed refund for customer complaint',
          metadata: {
            amount: 9900,
            reason: 'Customer dissatisfaction',
            transactionId: 'txn_789',
          },
        },
      })

      const meta = log.metadata as { amount: number }
      expect(meta.amount).toBe(9900)
    })

    it('logs system configuration change', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'UPDATE_CONFIG',
          resource: 'system_config',
          description: 'Updated rate limiting settings',
          changes: {
            before: { maxRequests: 100 },
            after: { maxRequests: 200 },
          },
          severity: 'high',
        },
      })

      expect(log.severity).toBe('high')
    })
  })

  describe('Audit Log Retrieval', () => {
    it('retrieves logs by admin', async () => {
      const admin = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Viewed user ${i}`,
          },
        })
      }

      const logs = await testPrisma.adminAuditLog.findMany({
        where: { adminId: admin.id },
      })

      expect(logs).toHaveLength(5)
    })

    it('retrieves logs by action type', async () => {
      const admin = await createTestUserInDb()

      const actions = ['LOGIN', 'VIEW', 'UPDATE', 'VIEW', 'DELETE', 'VIEW']

      for (let i = 0; i < actions.length; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: actions[i],
            resource: 'user',
            description: `Action ${i}`,
          },
        })
      }

      const viewLogs = await testPrisma.adminAuditLog.findMany({
        where: { adminId: admin.id, action: 'VIEW' },
      })

      expect(viewLogs).toHaveLength(3)
    })

    it('retrieves logs by resource', async () => {
      const admin = await createTestUserInDb()

      const resources = ['user', 'payment', 'user', 'content', 'user']

      for (let i = 0; i < resources.length; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: resources[i],
            description: `Viewed ${resources[i]}`,
          },
        })
      }

      const userLogs = await testPrisma.adminAuditLog.findMany({
        where: { adminId: admin.id, resource: 'user' },
      })

      expect(userLogs).toHaveLength(3)
    })

    it('retrieves logs by date range', async () => {
      const admin = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Action ${i} days ago`,
            createdAt: date,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentLogs = await testPrisma.adminAuditLog.findMany({
        where: {
          adminId: admin.id,
          createdAt: { gte: sevenDaysAgo },
        },
      })

      expect(recentLogs).toHaveLength(8)
    })

    it('retrieves recent logs first', async () => {
      const admin = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Action ${i}`,
          },
        })
      }

      const logs = await testPrisma.adminAuditLog.findMany({
        where: { adminId: admin.id },
        orderBy: { createdAt: 'desc' },
        take: 3,
      })

      expect(logs[0].description).toBe('Action 4')
    })
  })

  describe('Security Event Tracking', () => {
    it('logs failed login attempts', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'LOGIN_FAILED',
          resource: 'auth',
          description: 'Failed login attempt',
          ipAddress: '203.0.113.1',
          severity: 'warning',
          metadata: {
            attemptCount: 3,
            reason: 'Invalid password',
          },
        },
      })

      expect(log.action).toBe('LOGIN_FAILED')
      expect(log.severity).toBe('warning')
    })

    it('logs permission denied events', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'PERMISSION_DENIED',
          resource: 'super_admin_panel',
          description: 'Attempted to access restricted area',
          severity: 'high',
        },
      })

      expect(log.action).toBe('PERMISSION_DENIED')
    })

    it('logs suspicious activity', async () => {
      const admin = await createTestUserInDb()

      const log = await testPrisma.adminAuditLog.create({
        data: {
          adminId: admin.id,
          action: 'SUSPICIOUS_ACTIVITY',
          resource: 'bulk_operation',
          description: 'Unusual bulk delete operation',
          severity: 'critical',
          metadata: {
            affectedRecords: 1000,
            operationType: 'DELETE',
          },
        },
      })

      expect(log.severity).toBe('critical')
    })

    it('retrieves high severity logs', async () => {
      const admin = await createTestUserInDb()

      const severities = ['low', 'medium', 'high', 'critical', 'low', 'high']

      for (let i = 0; i < severities.length; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Action ${i}`,
            severity: severities[i],
          },
        })
      }

      const highSeverity = await testPrisma.adminAuditLog.findMany({
        where: {
          adminId: admin.id,
          severity: { in: ['high', 'critical'] },
        },
      })

      expect(highSeverity).toHaveLength(3)
    })
  })

  describe('Audit Statistics', () => {
    it('counts actions by type', async () => {
      const admin = await createTestUserInDb()

      const actions = ['LOGIN', 'VIEW', 'VIEW', 'UPDATE', 'VIEW', 'DELETE']

      for (let i = 0; i < actions.length; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: actions[i],
            resource: 'user',
            description: `Action`,
          },
        })
      }

      const counts = await testPrisma.adminAuditLog.groupBy({
        by: ['action'],
        where: { adminId: admin.id },
        _count: { id: true },
      })

      const viewCount = counts.find((c) => c.action === 'VIEW')?._count.id
      expect(viewCount).toBe(3)
    })

    it('counts actions by admin', async () => {
      const admins: string[] = []
      const actionCounts = [5, 10, 3]

      for (let i = 0; i < actionCounts.length; i++) {
        const admin = await createTestUserInDb()
        admins.push(admin.id)

        for (let j = 0; j < actionCounts[i]; j++) {
          await testPrisma.adminAuditLog.create({
            data: {
              adminId: admin.id,
              action: 'VIEW',
              resource: 'user',
              description: `Action ${j}`,
            },
          })
        }
      }

      const counts = await testPrisma.adminAuditLog.groupBy({
        by: ['adminId'],
        where: { adminId: { in: admins } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(counts[0]._count.id).toBe(10)
    })

    it('counts by severity', async () => {
      const admin = await createTestUserInDb()

      const severities = ['low', 'low', 'medium', 'high', 'low', 'critical']

      for (let i = 0; i < severities.length; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Action`,
            severity: severities[i],
          },
        })
      }

      const counts = await testPrisma.adminAuditLog.groupBy({
        by: ['severity'],
        where: { adminId: admin.id },
        _count: { id: true },
      })

      const lowCount = counts.find((c) => c.severity === 'low')?._count.id
      expect(lowCount).toBe(3)
    })
  })

  describe('Audit Report Generation', () => {
    it('generates daily activity summary', async () => {
      const admin = await createTestUserInDb()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const actions = ['LOGIN', 'VIEW', 'UPDATE', 'VIEW', 'LOGOUT']

      for (const action of actions) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action,
            resource: 'user',
            description: `${action} action`,
          },
        })
      }

      const todayLogs = await testPrisma.adminAuditLog.findMany({
        where: {
          adminId: admin.id,
          createdAt: { gte: today },
        },
      })

      expect(todayLogs).toHaveLength(5)
    })

    it('generates resource access report', async () => {
      const admin = await createTestUserInDb()

      const resources = ['user', 'payment', 'user', 'content', 'payment', 'user']

      for (const resource of resources) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource,
            description: `Viewed ${resource}`,
          },
        })
      }

      const resourceCounts = await testPrisma.adminAuditLog.groupBy({
        by: ['resource'],
        where: { adminId: admin.id },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(resourceCounts[0].resource).toBe('user')
      expect(resourceCounts[0]._count.id).toBe(3)
    })
  })

  describe('Audit Log Deletion', () => {
    it('archives old logs', async () => {
      const admin = await createTestUserInDb()
      const now = new Date()

      // Old logs
      for (let i = 0; i < 3; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Old ${i}`,
            createdAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent logs
      for (let i = 0; i < 2; i++) {
        await testPrisma.adminAuditLog.create({
          data: {
            adminId: admin.id,
            action: 'VIEW',
            resource: 'user',
            description: `Recent ${i}`,
          },
        })
      }

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      await testPrisma.adminAuditLog.deleteMany({
        where: {
          adminId: admin.id,
          createdAt: { lt: oneYearAgo },
        },
      })

      const remaining = await testPrisma.adminAuditLog.findMany({
        where: { adminId: admin.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
