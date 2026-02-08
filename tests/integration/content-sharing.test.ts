/**
 * Content Sharing Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 결과 공유 기능
 * - 공유 링크 관리
 * - 조회수 및 만료 추적
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

describe('Integration: Content Sharing', () => {
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

  describe('Share Link Creation', () => {
    it('creates share link for saju reading', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'saju_reading',
          shareCode: `saju_${Date.now()}`,
          resultData: {
            summary: '2024년 운세 요약',
            scores: { career: 85, love: 78, health: 90 },
          },
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      expect(shared).toBeDefined()
      expect(shared.resultType).toBe('saju_reading')
      expect(shared.shareCode).toContain('saju_')
    })

    it('creates share link for tarot reading', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'tarot_reading',
          shareCode: `tarot_${Date.now()}`,
          resultData: {
            question: '미래의 연애운',
            cards: ['The Lovers', 'The Star', 'The Sun'],
            interpretation: '긍정적인 기운이 감지됩니다...',
          },
          expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
      })

      const data = shared.resultData as { cards: string[] }
      expect(data.cards).toHaveLength(3)
    })

    it('creates share link for compatibility result', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'compatibility',
          shareCode: `compat_${Date.now()}`,
          resultData: {
            person1: { name: '김철수', sign: '양자리' },
            person2: { name: '이영희', sign: '사자자리' },
            score: 88,
            analysis: '불과 불의 만남...',
          },
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })

      const data = shared.resultData as { score: number }
      expect(data.score).toBe(88)
    })
  })

  describe('Share Link Retrieval', () => {
    it('retrieves shared result by code', async () => {
      const user = await createTestUserInDb()
      const code = `unique_code_${Date.now()}`

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'saju_reading',
          shareCode: code,
          resultData: { test: true },
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.sharedResult.findUnique({
        where: { shareCode: code },
      })

      expect(found).not.toBeNull()
      expect(found?.shareCode).toBe(code)
    })

    it('retrieves all shares for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: `type_${i}`,
            shareCode: `code_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      const shares = await testPrisma.sharedResult.findMany({
        where: { userId: user.id },
      })

      expect(shares).toHaveLength(5)
    })

    it('retrieves shares by result type', async () => {
      const user = await createTestUserInDb()

      const types = ['saju', 'saju', 'tarot', 'compatibility', 'saju']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: types[i],
            shareCode: `type_filter_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      const sajuShares = await testPrisma.sharedResult.findMany({
        where: { userId: user.id, resultType: 'saju' },
      })

      expect(sajuShares).toHaveLength(3)
    })
  })

  describe('View Count Tracking', () => {
    it('increments view count on access', async () => {
      const user = await createTestUserInDb()

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'saju_reading',
          shareCode: `views_${Date.now()}`,
          resultData: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          viewCount: 0,
        },
      })

      // Simulate 5 views
      for (let i = 0; i < 5; i++) {
        await testPrisma.sharedResult.update({
          where: { id: shared.id },
          data: { viewCount: { increment: 1 } },
        })
      }

      const updated = await testPrisma.sharedResult.findUnique({
        where: { id: shared.id },
      })

      expect(updated?.viewCount).toBe(5)
    })

    it('tracks view count across multiple shares', async () => {
      const user = await createTestUserInDb()

      const shares: string[] = []

      for (let i = 0; i < 3; i++) {
        const share = await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'test',
            shareCode: `multi_view_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            viewCount: (i + 1) * 10, // 10, 20, 30 views
          },
        })
        shares.push(share.id)
      }

      const allShares = await testPrisma.sharedResult.findMany({
        where: { id: { in: shares } },
      })

      const totalViews = allShares.reduce((sum, s) => sum + (s.viewCount || 0), 0)
      expect(totalViews).toBe(60)
    })
  })

  describe('Expiration Management', () => {
    it('identifies expired shares', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const past = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const future = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'expired',
          shareCode: `expired_${Date.now()}`,
          resultData: {},
          expiresAt: past,
        },
      })

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'valid',
          shareCode: `valid_${Date.now()}`,
          resultData: {},
          expiresAt: future,
        },
      })

      const validShares = await testPrisma.sharedResult.findMany({
        where: {
          userId: user.id,
          expiresAt: { gt: now },
        },
      })

      const expiredShares = await testPrisma.sharedResult.findMany({
        where: {
          userId: user.id,
          expiresAt: { lte: now },
        },
      })

      expect(validShares).toHaveLength(1)
      expect(expiredShares).toHaveLength(1)
    })

    it('extends share expiration', async () => {
      const user = await createTestUserInDb()

      const originalExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      const shared = await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'extend_me',
          shareCode: `extend_${Date.now()}`,
          resultData: {},
          expiresAt: originalExpiry,
        },
      })

      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

      const extended = await testPrisma.sharedResult.update({
        where: { id: shared.id },
        data: { expiresAt: newExpiry },
      })

      expect(extended.expiresAt > originalExpiry).toBe(true)
    })

    it('cleans up expired shares', async () => {
      const user = await createTestUserInDb()

      const now = new Date()
      const past = new Date(now.getTime() - 48 * 60 * 60 * 1000)

      // Create expired shares
      for (let i = 0; i < 5; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'cleanup',
            shareCode: `cleanup_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: past,
          },
        })
      }

      await testPrisma.sharedResult.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: now },
        },
      })

      const remaining = await testPrisma.sharedResult.findMany({
        where: { userId: user.id, resultType: 'cleanup' },
      })

      expect(remaining).toHaveLength(0)
    })
  })

  describe('Share Link Deletion', () => {
    it('deletes share by code', async () => {
      const user = await createTestUserInDb()
      const code = `delete_me_${Date.now()}`

      await testPrisma.sharedResult.create({
        data: {
          userId: user.id,
          resultType: 'delete_test',
          shareCode: code,
          resultData: {},
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.sharedResult.delete({
        where: { shareCode: code },
      })

      const found = await testPrisma.sharedResult.findUnique({
        where: { shareCode: code },
      })

      expect(found).toBeNull()
    })

    it('deletes all user shares', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'bulk_delete',
            shareCode: `bulk_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        })
      }

      await testPrisma.sharedResult.deleteMany({
        where: { userId: user.id },
      })

      const remaining = await testPrisma.sharedResult.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(0)
    })
  })

  describe('Share Analytics', () => {
    it('tracks most viewed shares', async () => {
      const user = await createTestUserInDb()

      const viewCounts = [100, 50, 200, 75, 150]

      for (let i = 0; i < viewCounts.length; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'analytics',
            shareCode: `analytics_${Date.now()}_${i}`,
            resultData: { index: i },
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            viewCount: viewCounts[i],
          },
        })
      }

      const topShares = await testPrisma.sharedResult.findMany({
        where: { userId: user.id, resultType: 'analytics' },
        orderBy: { viewCount: 'desc' },
        take: 3,
      })

      expect(topShares[0].viewCount).toBe(200)
      expect(topShares[1].viewCount).toBe(150)
      expect(topShares[2].viewCount).toBe(100)
    })

    it('calculates total views for user', async () => {
      const user = await createTestUserInDb()

      for (let i = 1; i <= 5; i++) {
        await testPrisma.sharedResult.create({
          data: {
            userId: user.id,
            resultType: 'total_views',
            shareCode: `total_${Date.now()}_${i}`,
            resultData: {},
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            viewCount: i * 10,
          },
        })
      }

      const shares = await testPrisma.sharedResult.findMany({
        where: { userId: user.id, resultType: 'total_views' },
      })

      const totalViews = shares.reduce((sum, s) => sum + (s.viewCount || 0), 0)
      expect(totalViews).toBe(150) // 10+20+30+40+50
    })
  })
})
