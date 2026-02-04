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
import {
  personalityCompatibilitySaveRequestSchema,
  personalityCompatibilitySaveGetQuerySchema,
} from '@/lib/api/zodValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// POST: Save compatibility result
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json()

    const validationResult = personalityCompatibilitySaveRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[CompatibilitySave POST] validation failed', {
        errors: validationResult.error.issues,
      })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { person1, person2, compatibility, locale = 'en' } = validationResult.data

    try {
      const compatibilityResult = await prisma.compatibilityResult.create({
        data: {
          userId: context.userId!,
          person1UserId: person1.userId || null,
          person1Name: person1.name || 'Person 1',
          person1ICP: person1.icp as Prisma.InputJsonValue,
          person1Persona: person1.persona,
          person2UserId: person2.userId || null,
          person2Name: person2.name || 'Person 2',
          person2ICP: person2.icp as Prisma.InputJsonValue,
          person2Persona: person2.persona,
          icpCompatibility: {
            score: compatibility.icpScore,
            level: compatibility.icpLevel,
            levelKo: compatibility.icpLevelKo,
            description: compatibility.icpDescription,
            descriptionKo: compatibility.icpDescriptionKo,
          },
          personaCompatibility: {
            score: compatibility.personaScore,
            level: compatibility.personaLevel,
            levelKo: compatibility.personaLevelKo,
            description: compatibility.personaDescription,
            descriptionKo: compatibility.personaDescriptionKo,
            synergies: compatibility.synergies,
            synergiesKo: compatibility.synergiesKo,
            tensions: compatibility.tensions,
            tensionsKo: compatibility.tensionsKo,
          },
          crossSystemScore: compatibility.crossSystemScore,
          crossSystemAnalysis: {
            level: compatibility.crossSystemLevel,
            levelKo: compatibility.crossSystemLevelKo,
            description: compatibility.crossSystemDescription,
            descriptionKo: compatibility.crossSystemDescriptionKo,
            insights: compatibility.insights,
            insightsKo: compatibility.insightsKo,
          },
          person1Answers:
            person1.icpAnswers && person1.personaAnswers
              ? ({
                  icp: person1.icpAnswers,
                  persona: person1.personaAnswers,
                } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          person2Answers:
            person2.icpAnswers && person2.personaAnswers
              ? ({
                  icp: person2.icpAnswers,
                  persona: person2.personaAnswers,
                } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          locale,
        },
      })

      logger.info('Compatibility result saved', {
        userId: context.userId,
        id: compatibilityResult.id,
      })

      return apiSuccess({
        id: compatibilityResult.id,
        createdAt: compatibilityResult.createdAt,
      })
    } catch (err) {
      logger.error('[CompatibilitySave POST] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to save compatibility result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/compatibility/save',
    limit: 30,
    windowSeconds: 60,
  })
)

// GET: Retrieve compatibility result by ID
export const GET = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const { searchParams } = new URL(req.url)
    const queryValidation = personalityCompatibilitySaveGetQuerySchema.safeParse({
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
      const compatibilityResult = await prisma.compatibilityResult.findFirst({
        where: {
          id,
          userId: context.userId!,
        },
      })

      if (!compatibilityResult) {
        return apiError(ErrorCodes.NOT_FOUND, 'Compatibility result not found')
      }

      return apiSuccess({ result: compatibilityResult })
    } catch (err) {
      logger.error('[CompatibilitySave GET] Database error', { error: err })
      return apiError(ErrorCodes.DATABASE_ERROR, 'Failed to retrieve compatibility result')
    }
  },
  createAuthenticatedGuard({
    route: '/api/personality/compatibility/save',
    limit: 60,
    windowSeconds: 60,
  })
)
