/**
 * Tarot Schemas
 */

import { z } from 'zod'
import { dateSchema, localeSchema, chatMessageSchema } from './common'

// ============ Tarot Card Schemas ============

export const tarotCardSaveSchema = z.object({
  cardId: z.string().max(100),
  name: z.string().min(1).max(120),
  image: z.string().max(500),
  isReversed: z.boolean(),
  position: z.string().min(1).max(100),
})

export const tarotCardInsightSchema = z.object({
  position: z.string().max(100),
  card_name: z.string().max(120),
  is_reversed: z.boolean(),
  interpretation: z.string().max(5000),
})

export const tarotCardSchema = z.object({
  name: z.string().min(1).max(120),
  nameKo: z.string().min(1).max(120).optional(),
  isReversed: z.boolean(),
  position: z.string().min(1).max(80),
  positionKo: z.string().max(80).optional(),
  meaning: z.string().max(500).optional(),
  meaningKo: z.string().max(500).optional(),
  keywords: z.array(z.string()).max(8).optional(),
  keywordsKo: z.array(z.string()).max(8).optional(),
})

export const tarotCardDetailedSchema = z.object({
  name: z.string().min(1).max(120).trim(),
  nameKo: z.string().max(120).trim().optional(),
  isReversed: z.boolean(),
  position: z.string().min(1).max(80).trim(),
  positionKo: z.string().max(80).trim().optional(),
  meaning: z.string().max(120).optional(),
  meaningKo: z.string().max(120).optional(),
  keywords: z.array(z.string().max(50)).max(8).optional(),
  keywordsKo: z.array(z.string().max(50)).max(8).optional(),
})

// ============ Tarot Request Schemas ============

export const tarotSaveRequestSchema = z.object({
  question: z.string().min(1).max(1000).trim(),
  theme: z.string().max(100).trim().optional(),
  spreadId: z.string().min(1).max(100),
  spreadTitle: z.string().min(1).max(200),
  cards: z.array(tarotCardSaveSchema).min(1).max(20),
  overallMessage: z.string().max(5000).optional(),
  cardInsights: z.array(tarotCardInsightSchema).optional(),
  guidance: z.string().max(2000).optional(),
  affirmation: z.string().max(500).optional(),
  source: z.enum(['standalone', 'counselor']).optional(),
  counselorSessionId: z.string().max(100).optional(),
  locale: localeSchema.optional(),
})

export type TarotSaveRequestValidated = z.infer<typeof tarotSaveRequestSchema>

export const tarotQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  offset: z.coerce.number().int().min(0).optional().default(0),
  theme: z.string().max(100).optional(),
})

export type TarotQueryValidated = z.infer<typeof tarotQuerySchema>

export const tarotInterpretRequestSchema = z.object({
  categoryId: z.string().min(1).max(120),
  spreadId: z.string().min(1).max(120),
  spreadTitle: z.string().min(1).max(120),
  cards: z.array(tarotCardSchema).min(1).max(15),
  userQuestion: z.string().max(600).optional(),
  language: z.enum(['ko', 'en']).default('ko'),
  birthdate: dateSchema.optional(),
  moonPhase: z.string().min(2).max(40).optional(),
})

export type TarotInterpretRequest = z.infer<typeof tarotInterpretRequestSchema>

export const tarotInterpretEnhancedRequestSchema = z.object({
  categoryId: z.string().min(1).max(120).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().min(1).max(120).trim(),
  cards: z.array(tarotCardDetailedSchema).min(1).max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  birthdate: dateSchema.optional(),
  moonPhase: z.string().min(2).max(40).trim().optional(),
})

export type TarotInterpretEnhancedRequestValidated = z.infer<
  typeof tarotInterpretEnhancedRequestSchema
>

export const tarotDrawSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(200).trim(),
})

export type TarotDrawValidated = z.infer<typeof tarotDrawSchema>

export const tarotInterpretStreamSchema = z.object({
  categoryId: z.string().min(1).max(200).trim(),
  spreadId: z.string().max(200).trim().optional(),
  spreadTitle: z.string().max(200).trim().optional(),
  cards: z
    .array(
      z.object({
        name: z.string().min(1).max(200),
        nameKo: z.string().max(200).optional(),
        isReversed: z.boolean(),
        position: z.string().min(1).max(200),
        positionKo: z.string().max(200).optional(),
        keywords: z.array(z.string().max(100)).max(20).optional(),
        keywordsKo: z.array(z.string().max(100)).max(20).optional(),
      })
    )
    .min(1)
    .max(15),
  userQuestion: z.string().max(600).trim().optional(),
  language: z.enum(['ko', 'en']).optional(),
  birthdate: z.string().max(12).optional(),
  zodiacSign: z.string().max(50).optional(),
  previousReadings: z.array(z.string().max(200)).max(3).optional(),
  questionMood: z.enum(['worried', 'curious', 'hopeful', 'urgent', 'neutral']).optional(),
})

export type TarotInterpretStreamValidated = z.infer<typeof tarotInterpretStreamSchema>

export const tarotChatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(50),
  context: z.object({
    spread_title: z.string().max(200).trim(),
    category: z.string().max(100).trim(),
    cards: z
      .array(
        z.object({
          position: z.string().max(200).trim(),
          name: z.string().max(200).trim(),
          isReversed: z.boolean().optional(),
          is_reversed: z.boolean().optional(),
          meaning: z.string().max(2000).trim(),
          keywords: z.array(z.string().max(100)).max(20).optional(),
        })
      )
      .max(15),
    overall_message: z.string().max(10000),
    guidance: z.string().max(5000),
  }),
  language: z.enum(['ko', 'en']).optional(),
})

export type TarotChatRequestValidated = z.infer<typeof tarotChatRequestSchema>

export const tarotChatStreamRequestSchema = tarotChatRequestSchema.extend({
  counselor_id: z.string().max(200).trim().optional(),
  counselor_style: z.string().max(200).trim().optional(),
})

export type TarotChatStreamRequestValidated = z.infer<typeof tarotChatStreamRequestSchema>

export const tarotAnalyzeQuestionSchema = z.object({
  question: z.string().min(1, 'Question is required').max(500, 'Question too long (max 500)'),
  language: z.enum(['ko', 'en']).default('ko'),
})

// ============ Couple Tarot Reading Schemas ============

export const coupleTarotReadingPostSchema = z.object({
  connectionId: z.string().min(1).max(200).trim(),
  spreadId: z.string().min(1).max(120).trim(),
  spreadTitle: z.string().max(120).trim().optional(),
  cards: z.array(tarotCardSaveSchema),
  question: z.string().max(600).trim().optional(),
  theme: z.string().max(100).trim().optional(),
  overallMessage: z.string().max(10000).optional(),
  cardInsights: z.array(tarotCardInsightSchema).optional(),
  guidance: z.string().max(5000).optional(),
  affirmation: z.string().max(500).optional(),
})

export type CoupleTarotReadingPostValidated = z.infer<typeof coupleTarotReadingPostSchema>

export const coupleTarotReadingDeleteSchema = z.object({
  readingId: z.string().min(1).max(200).trim(),
})

export type CoupleTarotReadingDeleteValidated = z.infer<typeof coupleTarotReadingDeleteSchema>

export const coupleTarotReadingQuerySchema = z.object({
  connectionId: z.string().min(1).max(200).trim().optional(),
})

export type CoupleTarotReadingQueryValidated = z.infer<typeof coupleTarotReadingQuerySchema>
