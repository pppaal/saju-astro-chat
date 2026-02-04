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
import { sendNotification } from '@/lib/notifications/sse'
import { getNowInTimezone, formatDateString } from '@/lib/datetime'
import { getDailyFortuneScore } from '@/lib/destiny-map/destinyCalendar'
import { logger } from '@/lib/logger'
import { cacheOrCalculate, CacheKeys, CACHE_TTL } from '@/lib/cache/redis-cache'
import { dailyFortuneSchema } from '@/lib/api/zodValidation'

export const dynamic = 'force-dynamic'

interface FortuneData {
  love: number
  career: number
  wealth: number
  health: number
  overall: number
  luckyColor: string
  luckyNumber: number
  date: string
  userTimezone?: string
  alerts?: { type: 'warning' | 'positive' | 'info'; msg: string; icon?: string }[]
  source?: string
}

export const POST = withApiMiddleware(
  async (request: NextRequest, context: ApiContext) => {
    const rawBody = await request.json()

    const validationResult = dailyFortuneSchema.safeParse(rawBody)
    if (!validationResult.success) {
      logger.warn('[Daily fortune] validation failed', { errors: validationResult.error.issues })
      return apiError(
        ErrorCodes.VALIDATION_ERROR,
        `Validation failed: ${validationResult.error.issues.map((e) => e.message).join(', ')}`
      )
    }

    const { birthDate, birthTime, sendEmail, userTimezone } = validationResult.data

    try {
      const userNow = getNowInTimezone(userTimezone)
      const targetDate = new Date(userNow.year, userNow.month - 1, userNow.day)

      const dateKey = formatDateString(userNow.year, userNow.month, userNow.day)
      const cacheKey = CacheKeys.grading(dateKey, `${birthDate}:${birthTime || '12:00'}`)

      const fortuneResult = await cacheOrCalculate(
        cacheKey,
        async () => getDailyFortuneScore(birthDate, birthTime, targetDate),
        CACHE_TTL.GRADING_RESULT
      )

      const fortune: FortuneData = {
        love: fortuneResult.love,
        career: fortuneResult.career,
        wealth: fortuneResult.wealth,
        health: fortuneResult.health,
        overall: fortuneResult.overall,
        luckyColor: fortuneResult.luckyColor,
        luckyNumber: fortuneResult.luckyNumber,
        date: dateKey,
        userTimezone: userTimezone || 'Asia/Seoul',
        alerts: fortuneResult.alerts || [],
        source: 'destinyCalendar',
      }

      if (context.userId) {
        await prisma.dailyFortune
          .create({
            data: {
              userId: context.userId,
              date: fortune.date,
              loveScore: fortune.love,
              careerScore: fortune.career,
              wealthScore: fortune.wealth,
              healthScore: fortune.health,
              overallScore: fortune.overall,
              luckyColor: fortune.luckyColor,
              luckyNumber: fortune.luckyNumber,
            },
          })
          .catch((err: unknown) => {
            const prismaError = err as { code?: string }
            if (prismaError?.code !== 'P2002') {
              logger.error('[Daily Fortune] Failed to save fortune to DB:', err)
            }
          })
      }

      const userEmail = context.session?.user?.email
      if (userEmail) {
        sendNotification(userEmail, {
          type: 'system',
          title: "Today's Fortune Ready!",
          message: `Overall: ${fortune.overall} | Love: ${fortune.love} | Career: ${fortune.career} | Wealth: ${fortune.wealth}`,
          link: '/myjourney',
        }).catch((err: unknown) => {
          logger.warn('[Daily Fortune] Failed to send notification:', err)
        })
      }

      let emailSent = false
      if (sendEmail && userEmail) {
        try {
          await sendFortuneEmail(userEmail, fortune)
          emailSent = true
        } catch (emailErr) {
          logger.error('[Daily Fortune] Failed to send email:', emailErr)
        }
      }

      return apiSuccess({
        fortune,
        message: sendEmail
          ? emailSent
            ? 'Fortune sent to your email!'
            : 'Fortune calculated! (Email delivery failed)'
          : 'Fortune calculated!',
      })
    } catch (err) {
      logger.error('[Daily Fortune Error]:', err)
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Internal Server Error')
    }
  },
  createAuthenticatedGuard({
    route: '/api/daily-fortune',
    limit: 20,
    windowSeconds: 60,
  })
)

async function sendFortuneEmail(email: string, fortune: FortuneData) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: "DestinyPal | Today's Fortune",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 8px;">
            <h1 style="color: #6c5ce7; margin-bottom: 4px;">Today's Fortune</h1>
            <p style="margin-top: 0; color: #444;">${fortune.date}</p>
            <div style="background: #f5f5f8; padding: 16px; border-radius: 12px; margin: 16px 0;">
              <h2 style="color: #1e293b; margin: 0 0 8px;">Overall: ${fortune.overall}/100</h2>
              <p style="margin: 4px 0;">Love: ${fortune.love}/100</p>
              <p style="margin: 4px 0;">Career: ${fortune.career}/100</p>
              <p style="margin: 4px 0;">Wealth: ${fortune.wealth}/100</p>
              <p style="margin: 4px 0;">Health: ${fortune.health}/100</p>
            </div>
            <div style="background: linear-gradient(135deg, #4f46e5, #8b5cf6); color: #fff; padding: 16px; border-radius: 12px;">
              <p style="margin: 0;">Lucky Color: <strong>${fortune.luckyColor}</strong></p>
              <p style="margin: 4px 0 0;">Lucky Number: <strong>${fortune.luckyNumber}</strong></p>
            </div>
            <p style="margin-top: 20px; color: #475569;">Have a great day with DestinyPal.</p>
          </div>
        `,
      }),
    })

    if (!response.ok) {
      throw new Error('Email send failed')
    }

    logger.info('[Daily Fortune] Email sent to:', email)
  } catch (error) {
    logger.warn('[Daily Fortune] Email send failed:', error)
  }
}
