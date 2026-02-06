/**
 * Payment, Credits & Stripe Schemas
 */

import { z } from 'zod'

// ============ Payment & Checkout Schemas ============

export const planKeySchema = z.enum(['starter', 'pro', 'premium'])

export const billingCycleSchema = z.enum(['monthly', 'yearly'])

export const creditPackKeySchema = z.enum(['mini', 'standard', 'plus', 'mega', 'ultimate'])

export const checkoutRequestSchema = z
  .object({
    plan: planKeySchema.optional(),
    billingCycle: billingCycleSchema.optional(),
    creditPack: creditPackKeySchema.optional(),
  })
  .refine(
    (data) => {
      const hasPlan = !!data.plan
      const hasCreditPack = !!data.creditPack
      return (hasPlan && !hasCreditPack) || (!hasPlan && hasCreditPack)
    },
    {
      message: 'Must specify either plan (with optional billingCycle) or creditPack, but not both',
    }
  )
  .refine(
    (data) => {
      if (data.plan && !data.billingCycle) {
        return false
      }
      return true
    },
    {
      message: 'billingCycle is required when plan is specified',
    }
  )

export type CheckoutRequestValidated = z.infer<typeof checkoutRequestSchema>

// ============ Stripe Webhook Schemas ============

// Stripe webhook data.object has varying structure based on event type
// We define common fields and allow additional properties with passthrough()
export const stripeWebhookObjectSchema = z.object({
  id: z.string().optional(),
  object: z.string().optional(),
  customer: z.string().optional(),
  status: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().max(3).optional(),
  metadata: z.record(z.string(), z.string()).optional(),
}).passthrough()

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

// ============ Admin Schemas ============

export const adminRefundSubscriptionRequestSchema = z
  .object({
    subscriptionId: z.string().min(1).max(200).trim().optional(),
    email: z.string().email().max(200).trim().optional(),
  })
  .refine((data) => data.subscriptionId || data.email, {
    message: 'Either subscriptionId or email must be provided',
  })

export type AdminRefundSubscriptionRequestValidated = z.infer<
  typeof adminRefundSubscriptionRequestSchema
>
