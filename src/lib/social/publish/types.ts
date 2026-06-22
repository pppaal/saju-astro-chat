// src/lib/social/publish/types.ts
//
// 소셜 발행 어댑터 계약 — 플랫폼별 실제 게시. 전부 env 게이트(키 없으면
// isConfigured()=false → 발행 스킵, 수동 게시 폴백). 서버 전용.

import type { SocialPlatform } from '../types'

export interface PublishInput {
  caption: string
  hashtags: string[]
  /** 절대 이미지 URL(Instagram 필수). 카드 이미지에서 만든다. */
  imageUrl?: string
  /** Shorts 대본(YouTube — 자동발행 미지원). */
  script?: string
}

export interface PublishResult {
  ok: boolean
  platform: SocialPlatform
  /** 성공 시 게시물 URL. */
  url?: string
  /** 성공 시 외부 게시물 ID. */
  externalId?: string
  /** 실패 사유(사람이 읽을 수 있게). */
  error?: string
  /** 발행을 건너뛴 이유 — 미설정/미지원. */
  skipped?: 'not_configured' | 'unsupported'
}

export interface PublishAdapter {
  platform: SocialPlatform
  /** 이 플랫폼 자동발행이 켜져 있는지(키 설정 여부). */
  isConfigured(): boolean
  publish(input: PublishInput): Promise<PublishResult>
}

/** 캡션 + 해시태그를 한 덩어리 텍스트로. */
export function composeText(input: PublishInput): string {
  const tags = input.hashtags.length ? `\n\n${input.hashtags.join(' ')}` : ''
  return `${input.caption}${tags}`.trim()
}
