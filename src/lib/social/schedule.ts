// src/lib/social/schedule.ts
//
// Threads 자동 발행 스케줄링 — "한 번에 우르르"가 아니라 하루 N개를 시간
// 분산해 사람처럼 게시한다. 발행 크론(social-publish)이 매 회 다음 1개를
// 골라 발행하고, 하루 상한(SOCIAL_THREADS_DAILY_LIMIT)까지만 나간다.
//
// 카테고리 우선순위는 날짜(JDN)로 로테이션 — 매일 같은 카테고리가 먼저
// 나가지 않도록. 서버 전용.

import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { getDrafts } from './draftStore'
import {
  SOCIAL_CATEGORIES,
  draftCategory,
  type SocialCategory,
  type SocialPostDraft,
} from './types'

/** 하루 Threads 자동 발행 상한 (기본 2). */
export function threadsDailyLimit(): number {
  const raw = parseInt((process.env.SOCIAL_THREADS_DAILY_LIMIT || '').trim(), 10)
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 10)
  return 2
}

/** 오늘 이미 Threads 로 발행된 초안 수(멱등 카운트 — publishedUrl 기준). */
export function publishedThreadsCount(drafts: SocialPostDraft[]): number {
  let n = 0
  for (const d of drafts) {
    if (d.variants.some((v) => v.platform === 'threads' && v.publishedUrl)) n += 1
  }
  return n
}

/** 날짜별 카테고리 우선순위 — JDN 만큼 회전시켜 매일 순서를 바꾼다. */
export function categoryOrderForDate(date: string): SocialCategory[] {
  const [y, m, d] = date.split('-').map(Number)
  const { jdn } = computeDayPillarIndices(y, m, d)
  const shift = jdn % SOCIAL_CATEGORIES.length
  return [...SOCIAL_CATEGORIES.slice(shift), ...SOCIAL_CATEGORIES.slice(0, shift)]
}

/** Threads 미발행 + 발행 대상 상태인가. 자동모드는 pending·approved 둘 다. */
function isEligible(draft: SocialPostDraft): boolean {
  if (draft.status === 'rejected' || draft.status === 'published') return false
  const threads = draft.variants.find((v) => v.platform === 'threads')
  if (!threads || !threads.caption) return false
  if (threads.publishedUrl) return false
  return true
}

/**
 * 다음에 발행할 초안 1개를 고른다 — 카테고리 우선순위(날짜 로테이션) × 로케일
 * 우선순위 순. 대상이 없으면 null. 하루 상한 체크는 호출부(크론)가 한다.
 */
export async function pickNextThreadsDraft(
  date: string,
  locales: Array<'ko' | 'en'>
): Promise<SocialPostDraft | null> {
  const drafts = await getDrafts(date)
  const order = categoryOrderForDate(date)
  const rank = (c: SocialCategory) => {
    const i = order.indexOf(c)
    return i < 0 ? 999 : i
  }
  const eligible = drafts
    .filter(isEligible)
    .filter((d) => locales.includes(d.locale))
    .sort((a, b) => {
      // 1순위: 카테고리 로테이션, 2순위: 로케일 목록 순서.
      const byCat = rank(draftCategory(a)) - rank(draftCategory(b))
      if (byCat !== 0) return byCat
      return locales.indexOf(a.locale) - locales.indexOf(b.locale)
    })
  return eligible[0] ?? null
}
