// src/lib/social/publish/index.ts
//
// 발행 오케스트레이션 — 초안의 각 플랫폼 variant 를 해당 어댑터로 게시한다.
// 설정된(키 있는) 플랫폼만 발행, 나머지는 스킵. 서버 전용.

import { siteBaseUrl } from '@/lib/tarot/shareLink'
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
    results.push(
      await adapter.publish({
        caption: variant.caption,
        hashtags: variant.hashtags,
        imageUrl,
        script: variant.script,
      })
    )
  }
  return results
}
