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
  skipped?: 'not_configured' | 'unsupported' | 'already_published'
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
// 쓰레드는 해시태그 도배가 스팸처럼 보인다(인스타 문법). 태그는 최대 1개만
// 남긴다 — 인스타는 composeText 로 5~8개 그대로 유지되므로 영향 없음.
const THREADS_MAX_HASHTAGS = 1

/** 캡션 + 해시태그를 한 덩어리 텍스트로. (Instagram 용 — 태그 그대로 유지) */
export function composeText(input: PublishInput): string {
  const tags = input.hashtags.length ? `\n\n${input.hashtags.join(' ')}` : ''
  return `${input.caption}${tags}`.trim()
}

// 쓰레드 본문에 남은 URL 을 제거한다(백스톱). 본문에 외부 링크가 있으면 도달이
// 눌리므로 프롬프트에서 이미 금지하지만, 모델이 넣는 날을 대비해 출력단에서
// 지운다. 앞에 붙은 유도 화살표/이모지(👉 ➡️ 🔗)와 "링크:/link:" 라벨까지 정리.
function stripUrls(text: string): string {
  return text
    .replace(/\s*(?:👉|➡️|▶️|🔗|link:|링크:)?\s*https?:\/\/\S+/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Threads 안전 조립 — 쓰레드 규범에 맞춰 (0) 본문 URL 제거 + 해시태그 1개 제한,
 * 그다음 500자 상한에 맞춰 (1) 해시태그를 버리고 (2) 캡션을 문장/공백 경계에서
 * 자르고 '…' 를 붙인다. 프롬프트가 이미 짧게·링크 없이 쓰도록 지시하지만 백스톱.
 */
export function composeTextForThreads(input: PublishInput): {
  text: string
  trimmed: boolean
} {
  // 쓰레드 정규화: 본문 URL 제거 + 해시태그 1개로 제한.
  const caption = stripUrls(input.caption.trim())
  const hashtags = input.hashtags.slice(0, THREADS_MAX_HASHTAGS)
  const sanitized = caption !== input.caption.trim() || hashtags.length < input.hashtags.length

  const compose = (tags: string[]): string => {
    const t = tags.length ? `\n\n${tags.join(' ')}` : ''
    return `${caption}${t}`.trim()
  }

  const full = compose(hashtags)
  if ([...full].length <= THREADS_SAFE_CHARS) return { text: full, trimmed: sanitized }

  // 1) 해시태그를 뒤에서부터 줄여가며 상한 이하가 되는 최대 집합을 찾는다.
  for (let n = hashtags.length; n >= 0; n--) {
    const candidate = compose(hashtags.slice(0, n))
    if ([...candidate].length <= THREADS_SAFE_CHARS) return { text: candidate, trimmed: true }
  }

  // 2) 해시태그를 다 빼도 캡션 자체가 길면 — 경계에서 자르고 말줄임.
  const chars = [...caption]
  const budget = THREADS_SAFE_CHARS - 1 // '…' 자리
  let cut = chars.slice(0, budget).join('')
  const lastBreak = Math.max(cut.lastIndexOf('\n'), cut.lastIndexOf('. '), cut.lastIndexOf(' '))
  if (lastBreak > budget * 0.6) cut = cut.slice(0, lastBreak)
  return { text: `${cut.trim()}…`, trimmed: true }
}
