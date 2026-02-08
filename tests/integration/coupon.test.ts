/**
 * Coupon Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 쿠폰 생성 및 관리
 * - 쿠폰 사용 및 검증
 * - 할인 계산
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

describe('Integration: Coupon', () => {
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

  describe('Coupon Creation', () => {
    it('creates percentage discount coupon', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'SAVE20',
          discountType: 'percentage',
          discountValue: 20,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(coupon.code).toBe('SAVE20')
      expect(coupon.discountType).toBe('percentage')
      expect(coupon.discountValue).toBe(20)
    })

    it('creates fixed amount discount coupon', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'FLAT5000',
          discountType: 'fixed',
          discountValue: 5000,
          maxUses: 50,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      })

      expect(coupon.discountType).toBe('fixed')
      expect(coupon.discountValue).toBe(5000)
    })

    it('creates coupon with minimum purchase requirement', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'MIN10000',
          discountType: 'percentage',
          discountValue: 10,
          minPurchaseAmount: 10000,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(coupon.minPurchaseAmount).toBe(10000)
    })

    it('creates coupon with maximum discount cap', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'MAXCAP',
          discountType: 'percentage',
          discountValue: 30,
          maxDiscountAmount: 10000,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(coupon.maxDiscountAmount).toBe(10000)
    })

    it('creates single-use coupon per user', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'ONCE',
          discountType: 'percentage',
          discountValue: 15,
          maxUses: 1000,
          maxUsesPerUser: 1,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(coupon.maxUsesPerUser).toBe(1)
    })

    it('creates coupon for specific products', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'SAJU50',
          discountType: 'percentage',
          discountValue: 50,
          applicableProducts: ['saju_basic', 'saju_premium'],
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      const products = coupon.applicableProducts as string[]
      expect(products).toContain('saju_premium')
    })
  })

  describe('Coupon Validation', () => {
    it('validates active coupon', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'VALID',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.coupon.findFirst({
        where: {
          code: 'VALID',
          isActive: true,
          expiresAt: { gt: new Date() },
          currentUses: { lt: coupon.maxUses || 999999 },
        },
      })

      expect(found).not.toBeNull()
    })

    it('rejects expired coupon', async () => {
      await testPrisma.coupon.create({
        data: {
          code: 'EXPIRED',
          discountType: 'percentage',
          discountValue: 20,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.coupon.findFirst({
        where: {
          code: 'EXPIRED',
          isActive: true,
          expiresAt: { gt: new Date() },
        },
      })

      expect(found).toBeNull()
    })

    it('rejects inactive coupon', async () => {
      await testPrisma.coupon.create({
        data: {
          code: 'INACTIVE',
          discountType: 'percentage',
          discountValue: 20,
          maxUses: 100,
          currentUses: 0,
          isActive: false,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.coupon.findFirst({
        where: {
          code: 'INACTIVE',
          isActive: true,
        },
      })

      expect(found).toBeNull()
    })

    it('rejects fully used coupon', async () => {
      await testPrisma.coupon.create({
        data: {
          code: 'MAXED',
          discountType: 'percentage',
          discountValue: 20,
          maxUses: 10,
          currentUses: 10,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const coupon = await testPrisma.coupon.findFirst({
        where: { code: 'MAXED' },
      })

      expect(coupon?.currentUses).toBe(coupon?.maxUses)
    })
  })

  describe('Coupon Usage', () => {
    it('records coupon usage', async () => {
      const user = await createTestUserInDb()

      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'USE1',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const usage = await testPrisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId: user.id,
          orderAmount: 50000,
          discountAmount: 5000,
        },
      })

      expect(usage.discountAmount).toBe(5000)
    })

    it('increments usage count', async () => {
      const user = await createTestUserInDb()

      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'COUNT',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 5,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId: user.id,
          orderAmount: 10000,
          discountAmount: 1000,
        },
      })

      const updated = await testPrisma.coupon.update({
        where: { id: coupon.id },
        data: { currentUses: { increment: 1 } },
      })

      expect(updated.currentUses).toBe(6)
    })

    it('checks user usage limit', async () => {
      const user = await createTestUserInDb()

      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'USERLIMIT',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          maxUsesPerUser: 2,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      // Use twice
      for (let i = 0; i < 2; i++) {
        await testPrisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: user.id,
            orderAmount: 10000,
            discountAmount: 1000,
          },
        })
      }

      const userUsageCount = await testPrisma.couponUsage.count({
        where: { couponId: coupon.id, userId: user.id },
      })

      expect(userUsageCount).toBe(2)
    })
  })

  describe('Discount Calculation', () => {
    it('calculates percentage discount', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'PERCENT15',
          discountType: 'percentage',
          discountValue: 15,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const orderAmount = 100000
      const discount = Math.floor(orderAmount * (coupon.discountValue / 100))

      expect(discount).toBe(15000)
    })

    it('calculates fixed discount', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'FIXED10000',
          discountType: 'fixed',
          discountValue: 10000,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const discount = coupon.discountValue
      expect(discount).toBe(10000)
    })

    it('applies maximum discount cap', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'CAPPED',
          discountType: 'percentage',
          discountValue: 50,
          maxDiscountAmount: 20000,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const orderAmount = 100000
      let discount = Math.floor(orderAmount * (coupon.discountValue / 100)) // 50000
      if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
        discount = coupon.maxDiscountAmount
      }

      expect(discount).toBe(20000)
    })
  })

  describe('Coupon Statistics', () => {
    it('counts total usage', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'STATS',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      for (let i = 0; i < 5; i++) {
        const user = await createTestUserInDb()
        await testPrisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: user.id,
            orderAmount: 10000 * (i + 1),
            discountAmount: 1000 * (i + 1),
          },
        })
      }

      const totalUsage = await testPrisma.couponUsage.count({
        where: { couponId: coupon.id },
      })

      expect(totalUsage).toBe(5)
    })

    it('calculates total discount given', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'TOTALDISCOUNT',
          discountType: 'fixed',
          discountValue: 5000,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      for (let i = 0; i < 10; i++) {
        const user = await createTestUserInDb()
        await testPrisma.couponUsage.create({
          data: {
            couponId: coupon.id,
            userId: user.id,
            orderAmount: 50000,
            discountAmount: 5000,
          },
        })
      }

      const usages = await testPrisma.couponUsage.findMany({
        where: { couponId: coupon.id },
      })

      const totalDiscount = usages.reduce((sum, u) => sum + u.discountAmount, 0)
      expect(totalDiscount).toBe(50000)
    })

    it('groups coupons by type', async () => {
      const types = ['percentage', 'fixed', 'percentage', 'percentage', 'fixed']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.coupon.create({
          data: {
            code: `TYPE${i}`,
            discountType: types[i],
            discountValue: 10,
            maxUses: 100,
            currentUses: 0,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const counts = await testPrisma.coupon.groupBy({
        by: ['discountType'],
        _count: { id: true },
      })

      const percentageCount = counts.find((c) => c.discountType === 'percentage')?._count.id
      expect(percentageCount).toBe(3)
    })
  })

  describe('Coupon Updates', () => {
    it('extends expiration date', async () => {
      const originalExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'EXTEND',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: originalExpiry,
        },
      })

      const updated = await testPrisma.coupon.update({
        where: { id: coupon.id },
        data: { expiresAt: newExpiry },
      })

      expect(updated.expiresAt?.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })

    it('increases max uses', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'INCREASE',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 50,
          currentUses: 45,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.coupon.update({
        where: { id: coupon.id },
        data: { maxUses: 100 },
      })

      expect(updated.maxUses).toBe(100)
    })

    it('deactivates coupon', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'DEACTIVATE',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.coupon.update({
        where: { id: coupon.id },
        data: { isActive: false },
      })

      expect(updated.isActive).toBe(false)
    })
  })

  describe('Coupon Deletion', () => {
    it('deletes coupon', async () => {
      const coupon = await testPrisma.coupon.create({
        data: {
          code: 'DELETE',
          discountType: 'percentage',
          discountValue: 10,
          maxUses: 100,
          currentUses: 0,
          isActive: true,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      await testPrisma.coupon.delete({
        where: { id: coupon.id },
      })

      const found = await testPrisma.coupon.findUnique({
        where: { id: coupon.id },
      })

      expect(found).toBeNull()
    })

    it('deletes expired coupons', async () => {
      const now = new Date()

      // Expired coupons
      for (let i = 0; i < 3; i++) {
        await testPrisma.coupon.create({
          data: {
            code: `OLDCOUPON${i}`,
            discountType: 'percentage',
            discountValue: 10,
            maxUses: 100,
            currentUses: 0,
            isActive: false,
            expiresAt: new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Active coupons
      for (let i = 0; i < 2; i++) {
        await testPrisma.coupon.create({
          data: {
            code: `ACTIVECOUPON${i}`,
            discountType: 'percentage',
            discountValue: 10,
            maxUses: 100,
            currentUses: 0,
            isActive: true,
            expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

      await testPrisma.coupon.deleteMany({
        where: {
          isActive: false,
          expiresAt: { lt: ninetyDaysAgo },
        },
      })

      const remaining = await testPrisma.coupon.findMany({
        where: {
          code: { startsWith: 'OLDCOUPON' },
        },
      })

      expect(remaining).toHaveLength(0)
    })
  })
})
