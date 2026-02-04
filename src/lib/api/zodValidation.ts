/**
 * Zod-based API Input Validation
 *
 * This file re-exports all schemas from the zodValidation/ directory.
 * Schemas are organized by domain for maintainability:
 *
 * - common.ts     : Shared primitives (date, time, locale, pagination, helpers)
 * - saju.ts       : Saju, Astrology, Destiny Map, Calendar, Compatibility
 * - tarot.ts      : Tarot card and reading schemas
 * - divination.ts : I Ching, Dream, Numerology, Past Life, Life Prediction
 * - payment.ts    : Checkout, Credits, Stripe webhooks
 * - user.ts       : Auth, Profile, Notification, Feedback, Personality
 * - destiny-match.ts : Dating/matching schemas
 */

export * from './zodValidation/index'
