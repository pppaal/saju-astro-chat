/**
 * Zod Validation Schemas - Barrel Export
 *
 * All schemas are organized by domain:
 * - common.ts    : Shared primitives (date, time, locale, pagination, helpers)
 *                  + Zod error mapping utilities (createValidationErrorResponse, etc.)
 * - saju.ts      : Saju, Astrology, Destiny Map, Calendar, Compatibility
 * - tarot.ts     : Tarot card and reading schemas
 * - divination.ts: I Ching, Dream, Numerology, Past Life, Life Prediction
 * - payment.ts   : Checkout, Credits, Stripe webhooks
 * - user.ts      : Auth, Profile, Notification, Feedback, Personality
 * - destiny-match.ts: Dating/matching schemas
 *
 * Error Handling Utilities (from common.ts):
 * - formatZodErrors()              : Convert ZodError to ValidationErrorDetail[]
 * - mapZodErrorToCode()            : Map ZodError to appropriate ErrorCode
 * - createValidationErrorResponse(): Create standardized API error response from ZodError
 * - handleZodValidation()          : Helper to process safeParse results
 */

export * from './common'
export * from './saju'
export * from './tarot'
export * from './divination'
export * from './payment'
export * from './user'
export * from './destiny-match'
