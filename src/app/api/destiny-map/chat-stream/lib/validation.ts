// validation.ts
// Zod schemas for destiny-map chat-stream endpoint

import { z } from 'zod'
import { LIMITS } from '@/lib/validation'
import { chatMessageSchema } from '@/lib/api/zodValidation'

// Route-specific: this endpoint uses a 2000 char limit for messages
const chatStreamMessageSchema = chatMessageSchema.extend({
  content: z.string().min(1).max(2000),
})

/**
 * Saju data structure schema (flexible object for now)
 */
export const SajuDataStructureSchema = z
  .object({
    dayMaster: z.unknown().optional(),
    unse: z.unknown().optional(),
  })
  .passthrough() // Allow additional properties

/**
 * Astro data structure schema (flexible object for now)
 */
export const AstroDataStructureSchema = z
  .object({
    sun: z.unknown().optional(),
    moon: z.unknown().optional(),
    mercury: z.unknown().optional(),
    venus: z.unknown().optional(),
    mars: z.unknown().optional(),
    jupiter: z.unknown().optional(),
    saturn: z.unknown().optional(),
    ascendant: z.unknown().optional(),
  })
  .passthrough()

const CounselingBriefSchema = z.object({
  user_archetype: z.object({
    id: z.string().min(1).max(32),
    name_ko: z.string().min(1).max(120),
  }),
  axes: z
    .array(
      z.object({
        name: z.enum(['agency', 'warmth', 'boundary', 'resilience']),
        score: z.number().min(0).max(100),
        interpretation: z.string().max(400),
      })
    )
    .max(4),
  hybrid_archetype: z.object({
    id: z.string().min(1).max(32),
    name_ko: z.string().min(1).max(120),
    fallback: z.boolean().optional(),
  }),
  confidence: z.object({
    score: z.number().min(0).max(100),
    level: z.enum(['high', 'medium', 'low']),
  }),
  key_strengths: z.array(z.string().max(200)).max(5),
  key_blindspots: z.array(z.string().max(200)).max(5),
  what_user_wants: z.string().max(500).optional(),
  disclaimer: z.string().max(300),
})

/**
 * Main request body schema for destiny-map chat-stream
 */
export const DestinyMapChatStreamSchema = z.object({
  // Basic user info
  name: z.string().max(LIMITS.NAME).optional(),
  birthDate: z.string().optional(),
  birthTime: z.string().optional(),
  gender: z.enum(['male', 'female']).default('male'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),

  // Theme and language
  theme: z.string().max(LIMITS.THEME).default('chat'),
  lang: z.enum(['ko', 'en']).default('ko'),

  // Chat messages (max 50 messages)
  messages: z.array(chatStreamMessageSchema).max(50).default([]),

  // Pre-computed chart data (optional)
  saju: SajuDataStructureSchema.optional(),
  astro: AstroDataStructureSchema.optional(),
  advancedAstro: z.record(z.string(), z.unknown()).optional(),

  // Prediction and user context
  predictionContext: z.record(z.string(), z.unknown()).optional(),
  userContext: z.record(z.string(), z.unknown()).optional(),
  cvText: z.string().optional(),
  counselingBrief: CounselingBriefSchema.optional(),
})

export type DestinyMapChatStreamInput = z.infer<typeof DestinyMapChatStreamSchema>

/**
 * Validate and parse request body
 */
export function validateDestinyMapRequest(body: unknown) {
  return DestinyMapChatStreamSchema.safeParse(body)
}
