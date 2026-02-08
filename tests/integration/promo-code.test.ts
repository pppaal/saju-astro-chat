/**
 * Promo Code Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 프로모션 코드 생성
 * - 코드 사용 및 검증
 * - 할인 적용
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

describe('Integration: Promo Code', () => {
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

  describe('Promo Code Creation', () => {
    it('creates percentage discount code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'SUMMER20',
          discountType: 'percentage',
          discountValue: 20,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      expect(code.code).toBe('SUMMER20')
      expect(code.discountType).toBe('percentage')
      expect(code.discountValue).toBe(20)
    })

    it('creates fixed amount discount code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'SAVE5000',
          discountType: 'fixed',
          discountValue: 5000,
          currency: 'KRW',
          isActive: true,
          startDate: new Date(),
        },
      })

      expect(code.discountType).toBe('fixed')
      expect(code.discountValue).toBe(5000)
    })

    it('creates code with usage limit', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'LIMITED100',
          discountType: 'percentage',
          discountValue: 30,
          isActive: true,
          startDate: new Date(),
          maxUsageCount: 100,
          currentUsageCount: 0,
        },
      })

      expect(code.maxUsageCount).toBe(100)
    })

    it('creates code with per-user limit', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'ONCE10',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
          maxUsagePerUser: 1,
        },
      })

      expect(code.maxUsagePerUser).toBe(1)
    })

    it('creates code with minimum purchase requirement', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'MIN10000',
          discountType: 'percentage',
          discountValue: 15,
          isActive: true,
          startDate: new Date(),
          minPurchaseAmount: 10000,
        },
      })

      expect(code.minPurchaseAmount).toBe(10000)
    })

    it('creates product-specific code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'PREMIUM50',
          discountType: 'percentage',
          discountValue: 50,
          isActive: true,
          startDate: new Date(),
          applicableProducts: ['premium_monthly', 'premium_yearly'],
        },
      })

      const products = code.applicableProducts as string[]
      expect(products).toContain('premium_monthly')
    })

    it('creates first-purchase only code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'WELCOME20',
          discountType: 'percentage',
          discountValue: 20,
          isActive: true,
          startDate: new Date(),
          isFirstPurchaseOnly: true,
        },
      })

      expect(code.isFirstPurchaseOnly).toBe(true)
    })
  })

  describe('Promo Code Usage', () => {
    it('records code usage', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.promoCode.create({
        data: {
          code: 'USE10',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
        },
      })

      const usage = await testPrisma.promoCodeUsage.create({
        data: {
          promoCodeId: code.id,
          userId: user.id,
          usedAt: new Date(),
          orderAmount: 29900,
          discountAmount: 2990,
        },
      })

      expect(usage.discountAmount).toBe(2990)
    })

    it('increments usage count', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'COUNT_TEST',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
          currentUsageCount: 0,
        },
      })

      const updated = await testPrisma.promoCode.update({
        where: { id: code.id },
        data: { currentUsageCount: { increment: 1 } },
      })

      expect(updated.currentUsageCount).toBe(1)
    })

    it('checks user usage count', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.promoCode.create({
        data: {
          code: 'MULTI_USE',
          discountType: 'percentage',
          discountValue: 5,
          isActive: true,
          startDate: new Date(),
          maxUsagePerUser: 3,
        },
      })

      for (let i = 0; i < 2; i++) {
        await testPrisma.promoCodeUsage.create({
          data: {
            promoCodeId: code.id,
            userId: user.id,
            usedAt: new Date(),
            orderAmount: 10000,
            discountAmount: 500,
          },
        })
      }

      const userUsageCount = await testPrisma.promoCodeUsage.count({
        where: { promoCodeId: code.id, userId: user.id },
      })

      expect(userUsageCount).toBe(2)
      expect(userUsageCount < (code.maxUsagePerUser ?? Infinity)).toBe(true)
    })

    it('tracks usage with order reference', async () => {
      const user = await createTestUserInDb()

      const code = await testPrisma.promoCode.create({
        data: {
          code: 'ORDER_REF',
          discountType: 'fixed',
          discountValue: 3000,
          isActive: true,
          startDate: new Date(),
        },
      })

      const usage = await testPrisma.promoCodeUsage.create({
        data: {
          promoCodeId: code.id,
          userId: user.id,
          usedAt: new Date(),
          orderAmount: 15000,
          discountAmount: 3000,
          orderId: 'order-12345',
        },
      })

      expect(usage.orderId).toBe('order-12345')
    })
  })

  describe('Promo Code Validation', () => {
    it('validates active code', async () => {
      await testPrisma.promoCode.create({
        data: {
          code: 'VALID_CODE',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      })

      const now = new Date()
      const code = await testPrisma.promoCode.findFirst({
        where: {
          code: 'VALID_CODE',
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      })

      expect(code).not.toBeNull()
    })

    it('rejects expired code', async () => {
      await testPrisma.promoCode.create({
        data: {
          code: 'EXPIRED_CODE',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      })

      const now = new Date()
      const code = await testPrisma.promoCode.findFirst({
        where: {
          code: 'EXPIRED_CODE',
          isActive: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      })

      expect(code).toBeNull()
    })

    it('rejects code at usage limit', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'MAXED_OUT',
          discountType: 'percentage',
          discountValue: 20,
          isActive: true,
          startDate: new Date(),
          maxUsageCount: 100,
          currentUsageCount: 100,
        },
      })

      const isAvailable = code.currentUsageCount! < code.maxUsageCount!
      expect(isAvailable).toBe(false)
    })

    it('validates minimum purchase amount', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'MIN_CHECK',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
          minPurchaseAmount: 20000,
        },
      })

      const orderAmount = 15000
      const meetsMinimum = orderAmount >= (code.minPurchaseAmount ?? 0)
      expect(meetsMinimum).toBe(false)
    })
  })

  describe('Discount Calculation', () => {
    it('calculates percentage discount', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'CALC_PCT',
          discountType: 'percentage',
          discountValue: 25,
          isActive: true,
          startDate: new Date(),
        },
      })

      const orderAmount = 40000
      const discountAmount = Math.round(orderAmount * (code.discountValue / 100))
      expect(discountAmount).toBe(10000)
    })

    it('calculates fixed discount', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'CALC_FIXED',
          discountType: 'fixed',
          discountValue: 5000,
          isActive: true,
          startDate: new Date(),
        },
      })

      const orderAmount = 30000
      const discountAmount = Math.min(code.discountValue, orderAmount)
      expect(discountAmount).toBe(5000)
    })

    it('applies maximum discount cap', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'CAPPED',
          discountType: 'percentage',
          discountValue: 50,
          isActive: true,
          startDate: new Date(),
          maxDiscountAmount: 10000,
        },
      })

      const orderAmount = 50000
      let discountAmount = Math.round(orderAmount * (code.discountValue / 100))
      if (code.maxDiscountAmount && discountAmount > code.maxDiscountAmount) {
        discountAmount = code.maxDiscountAmount
      }
      expect(discountAmount).toBe(10000)
    })
  })

  describe('Promo Code Statistics', () => {
    it('counts total usage', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'STAT_COUNT',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
        },
      })

      for (let i = 0; i < 15; i++) {
        const user = await createTestUserInDb()
        await testPrisma.promoCodeUsage.create({
          data: {
            promoCodeId: code.id,
            userId: user.id,
            usedAt: new Date(),
            orderAmount: 20000,
            discountAmount: 2000,
          },
        })
      }

      const count = await testPrisma.promoCodeUsage.count({
        where: { promoCodeId: code.id },
      })

      expect(count).toBe(15)
    })

    it('calculates total discount given', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'STAT_DISCOUNT',
          discountType: 'fixed',
          discountValue: 3000,
          isActive: true,
          startDate: new Date(),
        },
      })

      const discounts = [3000, 3000, 3000, 3000, 3000]

      for (let i = 0; i < discounts.length; i++) {
        const user = await createTestUserInDb()
        await testPrisma.promoCodeUsage.create({
          data: {
            promoCodeId: code.id,
            userId: user.id,
            usedAt: new Date(),
            orderAmount: 25000,
            discountAmount: discounts[i],
          },
        })
      }

      const usages = await testPrisma.promoCodeUsage.findMany({
        where: { promoCodeId: code.id },
      })

      const totalDiscount = usages.reduce((sum, u) => sum + u.discountAmount, 0)
      expect(totalDiscount).toBe(15000)
    })

    it('counts unique users', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'STAT_UNIQUE',
          discountType: 'percentage',
          discountValue: 5,
          isActive: true,
          startDate: new Date(),
        },
      })

      const users = []
      for (let i = 0; i < 5; i++) {
        users.push(await createTestUserInDb())
      }

      // Some users use multiple times
      const usagePattern = [0, 0, 1, 1, 1, 2, 3, 4, 4, 4]
      for (const userIndex of usagePattern) {
        await testPrisma.promoCodeUsage.create({
          data: {
            promoCodeId: code.id,
            userId: users[userIndex].id,
            usedAt: new Date(),
            orderAmount: 10000,
            discountAmount: 500,
          },
        })
      }

      const uniqueUsers = await testPrisma.promoCodeUsage.groupBy({
        by: ['userId'],
        where: { promoCodeId: code.id },
      })

      expect(uniqueUsers).toHaveLength(5)
    })
  })

  describe('Promo Code Management', () => {
    it('deactivates code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'DEACTIVATE',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
        },
      })

      const updated = await testPrisma.promoCode.update({
        where: { id: code.id },
        data: { isActive: false, deactivatedAt: new Date() },
      })

      expect(updated.isActive).toBe(false)
    })

    it('extends code validity', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'EXTEND',
          discountType: 'percentage',
          discountValue: 15,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      const newEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const updated = await testPrisma.promoCode.update({
        where: { id: code.id },
        data: { endDate: newEndDate },
      })

      expect(updated.endDate?.getTime()).toBe(newEndDate.getTime())
    })

    it('updates discount value', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'UPDATE_VALUE',
          discountType: 'percentage',
          discountValue: 10,
          isActive: true,
          startDate: new Date(),
        },
      })

      const updated = await testPrisma.promoCode.update({
        where: { id: code.id },
        data: { discountValue: 15 },
      })

      expect(updated.discountValue).toBe(15)
    })
  })

  describe('Promo Code Queries', () => {
    it('retrieves active codes', async () => {
      const statuses = [true, false, true, true, false]

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.promoCode.create({
          data: {
            code: `ACTIVE_${i}`,
            discountType: 'percentage',
            discountValue: 10,
            isActive: statuses[i],
            startDate: new Date(),
          },
        })
      }

      const active = await testPrisma.promoCode.findMany({
        where: { isActive: true },
      })

      expect(active).toHaveLength(3)
    })

    it('finds codes by type', async () => {
      const types = ['percentage', 'fixed', 'percentage', 'fixed', 'percentage']

      for (let i = 0; i < types.length; i++) {
        await testPrisma.promoCode.create({
          data: {
            code: `TYPE_${i}`,
            discountType: types[i],
            discountValue: types[i] === 'percentage' ? 10 : 5000,
            isActive: true,
            startDate: new Date(),
          },
        })
      }

      const percentageCodes = await testPrisma.promoCode.findMany({
        where: { discountType: 'percentage' },
      })

      expect(percentageCodes).toHaveLength(3)
    })

    it("retrieves user's used codes", async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 4; i++) {
        const code = await testPrisma.promoCode.create({
          data: {
            code: `USER_CODE_${i}`,
            discountType: 'percentage',
            discountValue: 10 + i * 5,
            isActive: true,
            startDate: new Date(),
          },
        })

        await testPrisma.promoCodeUsage.create({
          data: {
            promoCodeId: code.id,
            userId: user.id,
            usedAt: new Date(),
            orderAmount: 20000,
            discountAmount: 2000 + i * 1000,
          },
        })
      }

      const usages = await testPrisma.promoCodeUsage.findMany({
        where: { userId: user.id },
        include: { promoCode: true },
      })

      expect(usages).toHaveLength(4)
    })
  })

  describe('Promo Code Deletion', () => {
    it('deletes code', async () => {
      const code = await testPrisma.promoCode.create({
        data: {
          code: 'DELETE_ME',
          discountType: 'percentage',
          discountValue: 10,
          isActive: false,
          startDate: new Date(),
        },
      })

      await testPrisma.promoCode.delete({
        where: { id: code.id },
      })

      const found = await testPrisma.promoCode.findUnique({
        where: { id: code.id },
      })

      expect(found).toBeNull()
    })
  })
})
