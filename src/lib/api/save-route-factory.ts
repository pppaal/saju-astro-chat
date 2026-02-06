/**
 * Save Route Factory
 * Consolidates duplicate save operation patterns across 9+ API routes
 *
 * Each route was implementing:
 * - JSON body parsing
 * - Zod validation
 * - Prisma create/upsert
 * - Success/error responses
 */

import type { ZodSchema } from 'zod'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { parseAndValidate } from './request-parser'

// ============ Types ============

export interface SaveRouteConfig<TInput, TOutput> {
  /** Route name for logging */
  route: string
  /** Zod schema for validation */
  schema: ZodSchema<TInput>
  /** Rate limit configuration */
  rateLimit?: {
    limit: number
    windowSeconds: number
  }
  /** Transform input data before saving */
  transform?: (data: TInput, context: ApiContext) => Partial<TOutput> | Promise<Partial<TOutput>>
  /** Custom save logic (overrides default create) */
  save?: (data: TInput, context: ApiContext) => Promise<TOutput>
}

export interface UpsertRouteConfig<TInput, TOutput> extends SaveRouteConfig<TInput, TOutput> {
  /** Field to use for upsert where clause (default: 'userId') */
  uniqueField?: string
  /** Model name for prisma (e.g., 'tarotReading') */
  modelName: keyof typeof prisma
}

// ============ Factory Functions ============

/**
 * Creates a POST handler for saving data
 *
 * @example
 * export const POST = createSaveRoute({
 *   route: '/api/tarot/save',
 *   schema: tarotSaveSchema,
 *   save: async (data, context) => {
 *     return prisma.tarotReading.create({
 *       data: { userId: context.userId!, ...data }
 *     })
 *   }
 * })
 */
export function createSaveRoute<TInput, TOutput>(
  config: SaveRouteConfig<TInput, TOutput>
) {
  const { route, schema, rateLimit = { limit: 30, windowSeconds: 60 }, save } = config

  if (!save) {
    throw new Error('createSaveRoute requires a save function')
  }

  return withApiMiddleware(
    async (req: NextRequest, context: ApiContext) => {
      const parseResult = await parseAndValidate(req, schema, route)

      if (!parseResult.success) {
        return parseResult.error
      }

      try {
        const result = await save(parseResult.data, context)

        logger.info(`[${route}] Save successful`, {
          userId: context.userId,
        })

        return apiSuccess({ success: true, data: result })
      } catch (error) {
        logger.error(`[${route}] Save failed`, { error, userId: context.userId })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to save data')
      }
    },
    createAuthenticatedGuard({ route, ...rateLimit })
  )
}

/**
 * Creates a POST handler for upsert operations
 * Automatically handles create/update based on existing record
 *
 * @example
 * export const POST = createUpsertRoute({
 *   route: '/api/persona-memory',
 *   schema: personaMemorySchema,
 *   modelName: 'personaMemory',
 *   transform: (data) => ({
 *     themes: data.themes,
 *     patterns: data.patterns,
 *   })
 * })
 */
export function createUpsertRoute<TInput, TOutput>(
  config: UpsertRouteConfig<TInput, TOutput>
) {
  const {
    route,
    schema,
    rateLimit = { limit: 30, windowSeconds: 60 },
    modelName,
    uniqueField = 'userId',
    transform,
  } = config

  return withApiMiddleware(
    async (req: NextRequest, context: ApiContext) => {
      const parseResult = await parseAndValidate(req, schema, route)

      if (!parseResult.success) {
        return parseResult.error
      }

      try {
        const transformedData = transform
          ? await transform(parseResult.data, context)
          : parseResult.data

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = prisma[modelName] as any

        const result = await model.upsert({
          where: { [uniqueField]: context.userId! },
          update: transformedData,
          create: {
            [uniqueField]: context.userId!,
            ...transformedData,
          },
        })

        logger.info(`[${route}] Upsert successful`, {
          userId: context.userId,
          id: result.id,
        })

        return apiSuccess({ success: true, id: result.id, data: result })
      } catch (error) {
        logger.error(`[${route}] Upsert failed`, { error, userId: context.userId })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to save data')
      }
    },
    createAuthenticatedGuard({ route, ...rateLimit })
  )
}

/**
 * Creates a GET handler for fetching user's data
 *
 * @example
 * export const GET = createGetRoute({
 *   route: '/api/tarot/save',
 *   modelName: 'tarotReading',
 *   orderBy: { createdAt: 'desc' },
 *   take: 20,
 * })
 */
export function createGetRoute<TOutput>(config: {
  route: string
  modelName: keyof typeof prisma
  orderBy?: Record<string, 'asc' | 'desc'>
  take?: number
  select?: Record<string, boolean>
  rateLimit?: { limit: number; windowSeconds: number }
}) {
  const {
    route,
    modelName,
    orderBy = { createdAt: 'desc' },
    take,
    select,
    rateLimit = { limit: 60, windowSeconds: 60 },
  } = config

  return withApiMiddleware(
    async (_req: NextRequest, context: ApiContext) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = prisma[modelName] as any

        const result = await model.findMany({
          where: { userId: context.userId! },
          orderBy,
          ...(take && { take }),
          ...(select && { select }),
        })

        return apiSuccess(result)
      } catch (error) {
        logger.error(`[${route}] Get failed`, { error, userId: context.userId })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch data')
      }
    },
    createAuthenticatedGuard({ route, ...rateLimit })
  )
}

/**
 * Creates a DELETE handler for removing user's data
 *
 * @example
 * export const DELETE = createDeleteRoute({
 *   route: '/api/tarot/save',
 *   modelName: 'tarotReading',
 *   idParam: 'id',
 * })
 */
export function createDeleteRoute(config: {
  route: string
  modelName: keyof typeof prisma
  idParam?: string
  rateLimit?: { limit: number; windowSeconds: number }
}) {
  const {
    route,
    modelName,
    idParam = 'id',
    rateLimit = { limit: 30, windowSeconds: 60 },
  } = config

  return withApiMiddleware(
    async (req: NextRequest, context: ApiContext) => {
      const url = new URL(req.url)
      const id = url.searchParams.get(idParam)

      if (!id) {
        return apiError(ErrorCodes.VALIDATION_ERROR, `Missing ${idParam} parameter`)
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const model = prisma[modelName] as any

        // Verify ownership before deleting
        const existing = await model.findFirst({
          where: { id, userId: context.userId! },
        })

        if (!existing) {
          return apiError(ErrorCodes.NOT_FOUND, 'Record not found')
        }

        await model.delete({ where: { id } })

        logger.info(`[${route}] Delete successful`, {
          userId: context.userId,
          id,
        })

        return apiSuccess({ success: true, deleted: id })
      } catch (error) {
        logger.error(`[${route}] Delete failed`, { error, userId: context.userId })
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete data')
      }
    },
    createAuthenticatedGuard({ route, ...rateLimit })
  )
}
