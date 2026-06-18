// src/app/api/tarot/share/route.ts
//
// 공개 공유 링크 발급/회수 — 사용자가 자기 저장 리딩을 "공개 링크 만들기"로
// 공유하면 단일 shareToken 을 발급하고, /r/[token] 공개 페이지가 그 토큰으로
// 조회한다. 명시적 opt-in 이며(기본 비공개), 사용자가 revoke 하면 토큰을 비운다.
//
// POST   { readingId } → { shareToken, shareUrl }   (이미 있으면 그대로 반환)
// DELETE { readingId } → { success }                (토큰 제거 = 비공개로 복귀)

import { randomBytes } from 'crypto'
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
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function baseUrl(): string {
  return (process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.me').replace(/\/$/, '')
}

// URL-safe 토큰 — 추측 불가하도록 충분한 엔트로피(96bit). base64url 이라
// 경로에 그대로 쓸 수 있다.
function newShareToken(): string {
  return randomBytes(12).toString('base64url')
}

async function readReadingId(req: NextRequest): Promise<string | null> {
  const body = (await req.json().catch(() => null)) as { readingId?: unknown } | null
  const id = body?.readingId
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : null
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const readingId = await readReadingId(req)
    if (!readingId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'reading_id_required')
    }

    try {
      const reading = await prisma.tarotReading.findFirst({
        where: { id: readingId, userId: context.userId! },
        select: { id: true, shareToken: true },
      })
      if (!reading) {
        return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
      }

      // 이미 공개된 리딩이면 기존 토큰 재사용(매번 새 링크가 생기지 않게).
      const token = reading.shareToken || newShareToken()
      if (!reading.shareToken) {
        await prisma.tarotReading.update({
          where: { id: reading.id },
          data: { shareToken: token, sharedAt: new Date() },
        })
      }

      return apiSuccess({ shareToken: token, shareUrl: `${baseUrl()}/r/${token}` })
    } catch (error) {
      // P2022 — shareToken 컬럼이 prod DB 에 아직 없는 환경(마이그레이션 미적용).
      // 깨끗한 에러로 응답해 UI 가 500 대신 "준비 중" 안내를 띄우게 한다.
      const code = (error as { code?: string } | null)?.code
      if (code === 'P2022') {
        logger.warn('[tarot/share] shareToken column missing — migration pending?')
        return apiError(ErrorCodes.NOT_FOUND, 'share_not_available')
      }
      logger.error('[tarot/share POST] error', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
    }
  },
  createAuthenticatedGuard({ route: '/api/tarot/share', limit: 30, windowSeconds: 60 })
)

export const DELETE = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const readingId = await readReadingId(req)
    if (!readingId) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'reading_id_required')
    }

    try {
      const result = await prisma.tarotReading.updateMany({
        where: { id: readingId, userId: context.userId! },
        data: { shareToken: null, sharedAt: null },
      })
      if (result.count === 0) {
        return apiError(ErrorCodes.NOT_FOUND, 'reading_not_found')
      }
      return apiSuccess({ success: true })
    } catch (error) {
      const code = (error as { code?: string } | null)?.code
      if (code === 'P2022') {
        return apiSuccess({ success: true }) // 컬럼 없음 = 이미 비공개나 다름없음.
      }
      logger.error('[tarot/share DELETE] error', error)
      return apiError(ErrorCodes.DATABASE_ERROR, 'internal_server_error')
    }
  },
  createAuthenticatedGuard({ route: '/api/tarot/share', limit: 30, windowSeconds: 60 })
)
