/**
 * Payment Schema Tests
 * Comprehensive testing for payment.ts validation schemas
 */
import { describe, it, expect } from 'vitest'
import {
  planKeySchema,
  billingCycleSchema,
  creditPackKeySchema,
  checkoutRequestSchema,
  stripeWebhookObjectSchema,
  stripeWebhookEventSchema,
  stripeWebhookEventTypeSchema,
  stripeWebhookMetadataSchema,
  creditTypeSchema,
  featureTypeSchema,
  creditCheckRequestSchema,
  adminRefundSubscriptionRequestSchema,
} from '@/lib/api/zodValidation/payment'

describe('Payment Schema Tests', () => {
  describe('planKeySchema', () => {
    it('should accept valid plan keys', () => {
      expect(planKeySchema.safeParse('starter').success).toBe(true)
      expect(planKeySchema.safeParse('pro').success).toBe(true)
      expect(planKeySchema.safeParse('premium').success).toBe(true)
    })

    it('should reject invalid plan keys', () => {
      expect(planKeySchema.safeParse('free').success).toBe(false)
      expect(planKeySchema.safeParse('enterprise').success).toBe(false)
      expect(planKeySchema.safeParse('').success).toBe(false)
    })
  })

  describe('billingCycleSchema', () => {
    it('should accept valid billing cycles', () => {
      expect(billingCycleSchema.safeParse('monthly').success).toBe(true)
      expect(billingCycleSchema.safeParse('yearly').success).toBe(true)
    })

    it('should reject invalid billing cycles', () => {
      expect(billingCycleSchema.safeParse('weekly').success).toBe(false)
      expect(billingCycleSchema.safeParse('quarterly').success).toBe(false)
    })
  })

  describe('creditPackKeySchema', () => {
    it('should accept all credit pack keys', () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate']
      packs.forEach(pack => {
        expect(creditPackKeySchema.safeParse(pack).success).toBe(true)
      })
    })

    it('should reject invalid credit pack keys', () => {
      expect(creditPackKeySchema.safeParse('small').success).toBe(false)
      expect(creditPackKeySchema.safeParse('large').success).toBe(false)
    })
  })
})

describe('Checkout Schema Tests', () => {
  describe('checkoutRequestSchema', () => {
    it('should accept subscription checkout', () => {
      expect(checkoutRequestSchema.safeParse({
        plan: 'pro',
        billingCycle: 'monthly',
      }).success).toBe(true)
    })

    it('should accept credit pack checkout', () => {
      expect(checkoutRequestSchema.safeParse({
        creditPack: 'standard',
      }).success).toBe(true)
    })

    it('should reject both plan and creditPack', () => {
      expect(checkoutRequestSchema.safeParse({
        plan: 'pro',
        billingCycle: 'monthly',
        creditPack: 'standard',
      }).success).toBe(false)
    })

    it('should reject neither plan nor creditPack', () => {
      expect(checkoutRequestSchema.safeParse({}).success).toBe(false)
    })

    it('should reject plan without billingCycle', () => {
      expect(checkoutRequestSchema.safeParse({
        plan: 'pro',
      }).success).toBe(false)
    })

    it('should accept yearly billing', () => {
      expect(checkoutRequestSchema.safeParse({
        plan: 'premium',
        billingCycle: 'yearly',
      }).success).toBe(true)
    })

    it('should accept all credit pack options', () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate']
      packs.forEach(pack => {
        expect(checkoutRequestSchema.safeParse({ creditPack: pack }).success).toBe(true)
      })
    })
  })
})

describe('Stripe Webhook Schema Tests', () => {
  describe('stripeWebhookObjectSchema', () => {
    it('should accept valid webhook object', () => {
      expect(stripeWebhookObjectSchema.safeParse({
        id: 'sub_123',
        object: 'subscription',
        customer: 'cus_456',
        status: 'active',
      }).success).toBe(true)
    })

    it('should accept with metadata', () => {
      expect(stripeWebhookObjectSchema.safeParse({
        id: 'pi_123',
        metadata: {
          userId: 'user-123',
          plan: 'pro',
        },
      }).success).toBe(true)
    })

    it('should allow additional properties (passthrough)', () => {
      expect(stripeWebhookObjectSchema.safeParse({
        id: 'sub_123',
        custom_field: 'custom_value',
        nested: { data: true },
      }).success).toBe(true)
    })
  })

  describe('stripeWebhookEventSchema', () => {
    const validEvent = {
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          customer: 'cus_456',
        },
      },
      created: 1700000000,
      livemode: false,
    }

    it('should accept valid webhook event', () => {
      expect(stripeWebhookEventSchema.safeParse(validEvent).success).toBe(true)
    })

    it('should accept live mode event', () => {
      expect(stripeWebhookEventSchema.safeParse({
        ...validEvent,
        livemode: true,
      }).success).toBe(true)
    })

    it('should reject missing id', () => {
      const { id, ...rest } = validEvent
      expect(stripeWebhookEventSchema.safeParse(rest).success).toBe(false)
    })

    it('should reject missing type', () => {
      const { type, ...rest } = validEvent
      expect(stripeWebhookEventSchema.safeParse(rest).success).toBe(false)
    })

    it('should reject invalid created timestamp', () => {
      expect(stripeWebhookEventSchema.safeParse({
        ...validEvent,
        created: -1,
      }).success).toBe(false)
    })
  })

  describe('stripeWebhookEventTypeSchema', () => {
    it('should accept valid event types', () => {
      const types = [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ]
      types.forEach(type => {
        expect(stripeWebhookEventTypeSchema.safeParse(type).success).toBe(true)
      })
    })

    it('should reject invalid event types', () => {
      expect(stripeWebhookEventTypeSchema.safeParse('payment.created').success).toBe(false)
      expect(stripeWebhookEventTypeSchema.safeParse('charge.succeeded').success).toBe(false)
    })
  })

  describe('stripeWebhookMetadataSchema', () => {
    it('should accept valid metadata', () => {
      expect(stripeWebhookMetadataSchema.safeParse({
        type: 'credit_pack',
        creditPack: 'standard',
        userId: 'user-123',
      }).success).toBe(true)
    })

    it('should accept subscription type', () => {
      expect(stripeWebhookMetadataSchema.safeParse({
        type: 'subscription',
        userId: 'user-456',
      }).success).toBe(true)
    })

    it('should allow additional properties', () => {
      expect(stripeWebhookMetadataSchema.safeParse({
        type: 'credit_pack',
        customField: 'custom_value',
      }).success).toBe(true)
    })

    it('should accept all credit pack types', () => {
      const packs = ['mini', 'standard', 'plus', 'mega', 'ultimate']
      packs.forEach(pack => {
        expect(stripeWebhookMetadataSchema.safeParse({
          creditPack: pack,
        }).success).toBe(true)
      })
    })
  })
})

describe('Credit Schema Tests', () => {
  describe('creditTypeSchema', () => {
    it('should accept valid credit types', () => {
      expect(creditTypeSchema.safeParse('reading').success).toBe(true)
      expect(creditTypeSchema.safeParse('compatibility').success).toBe(true)
      expect(creditTypeSchema.safeParse('followUp').success).toBe(true)
    })

    it('should reject invalid credit types', () => {
      expect(creditTypeSchema.safeParse('premium').success).toBe(false)
      expect(creditTypeSchema.safeParse('basic').success).toBe(false)
    })
  })

  describe('featureTypeSchema', () => {
    it('should accept all feature types', () => {
      const features = [
        'advancedAstrology',
        'counselor',
        'dreamAnalysis',
        'compatibility',
        'calendar',
        'pastLife',
        'lifeReading',
      ]
      features.forEach(feature => {
        expect(featureTypeSchema.safeParse(feature).success).toBe(true)
      })
    })

    it('should reject invalid feature types', () => {
      expect(featureTypeSchema.safeParse('basic').success).toBe(false)
      expect(featureTypeSchema.safeParse('tarot').success).toBe(false)
    })
  })

  describe('creditCheckRequestSchema', () => {
    it('should accept empty request', () => {
      expect(creditCheckRequestSchema.safeParse({}).success).toBe(true)
    })

    it('should accept with credit type', () => {
      expect(creditCheckRequestSchema.safeParse({
        type: 'reading',
      }).success).toBe(true)
    })

    it('should accept with amount', () => {
      expect(creditCheckRequestSchema.safeParse({
        amount: 5,
      }).success).toBe(true)
    })

    it('should accept with feature', () => {
      expect(creditCheckRequestSchema.safeParse({
        feature: 'counselor',
      }).success).toBe(true)
    })

    it('should accept combined fields', () => {
      expect(creditCheckRequestSchema.safeParse({
        type: 'reading',
        amount: 10,
        feature: 'dreamAnalysis',
      }).success).toBe(true)
    })

    it('should reject invalid amount', () => {
      expect(creditCheckRequestSchema.safeParse({ amount: 0 }).success).toBe(false)
      expect(creditCheckRequestSchema.safeParse({ amount: 1001 }).success).toBe(false)
    })
  })
})

describe('Admin Schema Tests', () => {
  describe('adminRefundSubscriptionRequestSchema', () => {
    it('should accept subscriptionId', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({
        subscriptionId: 'sub_123456',
      }).success).toBe(true)
    })

    it('should accept email', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({
        email: 'user@example.com',
      }).success).toBe(true)
    })

    it('should accept both subscriptionId and email', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({
        subscriptionId: 'sub_123',
        email: 'user@example.com',
      }).success).toBe(true)
    })

    it('should reject neither subscriptionId nor email', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({}).success).toBe(false)
    })

    it('should trim subscriptionId', () => {
      const result = adminRefundSubscriptionRequestSchema.safeParse({
        subscriptionId: '  sub_123  ',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.subscriptionId).toBe('sub_123')
      }
    })

    it('should accept valid email', () => {
      const result = adminRefundSubscriptionRequestSchema.safeParse({
        email: 'user@example.com',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('user@example.com')
      }
    })

    it('should reject invalid email', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({
        email: 'invalid-email',
      }).success).toBe(false)
    })

    it('should reject too long subscriptionId', () => {
      expect(adminRefundSubscriptionRequestSchema.safeParse({
        subscriptionId: 'a'.repeat(201),
      }).success).toBe(false)
    })
  })
})
