/**
 * Gift Card Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 기프트 카드 생성 및 발급
 * - 카드 사용 및 잔액 관리
 * - 만료 처리
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

describe('Integration: Gift Card', () => {
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

  describe('Card Creation', () => {
    it('creates gift card', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      expect(card.amount).toBe(10000)
      expect(card.balance).toBe(10000)
    })

    it('creates card with message', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 50000,
          balance: 50000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          recipientEmail: 'friend@example.com',
          message: '생일 축하해요! 행복한 하루 되세요.',
          senderName: '김철수',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      expect(card.message).toContain('생일')
      expect(card.senderName).toBe('김철수')
    })

    it('creates themed gift card', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 30000,
          balance: 30000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          theme: 'birthday',
          designTemplate: 'birthday_balloons',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      expect(card.theme).toBe('birthday')
    })

    it('creates bulk gift cards', async () => {
      const user = await createTestUserInDb()
      const batchId = `BATCH_${Date.now()}`

      for (let i = 0; i < 10; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 5000,
            balance: 5000,
            currency: 'KRW',
            purchasedBy: user.id,
            status: 'active',
            batchId,
            expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const batchCards = await testPrisma.giftCard.findMany({
        where: { batchId },
      })

      expect(batchCards).toHaveLength(10)
    })
  })

  describe('Card Redemption', () => {
    it('redeems gift card', async () => {
      const purchaser = await createTestUserInDb()
      const recipient = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: purchaser.id,
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      const redeemed = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: {
          redeemedBy: recipient.id,
          redeemedAt: new Date(),
          status: 'redeemed',
        },
      })

      expect(redeemed.redeemedBy).toBe(recipient.id)
      expect(redeemed.status).toBe('redeemed')
    })

    it('partially uses gift card', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          redeemedBy: user.id,
          status: 'redeemed',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      // Use 3000 KRW
      const updated = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: { balance: card.balance - 3000 },
      })

      expect(updated.balance).toBe(7000)
    })

    it('fully depletes gift card', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 5000,
          balance: 5000,
          currency: 'KRW',
          purchasedBy: user.id,
          redeemedBy: user.id,
          status: 'redeemed',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: {
          balance: 0,
          status: 'depleted',
          depletedAt: new Date(),
        },
      })

      expect(updated.balance).toBe(0)
      expect(updated.status).toBe('depleted')
    })
  })

  describe('Card Retrieval', () => {
    it('retrieves card by code', async () => {
      const user = await createTestUserInDb()
      const code = `GIFT_${Date.now()}`

      await testPrisma.giftCard.create({
        data: {
          code,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      const found = await testPrisma.giftCard.findUnique({
        where: { code },
      })

      expect(found).not.toBeNull()
    })

    it('retrieves cards purchased by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 10000,
            balance: 10000,
            currency: 'KRW',
            purchasedBy: user.id,
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const cards = await testPrisma.giftCard.findMany({
        where: { purchasedBy: user.id },
      })

      expect(cards).toHaveLength(5)
    })

    it('retrieves cards redeemed by user', async () => {
      const purchaser = await createTestUserInDb()
      const recipient = await createTestUserInDb()

      for (let i = 0; i < 3; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 10000,
            balance: 10000,
            currency: 'KRW',
            purchasedBy: purchaser.id,
            redeemedBy: recipient.id,
            status: 'redeemed',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const cards = await testPrisma.giftCard.findMany({
        where: { redeemedBy: recipient.id },
      })

      expect(cards).toHaveLength(3)
    })

    it('retrieves active cards with balance', async () => {
      const user = await createTestUserInDb()

      const balances = [5000, 0, 3000, 0, 7000]

      for (let i = 0; i < balances.length; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 10000,
            balance: balances[i],
            currency: 'KRW',
            purchasedBy: user.id,
            redeemedBy: user.id,
            status: balances[i] > 0 ? 'redeemed' : 'depleted',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const cardsWithBalance = await testPrisma.giftCard.findMany({
        where: { redeemedBy: user.id, balance: { gt: 0 } },
      })

      expect(cardsWithBalance).toHaveLength(3)
    })
  })

  describe('Card Statistics', () => {
    it('calculates total gift card sales', async () => {
      const users: string[] = []
      const amounts = [10000, 20000, 30000, 50000, 100000]

      for (let i = 0; i < amounts.length; i++) {
        const user = await createTestUserInDb()
        users.push(user.id)

        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: amounts[i],
            balance: amounts[i],
            currency: 'KRW',
            purchasedBy: user.id,
            status: 'active',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const cards = await testPrisma.giftCard.findMany({
        where: { purchasedBy: { in: users } },
      })

      const totalSales = cards.reduce((sum, c) => sum + c.amount, 0)
      expect(totalSales).toBe(210000)
    })

    it('counts cards by status', async () => {
      const user = await createTestUserInDb()

      const statuses = ['active', 'active', 'redeemed', 'redeemed', 'redeemed', 'expired']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 10000,
            balance: statuses[i] === 'active' ? 10000 : 5000,
            currency: 'KRW',
            purchasedBy: user.id,
            status: statuses[i],
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const counts = await testPrisma.giftCard.groupBy({
        by: ['status'],
        where: { purchasedBy: user.id },
        _count: { id: true },
      })

      const redeemedCount = counts.find((c) => c.status === 'redeemed')?._count.id
      expect(redeemedCount).toBe(3)
    })

    it('calculates unused balance', async () => {
      const user = await createTestUserInDb()

      const balances = [5000, 3000, 7000, 0, 2000]

      for (let i = 0; i < balances.length; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `GIFT_${Date.now()}_${i}`,
            amount: 10000,
            balance: balances[i],
            currency: 'KRW',
            purchasedBy: user.id,
            redeemedBy: user.id,
            status: balances[i] > 0 ? 'redeemed' : 'depleted',
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const cards = await testPrisma.giftCard.findMany({
        where: { redeemedBy: user.id },
      })

      const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0)
      expect(totalBalance).toBe(17000)
    })
  })

  describe('Card Expiration', () => {
    it('identifies expired cards', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Expired card
      await testPrisma.giftCard.create({
        data: {
          code: `EXPIRED_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      })

      // Valid card
      await testPrisma.giftCard.create({
        data: {
          code: `VALID_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      const expiredCards = await testPrisma.giftCard.findMany({
        where: {
          purchasedBy: user.id,
          status: 'active',
          expiresAt: { lt: now },
        },
      })

      expect(expiredCards).toHaveLength(1)
    })

    it('marks cards as expired', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: { status: 'expired' },
      })

      expect(updated.status).toBe('expired')
    })
  })

  describe('Card Updates', () => {
    it('extends expiration', async () => {
      const user = await createTestUserInDb()
      const originalExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const newExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: originalExpiry,
        },
      })

      const updated = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: { expiresAt: newExpiry },
      })

      expect(updated.expiresAt?.getTime()).toBeGreaterThan(originalExpiry.getTime())
    })

    it('deactivates card', async () => {
      const user = await createTestUserInDb()

      const card = await testPrisma.giftCard.create({
        data: {
          code: `GIFT_${Date.now()}`,
          amount: 10000,
          balance: 10000,
          currency: 'KRW',
          purchasedBy: user.id,
          status: 'active',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      })

      const updated = await testPrisma.giftCard.update({
        where: { id: card.id },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: 'Fraud prevention',
        },
      })

      expect(updated.status).toBe('cancelled')
    })
  })

  describe('Card Deletion', () => {
    it('deletes old expired cards', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      // Old expired cards
      for (let i = 0; i < 3; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `OLD_${Date.now()}_${i}`,
            amount: 10000,
            balance: 0,
            currency: 'KRW',
            purchasedBy: user.id,
            status: 'expired',
            expiresAt: new Date(now.getTime() - 400 * 24 * 60 * 60 * 1000),
          },
        })
      }

      // Active cards
      for (let i = 0; i < 2; i++) {
        await testPrisma.giftCard.create({
          data: {
            code: `ACTIVE_${Date.now()}_${i}`,
            amount: 10000,
            balance: 10000,
            currency: 'KRW',
            purchasedBy: user.id,
            status: 'active',
            expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
          },
        })
      }

      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

      await testPrisma.giftCard.deleteMany({
        where: {
          purchasedBy: user.id,
          status: 'expired',
          expiresAt: { lt: oneYearAgo },
        },
      })

      const remaining = await testPrisma.giftCard.findMany({
        where: { purchasedBy: user.id },
      })

      expect(remaining).toHaveLength(2)
    })
  })
})
