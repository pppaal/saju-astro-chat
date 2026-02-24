import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma, Prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { icpSaveRequestSchema, personalityIcpSaveGetQuerySchema } from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ICP_OPTIONAL_COLUMNS = [
  'testVersion',
  'resultId',
  'confidence',
  'axes',
  'completionSeconds',
  'missingAnswerCount',
] as const

const ICP_RESULT_SELECT_LEGACY = {
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  primaryStyle: true,
  secondaryStyle: true,
  dominanceScore: true,
  affiliationScore: true,
  octantScores: true,
  analysisData: true,
  answers: true,
  locale: true,
} as const

function isMissingColumnError(
  error: unknown
): error is { code: string; message?: string; meta?: unknown } {
  return (
    !!error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: string }).code === 'P2022'
  )
}

function parseMissingColumn(error: unknown): string | null {
  if (!isMissingColumnError(error)) return null

  const metaColumn =
    error.meta && typeof error.meta === 'object' && 'column' in error.meta
      ? (error.meta as { column?: unknown }).column
      : null

  if (typeof metaColumn === 'string' && metaColumn.trim()) {
    const cleaned = metaColumn.trim().replace(/[`"']/g, '')
    const parts = cleaned.split('.')
    return parts[parts.length - 1] || null
  }

  if (typeof error.message === 'string') {
    const match = error.message.match(/column\s+[`"']?([a-zA-Z0-9_]+)[`"']?\s+does not exist/i)
    if (match?.[1]) return match[1]
  }

  return null
}

function readOptionalField<T>(value: unknown, key: string): T | null {
  if (!value || typeof value !== 'object') return null
  if (!(key in value)) return null
  const raw = (value as Record<string, unknown>)[key]
  return raw == null ? null : (raw as T)
}

function normalizeIcpResult<T extends Record<string, unknown>>(
  result: T
): T & {
  testVersion: string | null
  resultId: string | null
  confidence: number | null
  axes: Prisma.JsonValue | null
  completionSeconds: number | null
  missingAnswerCount: number | null
} {
  return {
    ...result,
    testVersion: readOptionalField<string>(result, 'testVersion'),
    resultId: readOptionalField<string>(result, 'resultId'),
    confidence: readOptionalField<number>(result, 'confidence'),
    axes: readOptionalField<Prisma.JsonValue>(result, 'axes'),
    completionSeconds: readOptionalField<number>(result, 'completionSeconds'),
    missingAnswerCount: readOptionalField<number>(result, 'missingAnswerCount'),
  }
}

async function createIcpResultWithFallback(data: Prisma.ICPResultCreateInput) {
  try {
    return await prisma.iCPResult.create({ data })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    const retryData: Record<string, unknown> = { ...data }
    const droppedColumns = new Set<string>()
    let currentError: unknown = error

    while (isMissingColumnError(currentError)) {
      const missingColumn = parseMissingColumn(currentError)
      if (!missingColumn) throw currentError
      if (!ICP_OPTIONAL_COLUMNS.includes(missingColumn as (typeof ICP_OPTIONAL_COLUMNS)[number])) {
        throw currentError
      }
      if (!(missingColumn in retryData) || droppedColumns.has(missingColumn)) {
        throw currentError
      }

      delete retryData[missingColumn]
      droppedColumns.add(missingColumn)

      logger.warn('[ICP save POST] Missing column detected, retrying without field', {
        missingColumn,
      })

      try {
        return await prisma.iCPResult.create({
          data: retryData as Prisma.ICPResultCreateInput,
          select: {
            id: true,
            createdAt: true,
          },
        })
      } catch (retryError) {
        currentError = retryError
      }
    }

    throw currentError
  }
}

async function findIcpResultWithFallback(id: string, userId: string) {
  try {
    return await prisma.iCPResult.findFirst({
      where: {
        id,
        userId,
      },
    })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    logger.warn('[ICP save GET] Missing column detected, using legacy select', {
      missingColumn: parseMissingColumn(error),
      id,
      userId,
    })

    return prisma.iCPResult.findFirst({
      where: {
        id,
        userId,
      },
      select: ICP_RESULT_SELECT_LEGACY,
    })
  }
}

// POST: Save ICP result
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    const validationResult = icpSaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ICP save POST] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const {
      primaryStyle,
      secondaryStyle,
      dominanceScore,
      affiliationScore,
      octantScores,
      analysisData,
      answers,
      testVersion,
      resultId,
      confidence,
      axes,
      completionSeconds,
      missingAnswerCount,
      locale = 'en',
    } = validationResult.data

    try {
      const icpResult = await createIcpResultWithFallback({
        userId: context.userId!,
        testVersion: testVersion || 'icp_v2',
        resultId: resultId || null,
        primaryStyle,
        secondaryStyle,
        dominanceScore,
        affiliationScore,
        confidence: confidence ?? null,
        axes: axes ? (axes as Prisma.InputJsonValue) : Prisma.JsonNull,
        completionSeconds: completionSeconds ?? null,
        missingAnswerCount: missingAnswerCount ?? 0,
        octantScores: octantScores as Prisma.InputJsonValue,
        analysisData,
        answers: answers ? (answers as Prisma.InputJsonValue) : Prisma.JsonNull,
        locale,
      })

      logger.info('ICP result saved', { userId: context.userId, id: icpResult.id })

      return apiSuccess({
        id: icpResult.id,
        createdAt: icpResult.createdAt,
      })
    } catch (err) {
      logger.error('[ICP save POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save ICP result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/icp/save',
    limit: 20,
    windowSeconds: 60,
  })
)

// GET: Retrieve ICP result by ID
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = personalityIcpSaveGetQuerySchema.safeParse({
      id: searchParams.get('id') || undefined,
    })

    if (!queryValidation.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing or invalid id parameter')
    }

    const { id } = queryValidation.data

    if (!id) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Missing id parameter')
    }

    try {
      const icpResult = await findIcpResultWithFallback(id, context.userId!)

      if (!icpResult) {
        return apiError(ErrorCodes.NOT_FOUND, 'ICP result not found')
      }

      return apiSuccess({ result: normalizeIcpResult(icpResult) })
    } catch (err) {
      logger.error('[ICP save GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve ICP result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/icp/save',
    limit: 60,
    windowSeconds: 60,
  })
)
