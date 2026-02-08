/**
 * User Onboarding Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 온보딩 단계 추적
 * - 튜토리얼 완료
 * - 초기 설정
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

describe('Integration: User Onboarding', () => {
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

  describe('Onboarding Progress', () => {
    it('creates onboarding record', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 1,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
        },
      })

      expect(onboarding.currentStep).toBe(1)
      expect(onboarding.isCompleted).toBe(false)
    })

    it('advances to next step', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 1,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
        },
      })

      const updated = await testPrisma.userOnboarding.update({
        where: { id: onboarding.id },
        data: {
          currentStep: 2,
          completedSteps: ['profile_setup'],
        },
      })

      expect(updated.currentStep).toBe(2)
    })

    it('completes onboarding', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 5,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
        },
      })

      const updated = await testPrisma.userOnboarding.update({
        where: { id: onboarding.id },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          completedSteps: ['profile', 'birth_info', 'preferences', 'tutorial', 'first_reading'],
        },
      })

      expect(updated.isCompleted).toBe(true)
      expect(updated.completedAt).not.toBeNull()
    })

    it('skips step', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 2,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
          skippedSteps: [],
        },
      })

      const updated = await testPrisma.userOnboarding.update({
        where: { id: onboarding.id },
        data: {
          currentStep: 3,
          skippedSteps: ['tutorial'],
        },
      })

      const skipped = updated.skippedSteps as string[]
      expect(skipped).toContain('tutorial')
    })
  })

  describe('Onboarding Steps', () => {
    it('records profile setup completion', async () => {
      const user = await createTestUserInDb()

      const step = await testPrisma.onboardingStepCompletion.create({
        data: {
          userId: user.id,
          stepName: 'profile_setup',
          completedAt: new Date(),
          data: {
            name: '홍길동',
            nickname: '길동이',
          },
        },
      })

      expect(step.stepName).toBe('profile_setup')
    })

    it('records birth info step', async () => {
      const user = await createTestUserInDb()

      const step = await testPrisma.onboardingStepCompletion.create({
        data: {
          userId: user.id,
          stepName: 'birth_info',
          completedAt: new Date(),
          data: {
            birthDate: '1990-05-15',
            birthTime: '14:30',
            birthPlace: '서울',
            gender: 'male',
          },
        },
      })

      const data = step.data as { birthDate: string }
      expect(data.birthDate).toBe('1990-05-15')
    })

    it('records preference setup', async () => {
      const user = await createTestUserInDb()

      const step = await testPrisma.onboardingStepCompletion.create({
        data: {
          userId: user.id,
          stepName: 'preferences',
          completedAt: new Date(),
          data: {
            theme: 'dark',
            language: 'ko',
            notifications: true,
            dailyFortune: true,
          },
        },
      })

      expect(step.stepName).toBe('preferences')
    })

    it('records tutorial completion', async () => {
      const user = await createTestUserInDb()

      const step = await testPrisma.onboardingStepCompletion.create({
        data: {
          userId: user.id,
          stepName: 'tutorial',
          completedAt: new Date(),
          data: {
            watchedVideo: true,
            completedQuiz: true,
            quizScore: 80,
          },
        },
      })

      const data = step.data as { quizScore: number }
      expect(data.quizScore).toBe(80)
    })

    it('records first reading completion', async () => {
      const user = await createTestUserInDb()

      const step = await testPrisma.onboardingStepCompletion.create({
        data: {
          userId: user.id,
          stepName: 'first_reading',
          completedAt: new Date(),
          data: {
            readingType: 'basic_saju',
            readingId: 'reading_123',
          },
        },
      })

      expect(step.stepName).toBe('first_reading')
    })
  })

  describe('Onboarding Retrieval', () => {
    it('retrieves user onboarding status', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 3,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
        },
      })

      const onboarding = await testPrisma.userOnboarding.findUnique({
        where: { userId: user.id },
      })

      expect(onboarding?.currentStep).toBe(3)
    })

    it('retrieves completed steps', async () => {
      const user = await createTestUserInDb()

      const stepNames = ['profile_setup', 'birth_info', 'preferences']

      for (const stepName of stepNames) {
        await testPrisma.onboardingStepCompletion.create({
          data: {
            userId: user.id,
            stepName,
            completedAt: new Date(),
          },
        })
      }

      const steps = await testPrisma.onboardingStepCompletion.findMany({
        where: { userId: user.id },
      })

      expect(steps).toHaveLength(3)
    })

    it('retrieves users at specific step', async () => {
      const steps = [1, 2, 1, 3, 1]

      for (let i = 0; i < steps.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userOnboarding.create({
          data: {
            userId: user.id,
            currentStep: steps[i],
            totalSteps: 5,
            isCompleted: false,
            startedAt: new Date(),
          },
        })
      }

      const atStep1 = await testPrisma.userOnboarding.findMany({
        where: { currentStep: 1 },
      })

      expect(atStep1).toHaveLength(3)
    })

    it('retrieves incomplete onboardings', async () => {
      const completedStatuses = [false, true, false, false, true]

      for (let i = 0; i < completedStatuses.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userOnboarding.create({
          data: {
            userId: user.id,
            currentStep: completedStatuses[i] ? 5 : i + 1,
            totalSteps: 5,
            isCompleted: completedStatuses[i],
            startedAt: new Date(),
          },
        })
      }

      const incomplete = await testPrisma.userOnboarding.findMany({
        where: { isCompleted: false },
      })

      expect(incomplete).toHaveLength(3)
    })
  })

  describe('Onboarding Statistics', () => {
    it('calculates completion rate', async () => {
      const completedStatuses = [true, true, true, false, false, true, false, true, true, false]

      for (let i = 0; i < completedStatuses.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userOnboarding.create({
          data: {
            userId: user.id,
            currentStep: completedStatuses[i] ? 5 : 3,
            totalSteps: 5,
            isCompleted: completedStatuses[i],
            startedAt: new Date(),
          },
        })
      }

      const total = await testPrisma.userOnboarding.count()
      const completed = await testPrisma.userOnboarding.count({
        where: { isCompleted: true },
      })

      const completionRate = (completed / total) * 100
      expect(completionRate).toBe(60)
    })

    it('counts users by step', async () => {
      const steps = [1, 2, 1, 3, 2, 1, 4, 2, 1, 5]

      for (let i = 0; i < steps.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.userOnboarding.create({
          data: {
            userId: user.id,
            currentStep: steps[i],
            totalSteps: 5,
            isCompleted: steps[i] === 5,
            startedAt: new Date(),
          },
        })
      }

      const counts = await testPrisma.userOnboarding.groupBy({
        by: ['currentStep'],
        _count: { id: true },
      })

      const step1Count = counts.find((c) => c.currentStep === 1)?._count.id
      expect(step1Count).toBe(4)
    })

    it('identifies dropout steps', async () => {
      const user = await createTestUserInDb()

      await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 2,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      })

      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

      const dropouts = await testPrisma.userOnboarding.findMany({
        where: {
          isCompleted: false,
          lastActivityAt: { lt: threeDaysAgo },
        },
      })

      expect(dropouts.length).toBeGreaterThanOrEqual(1)
    })

    it('calculates average completion time', async () => {
      const completionTimes = [1, 2, 3, 2, 2] // days

      for (let i = 0; i < completionTimes.length; i++) {
        const user = await createTestUserInDb()
        const startedAt = new Date()
        const completedAt = new Date(startedAt.getTime() + completionTimes[i] * 24 * 60 * 60 * 1000)

        await testPrisma.userOnboarding.create({
          data: {
            userId: user.id,
            currentStep: 5,
            totalSteps: 5,
            isCompleted: true,
            startedAt,
            completedAt,
          },
        })
      }

      const onboardings = await testPrisma.userOnboarding.findMany({
        where: { isCompleted: true },
      })

      const totalDays = onboardings.reduce((sum, o) => {
        if (o.completedAt && o.startedAt) {
          return sum + (o.completedAt.getTime() - o.startedAt.getTime()) / (24 * 60 * 60 * 1000)
        }
        return sum
      }, 0)

      const avgDays = totalDays / onboardings.length
      expect(avgDays).toBe(2)
    })
  })

  describe('Onboarding Reminders', () => {
    it('finds users needing reminders', async () => {
      const now = new Date()

      // User who hasn't completed and inactive for 2 days
      const user1 = await createTestUserInDb()
      await testPrisma.userOnboarding.create({
        data: {
          userId: user1.id,
          currentStep: 2,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          lastActivityAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      })

      // User who completed
      const user2 = await createTestUserInDb()
      await testPrisma.userOnboarding.create({
        data: {
          userId: user2.id,
          currentStep: 5,
          totalSteps: 5,
          isCompleted: true,
          startedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          completedAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
        },
      })

      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

      const needsReminder = await testPrisma.userOnboarding.findMany({
        where: {
          isCompleted: false,
          lastActivityAt: { lt: oneDayAgo },
        },
      })

      expect(needsReminder).toHaveLength(1)
    })

    it('records reminder sent', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 2,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
          reminderCount: 0,
        },
      })

      const updated = await testPrisma.userOnboarding.update({
        where: { id: onboarding.id },
        data: {
          reminderCount: { increment: 1 },
          lastReminderAt: new Date(),
        },
      })

      expect(updated.reminderCount).toBe(1)
    })
  })

  describe('Onboarding Updates', () => {
    it('resets onboarding', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 3,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          completedSteps: ['profile', 'birth_info'],
        },
      })

      const updated = await testPrisma.userOnboarding.update({
        where: { id: onboarding.id },
        data: {
          currentStep: 1,
          completedSteps: [],
          skippedSteps: [],
          startedAt: new Date(),
        },
      })

      expect(updated.currentStep).toBe(1)
    })
  })

  describe('Onboarding Deletion', () => {
    it('deletes onboarding record', async () => {
      const user = await createTestUserInDb()

      const onboarding = await testPrisma.userOnboarding.create({
        data: {
          userId: user.id,
          currentStep: 1,
          totalSteps: 5,
          isCompleted: false,
          startedAt: new Date(),
        },
      })

      await testPrisma.userOnboarding.delete({
        where: { id: onboarding.id },
      })

      const found = await testPrisma.userOnboarding.findUnique({
        where: { id: onboarding.id },
      })

      expect(found).toBeNull()
    })
  })
})
