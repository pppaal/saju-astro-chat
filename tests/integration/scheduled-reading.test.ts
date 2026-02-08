/**
 * Scheduled Reading Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 예약된 리딩 관리
 * - 리마인더 설정
 * - 반복 스케줄
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

describe('Integration: Scheduled Reading', () => {
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

  describe('Schedule Creation', () => {
    it('creates one-time scheduled reading', async () => {
      const user = await createTestUserInDb()
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: scheduledTime,
          status: 'pending',
        },
      })

      expect(schedule.readingType).toBe('daily_fortune')
      expect(schedule.status).toBe('pending')
    })

    it('creates recurring daily reading', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(),
          status: 'pending',
          isRecurring: true,
          recurrencePattern: 'daily',
          recurrenceTime: '08:00',
        },
      })

      expect(schedule.isRecurring).toBe(true)
      expect(schedule.recurrencePattern).toBe('daily')
    })

    it('creates weekly scheduled reading', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'weekly_fortune',
          scheduledAt: new Date(),
          status: 'pending',
          isRecurring: true,
          recurrencePattern: 'weekly',
          recurrenceDay: 1, // Monday
          recurrenceTime: '09:00',
        },
      })

      expect(schedule.recurrencePattern).toBe('weekly')
      expect(schedule.recurrenceDay).toBe(1)
    })

    it('creates monthly scheduled reading', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'monthly_forecast',
          scheduledAt: new Date(),
          status: 'pending',
          isRecurring: true,
          recurrencePattern: 'monthly',
          recurrenceDay: 1, // 1st of month
          recurrenceTime: '10:00',
        },
      })

      expect(schedule.recurrencePattern).toBe('monthly')
    })

    it('creates schedule with notification settings', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'tarot',
          scheduledAt: new Date(Date.now() + 3600000),
          status: 'pending',
          notifyBefore: 30, // 30 minutes before
          notificationChannels: ['push', 'email'],
        },
      })

      expect(schedule.notifyBefore).toBe(30)
      expect(schedule.notificationChannels).toContain('push')
    })
  })

  describe('Schedule Retrieval', () => {
    it('retrieves schedules by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            status: 'pending',
          },
        })
      }

      const schedules = await testPrisma.scheduledReading.findMany({
        where: { userId: user.id },
      })

      expect(schedules).toHaveLength(5)
    })

    it('retrieves pending schedules', async () => {
      const user = await createTestUserInDb()

      const statuses = ['pending', 'completed', 'pending', 'cancelled', 'pending']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(Date.now() + i * 3600000),
            status: statuses[i],
          },
        })
      }

      const pendingSchedules = await testPrisma.scheduledReading.findMany({
        where: { userId: user.id, status: 'pending' },
      })

      expect(pendingSchedules).toHaveLength(3)
    })

    it('retrieves upcoming schedules', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Past schedules
      for (let i = 0; i < 2; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(now.getTime() - (i + 1) * 24 * 60 * 60 * 1000),
            status: 'completed',
          },
        })
      }

      // Future schedules
      for (let i = 0; i < 3; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(now.getTime() + (i + 1) * 24 * 60 * 60 * 1000),
            status: 'pending',
          },
        })
      }

      const upcomingSchedules = await testPrisma.scheduledReading.findMany({
        where: {
          userId: user.id,
          scheduledAt: { gt: now },
        },
      })

      expect(upcomingSchedules).toHaveLength(3)
    })

    it('retrieves recurring schedules', async () => {
      const user = await createTestUserInDb()

      const recurring = [true, false, true, false, true]

      for (let i = 0; i < recurring.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(),
            status: 'pending',
            isRecurring: recurring[i],
          },
        })
      }

      const recurringSchedules = await testPrisma.scheduledReading.findMany({
        where: { userId: user.id, isRecurring: true },
      })

      expect(recurringSchedules).toHaveLength(3)
    })

    it('retrieves schedules by reading type', async () => {
      const user = await createTestUserInDb()

      const types = ['daily_fortune', 'tarot', 'daily_fortune', 'saju', 'daily_fortune']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: types[i],
            scheduledAt: new Date(Date.now() + i * 3600000),
            status: 'pending',
          },
        })
      }

      const fortuneSchedules = await testPrisma.scheduledReading.findMany({
        where: { userId: user.id, readingType: 'daily_fortune' },
      })

      expect(fortuneSchedules).toHaveLength(3)
    })
  })

  describe('Schedule Processing', () => {
    it('marks schedule as processing', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(),
          status: 'pending',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: {
          status: 'processing',
          processedAt: new Date(),
        },
      })

      expect(updated.status).toBe('processing')
    })

    it('marks schedule as completed', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(),
          status: 'processing',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          resultId: 'reading_123',
        },
      })

      expect(updated.status).toBe('completed')
      expect(updated.resultId).toBe('reading_123')
    })

    it('marks schedule as failed', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(),
          status: 'processing',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: {
          status: 'failed',
          errorMessage: 'API rate limit exceeded',
          retryCount: 1,
        },
      })

      expect(updated.status).toBe('failed')
      expect(updated.errorMessage).toContain('rate limit')
    })

    it('creates next occurrence for recurring', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: now,
          status: 'completed',
          isRecurring: true,
          recurrencePattern: 'daily',
        },
      })

      // Create next occurrence
      const nextOccurrence = new Date(now)
      nextOccurrence.setDate(nextOccurrence.getDate() + 1)

      const nextSchedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: nextOccurrence,
          status: 'pending',
          isRecurring: true,
          recurrencePattern: 'daily',
          parentScheduleId: schedule.id,
        },
      })

      expect(nextSchedule.parentScheduleId).toBe(schedule.id)
    })
  })

  describe('Schedule Statistics', () => {
    it('counts schedules by status', async () => {
      const user = await createTestUserInDb()

      const statuses = ['pending', 'pending', 'completed', 'completed', 'completed', 'failed']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(),
            status: statuses[i],
          },
        })
      }

      const counts = await testPrisma.scheduledReading.groupBy({
        by: ['status'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const completedCount = counts.find((c) => c.status === 'completed')?._count.id
      expect(completedCount).toBe(3)
    })

    it('counts schedules by reading type', async () => {
      const user = await createTestUserInDb()

      const types = ['daily_fortune', 'tarot', 'daily_fortune', 'daily_fortune', 'saju']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: types[i],
            scheduledAt: new Date(),
            status: 'pending',
          },
        })
      }

      const counts = await testPrisma.scheduledReading.groupBy({
        by: ['readingType'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const fortuneCount = counts.find((c) => c.readingType === 'daily_fortune')?._count.id
      expect(fortuneCount).toBe(3)
    })

    it('calculates completion rate', async () => {
      const user = await createTestUserInDb()

      const statuses = ['completed', 'completed', 'failed', 'completed', 'completed'] // 80% success

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(),
            status: statuses[i],
          },
        })
      }

      const total = await testPrisma.scheduledReading.count({
        where: {
          userId: user.id,
          status: { in: ['completed', 'failed'] },
        },
      })

      const completed = await testPrisma.scheduledReading.count({
        where: { userId: user.id, status: 'completed' },
      })

      const completionRate = (completed / total) * 100
      expect(completionRate).toBe(80)
    })
  })

  describe('Schedule Updates', () => {
    it('reschedules reading', async () => {
      const user = await createTestUserInDb()
      const originalTime = new Date(Date.now() + 3600000)
      const newTime = new Date(Date.now() + 7200000)

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'tarot',
          scheduledAt: originalTime,
          status: 'pending',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: { scheduledAt: newTime },
      })

      expect(updated.scheduledAt.getTime()).toBeGreaterThan(originalTime.getTime())
    })

    it('cancels schedule', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(Date.now() + 3600000),
          status: 'pending',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'User requested',
        },
      })

      expect(updated.status).toBe('cancelled')
    })

    it('updates notification settings', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(Date.now() + 3600000),
          status: 'pending',
          notifyBefore: 30,
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: { notifyBefore: 60 },
      })

      expect(updated.notifyBefore).toBe(60)
    })

    it('stops recurring schedule', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(),
          status: 'pending',
          isRecurring: true,
          recurrencePattern: 'daily',
        },
      })

      const updated = await testPrisma.scheduledReading.update({
        where: { id: schedule.id },
        data: {
          isRecurring: false,
          recurrenceEndedAt: new Date(),
        },
      })

      expect(updated.isRecurring).toBe(false)
    })
  })

  describe('Schedule Deletion', () => {
    it('deletes schedule', async () => {
      const user = await createTestUserInDb()

      const schedule = await testPrisma.scheduledReading.create({
        data: {
          userId: user.id,
          readingType: 'daily_fortune',
          scheduledAt: new Date(Date.now() + 3600000),
          status: 'pending',
        },
      })

      await testPrisma.scheduledReading.delete({
        where: { id: schedule.id },
      })

      const found = await testPrisma.scheduledReading.findUnique({
        where: { id: schedule.id },
      })

      expect(found).toBeNull()
    })

    it('deletes old completed schedules', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old completed schedules
      for (let i = 0; i < 3; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
            status: 'completed',
            completedAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Recent schedules
      for (let i = 0; i < 2; i++) {
        await testPrisma.scheduledReading.create({
          data: {
            userId: user.id,
            readingType: 'daily_fortune',
            scheduledAt: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
            status: 'pending',
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.scheduledReading.deleteMany({
        where: {
          userId: user.id,
          status: 'completed',
          completedAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.scheduledReading.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
