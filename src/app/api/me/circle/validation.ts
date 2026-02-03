// validation.ts
// Zod schemas for /me/circle endpoint

import { z } from 'zod'

/**
 * GET query parameters schema
 */
export const GetCircleSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

/**
 * POST request body schema (add person)
 */
export const PostCircleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long (max 100)'),
  relation: z.string().min(1, 'Relation is required').max(50, 'Relation too long (max 50)'),
  birthDate: z.string().optional().nullable(),
  birthTime: z.string().optional().nullable(),
  gender: z.enum(['male', 'female']).optional().nullable(),
  birthCity: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  tzId: z.string().optional().nullable(),
  note: z.string().max(500, 'Note too long (max 500)').optional().nullable(),
})

/**
 * DELETE query parameters schema
 */
export const DeleteCircleSchema = z.object({
  id: z.string().min(1, 'Person ID is required'),
})

export type GetCircleInput = z.infer<typeof GetCircleSchema>
export type PostCircleInput = z.infer<typeof PostCircleSchema>
export type DeleteCircleInput = z.infer<typeof DeleteCircleSchema>
