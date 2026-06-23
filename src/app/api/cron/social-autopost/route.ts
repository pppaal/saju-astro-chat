/**
 * /api/cron/social-autopost — 새 블로그 글을 Threads 에 자동 홍보.
 *
 * 보안은 다른 cron 과 동일: IP 레이트리밋(5/min) → timing-safe CRON_SECRET.
 *
 * 동작:
 *   1. 블로그 메타데이터 + 이미 게시한 slug(SocialPostLog) 조회
 *   2. pickLatestUnposted — date 내림차순으로 "아직 안 올린 최신 글" 1편
 *   3. 없으면 { posted: false, reason: 'no_new_post' }
 *   4. formatBlogThreadsPost → postToThreads (미설정이면 not_configured, 기록 안 함)
 *   5. 성공 시 SocialPostLog 기록 (platform+ref unique 로 중복 방지)
 *
 * Threads 미설정(THREADS_*) 이면 throw 없이 not_configured 반환 — 글을
 * "올린 것으로 기록하지 않아" 토큰 설정 후 다음 실행에서 게시된다.
 *
 * Vercel cron: vercel.json — 매일 1회 (하루 한 글씩 소진).
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db/prisma'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { getBlogMetadata } from '@/data/blog/loader'
import { pickLatestUnposted, formatBlogThreadsPost } from '@/lib/social/blogPromo'
import { postToThreads } from '@/lib/social/threads'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PLATFORM = 'threads'

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron social-autopost] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:social-autopost:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/social-autopost',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/social-autopost',
      })
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL
    if (!baseUrl) {
      logger.error('[Cron social-autopost] NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL not set')
      return NextResponse.json({ success: false, posted: false, reason: 'no_base_url' })
    }

    const meta = getBlogMetadata()
    const postedRows = await prisma.socialPostLog.findMany({
      where: { platform: PLATFORM },
      select: { ref: true },
    })
    const postedSlugs = new Set(postedRows.map((r) => r.ref))

    const post = pickLatestUnposted(meta, postedSlugs)
    if (!post) {
      return NextResponse.json({ success: true, posted: false, reason: 'no_new_post' })
    }

    const text = formatBlogThreadsPost(post, { locale: 'ko', baseUrl })
    const result = await postToThreads(text)

    if (!result.ok) {
      // 미설정/실패는 기록하지 않는다 → 설정/복구 후 다음 실행에서 재시도.
      logger.warn('[Cron social-autopost] post not published', {
        slug: post.slug,
        reason: result.reason,
      })
      return NextResponse.json({
        success: false,
        posted: false,
        slug: post.slug,
        reason: result.reason,
      })
    }

    // 중복 방지 기록 — 동시 실행 경합 시 unique 충돌은 무시(이미 기록됨).
    await prisma.socialPostLog
      .create({ data: { platform: PLATFORM, ref: post.slug, externalId: result.id } })
      .catch((err) => logger.warn('[Cron social-autopost] log create skipped', { err }))

    logger.warn('[Cron social-autopost] published', { slug: post.slug, externalId: result.id })
    return NextResponse.json({
      success: true,
      posted: true,
      slug: post.slug,
      externalId: result.id,
    })
  } catch (err: unknown) {
    logger.error('[Cron social-autopost error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/social-autopost',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
