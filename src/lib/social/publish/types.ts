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

// Threads 게시글 문자 상한(공식 500). 안전 여백으로 480 을 실사용 상한으로.
export const THREADS_MAX_CHARS = 500
const THREADS_SAFE_CHARS = 480

/** 캡션 + 해시태그를 한 덩어리 텍스트로. */
export function composeText(input: PublishInput): string {
  const tags = input.hashtags.length ? `\n\n${input.hashtags.join(' ')}` : ''
  return `${input.caption}${tags}`.trim()
}

/**
 * Threads 상한에 맞춰 안전하게 조립 — 초과 시 (1) 해시태그를 뒤에서 하나씩
 * 버리고 (2) 그래도 넘으면 캡션을 문장/공백 경계에서 자르고 '…' 를 붙인다.
 * 프롬프트가 이미 짧게 쓰도록 지시하지만, LLM 이 길게 뽑는 날의 백스톱.
 */
export function composeTextForThreads(input: PublishInput): {
  text: string
  trimmed: boolean
} {
  const full = composeText(input)
  if ([...full].length <= THREADS_SAFE_CHARS) return { text: full, trimmed: false }

  // 1) 해시태그를 뒤에서부터 줄여가며 상한 이하가 되는 최대 집합을 찾는다.
  const caption = input.caption.trim()
  for (let n = input.hashtags.length; n >= 0; n--) {
    const tags = n > 0 ? `\n\n${input.hashtags.slice(0, n).join(' ')}` : ''
    const candidate = `${caption}${tags}`.trim()
    if ([...candidate].length <= THREADS_SAFE_CHARS) {
      return { text: candidate, trimmed: n < input.hashtags.length }
    }
  }

  // 2) 해시태그를 다 빼도 캡션 자체가 길면 — 경계에서 자르고 말줄임.
  const chars = [...caption]
  const budget = THREADS_SAFE_CHARS - 1 // '…' 자리
  let cut = chars.slice(0, budget).join('')
  const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '), cut.lastIndexOf(' '))
  if (lastBreak > budget * 0.6) cut = cut.slice(0, lastBreak)
  return { text: `${cut.trim()}…`, trimmed: true }
}
