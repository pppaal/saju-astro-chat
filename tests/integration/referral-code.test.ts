/**
 * Referral Code Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 추천 코드 생성 및 관리
 * - 추천 보상 처리
 * - 추천 통계
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

describe('Integration: Referral Code', () => {
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

  describe('Code Generation', () => {
    it('creates referral code for user', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `REF_${Date.now()}`,
          isActive: true,
        },
      })

      expect(code.isActive).toBe(true)
      expect(code.code).toContain('REF_')
    })

    it('creates code with custom settings', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: 'SPECIAL2024',
          isActive: true,
          maxUses: 100,
          bonusCredits: 50,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(code.maxUses).toBe(100)
      expect(code.bonusCredits).toBe(50)
    })

    it('creates promotional code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: 'PROMO50',
          isActive: true,
          codeType: 'promotional',
          discountPercent: 50,
          description: '50% 할인 프로모션',
        },
      })

      expect(code.codeType).toBe('promotional')
      expect(code.discountPercent).toBe(50)
    })

    it('creates influencer code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: 'INFLUENCER_KIM',
          isActive: true,
          codeType: 'influencer',
          commissionPercent: 10,
          influencerName: '김인플루언서',
        },
      })

      expect(code.codeType).toBe('influencer')
      expect(code.commissionPercent).toBe(10)
    })
  })

  describe('Code Redemption', () => {
    it('records code redemption', async () => {
      const referrer = await createTestUserInDb()
      const referee = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          usageCount: 0,
        },
      })

      // Record redemption
      const redemption = await testPrisma.referralRedemption.create({
        data: {
          codeId: code.id,
          referrerId: referrer.id,
          refereeId: referee.id,
          status: 'completed',
        },
      })

      // Update usage count
      await testPrisma.referralCode.update({
        where: { id: code.id },
        data: { usageCount: { increment: 1 } },
      })

      expect(redemption.status).toBe('completed')
    })

    it('tracks multiple redemptions', async () => {
      const referrer = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          usageCount: 0,
        },
      })

      for (let i = 0; i < 5; i++) {
        const referee = await createTestUserInDb()

        await testPrisma.referralRedemption.create({
          data: {
            codeId: code.id,
            referrerId: referrer.id,
            refereeId: referee.id,
            status: 'completed',
          },
        })
      }

      await testPrisma.referralCode.update({
        where: { id: code.id },
        data: { usageCount: 5 },
      })

      const redemptions = await testPrisma.referralRedemption.findMany({
        where: { codeId: code.id },
      })

      expect(redemptions).toHaveLength(5)
    })

    it('prevents exceeding max uses', async () => {
      const referrer = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          maxUses: 3,
          usageCount: 3,
        },
      })

      const canRedeem = code.usageCount < (code.maxUses || Infinity)
      expect(canRedeem).toBe(false)
    })
  })

  describe('Code Retrieval', () => {
    it('retrieves code by value', async () => {
      const user = await createTestUserInDb()
      const codeValue = `REF_${Date.now()}`

      await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: codeValue,
          isActive: true,
        },
      })

      const found = await testPrisma.referralCode.findUnique({
        where: { code: codeValue },
      })

      expect(found).not.toBeNull()
    })

    it('retrieves codes by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.referralCode.create({
          data: {
            userId: user.id,
            code: `REF_${Date.now()}_${i}`,
            isActive: true,
          },
        })
      }

      const codes = await testPrisma.referralCode.findMany({
        where: { userId: user.id },
      })

      expect(codes).toHaveLength(3)
    })

    it('retrieves active codes only', async () => {
      const user = await createTestUserInDb()

      const states = [true, false, true, false, true]

      for (let i = 0; i < states.length; i++) {
        await testPrisma.referralCode.create({
          data: {
            userId: user.id,
            code: `REF_${Date.now()}_${i}`,
            isActive: states[i],
          },
        })
      }

      const activeCodes = await testPrisma.referralCode.findMany({
        where: { userId: user.id, isActive: true },
      })

      expect(activeCodes).toHaveLength(3)
    })

    it('retrieves non-expired codes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Expired code
      await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `EXPIRED_${Date.now()}`,
          isActive: true,
          expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      })

      // Valid code
      await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `VALID_${Date.now()}`,
          isActive: true,
          expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      // No expiration
      await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `FOREVER_${Date.now()}`,
          isActive: true,
          expiresAt: null,
        },
      })

      const validCodes = await testPrisma.referralCode.findMany({
        where: {
          userId: user.id,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        },
      })

      expect(validCodes).toHaveLength(2)
    })
  })

  describe('Referral Statistics', () => {
    it('counts total referrals per user', async () => {
      const referrer = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
        },
      })

      for (let i = 0; i < 7; i++) {
        const referee = await createTestUserInDb()

        await testPrisma.referralRedemption.create({
          data: {
            codeId: code.id,
            referrerId: referrer.id,
            refereeId: referee.id,
            status: 'completed',
          },
        })
      }

      const totalReferrals = await testPrisma.referralRedemption.count({
        where: { referrerId: referrer.id, status: 'completed' },
      })

      expect(totalReferrals).toBe(7)
    })

    it('calculates total rewards earned', async () => {
      const referrer = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          bonusCredits: 100,
        },
      })

      const rewards = [100, 100, 100, 50, 100] // Different rewards

      for (let i = 0; i < rewards.length; i++) {
        const referee = await createTestUserInDb()

        await testPrisma.referralRedemption.create({
          data: {
            codeId: code.id,
            referrerId: referrer.id,
            refereeId: referee.id,
            status: 'completed',
            referrerReward: rewards[i],
          },
        })
      }

      const redemptions = await testPrisma.referralRedemption.findMany({
        where: { referrerId: referrer.id },
      })

      const totalRewards = redemptions.reduce((sum, r) => sum + (r.referrerReward || 0), 0)
      expect(totalRewards).toBe(450)
    })

    it('counts redemptions by status', async () => {
      const referrer = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: referrer.id,
          code: `REF_${Date.now()}`,
          isActive: true,
        },
      })

      const statuses = ['completed', 'completed', 'pending', 'completed', 'cancelled']

      for (let i = 0; i < statuses.length; i++) {
        const referee = await createTestUserInDb()

        await testPrisma.referralRedemption.create({
          data: {
            codeId: code.id,
            referrerId: referrer.id,
            refereeId: referee.id,
            status: statuses[i],
          },
        })
      }

      const counts = await testPrisma.referralRedemption.groupBy({
        by: ['status'],
        where: { codeId: code.id },
        _count: { id: true },
      })

      const completedCount = counts.find((c) => c.status === 'completed')?._count.id
      expect(completedCount).toBe(3)
    })

    it('finds top referrers', async () => {
      const referrers: string[] = []
      const referralCounts = [5, 10, 3, 8, 2]

      for (let i = 0; i < referralCounts.length; i++) {
        const referrer = await createTestUserInDb()
        referrers.push(referrer.id)

        const code = await testPrisma.referralCode.create({
          data: {
            userId: referrer.id,
            code: `REF_${Date.now()}_${i}`,
            isActive: true,
          },
        })

        for (let j = 0; j < referralCounts[i]; j++) {
          const referee = await createTestUserInDb()

          await testPrisma.referralRedemption.create({
            data: {
              codeId: code.id,
              referrerId: referrer.id,
              refereeId: referee.id,
              status: 'completed',
            },
          })
        }
      }

      const counts = await testPrisma.referralRedemption.groupBy({
        by: ['referrerId'],
        where: { referrerId: { in: referrers } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 1,
      })

      expect(counts[0]._count.id).toBe(10)
    })
  })

  describe('Code Updates', () => {
    it('deactivates code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `REF_${Date.now()}`,
          isActive: true,
        },
      })

      const updated = await testPrisma.referralCode.update({
        where: { id: code.id },
        data: { isActive: false },
      })

      expect(updated.isActive).toBe(false)
    })

    it('updates bonus amount', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          bonusCredits: 50,
        },
      })

      const updated = await testPrisma.referralCode.update({
        where: { id: code.id },
        data: { bonusCredits: 100 },
      })

      expect(updated.bonusCredits).toBe(100)
    })

    it('extends expiration', async () => {
      const user = await createTestUserInDb()
      const originalExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `REF_${Date.now()}`,
          isActive: true,
          expiresAt: originalExpiry,
        },
      })

      const updated = await testPrisma.referralCode.update({
        where: { id: code.id },
        data: { expiresAt: newExpiry },
      })

      expect(updated.expiresAt?.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })
  })

  describe('Code Deletion', () => {
    it('deletes code', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.referralCode.create({
        data: {
          userId: user.id,
          code: `REF_${Date.now()}`,
          isActive: true,
        },
      })

      await testPrisma.referralCode.delete({
        where: { id: code.id },
      })

      const found = await testPrisma.referralCode.findUnique({
        where: { id: code.id },
      })

      expect(found).toBeNull()
    })

    it('deletes expired codes', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Expired codes
      for (let i = 0; i < 3; i++) {
        await testPrisma.referralCode.create({
          data: {
            userId: user.id,
            code: `EXPIRED_${Date.now()}_${i}`,
            isActive: false,
            expiresAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Active codes
      for (let i = 0; i < 2; i++) {
        await testPrisma.referralCode.create({
          data: {
            userId: user.id,
            code: `ACTIVE_${Date.now()}_${i}`,
            isActive: true,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.referralCode.deleteMany({
        where: {
          userId: user.id,
          isActive: false,
          expiresAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.referralCode.findMany({
        where: { userId: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
