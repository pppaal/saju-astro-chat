import { NextRequest } from 'next/server'
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

// GET — 동의 상태 조회. LegalConsentModal 이 마운트 시 호출해서
// 모달을 띄울지 결정한다.
export const GET = withApiMiddleware(
  async (_req: NextRequest, context: ApiContext) => {
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
