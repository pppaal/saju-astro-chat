import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { LEGAL_VERSION } from '@/lib/legal/consentVersion'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// P2022 = column does not exist. legal_consent migration 이 production
// DB 에 아직 적용 안 된 상태(deploy-production workflow 의 migrate job
// 이 P1001 로 실패한 적 있음). 컬럼이 생길 때까지 라우트가 500 으로
// 앱 전체를 막지 않도록 graceful degrade — needsConsent:false 로 모달
// 안 뜨게 하고 사용자 진입은 통과. migration 적용되면 자연 정상화.
function isMissingColumnError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2022'
}

// GET — 동의 상태 조회. LegalConsentModal 이 마운트 시 호출해서
// 모달을 띄울지 결정한다.
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
    try {
      const settings = await prisma.userSettings.findUnique({
        where: { userId: context.userId! },
        select: {
          legalAcceptedAt: true,
          legalAcceptedVersion: true,
          ageConfirmedAt: true,
        },
      })

      const acceptedCurrent = settings?.legalAcceptedVersion === LEGAL_VERSION
      const ageConfirmed = settings?.ageConfirmedAt != null
      const needsConsent = !acceptedCurrent || !ageConfirmed

      return apiSuccess({
        currentVersion: LEGAL_VERSION,
        legalAcceptedVersion: settings?.legalAcceptedVersion ?? null,
        legalAcceptedAt: settings?.legalAcceptedAt ?? null,
        ageConfirmedAt: settings?.ageConfirmedAt ?? null,
        needsConsent,
      })
    } catch (err) {
      if (isMissingColumnError(err)) {
        logger.error(
          '[legal-consent GET] DB schema missing legal_consent columns — migration not applied yet',
          { userId: context.userId }
        )
        return apiSuccess({
          currentVersion: LEGAL_VERSION,
          legalAcceptedVersion: null,
          legalAcceptedAt: null,
          ageConfirmedAt: null,
          needsConsent: false,
        })
      }
      throw err
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/legal-consent',
    limit: 60,
    windowSeconds: 60,
  })
)

// POST — 동의 기록. body: { acceptedTerms: true, acceptedPrivacy: true,
// ageConfirmed: true }. 셋 다 true 가 아니면 400 — 정책 위반 시도.
export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON')
    }
    const { acceptedTerms, acceptedPrivacy, ageConfirmed } = (body ?? {}) as {
      acceptedTerms?: boolean
      acceptedPrivacy?: boolean
      ageConfirmed?: boolean
    }

    if (!acceptedTerms || !acceptedPrivacy || !ageConfirmed) {
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        'All three consents (terms, privacy, age) are required.'
      )
    }

    const now = new Date()
    // UserSettings 행이 아직 없을 수도 있어 upsert 로 처리. referralCode 같은
    // 다른 필드는 건드리지 않는다.
    try {
      await prisma.userSettings.upsert({
        where: { userId: context.userId! },
        create: {
          userId: context.userId!,
          legalAcceptedAt: now,
          legalAcceptedVersion: LEGAL_VERSION,
          ageConfirmedAt: now,
        },
        update: {
          legalAcceptedAt: now,
          legalAcceptedVersion: LEGAL_VERSION,
          ageConfirmedAt: now,
        },
      })
    } catch (err) {
      if (isMissingColumnError(err)) {
        // DB 컬럼 없으면 기록 자체가 불가. 사용자한테 500 띄우면 진입 막힘 →
        // ok:true 로 응답해서 client 의 modal 만 닫음. migration 적용 후
        // 사용자 다음 방문 때 다시 기록 시도.
        logger.error(
          '[legal-consent POST] DB schema missing legal_consent columns — recording skipped',
          { userId: context.userId }
        )
        return apiSuccess({ ok: true, version: LEGAL_VERSION, persisted: false })
      }
      throw err
    }

    logger.info('[legal-consent] recorded', {
      userId: context.userId,
      version: LEGAL_VERSION,
    })

    return apiSuccess({ ok: true, version: LEGAL_VERSION })
  },
  createAuthenticatedGuard({
    route: '/api/me/legal-consent',
    limit: 10,
    windowSeconds: 60,
  })
)
