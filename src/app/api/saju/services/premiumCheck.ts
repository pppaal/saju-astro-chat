// src/app/api/saju/services/premiumCheck.ts
// Premium status checking via Stripe

import Stripe from 'stripe';
import { rateLimit } from '@/lib/rateLimit';
import { logger } from '@/lib/logger';
import type { PremiumCacheEntry } from '@/types/saju-api';

// Simple in-memory cache to reduce repeated Stripe lookups per runtime
const premiumCache = new Map<string, PremiumCacheEntry>();
const PREMIUM_TTL_MS = 5 * 60 * 1000;
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2025-10-29.clover';

// Email validation regex (RFC 5322 simplified)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

function getCachedPremium(email: string): boolean | null {
  const entry = premiumCache.get(email.toLowerCase());
  if (entry && entry.expires > Date.now()) return entry.value;
  return null;
}

function setCachedPremium(email: string, value: boolean): void {
  premiumCache.set(email.toLowerCase(), { value, expires: Date.now() + PREMIUM_TTL_MS });
}

/**
 * Check premium status via Stripe
 * Includes rate limiting and input validation
 */
export async function checkPremiumStatus(email?: string, ip?: string): Promise<boolean> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !email) return false;

  // Validate email format
  if (!EMAIL_REGEX.test(email) || email.length > 254) return false;

  const cached = getCachedPremium(email);
  if (cached !== null) return cached;

  try {
    const rlKey = `saju-premium:${email.toLowerCase()}:${ip ?? 'unknown'}`;
    const limit = await rateLimit(rlKey, { limit: 5, windowSeconds: 60 });
    if (!limit.allowed) {
      return false;
    }

    const stripe = new Stripe(key, { apiVersion: STRIPE_API_VERSION });

    // Use parameterized API to prevent query injection
    const customers = await stripe.customers.list({
      email: email.toLowerCase(),
      limit: 3,
    });

    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({
        customer: c.id,
        status: 'all',
        limit: 5,
      });
      const active = subs.data.find((s) =>
        ['active', 'trialing', 'past_due'].includes(s.status)
      );
      if (active) {
        setCachedPremium(email, true);
        return true;
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') logger.warn('[Saju API] Premium check failed:', e);
  }
  setCachedPremium(email, false);
  return false;
}
