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
import { ensureDrafts, updateDraft } from '@/lib/social/draftStore'
import { generateDailyDrafts, todayKeyKST } from '@/lib/social/generateDrafts'
import { isVideoConfigured, renderCardReel } from '@/lib/social/video'
import { siteBaseUrl } from '@/lib/tarot/shareLink'
import type { SocialPostDraft } from '@/lib/social/types'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
// 릴스 렌더(SOCIAL_VIDEO=on 시 카테고리당 ~15-40초)까지 포함 — Vercel Pro 상한.
export const maxDuration = 300

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
    // 생성만 담당 — 실제 발행은 social-publish 크론이 하루 상한 내에서 시간
    // 분산으로 처리한다("한 번에 우르르" 방지). 자동모드면 그 크론이 승인 없이
    // 발행하고, 아니면 어드민이 수동 발행한다.
    const { drafts, created } = await ensureDrafts(date, () => generateDailyDrafts(date))
    const videos = await renderReels(date, drafts)
    return NextResponse.json({ success: true, date, created, count: drafts.length, videos })
  } catch (error) {
    logger.error('[Cron social-drafts] generation failed', { date, error })
    return NextResponse.json({ success: false, error: 'generation_failed' }, { status: 500 })
  }
}

// 초안별 릴스 렌더 — SOCIAL_VIDEO=on 일 때만. 순차 렌더 + 시간 예산(전체
// 220초)으로 maxDuration 안에서 끊고, 남은 건 다음 실행(멱등 — videoUrl 있는
// 초안은 스킵)이 이어서 한다. 렌더 실패는 초안에 영향 없음(이미지 발행 폴백).
async function renderReels(date: string, drafts: SocialPostDraft[]): Promise<number> {
  if (!isVideoConfigured()) return 0
  const budgetMs = 220_000
  const start = Date.now()
  let rendered = 0
  for (const d of drafts) {
    if (d.videoUrl) continue
    const remaining = budgetMs - (Date.now() - start)
    if (remaining < 20_000) break
    const cardUrl = /^https?:\/\//.test(d.cardImage)
      ? d.cardImage
      : `${siteBaseUrl()}${d.cardImage.startsWith('/') ? '' : '/'}${d.cardImage}`
    const url = await renderCardReel({
      cardImageUrl: cardUrl,
      date,
      category: d.category ?? 'tarot',
      locale: d.locale,
      timeoutMs: Math.min(90_000, remaining - 10_000),
    })
    if (url) {
      await updateDraft(date, d.id, { videoUrl: url })
      rendered += 1
    }
  }
  return rendered
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
