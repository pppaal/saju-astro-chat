/**
 * App Review Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 앱 리뷰 및 평점
 * - 리뷰 분석
 * - 피드백 관리
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

describe('Integration: App Review', () => {
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

  describe('Review Creation', () => {
    it('creates basic review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '최고의 사주 앱!',
          content: '정확하고 상세한 풀이에 매우 만족합니다.',
          platform: 'ios',
        },
      })

      expect(review.rating).toBe(5)
      expect(review.platform).toBe('ios')
    })

    it('creates review with feature ratings', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 4,
          title: '좋은 앱이에요',
          content: '대체로 만족하지만 UI가 조금 불편해요',
          platform: 'android',
          featureRatings: {
            accuracy: 5,
            usability: 3,
            design: 4,
            speed: 4,
          },
        },
      })

      const features = review.featureRatings as { accuracy: number }
      expect(features.accuracy).toBe(5)
    })

    it('creates review with version info', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 4,
          title: '버전 업데이트 후기',
          content: '새 버전이 훨씬 좋아졌어요',
          platform: 'ios',
          appVersion: '2.5.0',
          osVersion: 'iOS 17.2',
        },
      })

      expect(review.appVersion).toBe('2.5.0')
    })

    it('creates review with device info', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '태블릿에서도 잘 작동해요',
          content: '아이패드에서 사용하기 좋습니다',
          platform: 'ios',
          deviceModel: 'iPad Pro 12.9',
          deviceInfo: {
            screenSize: '12.9 inch',
            memory: '8GB',
          },
        },
      })

      expect(review.deviceModel).toBe('iPad Pro 12.9')
    })
  })

  describe('Review Retrieval', () => {
    it('retrieves reviews by rating', async () => {
      const user = await createTestUserInDb()
      const ratings = [5, 4, 5, 3, 5, 4, 5]

      for (let i = 0; i < ratings.length; i++) {
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: ratings[i],
            title: `리뷰 ${i}`,
            content: '내용',
            platform: 'ios',
          },
        })
      }

      const fiveStarReviews = await testPrisma.appReview.findMany({
        where: { userId: user.id, rating: 5 },
      })

      expect(fiveStarReviews).toHaveLength(4)
    })

    it('retrieves reviews by platform', async () => {
      const platforms = ['ios', 'android', 'ios', 'web', 'ios', 'android']

      for (let i = 0; i < platforms.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: 5,
            title: `플랫폼 리뷰 ${i}`,
            content: '내용',
            platform: platforms[i],
          },
        })
      }

      const iosReviews = await testPrisma.appReview.findMany({
        where: { platform: 'ios' },
      })

      expect(iosReviews).toHaveLength(3)
    })

    it('retrieves recent reviews', async () => {
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const user = await createTestUserInDb()
        const date = new Date(now)
        date.setDate(date.getDate() - i)

        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: 5,
            title: `최근 리뷰 ${i}`,
            content: '내용',
            platform: 'ios',
            createdAt: date,
          },
        })
      }

      const sevenDaysAgo = new Date(now)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const recentReviews = await testPrisma.appReview.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
      })

      expect(recentReviews).toHaveLength(8)
    })

    it('retrieves reviews with user info', async () => {
      const user = await createTestUserInDb()

      await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '좋아요',
          content: '내용',
          platform: 'ios',
        },
      })

      const review = await testPrisma.appReview.findFirst({
        where: { userId: user.id },
        include: { user: true },
      })

      expect(review?.user.id).toBe(user.id)
    })
  })

  describe('Review Statistics', () => {
    it('calculates average rating', async () => {
      const ratings = [5, 4, 5, 3, 4, 5, 4, 5, 4, 5] // avg = 4.4

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: ratings[i],
            title: `평균 테스트 ${i}`,
            content: '내용',
            platform: 'ios',
          },
        })
      }

      const reviews = await testPrisma.appReview.findMany({
        where: { platform: 'ios' },
      })

      const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      expect(avgRating).toBe(4.4)
    })

    it('counts reviews by rating', async () => {
      const ratings = [5, 4, 5, 3, 5, 4, 5, 2, 5, 4]

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: ratings[i],
            title: `분포 테스트 ${i}`,
            content: '내용',
            platform: 'ios',
          },
        })
      }

      const counts = await testPrisma.appReview.groupBy({
        by: ['rating'],
        _count: { id: true },
        orderBy: { rating: 'desc' },
      })

      const fiveStarCount = counts.find((c) => c.rating === 5)?._count.id
      expect(fiveStarCount).toBe(5)
    })

    it('calculates NPS score', async () => {
      // NPS: % Promoters (9-10 or 5 stars) - % Detractors (1-6 or 1-2 stars)
      const ratings = [5, 5, 5, 5, 5, 4, 4, 3, 2, 1] // 5 promoters, 2 detractors

      for (let i = 0; i < ratings.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: ratings[i],
            title: `NPS 테스트 ${i}`,
            content: '내용',
            platform: 'ios',
          },
        })
      }

      const reviews = await testPrisma.appReview.findMany()
      const total = reviews.length
      const promoters = reviews.filter((r) => r.rating === 5).length
      const detractors = reviews.filter((r) => r.rating <= 2).length

      const nps = ((promoters - detractors) / total) * 100
      expect(nps).toBe(30) // (5 - 2) / 10 * 100 = 30
    })

    it('groups reviews by version', async () => {
      const versions = ['2.5.0', '2.4.0', '2.5.0', '2.5.0', '2.4.0']

      for (let i = 0; i < versions.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: 5,
            title: `버전 테스트 ${i}`,
            content: '내용',
            platform: 'ios',
            appVersion: versions[i],
          },
        })
      }

      const counts = await testPrisma.appReview.groupBy({
        by: ['appVersion'],
        _count: { id: true },
      })

      const version250Count = counts.find((c) => c.appVersion === '2.5.0')?._count.id
      expect(version250Count).toBe(3)
    })
  })

  describe('Review Moderation', () => {
    it('flags inappropriate review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 1,
          title: '부적절한 리뷰',
          content: '부적절한 내용',
          platform: 'ios',
          isFlagged: true,
          flagReason: 'inappropriate_content',
        },
      })

      expect(review.isFlagged).toBe(true)
    })

    it('approves review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '승인 대기',
          content: '내용',
          platform: 'ios',
          status: 'pending',
        },
      })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: {
          status: 'approved',
          moderatedAt: new Date(),
        },
      })

      expect(updated.status).toBe('approved')
    })

    it('hides review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 1,
          title: '숨김 처리',
          content: '내용',
          platform: 'ios',
          isVisible: true,
        },
      })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: { isVisible: false },
      })

      expect(updated.isVisible).toBe(false)
    })
  })

  describe('Review Response', () => {
    it('adds developer response', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 3,
          title: '개선이 필요해요',
          content: '속도가 느려요',
          platform: 'ios',
        },
      })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: {
          developerResponse: '소중한 피드백 감사합니다. 다음 업데이트에서 속도를 개선하겠습니다.',
          respondedAt: new Date(),
        },
      })

      expect(updated.developerResponse).toContain('피드백 감사합니다')
    })

    it('finds reviews needing response', async () => {
      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        await testPrisma.appReview.create({
          data: {
            userId: user.id,
            rating: i < 3 ? 2 : 5,
            title: `응답 테스트 ${i}`,
            content: '내용',
            platform: 'ios',
            developerResponse: i < 2 ? '응답' : null,
          },
        })
      }

      const needsResponse = await testPrisma.appReview.findMany({
        where: {
          rating: { lte: 3 },
          developerResponse: null,
        },
      })

      expect(needsResponse).toHaveLength(1)
    })
  })

  describe('Review Updates', () => {
    it('updates review rating', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 3,
          title: '초기 평가',
          content: '개선이 필요해요',
          platform: 'ios',
        },
      })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: {
          rating: 5,
          title: '업데이트 후 평가',
          content: '많이 좋아졌어요!',
          updatedAt: new Date(),
        },
      })

      expect(updated.rating).toBe(5)
    })

    it('tracks rating history', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 2,
          title: '초기',
          content: '내용',
          platform: 'ios',
          ratingHistory: [{ rating: 2, date: new Date().toISOString() }],
        },
      })

      const history = review.ratingHistory as { rating: number; date: string }[]
      history.push({ rating: 4, date: new Date().toISOString() })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: {
          rating: 4,
          ratingHistory: history,
        },
      })

      const updatedHistory = updated.ratingHistory as { rating: number }[]
      expect(updatedHistory).toHaveLength(2)
    })
  })

  describe('Review Deletion', () => {
    it('deletes review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '삭제 테스트',
          content: '내용',
          platform: 'ios',
        },
      })

      await testPrisma.appReview.delete({
        where: { id: review.id },
      })

      const found = await testPrisma.appReview.findUnique({
        where: { id: review.id },
      })

      expect(found).toBeNull()
    })

    it('soft deletes review', async () => {
      const user = await createTestUserInDb()

      const review = await testPrisma.appReview.create({
        data: {
          userId: user.id,
          rating: 5,
          title: '소프트 삭제',
          content: '내용',
          platform: 'ios',
          isDeleted: false,
        },
      })

      const updated = await testPrisma.appReview.update({
        where: { id: review.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })

      expect(updated.isDeleted).toBe(true)
    })
  })
})
