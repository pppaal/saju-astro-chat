// src/lib/social/publish/index.ts
//
// 발행 오케스트레이션 — 초안의 각 플랫폼 variant 를 해당 어댑터로 게시한다.
// 설정된(키 있는) 플랫폼만 발행, 나머지는 스킵. 서버 전용.

import { siteBaseUrl } from '@/lib/tarot/shareLink'
import { updateDraft } from '../draftStore'
import type { SocialPostDraft, SocialPlatform } from '../types'
import type { PublishAdapter, PublishResult } from './types'
import { threadsAdapter } from './threads'
import { instagramAdapter } from './instagram'
import { youtubeAdapter } from './youtube'

const ADAPTERS: Record<SocialPlatform, PublishAdapter> = {
  threads: threadsAdapter,
  instagram: instagramAdapter,
  youtube: youtubeAdapter,
}

/** 자동발행이 설정된 플랫폼 목록(UI 버튼 노출 판단용). */
export function configuredPlatforms(): SocialPlatform[] {
  return (Object.keys(ADAPTERS) as SocialPlatform[]).filter((p) => ADAPTERS[p].isConfigured())
}

/** 카드 이미지(상대경로)를 절대 URL 로 — IG/Threads 이미지 게시용. */
function absoluteImageUrl(cardImage: string): string | undefined {
  if (!cardImage) return undefined
  if (/^https?:\/\//.test(cardImage)) return cardImage
  return `${siteBaseUrl()}${cardImage.startsWith('/') ? '' : '/'}${cardImage}`
}

/**
 * 초안을 발행한다. platforms 미지정 시 설정된 모든 플랫폼.
 * 각 variant 의 caption/hashtags 를 사용하고 결과를 돌려준다.
 */
export async function publishDraft(
  draft: SocialPostDraft,
  platforms?: SocialPlatform[]
): Promise<PublishResult[]> {
  const targets =
    platforms && platforms.length > 0 ? platforms : (Object.keys(ADAPTERS) as SocialPlatform[])
  const imageUrl = absoluteImageUrl(draft.cardImage)

  const results: PublishResult[] = []
  for (const platform of targets) {
    const adapter = ADAPTERS[platform]
    if (!adapter.isConfigured()) {
      results.push({ ok: false, platform, skipped: 'not_configured' })
      continue
    }
    const variant = draft.variants.find((v) => v.platform === platform)
    if (!variant || !variant.caption) {
      results.push({ ok: false, platform, error: 'no caption' })
      continue
    }
    // 이미 이 플랫폼으로 발행된 variant 는 건너뛴다 — 부분 실패(예: IG 성공 +
    // Threads 일시 오류) 후 어드민이 발행을 다시 눌러도 성공분이 중복 포스트
    // 되지 않게. 실패한 플랫폼만 재시도된다(멱등 재시도).
    if (variant.publishedUrl || variant.externalId) {
      results.push({ ok: false, platform, skipped: 'already_published' })
      continue
    }
    results.push(
      await adapter.publish({
        caption: variant.caption,
        hashtags: variant.hashtags,
        imageUrl,
        videoUrl: draft.videoUrl,
        script: variant.script,
      })
    )
  }
  return results
}

/**
 * 완전 자동 발행 모드 — SOCIAL_AUTO_PUBLISH env 로 켠다.
 *   'true' | 'ko,en' : 두 로케일 모두 자동 발행
 *   'ko' 또는 'en'   : 해당 로케일만 (기본 추천: ko)
 *   미설정/그 외      : 꺼짐(어드민 수동 승인 흐름)
 */
export function autoPublishLocales(): Array<'ko' | 'en'> {
  const raw = (process.env.SOCIAL_AUTO_PUBLISH || '').trim().toLowerCase()
  if (!raw) return []
  if (raw === 'true' || raw === '1' || raw === 'all') return ['ko', 'en']
  const locales = raw
    .split(',')
    .map((s) => s.trim())
    .filter((s): s is 'ko' | 'en' => s === 'ko' || s === 'en')
  return [...new Set(locales)]
}

/**
 * 발행 + 결과 기록 원스톱 — variant 에 URL/externalId/에러를 반영해 저장하고,
 * 하나라도 성공하면 상태를 published 로. 어드민 발행 라우트와 자동 발행 크론이
 * 같은 기록 규칙을 쓰도록 여기로 모은다.
 */
export async function publishAndRecord(
  draft: SocialPostDraft,
  platforms?: SocialPlatform[]
): Promise<{ draft: SocialPostDraft | null; results: PublishResult[] }> {
  const results = await publishDraft(draft, platforms)

  const nextVariants = draft.variants.map((v) => {
    const r = results.find((x) => x.platform === v.platform)
    // already_published 스킵은 기존 발행 기록을 절대 건드리지 않는다.
    if (!r || r.skipped === 'not_configured' || r.skipped === 'already_published') return v
    return r.ok
      ? {
          ...v,
          publishedUrl: r.url ?? v.publishedUrl,
          externalId: r.externalId ?? v.externalId,
          publishError: undefined,
        }
      : { ...v, publishError: r.error || r.skipped || 'failed' }
  })

  const anyOk = results.some((r) => r.ok)
  const updated = await updateDraft(draft.date, draft.id, {
    variants: nextVariants,
    ...(anyOk ? { status: 'published' as const } : {}),
  })
  return { draft: updated, results }
}
