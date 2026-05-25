/**
 * Payment, Credits & Stripe Schemas
 */

import { z } from 'zod'

// ============ Payment & Checkout Schemas ============

export const creditPackKeySchema = z.enum(['mini', 'standard', 'plus', 'mega', 'ultimate'])

// 크레딧 전용 — 구독 결제는 폐지됐고 일회성 크레딧팩만 결제한다.
export const checkoutRequestSchema = z.object({
  creditPack: creditPackKeySchema,
})

export type CheckoutRequestValidated = z.infer<typeof checkoutRequestSchema>

// ============ Stripe Webhook Schemas ============

// Stripe webhook data.object has varying structure based on event type
// We define common fields and allow additional properties with passthrough()
export const stripeWebhookObjectSchema = z
  .object({
    id: z.string().optional(),
    object: z.string().optional(),
    customer: z.string().optional(),
    status: z.string().optional(),
    amount: z.number().optional(),
    currency: z.string().max(3).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .passthrough()

export const stripeWebhookEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  data: z.object({
    object: stripeWebhookObjectSchema,
  }),
  created: z.number().positive(),
  livemode: z.boolean(),
})

export type StripeWebhookEventValidated = z.infer<typeof stripeWebhookEventSchema>

export const stripeWebhookEventTypeSchema = z.enum([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
])

export const stripeWebhookMetadataSchema = z
  .object({
    type: z.enum(['credit_pack', 'subscription']).optional(),
    creditPack: z.enum(['mini', 'standard', 'plus', 'mega', 'ultimate']).optional(),
    userId: z.string().max(200).optional(),
  })
  .passthrough()

// ============ Credits Schemas ============

export const creditTypeSchema = z.enum(['reading', 'compatibility', 'followUp'])

export const featureTypeSchema = z.enum([
  'advancedAstrology',
  'counselor',
  'dreamAnalysis',
  'compatibility',
  'calendar',
  'pastLife',
  'lifeReading',
])

export const creditCheckRequestSchema = z.object({
  type: creditTypeSchema.optional(),
  amount: z.number().int().min(1).max(1000).optional(),
  feature: featureTypeSchema.optional(),
})

export type CreditCheckRequestValidated = z.infer<typeof creditCheckRequestSchema>
