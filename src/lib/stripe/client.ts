/**
 * Single Stripe SDK accessor for the whole codebase.
 *
 * The four route files that used to instantiate Stripe each had their
 * own copy of this snippet — three identical, one with a singleton
 * cache, one that threw instead of returning null, and one that
 * silently omitted the apiVersion config. Promote one implementation,
 * cache the instance, and expose two variants for the two call sites
 * that genuinely behave differently:
 *
 *   getStripeOrNull()  — admin/user refund + checkout: missing key
 *                        is a recoverable "feature disabled" state,
 *                        return null and let the caller respond with
 *                        a friendly 503.
 *   getStripeOrThrow() — webhook: missing key means the signature
 *                        check can't run, refuse to start.
 */

import Stripe from 'stripe'

/**
 * API version pinned across the codebase. Bumping it here updates
 * every route at once instead of three places that always have to
 * move together.
 */
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover'

let cachedInstance: Stripe | null = null

function build(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) return null
  if (!cachedInstance) {
    cachedInstance = new Stripe(key, { apiVersion: STRIPE_API_VERSION })
  }
  return cachedInstance
}

/** Returns the cached Stripe client, or null when STRIPE_SECRET_KEY is unset. */
export function getStripeOrNull(): Stripe | null {
  return build()
}

/** Returns the cached Stripe client. Throws when STRIPE_SECRET_KEY is unset. */
export function getStripeOrThrow(): Stripe {
  const stripe = build()
  if (!stripe) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return stripe
}
