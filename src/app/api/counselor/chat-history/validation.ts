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
  theme: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(5),
})

/**
 * POST request body schema (add message)
 */
export const PostChatHistorySchema = z.object({
  sessionId: z.string().optional(),
  theme: z.string().default('chat'),
  locale: z.enum(['ko', 'en']).default('ko'),
  userMessage: z.string().optional(),
  assistantMessage: z.string().optional(),
}).refine(
  (data) => data.userMessage || data.assistantMessage,
  {
    message: 'At least one message (userMessage or assistantMessage) is required',
  }
)

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
