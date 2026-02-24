// src/app/api/icp/route.ts

import { NextRequest, NextResponse } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  extractLocale,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma, Prisma } from '@/lib/db/prisma'
import { icpSaveSchema, createValidationErrorResponse } from '@/lib/api/zodValidation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const ICP_RESULT_SELECT_FULL = {
  id: true,
  testVersion: true,
  resultId: true,
  primaryStyle: true,
  secondaryStyle: true,
  dominanceScore: true,
  affiliationScore: true,
  confidence: true,
  axes: true,
  completionSeconds: true,
  missingAnswerCount: true,
  octantScores: true,
  analysisData: true,
  answers: true,
  locale: true,
  createdAt: true,
} as const

const ICP_RESULT_SELECT_LEGACY = {
  id: true,
  primaryStyle: true,
  secondaryStyle: true,
  dominanceScore: true,
  affiliationScore: true,
  octantScores: true,
  analysisData: true,
  answers: true,
  locale: true,
  createdAt: true,
} as const

const ICP_OPTIONAL_COLUMNS = [
  'testVersion',
  'resultId',
  'confidence',
  'axes',
  'completionSeconds',
  'missingAnswerCount',
] as const

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

async function findLatestResultWithFallback(userId: string) {
  try {
    return await prisma.iCPResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: ICP_RESULT_SELECT_FULL,
    })
  } catch (error) {
    if (!isMissingColumnError(error)) throw error

    logger.warn('[ICP] Missing column detected on GET, using legacy select', {
      missingColumn: parseMissingColumn(error),
      userId,
    })

    return prisma.iCPResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: ICP_RESULT_SELECT_LEGACY,
    })
  }
}

async function createResultWithFallback(data: Prisma.ICPResultCreateInput) {
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

      logger.warn('[ICP] Missing column detected on POST, retrying without field', {
        missingColumn,
      })

      try {
        return await prisma.iCPResult.create({
          data: retryData as Prisma.ICPResultCreateInput,
          select: ICP_RESULT_SELECT_LEGACY,
        })
      } catch (retryError) {
        currentError = retryError
      }
    }

    throw currentError
  }
}

// GET: saved ICP result
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    const latestResult = await findLatestResultWithFallback(context.userId!)

    if (!latestResult) {
      return NextResponse.json({ saved: false })
    }

    return NextResponse.json({ saved: true, result: normalizeIcpResult(latestResult) })
  },
  createAuthenticatedGuard({
    route: '/api/icp',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST: save ICP result
export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()
    const validationResult = icpSaveSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[ICP] validation failed', { errors: validationResult.error.issues })
      return createValidationErrorResponse(validationResult.error, {
        locale: extractLocale(request),
        route: 'icp',
      })
    }

    const icpData = validationResult.data

    const result = await createResultWithFallback({
      userId: context.userId!,
      testVersion: icpData.testVersion || 'icp_v2',
      resultId: icpData.resultId || null,
      primaryStyle: icpData.primaryStyle,
      secondaryStyle: icpData.secondaryStyle,
      dominanceScore: icpData.dominanceScore,
      affiliationScore: icpData.affiliationScore,
      confidence: icpData.confidence ?? null,
      axes: (icpData.axes || {}) as Prisma.JsonObject,
      completionSeconds: icpData.completionSeconds ?? null,
      missingAnswerCount: icpData.missingAnswerCount ?? 0,
      octantScores: (icpData.octantScores || {}) as Prisma.JsonObject,
      analysisData: (icpData.analysisData || {}) as Prisma.JsonObject,
      answers: (icpData.answers || {}) as Prisma.JsonObject,
      locale: icpData.locale || 'en',
    })

    const normalizedResult = normalizeIcpResult(result)

    return NextResponse.json({
      success: true,
      id: normalizedResult.id,
      testVersion: normalizedResult.testVersion,
      resultId: normalizedResult.resultId,
      primaryStyle: normalizedResult.primaryStyle,
      secondaryStyle: normalizedResult.secondaryStyle,
      dominanceScore: normalizedResult.dominanceScore,
      affiliationScore: normalizedResult.affiliationScore,
      confidence: normalizedResult.confidence,
      message: 'ICP result saved successfully',
    })
  },
  createAuthenticatedGuard({
    route: '/api/icp',
    limit: 30,
    windowSeconds: 60,
  })
)
