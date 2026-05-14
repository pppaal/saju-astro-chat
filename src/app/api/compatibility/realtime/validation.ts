import { z } from 'zod'

export const RELATION_KEYS = [
  'partner',
  'crush',
  'spouse',
  'engaged',
  'ex',
  'friend',
  'family',
  'colleague',
  'business',
  'other',
] as const

const personSchema = z.object({
  name: z.string().min(1, 'name required').max(50),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'birthDate must be YYYY-MM-DD'),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'birthTime must be HH:mm')
    .optional()
    .default('00:00'),
  gender: z.enum(['male', 'female']),
  birthCity: z.string().max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  tzId: z.string().max(64).nullable().optional(),
})

const messageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
})

export const RealtimeChatRequestSchema = z.object({
  personA: personSchema,
  personB: personSchema,
  relation: z.enum(RELATION_KEYS),
  relationNote: z.string().max(200).nullable().optional(),
  /**
   * Full conversation so far. Client owns chat history (server may also
   * persist it for logged-in users — see sessionId). Send a single message
   * with content "__start__" to trigger the AI's auto greeting.
   */
  messages: z.array(messageSchema).min(1).max(40),
  /**
   * When present, the server will append this turn's user message and the
   * AI's reply to the matching CompatibilityChatSession. Ignored for
   * guests. Treat as opaque — obtained from POST /session.
   */
  sessionId: z.string().min(1).max(60).nullable().optional(),
})

export type RealtimeChatRequest = z.infer<typeof RealtimeChatRequestSchema>
