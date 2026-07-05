// src/app/api/cron/social-drafts/route.ts
//
// 매일 "오늘의 카드" 소셜 초안을 미리 생성해 둔다 — 아침에 어드민이 열면
// 검토만 하면 되도록. 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe
// CRON_SECRET. 멱등(ensureDrafts) 이라 같은 날 두 번 돌아도 중복 생성 없음.
//
// Vercel cron: vercel.json — 매일 21:00 UTC (= 한국 아침 06:00 KST, 검토 여유).

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { ensureDrafts } from '@/lib/social/draftStore'
import { generateDailyDrafts, todayKeyKST } from '@/lib/social/generateDrafts'
import { autoPublishLocales, configuredPlatforms, publishAndRecord } from '@/lib/social/publish'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron social-drafts] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:social-drafts:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/social-drafts',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const date = todayKeyKST()
  try {
    const { drafts, created } = await ensureDrafts(date, () => generateDailyDrafts(date))

    // 완전 자동 발행 모드 — SOCIAL_AUTO_PUBLISH 로케일의 "이번에 새로 생성된"
    // pending 초안을 승인 없이 바로 발행한다. 재실행(created=false)이나 이미
    // 발행/반려된 초안은 건드리지 않음(멱등). 실패해도 크론은 성공으로 —
    // 초안은 남아 있으니 어드민이 수동 발행하면 된다.
    let autoPublished = 0
    const locales = autoPublishLocales()
    if (created && locales.length > 0 && configuredPlatforms().length > 0) {
      for (const draft of drafts) {
        if (draft.status !== 'pending') continue
        if (!locales.includes(draft.locale)) continue
        try {
          const { results } = await publishAndRecord(draft)
          if (results.some((r) => r.ok)) autoPublished += 1
        } catch (error) {
          logger.error('[Cron social-drafts] auto-publish failed', { id: draft.id, error })
        }
      }
      logger.info('[Cron social-drafts] auto-published', { date, autoPublished })
    }

    return NextResponse.json({ success: true, date, created, count: drafts.length, autoPublished })
  } catch (error) {
    logger.error('[Cron social-drafts] generation failed', { date, error })
    return NextResponse.json({ success: false, error: 'generation_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
