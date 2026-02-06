/**
 * Prisma Query Builders
 * Consolidates duplicate query patterns across 40+ API routes
 *
 * Common patterns consolidated:
 * - User-scoped findMany with pagination
 * - User-scoped findFirst for ownership check
 * - User-scoped delete with ownership verification
 * - Safe query wrapper for optional tables
 */

import { prisma } from './prisma'
import { logger } from '@/lib/logger'

// ============ Types ============

export interface PaginationOptions {
  limit?: number
  offset?: number
  page?: number
}

export interface FindManyOptions<TSelect = Record<string, boolean>> {
  /** User ID for scoping */
  userId: string
  /** Additional where conditions */
  where?: Record<string, unknown>
  /** Fields to select */
  select?: TSelect
  /** Order by field and direction */
  orderBy?: Record<string, 'asc' | 'desc'>
  /** Pagination */
  pagination?: PaginationOptions
  /** Include relations */
  include?: Record<string, boolean | Record<string, unknown>>
}

export interface FindFirstOptions<TSelect = Record<string, boolean>> {
  /** User ID for scoping */
  userId: string
  /** Record ID */
  id: string
  /** Fields to select */
  select?: TSelect
  /** Include relations */
  include?: Record<string, boolean | Record<string, unknown>>
}

export interface DeleteOptions {
  /** User ID for ownership check */
  userId: string
  /** Record ID to delete */
  id: string
}

export interface CreateOptions<TData> {
  /** User ID to associate */
  userId: string
  /** Data to create */
  data: TData
}

export interface UpsertOptions<TData> {
  /** User ID for where clause */
  userId: string
  /** Data to upsert */
  data: TData
  /** Unique field for upsert (default: 'userId') */
  uniqueField?: string
}

// ============ Query Builders ============

/**
 * Creates a type-safe findMany query builder for user-scoped data
 *
 * @example
 * const readings = await createUserFindMany('reading')({
 *   userId: 'user-123',
 *   select: { id: true, title: true, createdAt: true },
 *   orderBy: { createdAt: 'desc' },
 *   pagination: { limit: 10, offset: 0 },
 * })
 */
export function createUserFindMany<T>(modelName: keyof typeof prisma) {
  return async (options: FindManyOptions): Promise<T[]> => {
    const {
      userId,
      where = {},
      select,
      orderBy = { createdAt: 'desc' },
      pagination = {},
      include,
    } = options

    const { limit = 20, offset, page } = pagination

    // Calculate skip from offset or page
    const skip = offset ?? (page ? (page - 1) * limit : 0)

    const model = prisma[modelName] as {
      findMany: (args: Record<string, unknown>) => Promise<T[]>
    }

    return model.findMany({
      where: { userId, ...where },
      ...(select && { select }),
      ...(include && { include }),
      orderBy,
      take: limit,
      ...(skip > 0 && { skip }),
    })
  }
}

/**
 * Creates a type-safe findFirst query for user-scoped single record
 *
 * @example
 * const reading = await createUserFindFirst('reading')({
 *   userId: 'user-123',
 *   id: 'reading-456',
 *   select: { id: true, content: true },
 * })
 */
export function createUserFindFirst<T>(modelName: keyof typeof prisma) {
  return async (options: FindFirstOptions): Promise<T | null> => {
    const { userId, id, select, include } = options

    const model = prisma[modelName] as {
      findFirst: (args: Record<string, unknown>) => Promise<T | null>
    }

    return model.findFirst({
      where: { id, userId },
      ...(select && { select }),
      ...(include && { include }),
    })
  }
}

/**
 * Creates a delete operation with ownership verification
 *
 * @example
 * const result = await createUserDelete('reading')({
 *   userId: 'user-123',
 *   id: 'reading-456',
 * })
 * // Returns: { deleted: true } or { deleted: false, reason: 'not_found' }
 */
export function createUserDelete(modelName: keyof typeof prisma) {
  return async (
    options: DeleteOptions
  ): Promise<{ deleted: true } | { deleted: false; reason: 'not_found' | 'not_owner' }> => {
    const { userId, id } = options

    const model = prisma[modelName] as {
      findFirst: (args: Record<string, unknown>) => Promise<{ id: string; userId: string } | null>
      delete: (args: { where: { id: string } }) => Promise<unknown>
    }

    // Verify ownership
    const existing = await model.findFirst({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return { deleted: false, reason: 'not_found' }
    }

    if (existing.userId !== userId) {
      return { deleted: false, reason: 'not_owner' }
    }

    await model.delete({ where: { id } })
    return { deleted: true }
  }
}

/**
 * Creates a user-scoped create operation
 *
 * @example
 * const reading = await createUserCreate('reading')({
 *   userId: 'user-123',
 *   data: { type: 'tarot', content: '...' },
 * })
 */
export function createUserCreate<TData, TResult>(modelName: keyof typeof prisma) {
  return async (options: CreateOptions<TData>): Promise<TResult> => {
    const { userId, data } = options

    const model = prisma[modelName] as {
      create: (args: { data: Record<string, unknown> }) => Promise<TResult>
    }

    return model.create({
      data: { userId, ...data },
    })
  }
}

/**
 * Creates a user-scoped upsert operation
 *
 * @example
 * const memory = await createUserUpsert('personaMemory')({
 *   userId: 'user-123',
 *   data: { themes: [...], patterns: [...] },
 * })
 */
export function createUserUpsert<TData, TResult>(modelName: keyof typeof prisma) {
  return async (options: UpsertOptions<TData>): Promise<TResult> => {
    const { userId, data, uniqueField = 'userId' } = options

    const model = prisma[modelName] as {
      upsert: (args: {
        where: Record<string, string>
        update: Record<string, unknown>
        create: Record<string, unknown>
      }) => Promise<TResult>
    }

    return model.upsert({
      where: { [uniqueField]: userId },
      update: data as Record<string, unknown>,
      create: { [uniqueField]: userId, ...(data as Record<string, unknown>) },
    })
  }
}

// ============ Safe Query Wrapper ============

/**
 * Wraps a query to handle tables that may not exist
 * Returns empty array on error (useful for optional/new tables)
 *
 * @example
 * const reports = await safeQuery(
 *   prisma.destinyMatrixReport.findMany({ where: { userId } })
 * )
 */
export async function safeQuery<T>(promise: Promise<T[]>): Promise<T[]> {
  try {
    return await promise
  } catch (err) {
    logger.warn('[safeQuery] Query failed (table may not exist):', (err as Error)?.message)
    return []
  }
}

/**
 * Wraps a single-record query to handle tables that may not exist
 */
export async function safeQueryOne<T>(promise: Promise<T | null>): Promise<T | null> {
  try {
    return await promise
  } catch (err) {
    logger.warn('[safeQueryOne] Query failed (table may not exist):', (err as Error)?.message)
    return null
  }
}

// ============ Pagination Helpers ============

/**
 * Calculates skip value from pagination options
 */
export function calculateSkip(pagination: PaginationOptions, defaultLimit = 20): number {
  const { limit = defaultLimit, offset, page } = pagination
  return offset ?? (page ? (page - 1) * limit : 0)
}

/**
 * Builds pagination response
 */
export function buildPaginationResponse<T>(
  items: T[],
  pagination: PaginationOptions,
  totalCount?: number
): {
  items: T[]
  pagination: {
    limit: number
    offset: number
    page: number
    count: number
    total?: number
    hasMore: boolean
  }
} {
  const { limit = 20, offset, page } = pagination
  const skip = calculateSkip(pagination, limit)
  const currentPage = page || Math.floor(skip / limit) + 1

  return {
    items,
    pagination: {
      limit,
      offset: skip,
      page: currentPage,
      count: items.length,
      ...(totalCount !== undefined && { total: totalCount }),
      hasMore: items.length >= limit,
    },
  }
}

// ============ Pre-built Query Functions ============

/**
 * Standard user history queries used across multiple routes
 */
export const userQueries = {
  // Readings
  readings: createUserFindMany<{
    id: string
    type: string
    title: string | null
    createdAt: Date
  }>('reading'),

  // Tarot readings
  tarotReadings: createUserFindMany<{
    id: string
    question: string | null
    theme: string | null
    spreadTitle: string | null
    createdAt: Date
  }>('tarotReading'),

  // Consultations
  consultations: createUserFindMany<{
    id: string
    theme: string | null
    summary: string | null
    createdAt: Date
  }>('consultationHistory'),

  // Daily fortunes
  dailyFortunes: createUserFindMany<{
    id: string
    date: string
    overallScore: number
    createdAt: Date
  }>('dailyFortune'),

  // ICP results
  icpResults: createUserFindMany<{
    id: string
    primaryStyle: string
    secondaryStyle: string | null
    createdAt: Date
  }>('iCPResult'),

  // Compatibility results
  compatibilityResults: createUserFindMany<{
    id: string
    person1Name: string | null
    person2Name: string | null
    crossSystemScore: number
    createdAt: Date
  }>('compatibilityResult'),

  // Calendar dates
  calendarDates: createUserFindMany<{
    id: string
    date: string
    grade: number
    title: string | null
    createdAt: Date
  }>('savedCalendarDate'),
}
