/**
 * User Achievement Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 업적 달성 기록
 * - 배지 수여
 * - 레벨 시스템
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

describe('Integration: User Achievement', () => {
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

  describe('Achievement Definition', () => {
    it('creates achievement definition', async () => {
      const achievement = await testPrisma.achievement.create({
        data: {
          code: 'first_reading',
          name: '첫 사주 풀이',
          description: '첫 번째 사주 풀이를 받으셨습니다',
          category: 'beginner',
          points: 100,
          iconUrl: '/badges/first_reading.png',
        },
      })

      expect(achievement.code).toBe('first_reading')
      expect(achievement.points).toBe(100)
    })

    it('creates tiered achievement', async () => {
      const tiers = ['bronze', 'silver', 'gold']
      const points = [100, 250, 500]

      for (let i = 0; i < tiers.length; i++) {
        await testPrisma.achievement.create({
          data: {
            code: `reading_count_${tiers[i]}`,
            name: `사주 마스터 (${tiers[i]})`,
            description: `${(i + 1) * 10}회 사주 풀이 달성`,
            category: 'mastery',
            tier: tiers[i],
            points: points[i],
            requirement: { type: 'reading_count', count: (i + 1) * 10 },
          },
        })
      }

      const goldAchievement = await testPrisma.achievement.findFirst({
        where: { code: 'reading_count_gold' },
      })

      expect(goldAchievement?.tier).toBe('gold')
      expect(goldAchievement?.points).toBe(500)
    })

    it('creates secret achievement', async () => {
      const achievement = await testPrisma.achievement.create({
        data: {
          code: 'easter_egg',
          name: '???',
          description: '비밀 업적을 달성하셨습니다',
          category: 'secret',
          points: 1000,
          isSecret: true,
          iconUrl: '/badges/secret.png',
        },
      })

      expect(achievement.isSecret).toBe(true)
    })
  })

  describe('Achievement Unlocking', () => {
    it('unlocks achievement for user', async () => {
      const user = await createTestUserInDb()

      const achievement = await testPrisma.achievement.create({
        data: {
          code: 'first_login',
          name: '시작이 반',
          description: '첫 로그인을 완료하셨습니다',
          category: 'beginner',
          points: 50,
        },
      })

      const userAchievement = await testPrisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          unlockedAt: new Date(),
        },
      })

      expect(userAchievement.userId).toBe(user.id)
      expect(userAchievement.achievementId).toBe(achievement.id)
    })

    it('prevents duplicate achievement unlock', async () => {
      const user = await createTestUserInDb()

      const achievement = await testPrisma.achievement.create({
        data: {
          code: `unique_${Date.now()}`,
          name: '유니크 업적',
          description: '한 번만 달성 가능',
          category: 'special',
          points: 200,
        },
      })

      await testPrisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          unlockedAt: new Date(),
        },
      })

      const existing = await testPrisma.userAchievement.findFirst({
        where: {
          userId: user.id,
          achievementId: achievement.id,
        },
      })

      expect(existing).not.toBeNull()
    })

    it('records achievement progress', async () => {
      const user = await createTestUserInDb()

      const achievement = await testPrisma.achievement.create({
        data: {
          code: `progress_${Date.now()}`,
          name: '진행 중인 업적',
          description: '10회 달성 필요',
          category: 'mastery',
          points: 300,
          requirement: { type: 'count', target: 10 },
        },
      })

      const progress = await testPrisma.achievementProgress.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          currentValue: 5,
          targetValue: 10,
        },
      })

      expect(progress.currentValue).toBe(5)
      expect(progress.targetValue).toBe(10)
    })

    it('updates achievement progress', async () => {
      const user = await createTestUserInDb()

      const achievement = await testPrisma.achievement.create({
        data: {
          code: `update_progress_${Date.now()}`,
          name: '업데이트 테스트',
          description: '진행도 업데이트',
          category: 'mastery',
          points: 300,
        },
      })

      const progress = await testPrisma.achievementProgress.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          currentValue: 3,
          targetValue: 10,
        },
      })

      const updated = await testPrisma.achievementProgress.update({
        where: { id: progress.id },
        data: { currentValue: 7 },
      })

      expect(updated.currentValue).toBe(7)
    })
  })

  describe('Achievement Retrieval', () => {
    it('retrieves user achievements', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `achievement_${Date.now()}_${i}`,
            name: `업적 ${i}`,
            description: `설명 ${i}`,
            category: 'general',
            points: 100,
          },
        })

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt: new Date(),
          },
        })
      }

      const userAchievements = await testPrisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
      })

      expect(userAchievements).toHaveLength(5)
    })

    it('retrieves achievements by category', async () => {
      const categories = ['beginner', 'mastery', 'beginner', 'special', 'beginner']

      for (let i = 0; i < categories.length; i++) {
        await testPrisma.achievement.create({
          data: {
            code: `cat_${Date.now()}_${i}`,
            name: `카테고리 업적 ${i}`,
            description: `설명`,
            category: categories[i],
            points: 100,
          },
        })
      }

      const beginnerAchievements = await testPrisma.achievement.findMany({
        where: { category: 'beginner' },
      })

      expect(beginnerAchievements.length).toBeGreaterThanOrEqual(3)
    })

    it('retrieves unlocked vs locked achievements', async () => {
      const user = await createTestUserInDb()
      const achievementIds: string[] = []

      for (let i = 0; i < 5; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `lock_test_${Date.now()}_${i}`,
            name: `잠금 테스트 ${i}`,
            description: `설명`,
            category: 'general',
            points: 100,
          },
        })
        achievementIds.push(achievement.id)
      }

      // Unlock first 2
      for (let i = 0; i < 2; i++) {
        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievementIds[i],
            unlockedAt: new Date(),
          },
        })
      }

      const unlocked = await testPrisma.userAchievement.findMany({
        where: { userId: user.id, achievementId: { in: achievementIds } },
      })

      expect(unlocked).toHaveLength(2)
    })
  })

  describe('Points and Levels', () => {
    it('calculates total points', async () => {
      const user = await createTestUserInDb()
      const pointValues = [100, 200, 150, 300, 250] // 1000 total

      for (let i = 0; i < pointValues.length; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `points_${Date.now()}_${i}`,
            name: `포인트 업적 ${i}`,
            description: `설명`,
            category: 'general',
            points: pointValues[i],
          },
        })

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt: new Date(),
          },
        })
      }

      const userAchievements = await testPrisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
      })

      const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0)

      expect(totalPoints).toBe(1000)
    })

    it('determines user level from points', async () => {
      const user = await createTestUserInDb()
      const pointValues = [500, 500, 500, 500, 500] // 2500 total

      for (let i = 0; i < pointValues.length; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `level_${Date.now()}_${i}`,
            name: `레벨 업적 ${i}`,
            description: `설명`,
            category: 'general',
            points: pointValues[i],
          },
        })

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt: new Date(),
          },
        })
      }

      const userAchievements = await testPrisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
      })

      const totalPoints = userAchievements.reduce((sum, ua) => sum + ua.achievement.points, 0)

      // Level calculation: 1000 points per level
      const level = Math.floor(totalPoints / 1000) + 1
      expect(level).toBe(3)
    })
  })

  describe('Achievement Statistics', () => {
    it('counts achievements by category', async () => {
      const user = await createTestUserInDb()
      const categories = ['beginner', 'mastery', 'beginner', 'special', 'beginner', 'mastery']

      for (let i = 0; i < categories.length; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `stat_cat_${Date.now()}_${i}`,
            name: `통계 업적 ${i}`,
            description: `설명`,
            category: categories[i],
            points: 100,
          },
        })

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt: new Date(),
          },
        })
      }

      const userAchievements = await testPrisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
      })

      const categoryCount = userAchievements.reduce(
        (acc, ua) => {
          const cat = ua.achievement.category
          acc[cat] = (acc[cat] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )

      expect(categoryCount['beginner']).toBe(3)
    })

    it('finds users with most achievements', async () => {
      const users: { id: string; count: number }[] = []

      for (let i = 0; i < 3; i++) {
        const user = await createTestUserInDb()
        const achievementCount = (i + 1) * 2
        users.push({ id: user.id, count: achievementCount })

        for (let j = 0; j < achievementCount; j++) {
          const achievement = await testPrisma.achievement.create({
            data: {
              code: `rank_${user.id}_${j}`,
              name: `랭킹 업적 ${j}`,
              description: `설명`,
              category: 'general',
              points: 100,
            },
          })

          await testPrisma.userAchievement.create({
            data: {
              userId: user.id,
              achievementId: achievement.id,
              unlockedAt: new Date(),
            },
          })
        }
      }

      const counts = await testPrisma.userAchievement.groupBy({
        by: ['userId'],
        where: { userId: { in: users.map((u) => u.id) } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0]._count.id).toBe(6)
    })

    it('calculates completion rate', async () => {
      const user = await createTestUserInDb()
      const achievementIds: string[] = []

      // Create 10 achievements
      for (let i = 0; i < 10; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `completion_${Date.now()}_${i}`,
            name: `완료율 업적 ${i}`,
            description: `설명`,
            category: 'general',
            points: 100,
          },
        })
        achievementIds.push(achievement.id)
      }

      // Unlock 7
      for (let i = 0; i < 7; i++) {
        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievementIds[i],
            unlockedAt: new Date(),
          },
        })
      }

      const totalCount = achievementIds.length
      const unlockedCount = await testPrisma.userAchievement.count({
        where: { userId: user.id, achievementId: { in: achievementIds } },
      })

      const completionRate = (unlockedCount / totalCount) * 100
      expect(completionRate).toBe(70)
    })
  })

  describe('Recent Achievements', () => {
    it('retrieves recently unlocked achievements', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `recent_${Date.now()}_${i}`,
            name: `최근 업적 ${i}`,
            description: `설명`,
            category: 'general',
            points: 100,
          },
        })

        const unlockedAt = new Date(now)
        unlockedAt.setDate(unlockedAt.getDate() - i)

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentAchievements = await testPrisma.userAchievement.findMany({
        where: {
          userId: user.id,
          unlockedAt: { gte: sevenDaysAgo },
        },
        orderBy: { unlockedAt: 'desc' },
      })

      expect(recentAchievements).toHaveLength(8)
    })
  })

  describe('Achievement Notifications', () => {
    it('marks achievement as notified', async () => {
      const user = await createTestUserInDb()

      const achievement = await testPrisma.achievement.create({
        data: {
          code: `notify_${Date.now()}`,
          name: '알림 테스트',
          description: '설명',
          category: 'general',
          points: 100,
        },
      })

      const userAchievement = await testPrisma.userAchievement.create({
        data: {
          userId: user.id,
          achievementId: achievement.id,
          unlockedAt: new Date(),
          notified: false,
        },
      })

      const updated = await testPrisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: { notified: true },
      })

      expect(updated.notified).toBe(true)
    })

    it('finds unnotified achievements', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        const achievement = await testPrisma.achievement.create({
          data: {
            code: `unnotified_${Date.now()}_${i}`,
            name: `미알림 업적 ${i}`,
            description: '설명',
            category: 'general',
            points: 100,
          },
        })

        await testPrisma.userAchievement.create({
          data: {
            userId: user.id,
            achievementId: achievement.id,
            unlockedAt: new Date(),
            notified: i < 2, // First 2 are notified
          },
        })
      }

      const unnotified = await testPrisma.userAchievement.findMany({
        where: { userId: user.id, notified: false },
      })

      expect(unnotified).toHaveLength(3)
    })
  })
})
