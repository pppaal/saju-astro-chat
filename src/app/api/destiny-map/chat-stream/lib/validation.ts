// validation.ts
// Zod schemas for destiny-map chat-stream endpoint

import { z } from 'zod'
import { LIMITS } from '@/lib/validation'

// Allow sets for validation
export const ALLOWED_LANG = new Set(['ko', 'en'])
export const ALLOWED_GENDER = new Set(['male', 'female'])
const ALLOWED_ROLE = new Set(['system', 'user', 'assistant'])

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string().min(1).max(2000),
})

/**
 * Saju data structure schema (flexible object for now)
 */
export const SajuDataStructureSchema = z.object({
  dayMaster: z.any().optional(),
  unse: z.any().optional(),
}).passthrough() // Allow additional properties

/**
 * Astro data structure schema (flexible object for now)
 */
export const AstroDataStructureSchema = z.object({
  sun: z.any().optional(),
  moon: z.any().optional(),
  mercury: z.any().optional(),
  venus: z.any().optional(),
  mars: z.any().optional(),
  jupiter: z.any().optional(),
  saturn: z.any().optional(),
  ascendant: z.any().optional(),
}).passthrough()

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
  messages: z.array(ChatMessageSchema).max(50).default([]),

  // Pre-computed chart data (optional)
  saju: SajuDataStructureSchema.optional(),
  astro: AstroDataStructureSchema.optional(),
  advancedAstro: z.any().optional(), // CombinedResult partial

  // Prediction and user context
  predictionContext: z.any().optional(),
  userContext: z.any().optional(),
  cvText: z.string().optional(),
})

export type DestinyMapChatStreamInput = z.infer<typeof DestinyMapChatStreamSchema>

/**
 * Validate and parse request body
 */
export function validateDestinyMapRequest(body: unknown) {
  return DestinyMapChatStreamSchema.safeParse(body)
}
