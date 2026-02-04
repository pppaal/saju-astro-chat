/**
 * Destiny Match (Dating) Schemas
 */

import { z } from 'zod'
import { latitudeSchema, longitudeSchema } from './common'

// ============ Destiny Match Schemas ============

export const destinyMatchSwipeSchema = z.object({
  targetProfileId: z.string().min(1).max(200).trim(),
  action: z.enum(['like', 'pass', 'super_like']),
  compatibilityScore: z.number().min(0).max(100).optional().nullable(),
})

export type DestinyMatchSwipeValidated = z.infer<typeof destinyMatchSwipeSchema>

export const destinyMatchSwipeUndoSchema = z.object({
  swipeId: z.string().min(1).max(200).trim(),
})

export type DestinyMatchSwipeUndoValidated = z.infer<typeof destinyMatchSwipeUndoSchema>

export const destinyMatchBlockSchema = z.object({
  blockedUserId: z.string().min(1).max(200).trim(),
  reason: z.string().max(500).trim().optional(),
})

export type DestinyMatchBlockValidated = z.infer<typeof destinyMatchBlockSchema>

export const destinyMatchProfileSchema = z.object({
  displayName: z.string().min(2).max(64).trim(),
  bio: z.string().max(500).trim().optional().nullable(),
  occupation: z.string().max(100).trim().optional().nullable(),
  photos: z.array(z.string().max(500)).max(10).optional(),
  city: z.string().max(200).trim().optional().nullable(),
  latitude: latitudeSchema.optional().nullable(),
  longitude: longitudeSchema.optional().nullable(),
  interests: z.array(z.string().max(100)).max(30).optional(),
  ageMin: z.number().int().min(18).max(100).optional(),
  ageMax: z.number().int().min(18).max(100).optional(),
  maxDistance: z.number().int().min(1).max(500).optional(),
  genderPreference: z.string().max(20).optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
})

export type DestinyMatchProfileValidated = z.infer<typeof destinyMatchProfileSchema>

export const destinyMatchChatSchema = z.object({
  connectionId: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(2000).trim(),
  messageType: z.enum(['text', 'image', 'emoji']).optional().default('text'),
})

export type DestinyMatchChatValidated = z.infer<typeof destinyMatchChatSchema>

export const destinyMatchReportSchema = z.object({
  reportedUserId: z.string().min(1).max(200).trim(),
  category: z.enum(['inappropriate', 'spam', 'fake', 'harassment', 'other']),
  description: z.string().max(1000).trim().optional(),
})

export type DestinyMatchReportValidated = z.infer<typeof destinyMatchReportSchema>

export const destinyMatchMatchesQuerySchema = z.object({
  status: z.enum(['active', 'blocked', 'all']).optional().default('active'),
  connectionId: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
})

export type DestinyMatchMatchesQueryValidated = z.infer<typeof destinyMatchMatchesQuerySchema>

export const destinyMatchUnmatchSchema = z.object({
  connectionId: z.string().min(1).max(100),
})

export type DestinyMatchUnmatchValidated = z.infer<typeof destinyMatchUnmatchSchema>

export const destinyMatchDiscoverQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  gender: z.enum(['M', 'F', 'all']).optional(),
  ageMin: z.coerce.number().int().min(18).max(100).optional(),
  ageMax: z.coerce.number().int().min(18).max(100).optional(),
  city: z.string().max(100).optional(),
})

export const destinyMatchChatGetQuerySchema = z.object({
  connectionId: z.string().min(1).max(100),
  cursor: z.string().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
})
