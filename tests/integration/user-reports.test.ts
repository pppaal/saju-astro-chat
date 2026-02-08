/**
 * User Reports Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 사용자 신고 관리
 * - 신고 상태 처리
 * - 신고 통계 및 분석
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

describe('Integration: User Reports', () => {
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

  describe('Report Creation', () => {
    it('creates user report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'spam',
          description: '스팸 메시지를 보냄',
          status: 'pending',
        },
      })

      expect(report.reason).toBe('spam')
      expect(report.status).toBe('pending')
    })

    it('creates harassment report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'harassment',
          description: '불쾌한 메시지를 반복적으로 보냄',
          status: 'pending',
          evidence: {
            messageIds: ['msg_1', 'msg_2', 'msg_3'],
            screenshots: ['screenshot1.jpg'],
          },
        },
      })

      const evidence = report.evidence as { messageIds: string[] }
      expect(evidence.messageIds).toHaveLength(3)
    })

    it('creates inappropriate content report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'inappropriate_content',
          description: '부적절한 프로필 사진',
          status: 'pending',
        },
      })

      expect(report.reason).toBe('inappropriate_content')
    })

    it('creates scam report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'scam',
          description: '금전 요구',
          status: 'pending',
          priority: 'high',
        },
      })

      expect(report.priority).toBe('high')
    })
  })

  describe('Report Status Management', () => {
    it('updates report to under review', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'spam',
          description: 'Test',
          status: 'pending',
        },
      })

      const updated = await testPrisma.userReport.update({
        where: { id: report.id },
        data: {
          status: 'reviewing',
          reviewedAt: new Date(),
          reviewedBy: 'admin_user',
        },
      })

      expect(updated.status).toBe('reviewing')
      expect(updated.reviewedBy).toBe('admin_user')
    })

    it('resolves report with action', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'harassment',
          description: 'Test',
          status: 'reviewing',
        },
      })

      const updated = await testPrisma.userReport.update({
        where: { id: report.id },
        data: {
          status: 'resolved',
          resolution: 'warning_issued',
          resolvedAt: new Date(),
          adminNotes: '경고 발송됨',
        },
      })

      expect(updated.status).toBe('resolved')
      expect(updated.resolution).toBe('warning_issued')
    })

    it('dismisses invalid report', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      const report = await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'spam',
          description: '오해였음',
          status: 'reviewing',
        },
      })

      const updated = await testPrisma.userReport.update({
        where: { id: report.id },
        data: {
          status: 'dismissed',
          resolution: 'no_violation',
          resolvedAt: new Date(),
          adminNotes: '위반 사항 없음',
        },
      })

      expect(updated.status).toBe('dismissed')
    })
  })

  describe('Report Retrieval', () => {
    it('retrieves reports by status', async () => {
      const reporter = await createTestUserInDb()

      const statuses = ['pending', 'pending', 'reviewing', 'resolved', 'pending']

      for (let i = 0; i < statuses.length; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'spam',
            description: `Report ${i}`,
            status: statuses[i],
          },
        })
      }

      const pendingReports = await testPrisma.userReport.findMany({
        where: { reporterId: reporter.id, status: 'pending' },
      })

      expect(pendingReports).toHaveLength(3)
    })

    it('retrieves reports against user', async () => {
      const reported = await createTestUserInDb()

      for (let i = 0; i < 4; i++) {
        const reporter = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'harassment',
            description: `Report ${i}`,
            status: 'pending',
          },
        })
      }

      const reportsAgainst = await testPrisma.userReport.findMany({
        where: { reportedId: reported.id },
      })

      expect(reportsAgainst).toHaveLength(4)
    })

    it('retrieves reports by user (reporter)', async () => {
      const reporter = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'spam',
            description: `Report ${i}`,
            status: 'pending',
          },
        })
      }

      const reportsByUser = await testPrisma.userReport.findMany({
        where: { reporterId: reporter.id },
      })

      expect(reportsByUser).toHaveLength(3)
    })

    it('retrieves high priority reports', async () => {
      const reporter = await createTestUserInDb()

      const priorities = ['low', 'medium', 'high', 'high', 'medium']

      for (let i = 0; i < priorities.length; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'scam',
            description: `Report ${i}`,
            status: 'pending',
            priority: priorities[i],
          },
        })
      }

      const highPriority = await testPrisma.userReport.findMany({
        where: { reporterId: reporter.id, priority: 'high' },
      })

      expect(highPriority).toHaveLength(2)
    })
  })

  describe('Report Statistics', () => {
    it('counts reports by reason', async () => {
      const reporter = await createTestUserInDb()
      const reasons = ['spam', 'spam', 'harassment', 'scam', 'spam']

      for (let i = 0; i < reasons.length; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: reasons[i],
            description: `Report ${i}`,
            status: 'pending',
          },
        })
      }

      const counts = await testPrisma.userReport.groupBy({
        by: ['reason'],
        where: { reporterId: reporter.id },
        _count: { id: true },
      })

      const spamCount = counts.find((c) => c.reason === 'spam')?._count.id
      expect(spamCount).toBe(3)
    })

    it('counts reports by status', async () => {
      const reporter = await createTestUserInDb()
      const statuses = ['pending', 'resolved', 'pending', 'dismissed', 'resolved']

      for (let i = 0; i < statuses.length; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'spam',
            description: `Report ${i}`,
            status: statuses[i],
          },
        })
      }

      const counts = await testPrisma.userReport.groupBy({
        by: ['status'],
        where: { reporterId: reporter.id },
        _count: { id: true },
      })

      const resolvedCount = counts.find((c) => c.status === 'resolved')?._count.id
      expect(resolvedCount).toBe(2)
    })

    it('identifies frequently reported users', async () => {
      const reported1 = await createTestUserInDb()
      const reported2 = await createTestUserInDb()

      // 5 reports against reported1
      for (let i = 0; i < 5; i++) {
        const reporter = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported1.id,
            reason: 'spam',
            description: `Report ${i}`,
            status: 'pending',
          },
        })
      }

      // 2 reports against reported2
      for (let i = 0; i < 2; i++) {
        const reporter = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported2.id,
            reason: 'spam',
            description: `Report ${i}`,
            status: 'pending',
          },
        })
      }

      const reportCounts = await testPrisma.userReport.groupBy({
        by: ['reportedId'],
        where: { reportedId: { in: [reported1.id, reported2.id] } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      })

      expect(reportCounts[0].reportedId).toBe(reported1.id)
      expect(reportCounts[0]._count.id).toBe(5)
    })
  })

  describe('User Block from Reports', () => {
    it('creates block after report resolution', async () => {
      const reporter = await createTestUserInDb()
      const reported = await createTestUserInDb()

      await testPrisma.userReport.create({
        data: {
          reporterId: reporter.id,
          reportedId: reported.id,
          reason: 'harassment',
          description: '심각한 괴롭힘',
          status: 'resolved',
          resolution: 'user_blocked',
        },
      })

      const block = await testPrisma.userBlock.create({
        data: {
          blockerId: reporter.id,
          blockedId: reported.id,
          reason: 'harassment',
        },
      })

      expect(block).toBeDefined()
    })
  })

  describe('Report Deletion', () => {
    it('deletes old resolved reports', async () => {
      const reporter = await createTestUserInDb()
      const now = new Date()

      // Old resolved reports
      for (let i = 0; i < 3; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'spam',
            description: `Old Report ${i}`,
            status: 'resolved',
            resolvedAt: new Date(now.getTime() - 200 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent reports
      for (let i = 0; i < 2; i++) {
        const reported = await createTestUserInDb()
        await testPrisma.userReport.create({
          data: {
            reporterId: reporter.id,
            reportedId: reported.id,
            reason: 'spam',
            description: `Recent Report ${i}`,
            status: 'pending',
          },
        })
      }

      const oneEightyDaysAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000)

      await testPrisma.userReport.deleteMany({
        where: {
          reporterId: reporter.id,
          status: 'resolved',
          resolvedAt: { lt: oneEightyDaysAgo },
        },
      })

      const remaining = await testPrisma.userReport.findMany({
        where: { reporterId: reporter.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
