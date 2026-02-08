/**
 * Save Route Factory
 * Consolidates duplicate save operation patterns across 9+ API routes
 *
 * Each route was implementing:
 * - JSON body parsing
 * - Zod validation
 * - Prisma create/upsert
 * - Success/error responses
 *
 * 개선사항:
 * - 구체적인 에러 분류 및 메시지
 * - 스택 트레이스 로깅 (프로덕션에서는 숨김)
 * - 에러 유형별 적절한 ErrorCode 매핑
 */

import type { ZodSchema } from 'zod'
import { NextRequest } from 'next/server'
import { getModel, type PrismaModelName } from '@/lib/db/model-accessor'
import { logger } from '@/lib/logger'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
  type ErrorCode,
} from '@/lib/api/middleware'
import { parseAndValidate } from './request-parser'

// ============ Error Classification ============

/**
 * 에러 유형별 분류 및 적절한 ErrorCode 반환
 */
function classifyError(error: unknown): {
  code: ErrorCode
  message: string
  isRetryable: boolean
} {
  // Prisma 에러 분류
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string[] } }

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        return {
          code: ErrorCodes.BAD_REQUEST,
          message: `Duplicate entry: ${prismaError.meta?.target?.join(', ') || 'unique field'}`,
          isRetryable: false,
        }
      case 'P2003': // Foreign key constraint
        return {
          code: ErrorCodes.BAD_REQUEST,
          message: 'Referenced record does not exist',
          isRetryable: false,
        }
      case 'P2025': // Record not found
        return {
          code: ErrorCodes.NOT_FOUND,
          message: 'Record not found',
          isRetryable: false,
        }
      case 'P2024': // Connection pool timeout
        return {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Database temporarily unavailable',
          isRetryable: true,
        }
      default:
        if (prismaError.code.startsWith('P2')) {
          return {
            code: ErrorCodes.DATABASE_ERROR,
            message: 'Database operation failed',
            isRetryable: false,
          }
        }
    }
  }

  // 네트워크/타임아웃 에러
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('timeout') || msg.includes('timed out')) {
      return {
        code: ErrorCodes.TIMEOUT,
        message: 'Operation timed out',
        isRetryable: true,
      }
    }
    if (msg.includes('econnrefused') || msg.includes('network')) {
      return {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: 'Service temporarily unavailable',
        isRetryable: true,
      }
    }
  }

  // 기본 내부 에러
  return {
    code: ErrorCodes.INTERNAL_ERROR,
    message: 'An unexpected error occurred',
    isRetryable: false,
  }
}

/**
 * 에러 로깅 (개발 환경에서는 스택 트레이스 포함)
 */
function logError(
  route: string,
  operation: string,
  error: unknown,
  context: { userId?: string | null }
): void {
  const errorInfo: Record<string, unknown> = {
    userId: context.userId,
    operation,
  }

  if (error instanceof Error) {
    errorInfo.message = error.message
    errorInfo.name = error.name
    // 개발 환경에서만 스택 트레이스 포함
    if (process.env.NODE_ENV === 'development') {
      errorInfo.stack = error.stack
    }
  } else {
    errorInfo.error = String(error)
  }

  logger.error(`[${route}] ${operation} failed`, errorInfo)
}

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
  modelName: PrismaModelName
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
        logError(route, 'Save', error, context)
        const { code, message } = classifyError(error)
        return apiError(code, message)
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

        const model = getModel(modelName)

        const result = await model.upsert({
          where: { [uniqueField]: context.userId! },
          update: transformedData as Record<string, unknown>,
          create: {
            [uniqueField]: context.userId!,
            ...(transformedData as Record<string, unknown>),
          },
        })

        logger.info(`[${route}] Upsert successful`, {
          userId: context.userId,
          id: result.id,
        })

        return apiSuccess({ success: true, id: result.id, data: result })
      } catch (error) {
        logError(route, 'Upsert', error, context)
        const { code, message } = classifyError(error)
        return apiError(code, message)
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
  modelName: PrismaModelName
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
        const model = getModel(modelName)

        const result = await model.findMany({
          where: { userId: context.userId! },
          orderBy,
          ...(take && { take }),
          ...(select && { select }),
        })

        return apiSuccess(result)
      } catch (error) {
        logError(route, 'Get', error, context)
        const { code, message } = classifyError(error)
        return apiError(code, message)
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
  modelName: PrismaModelName
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
        const model = getModel(modelName)

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
        logError(route, 'Delete', error, context)
        const { code, message } = classifyError(error)
        return apiError(code, message)
      }
    },
    createAuthenticatedGuard({ route, ...rateLimit })
  )
}
