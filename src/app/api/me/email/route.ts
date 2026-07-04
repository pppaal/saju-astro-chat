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
import { userEmailUpdateSchema } from '@/lib/api/zodValidation'
import { isAdminEmail } from '@/lib/auth/admin'

export const runtime = 'nodejs'

// PATCH /api/me/email — 사용자가 결제 직전에 이메일 주소 보충.
//
// 배경: 일부 OAuth 가입 (Apple private-relay 옵트아웃, 일부 Google scope
// 누락 케이스 등) 에서 User.email 이 비어 있는 상태로 회원 가입되는 경우가
// 있다. 그 상태에서 /api/checkout 을 부르면 invalid_email 로 reject 되고,
// pricing 페이지는 일반 "결제 서비스 일시 불가" toast 만 띄워 사용자가
// 이유를 알 수 없었다. EmailCollectionModal 이 결제 직전에 이 엔드포인트로
// 보충 → next-auth update() 로 세션 갱신 → 결제 재시도, 라는 흐름을 만들기
// 위한 단일 책임 엔드포인트.
//
// Idempotent: 같은 이메일을 두 번 PATCH 해도 동일한 200 응답. unique 충돌
// (다른 계정이 이 이메일을 이미 점유) 은 409 로 분리해 모달에서 친절한
// 안내를 띄울 수 있게 한다.
export const PATCH = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    const rawBody = await req.json().catch(() => ({}))

    const parsed = userEmailUpdateSchema.safeParse(rawBody)
    if (!parsed.success) {
      logger.warn('[me/email PATCH] validation failed', {
        errors: parsed.error.issues,
      })
      return apiError(ErrorCodes.VALIDATION_ERROR, 'invalid_email')
    }

    const email = parsed.data.email
    const userId = context.userId

    if (!userId) {
      // createAuthenticatedGuard 가 이미 보장하지만, 타입 narrowing 용.
      return apiError(ErrorCodes.UNAUTHORIZED, 'unauthenticated')
    }

    // 🔒 권한 상승 차단: 어드민 판정(isAdminUser)이 세션/DB 이메일이
    // ADMIN_EMAILS allowlist 에 있으면 어드민을 부여하는데, 이 셀프-서비스
    // 엔드포인트는 소유권 검증 없이 이메일을 바꾼다. 아직 미가입한 어드민
    // 이메일을 임의 계정이 설정 → jwt 갱신 → 어드민 획득이 가능했으므로,
    // allowlist 이메일로의 셀프 변경은 거부한다(합법 어드민은 OAuth 로 이메일이
    // 채워지지 이 경로를 타지 않는다 — fail-closed).
    if (isAdminEmail(email)) {
      logger.warn('[me/email PATCH] blocked self-assignment of admin-allowlisted email', { userId })
      return apiError(ErrorCodes.BAD_REQUEST, 'email_in_use')
    }

    try {
      // 같은 이메일이면 no-op (idempotent). 굳이 update 안 쳐서 updatedAt
      // 노이즈 안 만들고, unique 충돌도 회피.
      const current = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      })

      if (current?.email === email) {
        return apiSuccess({ success: true, email })
      }

      await prisma.user.update({
        where: { id: userId },
        data: { email },
      })

      return apiSuccess({ success: true, email })
    } catch (e: unknown) {
      // P2002 = Prisma unique constraint violation. 다른 계정이 이 이메일을
      // 점유 중인 경우 → BAD_REQUEST + 'email_in_use'. ErrorCodes 에 별도의
      // CONFLICT 코드는 없어서 message 로 클라이언트가 분기하도록 한다.
      const err = e as { code?: string; message?: string }
      if (err?.code === 'P2002') {
        logger.warn('[me/email PATCH] email already in use', { userId })
        return apiError(ErrorCodes.BAD_REQUEST, 'email_in_use')
      }
      logger.error('[me/email PATCH] update failed', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'update_failed')
    }
  },
  createAuthenticatedGuard({
    route: '/api/me/email',
    limit: 10,
    windowSeconds: 60,
  })
)
