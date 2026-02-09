/**
 * Type-safe Prisma Model Accessor
 *
 * Provides a type-safe way to access Prisma models dynamically,
 * avoiding scattered `as any` casts throughout the codebase.
 *
 * This centralizes the type assertion in one place with proper documentation.
 */

import { prisma, Prisma } from './prisma'

/**
 * All available Prisma model names
 * Keep in sync with prisma/schema.prisma
 */
export type PrismaModelName =
  | 'user'
  | 'account'
  | 'session'
  | 'verificationToken'
  | 'reading'
  | 'fortune'
  | 'destinySnapshot'
  | 'dailyFortune'
  | 'userInteraction'
  | 'userPreferences'
  | 'consultationHistory'
  | 'personaMemory'
  | 'subscription'
  | 'premiumContentAccess'
  | 'userCredits'
  | 'counselorChatSession'
  | 'referralReward'
  | 'savedCalendarDate'
  | 'personalityResult'
  | 'iCPResult'
  | 'pastLifeResult'
  | 'compatibilityResult'
  | 'destinyMatrixReport'
  | 'tarotReading'
  | 'pushSubscription'
  | 'matchProfile'
  | 'matchMessage'
  | 'userBlock'
  | 'userReport'
  | 'savedPerson'
  | 'securityAuditLog'

/**
 * Generic Prisma delegate interface for common operations
 *
 * This interface represents the common CRUD operations available on all Prisma models.
 * It's used internally to provide type safety for dynamic model access.
 */
interface PrismaDelegate<T, CreateInput, UpdateInput, WhereUniqueInput, WhereInput> {
  findMany(args?: {
    where?: WhereInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
    orderBy?: Record<string, 'asc' | 'desc'>
    take?: number
    skip?: number
  }): Promise<T[]>

  findFirst(args?: {
    where?: WhereInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T | null>

  findUnique(args: {
    where: WhereUniqueInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T | null>

  create(args: {
    data: CreateInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T>

  createMany(args: { data: CreateInput[] }): Promise<Prisma.BatchPayload>

  update(args: {
    where: WhereUniqueInput
    data: UpdateInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T>

  upsert(args: {
    where: WhereUniqueInput
    create: CreateInput
    update: UpdateInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T>

  delete(args: {
    where: WhereUniqueInput
    select?: Partial<Record<keyof T, boolean>>
    include?: Record<string, boolean | Record<string, unknown>>
  }): Promise<T>

  count(args?: { where?: WhereInput }): Promise<number>
}

/**
 * Generic model delegate type for dynamic access
 * Uses a simplified interface that covers common operations
 */
type GenericModelDelegate = PrismaDelegate<
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>,
  Record<string, unknown>
>

/**
 * Get a Prisma model delegate by name
 *
 * This function provides type-safe dynamic access to Prisma models.
 * The type assertion is intentional and documented here rather than
 * scattered throughout the codebase.
 *
 * @param modelName - The name of the Prisma model (camelCase)
 * @returns The Prisma model delegate with common CRUD operations
 *
 * @example
 * const userModel = getModel('user')
 * const users = await userModel.findMany({ where: { role: 'admin' } })
 *
 * @example
 * const readingModel = getModel('tarotReading')
 * const reading = await readingModel.create({
 *   data: { userId: 'user-123', question: 'What does my future hold?' }
 * })
 */
export function getModel(modelName: PrismaModelName): GenericModelDelegate {
  // This type assertion is intentional and necessary for dynamic model access.
  // Prisma doesn't provide a built-in way to access models dynamically with full type safety.
  // By centralizing this here, we avoid scattered `as any` casts throughout the codebase.
  const model = (prisma as unknown as Record<string, GenericModelDelegate>)[modelName]

  if (!model) {
    throw new Error(`Unknown Prisma model: ${modelName}`)
  }

  return model
}

/**
 * Check if a model name is valid
 */
export function isValidModelName(name: string): name is PrismaModelName {
  return name in prisma && typeof (prisma as unknown as Record<string, unknown>)[name] === 'object'
}

/**
 * User-scoped query helpers
 *
 * These functions provide common patterns for user-scoped data access,
 * reducing boilerplate and ensuring consistent ownership checks.
 */
export const userScopedQueries = {
  /**
   * Find many records for a user with pagination
   */
  async findMany<T = Record<string, unknown>>(
    modelName: PrismaModelName,
    userId: string,
    options: {
      where?: Record<string, unknown>
      select?: Record<string, boolean>
      orderBy?: Record<string, 'asc' | 'desc'>
      take?: number
      skip?: number
    } = {}
  ): Promise<T[]> {
    const model = getModel(modelName)
    return model.findMany({
      where: { userId, ...options.where },
      select: options.select,
      orderBy: options.orderBy ?? { createdAt: 'desc' },
      take: options.take,
      skip: options.skip,
    }) as Promise<T[]>
  },

  /**
   * Find a single record owned by a user
   */
  async findFirst<T = Record<string, unknown>>(
    modelName: PrismaModelName,
    userId: string,
    id: string,
    options: {
      select?: Record<string, boolean>
    } = {}
  ): Promise<T | null> {
    const model = getModel(modelName)
    return model.findFirst({
      where: { id, userId },
      select: options.select,
    }) as Promise<T | null>
  },

  /**
   * Create a record for a user
   */
  async create<T = Record<string, unknown>>(
    modelName: PrismaModelName,
    userId: string,
    data: Record<string, unknown>
  ): Promise<T> {
    const model = getModel(modelName)
    return model.create({
      data: { userId, ...data },
    }) as Promise<T>
  },

  /**
   * Delete a record with ownership verification
   */
  async delete(
    modelName: PrismaModelName,
    userId: string,
    id: string
  ): Promise<{ deleted: true } | { deleted: false; reason: 'not_found' | 'not_owner' }> {
    const model = getModel(modelName)

    const existing = await model.findFirst({
      where: { id },
      select: { id: true, userId: true },
    })

    if (!existing) {
      return { deleted: false, reason: 'not_found' }
    }

    if ((existing as { userId?: string }).userId !== userId) {
      return { deleted: false, reason: 'not_owner' }
    }

    await model.delete({ where: { id } })
    return { deleted: true }
  },

  /**
   * Upsert a record for a user
   */
  async upsert<T = Record<string, unknown>>(
    modelName: PrismaModelName,
    userId: string,
    data: Record<string, unknown>,
    uniqueField: string = 'userId'
  ): Promise<T> {
    const model = getModel(modelName)
    return model.upsert({
      where: { [uniqueField]: userId },
      create: { [uniqueField]: userId, ...data },
      update: data,
    }) as Promise<T>
  },

  /**
   * Count records for a user
   */
  async count(
    modelName: PrismaModelName,
    userId: string,
    where: Record<string, unknown> = {}
  ): Promise<number> {
    const model = getModel(modelName)
    return model.count({
      where: { userId, ...where },
    })
  },
}
