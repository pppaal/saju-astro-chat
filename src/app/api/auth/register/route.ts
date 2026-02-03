import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'
import { generateReferralCode, linkReferrer } from '@/lib/referral'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { enforceBodySize } from '@/lib/http'
import { sendWelcomeEmail } from '@/lib/email'
import { logger } from '@/lib/logger'
import { sanitizeError } from '@/lib/security/errorSanitizer'
import { csrfGuard } from '@/lib/security/csrf'
import { HTTP_STATUS } from '@/lib/constants/http'
import { userRegistrationRequestSchema } from '@/lib/api/zodValidation'

export async function POST(req: Request) {
  try {
    // CSRF Protection
    const csrfError = csrfGuard(req.headers)
    if (csrfError) {
      logger.warn('[Register] CSRF validation failed')
      return csrfError
    }

    const ip = getClientIp(req.headers as Headers)
    const limit = await rateLimit(`register:${ip}`, { limit: 10, windowSeconds: 300 })
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: HTTP_STATUS.RATE_LIMITED, headers: limit.headers }
      )
    }

    const oversized = enforceBodySize(req, 32 * 1024, limit.headers)
    if (oversized) {
      return oversized
    }

    const rawBody = await req.json()

    // Validate with Zod
    const validationResult = userRegistrationRequestSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Register] validation failed', { errors: validationResult.error.issues })
      return NextResponse.json(
        {
          error: 'validation_failed',
          details: validationResult.error.issues.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: HTTP_STATUS.BAD_REQUEST, headers: limit.headers }
      )
    }

    const { email, password, name, referralCode } = validationResult.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing?.passwordHash) {
      return NextResponse.json(
        { error: 'user_exists' },
        { status: HTTP_STATUS.CONFLICT, headers: limit.headers }
      )
    }

    const hash = await bcrypt.hash(password, 10)
    const newUserReferralCode = generateReferralCode()

    const user = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
        passwordHash: hash,
        referralCode: newUserReferralCode,
      },
      update: { name: name ?? existing?.name, passwordHash: hash },
    })

    // 추천 코드가 있으면 추천인 연결
    if (referralCode && user.id) {
      await linkReferrer(user.id, referralCode)
    }

    // 환영 이메일 발송 (fire and forget)
    sendWelcomeEmail(user.id, email, name || '', 'ko', newUserReferralCode).catch((err) => {
      logger.error('[register] Failed to send welcome email:', err)
    })

    return NextResponse.json({ ok: true }, { headers: limit.headers })
  } catch (err: unknown) {
    logger.error('[register] error', err)
    const sanitized = sanitizeError(err, 'authentication')
    return NextResponse.json(sanitized, { status: HTTP_STATUS.SERVER_ERROR })
  }
}
