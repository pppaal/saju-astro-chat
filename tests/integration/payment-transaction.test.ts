/**
 * Payment Transaction Integration Tests
 *
 * 실제 데이터베이스를 사용하여 테스트:
 * - 결제 트랜잭션 기록
 * - 결제 상태 관리
 * - 환불 처리
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

describe('Integration: Payment Transaction', () => {
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

  describe('Transaction Recording', () => {
    it('records successful payment', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
        },
      })

      expect(transaction.amount).toBe(29900)
      expect(transaction.status).toBe('completed')
    })

    it('records pending payment', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 99900,
          currency: 'KRW',
          status: 'pending',
          paymentMethod: 'bank_transfer',
          provider: 'toss',
          providerTransactionId: `pending_${Date.now()}`,
          productId: 'premium_yearly',
        },
      })

      expect(transaction.status).toBe('pending')
    })

    it('records payment with discount', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 26910,
          currency: 'KRW',
          originalAmount: 29900,
          discountAmount: 2990,
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
          couponCode: 'SAVE10',
        },
      })

      expect(transaction.originalAmount).toBe(29900)
      expect(transaction.discountAmount).toBe(2990)
    })

    it('records payment with metadata', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
          metadata: {
            cardLast4: '4242',
            cardBrand: 'visa',
            receiptUrl: 'https://receipt.example.com/123',
          },
        },
      })

      const meta = transaction.metadata as { cardBrand: string }
      expect(meta.cardBrand).toBe('visa')
    })

    it('records subscription payment', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `sub_${Date.now()}`,
          productId: 'premium_monthly',
          subscriptionId: `sub_${Date.now()}`,
          isRecurring: true,
        },
      })

      expect(transaction.isRecurring).toBe(true)
    })
  })

  describe('Transaction Retrieval', () => {
    it('retrieves transactions by user', async () => {
      const user = await createTestUserInDb()

      for (let i = 0; i < 5; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
          },
        })
      }

      const transactions = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id },
      })

      expect(transactions).toHaveLength(5)
    })

    it('retrieves transactions by status', async () => {
      const user = await createTestUserInDb()

      const statuses = ['completed', 'pending', 'completed', 'failed', 'completed']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: statuses[i],
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
          },
        })
      }

      const completed = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id, status: 'completed' },
      })

      expect(completed).toHaveLength(3)
    })

    it('retrieves transactions by date range', async () => {
      const user = await createTestUserInDb()
      const now = new Date()

      for (let i = 0; i < 10; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() - i * 7)

        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
            createdAt: date,
          },
        })
      }

      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const recent = await testPrisma.paymentTransaction.findMany({
        where: {
          userId: user.id,
          createdAt: { gte: thirtyDaysAgo },
        },
      })

      expect(recent).toHaveLength(5)
    })

    it('retrieves transactions by provider', async () => {
      const user = await createTestUserInDb()

      const providers = ['stripe', 'toss', 'stripe', 'kakao', 'stripe']

      for (let i = 0; i < providers.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: providers[i],
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
          },
        })
      }

      const stripePayments = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id, provider: 'stripe' },
      })

      expect(stripePayments).toHaveLength(3)
    })
  })

  describe('Transaction Statistics', () => {
    it('calculates total revenue', async () => {
      const user = await createTestUserInDb()

      const amounts = [29900, 99900, 29900, 9900, 29900] // 199500 total

      for (let i = 0; i < amounts.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: amounts[i],
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium',
          },
        })
      }

      const transactions = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id, status: 'completed' },
      })

      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
      expect(totalRevenue).toBe(199500)
    })

    it('counts transactions by payment method', async () => {
      const user = await createTestUserInDb()

      const methods = ['card', 'bank_transfer', 'card', 'kakao_pay', 'card']

      for (let i = 0; i < methods.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: 'completed',
            paymentMethod: methods[i],
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium',
          },
        })
      }

      const counts = await testPrisma.paymentTransaction.groupBy({
        by: ['paymentMethod'],
        where: { userId: user.id },
        _count: { id: true },
      })

      const cardCount = counts.find((c) => c.paymentMethod === 'card')?._count.id
      expect(cardCount).toBe(3)
    })

    it('calculates average transaction amount', async () => {
      const user = await createTestUserInDb()

      const amounts = [10000, 20000, 30000, 40000, 50000] // avg = 30000

      for (let i = 0; i < amounts.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: amounts[i],
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'credits',
          },
        })
      }

      const transactions = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id },
      })

      const avgAmount = transactions.reduce((sum, t) => sum + t.amount, 0) / transactions.length
      expect(avgAmount).toBe(30000)
    })

    it('calculates total discount given', async () => {
      const user = await createTestUserInDb()

      const discounts = [1000, 2000, 1500, 3000, 2500] // 10000 total

      for (let i = 0; i < discounts.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900 - discounts[i],
            originalAmount: 29900,
            discountAmount: discounts[i],
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium',
          },
        })
      }

      const transactions = await testPrisma.paymentTransaction.findMany({
        where: { userId: user.id },
      })

      const totalDiscount = transactions.reduce((sum, t) => sum + (t.discountAmount || 0), 0)
      expect(totalDiscount).toBe(10000)
    })
  })

  describe('Refund Processing', () => {
    it('records full refund', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
        },
      })

      const refund = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: -29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `refund_${Date.now()}`,
          productId: 'premium_monthly',
          originalTransactionId: transaction.id,
          type: 'refund',
        },
      })

      expect(refund.type).toBe('refund')
      expect(refund.amount).toBe(-29900)
    })

    it('records partial refund', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 99900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_yearly',
        },
      })

      const refund = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: -50000,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `refund_${Date.now()}`,
          productId: 'premium_yearly',
          originalTransactionId: transaction.id,
          type: 'partial_refund',
        },
      })

      expect(refund.type).toBe('partial_refund')
      expect(refund.amount).toBe(-50000)
    })

    it('updates original transaction status after refund', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'completed',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
        },
      })

      const updated = await testPrisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: { status: 'refunded' },
      })

      expect(updated.status).toBe('refunded')
    })
  })

  describe('Transaction Updates', () => {
    it('updates pending to completed', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'pending',
          paymentMethod: 'bank_transfer',
          provider: 'toss',
          providerTransactionId: `pending_${Date.now()}`,
          productId: 'premium_monthly',
        },
      })

      const updated = await testPrisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })

      expect(updated.status).toBe('completed')
      expect(updated.completedAt).not.toBeNull()
    })

    it('marks transaction as failed', async () => {
      const user = await createTestUserInDb()

      const transaction = await testPrisma.paymentTransaction.create({
        data: {
          userId: user.id,
          amount: 29900,
          currency: 'KRW',
          status: 'pending',
          paymentMethod: 'card',
          provider: 'stripe',
          providerTransactionId: `txn_${Date.now()}`,
          productId: 'premium_monthly',
        },
      })

      const updated = await testPrisma.paymentTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'failed',
          failureReason: 'Card declined',
          failureCode: 'card_declined',
        },
      })

      expect(updated.status).toBe('failed')
      expect(updated.failureReason).toBe('Card declined')
    })
  })

  describe('Monthly Billing', () => {
    it('calculates monthly revenue', async () => {
      const user = await createTestUserInDb()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      for (let i = 0; i < 10; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: 'completed',
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
          },
        })
      }

      const monthlyTransactions = await testPrisma.paymentTransaction.findMany({
        where: {
          userId: user.id,
          status: 'completed',
          createdAt: { gte: startOfMonth },
        },
      })

      const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0)
      expect(monthlyRevenue).toBe(299000)
    })

    it('counts successful transactions per month', async () => {
      const user = await createTestUserInDb()
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const statuses = ['completed', 'failed', 'completed', 'completed', 'pending']

      for (let i = 0; i < statuses.length; i++) {
        await testPrisma.paymentTransaction.create({
          data: {
            userId: user.id,
            amount: 29900,
            currency: 'KRW',
            status: statuses[i],
            paymentMethod: 'card',
            provider: 'stripe',
            providerTransactionId: `txn_${Date.now()}_${i}`,
            productId: 'premium_monthly',
          },
        })
      }

      const successfulCount = await testPrisma.paymentTransaction.count({
        where: {
          userId: user.id,
          status: 'completed',
          createdAt: { gte: startOfMonth },
        },
      })

      expect(successfulCount).toBe(3)
    })
  })
})
