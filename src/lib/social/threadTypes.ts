// src/lib/social/threadTypes.ts
//
// Threads 데일리 게시물의 공통 타입. 주제(타로/사주/점성)마다 빌더가 다르지만
// cron 은 동일한 ThreadPost 모양만 보고 발행한다.

import type { ThreadSlot } from './tarotThread'

export type ThreadTopic = 'tarot' | 'saju' | 'astro'

export interface ThreadPost {
  topic: ThreadTopic
  slot: ThreadSlot
  locale: 'ko' | 'en'
  /** 로그/응답용 짧은 요약(카드명 · 일진 · 별자리 등). */
  summary: string
  /** Threads 캡션(CTA 포함). 해시태그는 별도. */
  caption: string
  hashtags: string[]
  /** 이미지 게시용 절대 URL(없으면 텍스트 게시). */
  imageUrl?: string
  /** 공유 결과 공개 URL(/r/{token}) — 타로만 보유, 사주/점성은 아직 없음. */
  shareUrl?: string
}

/** KST 기준 연·월·일 — 일진/별자리 경계가 KST 자정이라 공통 헬퍼. */
export function kstYmd(now: Date): { year: number; month: number; day: number } {
  const k = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  return { year: k.getUTCFullYear(), month: k.getUTCMonth() + 1, day: k.getUTCDate() }
}
