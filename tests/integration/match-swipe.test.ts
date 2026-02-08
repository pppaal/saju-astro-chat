/**
 * Match Swipe Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 스와이프 액션 저장
 * - 매치 감지
 * - 스와이프 통계
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

describe('Integration: Match Swipe', () => {
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

  async function createMatchProfile(userId: string) {
    return testPrisma.matchProfile.create({
      data: {
        userId,
        displayName: `User_${Date.now()}`,
        bio: 'Test profile',
        gender: 'male',
        birthDate: new Date('1990-01-01'),
        isActive: true,
      },
    })
  }

  describe('Swipe Creation', () => {
    it('creates like swipe', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'like',
        },
      })

      expect(swipe.action).toBe('like')
      expect(swipe.swiperId).toBe(profile1.id)
    })

    it('creates pass swipe', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'pass',
        },
      })

      expect(swipe.action).toBe('pass')
    })

    it('creates super like swipe', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'super_like',
        },
      })

      expect(swipe.action).toBe('super_like')
    })

    it('creates multiple swipes from same user', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      const targets: string[] = []

      for (let i = 0; i < 5; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)
        targets.push(targetProfile.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: i % 2 === 0 ? 'like' : 'pass',
          },
        })
      }

      const swipes = await testPrisma.matchSwipe.findMany({
        where: { swiperId: swiperProfile.id },
      })

      expect(swipes).toHaveLength(5)
    })
  })

  describe('Match Detection', () => {
    it('detects mutual like (match)', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      // User1 likes User2
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'like',
        },
      })

      // User2 likes User1
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile2.id,
          targetId: profile1.id,
          action: 'like',
        },
      })

      // Check for mutual likes
      const swipe1to2 = await testPrisma.matchSwipe.findFirst({
        where: { swiperId: profile1.id, targetId: profile2.id, action: 'like' },
      })

      const swipe2to1 = await testPrisma.matchSwipe.findFirst({
        where: { swiperId: profile2.id, targetId: profile1.id, action: 'like' },
      })

      const isMatch = swipe1to2 !== null && swipe2to1 !== null
      expect(isMatch).toBe(true)
    })

    it('does not match with pass', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      // User1 likes User2
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'like',
        },
      })

      // User2 passes User1
      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile2.id,
          targetId: profile1.id,
          action: 'pass',
        },
      })

      // Check for mutual likes
      const mutualLike = await testPrisma.matchSwipe.findFirst({
        where: { swiperId: profile2.id, targetId: profile1.id, action: 'like' },
      })

      expect(mutualLike).toBeNull()
    })

    it('finds all matches for user', async () => {
      const mainUser = await createTestUserInDb()
      const mainProfile = await createMatchProfile(mainUser.id)

      const matchedProfiles: string[] = []

      for (let i = 0; i < 5; i++) {
        const other = await createTestUserInDb()
        const otherProfile = await createMatchProfile(other.id)

        // Main user likes everyone
        await testPrisma.matchSwipe.create({
          data: {
            swiperId: mainProfile.id,
            targetId: otherProfile.id,
            action: 'like',
          },
        })

        // Only first 3 like back
        if (i < 3) {
          await testPrisma.matchSwipe.create({
            data: {
              swiperId: otherProfile.id,
              targetId: mainProfile.id,
              action: 'like',
            },
          })
          matchedProfiles.push(otherProfile.id)
        }
      }

      // Find who liked main user back
      const likedBack = await testPrisma.matchSwipe.findMany({
        where: {
          targetId: mainProfile.id,
          action: 'like',
        },
      })

      expect(likedBack).toHaveLength(3)
    })
  })

  describe('Swipe Retrieval', () => {
    it('retrieves all swipes by user', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      for (let i = 0; i < 4; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: 'like',
          },
        })
      }

      const swipes = await testPrisma.matchSwipe.findMany({
        where: { swiperId: swiperProfile.id },
      })

      expect(swipes).toHaveLength(4)
    })

    it('retrieves swipes by action type', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      const actions = ['like', 'like', 'pass', 'super_like', 'like']

      for (let i = 0; i < actions.length; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: actions[i],
          },
        })
      }

      const likes = await testPrisma.matchSwipe.findMany({
        where: { swiperId: swiperProfile.id, action: 'like' },
      })

      expect(likes).toHaveLength(3)
    })

    it('retrieves who swiped on user', async () => {
      const target = await createTestUserInDb()
      const targetProfile = await createMatchProfile(target.id)

      for (let i = 0; i < 6; i++) {
        const swiper = await createTestUserInDb()
        const swiperProfile = await createMatchProfile(swiper.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: i < 4 ? 'like' : 'pass',
          },
        })
      }

      const whoLikedMe = await testPrisma.matchSwipe.findMany({
        where: { targetId: targetProfile.id, action: 'like' },
      })

      expect(whoLikedMe).toHaveLength(4)
    })
  })

  describe('Swipe Statistics', () => {
    it('counts swipes by action', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      const actions = ['like', 'like', 'like', 'pass', 'pass', 'super_like']

      for (let i = 0; i < actions.length; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: actions[i],
          },
        })
      }

      const counts = await testPrisma.matchSwipe.groupBy({
        by: ['action'],
        where: { swiperId: swiperProfile.id },
        _count: { id: true },
      })

      const likeCount = counts.find((c) => c.action === 'like')?._count.id
      expect(likeCount).toBe(3)
    })

    it('calculates like rate', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      // 6 likes, 4 passes = 60% like rate
      const actions = [
        'like',
        'like',
        'like',
        'like',
        'like',
        'like',
        'pass',
        'pass',
        'pass',
        'pass',
      ]

      for (let i = 0; i < actions.length; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: actions[i],
          },
        })
      }

      const total = await testPrisma.matchSwipe.count({
        where: { swiperId: swiperProfile.id },
      })

      const likes = await testPrisma.matchSwipe.count({
        where: { swiperId: swiperProfile.id, action: 'like' },
      })

      const likeRate = (likes / total) * 100
      expect(likeRate).toBe(60)
    })
  })

  describe('Swipe Deletion', () => {
    it('deletes swipe (undo)', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      const swipe = await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'like',
        },
      })

      await testPrisma.matchSwipe.delete({
        where: { id: swipe.id },
      })

      const found = await testPrisma.matchSwipe.findUnique({
        where: { id: swipe.id },
      })

      expect(found).toBeNull()
    })

    it('deletes all swipes for profile', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      for (let i = 0; i < 5; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)

        await testPrisma.matchSwipe.create({
          data: {
            swiperId: swiperProfile.id,
            targetId: targetProfile.id,
            action: 'like',
          },
        })
      }

      await testPrisma.matchSwipe.deleteMany({
        where: { swiperId: swiperProfile.id },
      })

      const remaining = await testPrisma.matchSwipe.findMany({
        where: { swiperId: swiperProfile.id },
      })

      expect(remaining).toHaveLength(0)
    })
  })

  describe('Already Swiped Check', () => {
    it('checks if already swiped on target', async () => {
      const user1 = await createTestUserInDb()
      const user2 = await createTestUserInDb()

      const profile1 = await createMatchProfile(user1.id)
      const profile2 = await createMatchProfile(user2.id)

      await testPrisma.matchSwipe.create({
        data: {
          swiperId: profile1.id,
          targetId: profile2.id,
          action: 'like',
        },
      })

      const existingSwipe = await testPrisma.matchSwipe.findFirst({
        where: {
          swiperId: profile1.id,
          targetId: profile2.id,
        },
      })

      expect(existingSwipe).not.toBeNull()
    })

    it('filters out already swiped profiles', async () => {
      const swiper = await createTestUserInDb()
      const swiperProfile = await createMatchProfile(swiper.id)

      const allProfiles: string[] = []
      const swipedProfiles: string[] = []

      for (let i = 0; i < 6; i++) {
        const target = await createTestUserInDb()
        const targetProfile = await createMatchProfile(target.id)
        allProfiles.push(targetProfile.id)

        if (i < 3) {
          await testPrisma.matchSwipe.create({
            data: {
              swiperId: swiperProfile.id,
              targetId: targetProfile.id,
              action: 'like',
            },
          })
          swipedProfiles.push(targetProfile.id)
        }
      }

      const swipes = await testPrisma.matchSwipe.findMany({
        where: { swiperId: swiperProfile.id },
        select: { targetId: true },
      })

      const swipedIds = swipes.map((s) => s.targetId)
      const notSwiped = allProfiles.filter((id) => !swipedIds.includes(id))

      expect(notSwiped).toHaveLength(3)
    })
  })
})
