/**
 * 블로그 → Threads 자동게시 코어. cron(social-autopost)과 어드민 수동 트리거가
 * 공유한다 — 중복 로직을 한 곳에 모아 한 가지 동작만 보장한다.
 *
 * 옵션:
 *   - dryRun: 게시하지 않고 "올릴 글/문구"만 미리보기 반환 (어드민 미리보기 버튼)
 *   - force:  이미 게시한 글도 후보에 포함 (테스트로 강제 재게시)
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getBlogMetadata } from '@/data/blog/loader'
import { pickLatestUnposted, formatBlogThreadsPost } from '@/lib/social/blogPromo'
import { postToThreads } from '@/lib/social/threads'
import { getThreadsCreds } from '@/lib/social/threadsToken'

const PLATFORM = 'threads'

export interface AutopostOptions {
  dryRun?: boolean
  force?: boolean
}

export type AutopostResult =
  | { posted: false; reason: 'no_base_url' | 'no_new_post' | 'not_configured' }
  | { posted: false; dryRun: true; slug: string; text: string; credsConfigured: boolean }
  | { posted: false; reason: 'create_failed' | 'publish_failed' | 'error'; slug: string }
  | { posted: true; slug: string; externalId: string }

/** 블로그 1편을 골라 Threads 에 게시(또는 미리보기). throw 하지 않는다. */
export async function runBlogThreadsAutopost(
  options: AutopostOptions = {}
): Promise<AutopostResult> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL
  if (!baseUrl) {
    logger.error('[social/autopost] NEXT_PUBLIC_SITE_URL/NEXTAUTH_URL not set')
    return { posted: false, reason: 'no_base_url' }
  }

  const meta = getBlogMetadata()
  const postedSlugs = options.force
    ? new Set<string>()
    : new Set(
        (
          await prisma.socialPostLog.findMany({
            where: { platform: PLATFORM },
            select: { ref: true },
          })
        ).map((r) => r.ref)
      )

  const post = pickLatestUnposted(meta, postedSlugs)
  if (!post) return { posted: false, reason: 'no_new_post' }

  const text = formatBlogThreadsPost(post, { locale: 'ko', baseUrl })
  const creds = await getThreadsCreds()

  if (options.dryRun) {
    return { posted: false, dryRun: true, slug: post.slug, text, credsConfigured: Boolean(creds) }
  }

  if (!creds) return { posted: false, reason: 'not_configured' }

  const result = await postToThreads(text, creds)
  if (!result.ok) {
    logger.warn('[social/autopost] post not published', { slug: post.slug, reason: result.reason })
    return { posted: false, reason: result.reason, slug: post.slug }
  }

  // 중복 방지 기록 — 경합 시 unique 충돌은 무시(이미 기록됨).
  await prisma.socialPostLog
    .create({ data: { platform: PLATFORM, ref: post.slug, externalId: result.id } })
    .catch((err) => logger.warn('[social/autopost] log create skipped', { err }))

  logger.warn('[social/autopost] published', { slug: post.slug, externalId: result.id })
  return { posted: true, slug: post.slug, externalId: result.id }
}
