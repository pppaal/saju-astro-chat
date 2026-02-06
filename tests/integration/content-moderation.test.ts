/**
 * Content Moderation Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 콘텐츠 신고 관리
 * - 신고 처리 워크플로우
 * - 신고 통계
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

describe('Integration: Content Moderation', () => {
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

  describe('Report Creation', () => {
    it('creates spam report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'comment',
          contentId: 'comment_123',
          reason: 'spam',
          status: 'pending',
        },
      })

      expect(report.reason).toBe('spam')
      expect(report.status).toBe('pending')
    })

    it('creates harassment report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'message',
          contentId: 'message_456',
          reason: 'harassment',
          description: '욕설 및 인신공격 포함',
          status: 'pending',
        },
      })

      expect(report.reason).toBe('harassment')
    })

    it('creates inappropriate content report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'profile',
          contentId: 'profile_789',
          reason: 'inappropriate',
          description: '부적절한 프로필 사진',
          status: 'pending',
          priority: 'high',
        },
      })

      expect(report.priority).toBe('high')
    })
  })

  describe('Report Processing', () => {
    it('assigns moderator to report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'comment',
          contentId: 'assign_test',
          reason: 'spam',
          status: 'pending',
        },
      })

      const updated = await testPrisma.contentReport.update({
        where: { id: report.id },
        data: {
          status: 'under_review',
          assignedTo: 'moderator_001',
          assignedAt: new Date(),
        },
      })

      expect(updated.status).toBe('under_review')
      expect(updated.assignedTo).toBe('moderator_001')
    })

    it('resolves report with content removal', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'comment',
          contentId: 'resolve_test',
          reason: 'spam',
          status: 'under_review',
        },
      })

      const updated = await testPrisma.contentReport.update({
        where: { id: report.id },
        data: {
          status: 'resolved',
          resolution: 'content_removed',
          resolutionNote: '스팸 확인 - 콘텐츠 삭제',
          resolvedAt: new Date(),
          resolvedBy: 'moderator_001',
        },
      })

      expect(updated.status).toBe('resolved')
      expect(updated.resolution).toBe('content_removed')
    })

    it('dismisses false report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'review',
          contentId: 'false_report',
          reason: 'spam',
          status: 'under_review',
        },
      })

      const updated = await testPrisma.contentReport.update({
        where: { id: report.id },
        data: {
          status: 'dismissed',
          resolution: 'no_violation',
          resolutionNote: '규정 위반 없음',
          resolvedAt: new Date(),
        },
      })

      expect(updated.status).toBe('dismissed')
    })

    it('escalates serious report', async () => {
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'profile',
          contentId: 'escalate_test',
          reason: 'illegal_content',
          status: 'under_review',
          priority: 'normal',
        },
      })

      const updated = await testPrisma.contentReport.update({
        where: { id: report.id },
        data: {
          status: 'escalated',
          priority: 'urgent',
          escalatedAt: new Date(),
          escalationReason: '법적 검토 필요',
        },
      })

      expect(updated.status).toBe('escalated')
      expect(updated.priority).toBe('urgent')
    })
  })

  describe('Moderator Actions', () => {
    it('issues warning to user', async () => {
      const user = await createTestUserInDb()
      const reporter = await createTestUserInDb()

      const report = await testPrisma.contentReport.create({
        data: {
          reporterId: reporter.id,
          contentType: 'comment',
          contentId: 'warning_test',
          reason: 'inappropriate',
          status: 'resolved',
          resolution: 'warning_issued',
        },
      })

      const warning = await testPrisma.userWarning.create({
        data: {
          userId: user.id,
          reportId: report.id,
          reason: '부적절한 댓글 작성',
          severity: 'mild',
          issuedBy: 'moderator_001',
        },
      })

      expect(warning.severity).toBe('mild')
    })

    it('suspends user account', async () => {
      const user = await createTestUserInDb()

      const suspension = await testPrisma.userSuspension.create({
        data: {
          userId: user.id,
          reason: '반복적인 규정 위반',
          duration: 7,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          issuedBy: 'moderator_001',
        },
      })

      expect(suspension.duration).toBe(7)
    })

    it('permanently bans user', async () => {
      const user = await createTestUserInDb()

      const ban = await testPrisma.userBan.create({
        data: {
          userId: user.id,
          reason: '심각한 규정 위반',
          isPermanent: true,
          issuedBy: 'admin_001',
        },
      })

      expect(ban.isPermanent).toBe(true)
    })
  })

  describe('Report Retrieval', () => {
    it('retrieves pending reports', async () => {
      const reporter = await createTestUserInDb()
      const statuses = ['pending', 'under_review', 'pending', 'resolved', 'pending']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `pending_${i}`,
            reason: 'spam',
            status: statuses[i],
          },
        })
      }

      const pending = await testPrisma.contentReport.findMany({
        where: { reporterId: reporter.id, status: 'pending' },
      })

      expect(pending).toHaveLength(3)
    })

    it('retrieves reports by priority', async () => {
      const reporter = await createTestUserInDb()
      const priorities = ['low', 'normal', 'high', 'normal', 'urgent']

      for (let i = 0; i < priorities.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `priority_${i}`,
            reason: 'spam',
            status: 'pending',
            priority: priorities[i],
          },
        })
      }

      const highPriority = await testPrisma.contentReport.findMany({
        where: {
          reporterId: reporter.id,
          priority: { in: ['high', 'urgent'] },
        },
      })

      expect(highPriority).toHaveLength(2)
    })

    it('retrieves reports by content type', async () => {
      const reporter = await createTestUserInDb()
      const types = ['comment', 'message', 'comment', 'profile', 'comment']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: types[i],
            contentId: `type_${i}`,
            reason: 'spam',
            status: 'pending',
          },
        })
      }

      const commentReports = await testPrisma.contentReport.findMany({
        where: { reporterId: reporter.id, contentType: 'comment' },
      })

      expect(commentReports).toHaveLength(3)
    })

    it('retrieves reports by date range', async () => {
      const reporter = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `date_${i}`,
            reason: 'spam',
            status: 'pending',
            createdAt: date,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recent = await testPrisma.contentReport.findMany({
        where: {
          reporterId: reporter.id,
          createdAt: { gte: sevenDaysAgo },
        },
      })

      expect(recent).toHaveLength(8)
    })
  })

  describe('Moderation Statistics', () => {
    it('counts reports by reason', async () => {
      const reporter = await createTestUserInDb()
      const reasons = ['spam', 'harassment', 'spam', 'inappropriate', 'spam', 'harassment']

      for (let i = 0; i < reasons.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `reason_stat_${i}`,
            reason: reasons[i],
            status: 'pending',
          },
        })
      }

      const counts = await testPrisma.contentReport.groupBy({
        by: ['reason'],
        where: { reporterId: reporter.id },
        _count: { id: true },
      })

      const spamCount = counts.find((c) => c.reason === 'spam')?._count.id
      expect(spamCount).toBe(3)
    })

    it('counts reports by status', async () => {
      const reporter = await createTestUserInDb()
      const statuses = ['pending', 'resolved', 'pending', 'dismissed', 'pending', 'resolved']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `status_stat_${i}`,
            reason: 'spam',
            status: statuses[i],
          },
        })
      }

      const counts = await testPrisma.contentReport.groupBy({
        by: ['status'],
        where: { reporterId: reporter.id },
        _count: { id: true },
      })

      const resolvedCount = counts.find((c) => c.status === 'resolved')?._count.id
      expect(resolvedCount).toBe(2)
    })

    it('calculates resolution rate', async () => {
      const reporter = await createTestUserInDb()

      // Create resolved and pending reports
      for (let i = 0; i < 7; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `resolved_${i}`,
            reason: 'spam',
            status: 'resolved',
          },
        })
      }

      for (let i = 0; i < 3; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `pending_stat_${i}`,
            reason: 'spam',
            status: 'pending',
          },
        })
      }

      const total = await testPrisma.contentReport.count({
        where: { reporterId: reporter.id },
      })

      const resolved = await testPrisma.contentReport.count({
        where: { reporterId: reporter.id, status: 'resolved' },
      })

      const rate = (resolved / total) * 100
      expect(rate).toBe(70)
    })

    it('counts moderator actions', async () => {
      const reporter = await createTestUserInDb()
      const moderators = ['mod_1', 'mod_2', 'mod_1', 'mod_3', 'mod_1', 'mod_2']

      for (let i = 0; i < moderators.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `mod_action_${i}`,
            reason: 'spam',
            status: 'resolved',
            resolvedBy: moderators[i],
          },
        })
      }

      const counts = await testPrisma.contentReport.groupBy({
        by: ['resolvedBy'],
        where: { reporterId: reporter.id, resolvedBy: { not: null } },
        _count: { id: true },
      })

      const mod1Actions = counts.find((c) => c.resolvedBy === 'mod_1')?._count.id
      expect(mod1Actions).toBe(3)
    })
  })

  describe('Duplicate Detection', () => {
    it('identifies duplicate reports for same content', async () => {
      const contentId = 'duplicate_content_123'

      for (let i = 0; i < 5; i++) {
        const reporter = await createTestUserInDb()
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId,
            reason: 'spam',
            status: 'pending',
          },
        })
      }

      const duplicates = await testPrisma.contentReport.findMany({
        where: { contentId },
      })

      expect(duplicates).toHaveLength(5)
    })

    it('groups reports by content', async () => {
      const reporter = await createTestUserInDb()

      const contents = ['content_A', 'content_B', 'content_A', 'content_A', 'content_B']

      for (let i = 0; i < contents.length; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: contents[i],
            reason: 'spam',
            status: 'pending',
          },
        })
      }

      const counts = await testPrisma.contentReport.groupBy({
        by: ['contentId'],
        where: { reporterId: reporter.id },
        _count: { id: true },
      })

      const contentACount = counts.find((c) => c.contentId === 'content_A')?._count.id
      expect(contentACount).toBe(3)
    })
  })

  describe('Report Cleanup', () => {
    it('archives old resolved reports', async () => {
      const reporter = await createTestUserInDb()
      const now = new Date()

      // Old resolved reports
      for (let i = 0; i < 3; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `old_${i}`,
            reason: 'spam',
            status: 'resolved',
            resolvedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent reports
      for (let i = 0; i < 2; i++) {
        await testPrisma.contentReport.create({
          data: {
            reporterId: reporter.id,
            contentType: 'comment',
            contentId: `recent_${i}`,
            reason: 'spam',
            status: 'pending',
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.contentReport.deleteMany({
        where: {
          reporterId: reporter.id,
          status: 'resolved',
          resolvedAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.contentReport.findMany({
        where: { reporterId: reporter.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
