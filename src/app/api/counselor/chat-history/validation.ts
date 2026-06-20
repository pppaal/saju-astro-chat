// validation.ts
// Zod schemas for counselor chat-history endpoint

import { z } from 'zod'

/**
 * Chat message schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string(),
})

/**
 * GET query parameters schema
 */
export const GetChatHistorySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(5),
})

/**
 * POST request body schema (add message)
 */
export const PostChatHistorySchema = z
  .object({
    // Client-supplied id is allowed (compat unifies the id with the server's
    // x-session-id so the charge-time safety-net row and the client's content
    // land on the *same* row). Bound the length since clients now create ids.
    sessionId: z.string().max(128).optional(),
    locale: z.enum(['ko', 'en']).default('ko'),
    userMessage: z.string().optional(),
    assistantMessage: z.string().optional(),
    // Service discriminator. Existing destiny clients omit this and the
    // server defaults to 'destiny'. Compat clients send 'compat'.
    type: z.enum(['destiny', 'compat']).optional(),
    // Opt-in: when sessionId is provided but the row doesn't exist yet, create
    // it with that id (upsert) instead of 404. Used by compat, whose session id
    // is minted server-side (x-session-id) and may not have a row yet if the
    // charge-time safety-net hasn't run. Without this flag the route keeps its
    // original "unknown id → 404" guard against arbitrary id injection.
    create: z.boolean().optional(),
    // Type-specific persisted context. Compat sends a couple snapshot
    // (persons + person*Saju + person*Astro) on the *first* save so the
    // past-chat link can restore the chart without re-fetching.
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((data) => data.userMessage || data.assistantMessage, {
    message: 'At least one message (userMessage or assistantMessage) is required',
  })

/**
 * PATCH request body schema (update session metadata)
 */
export const PatchChatHistorySchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  summary: z.string().optional(),
  keyTopics: z.array(z.string()).optional(),
})

export type GetChatHistoryInput = z.infer<typeof GetChatHistorySchema>
export type PostChatHistoryInput = z.infer<typeof PostChatHistorySchema>
export type PatchChatHistoryInput = z.infer<typeof PatchChatHistorySchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>
