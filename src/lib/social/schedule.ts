// src/lib/social/schedule.ts
//
// 자동 발행 스케줄링 — "한 번에 우르르"가 아니라 플랫폼별 하루 N개를 시간
// 분산해 사람처럼 게시한다. 발행 크론(social-publish)이 매 회 플랫폼마다
// 다음 1개를 골라 발행하고, 하루 상한(SOCIAL_*_DAILY_LIMIT)까지만 나간다.
//
// 카테고리 우선순위는 날짜(JDN)로 로테이션 — 매일 같은 카테고리가 먼저
// 나가지 않도록. 서버 전용.

import { computeDayPillarIndices } from '@/lib/saju/dayPillar'
import { getDrafts } from './draftStore'
import {
  SOCIAL_CATEGORIES,
  draftCategory,
  type SocialCategory,
  type SocialPlatform,
  type SocialPostDraft,
} from './types'

/** 자동 발행을 지원하는 플랫폼 — 유튜브는 영상 렌더링이 없어 수동 유지. */
export type AutoPublishPlatform = 'threads' | 'instagram'

// 플랫폼별 하루 상한 env·기본값 — Threads 는 게시물 단위 발견이라 2, IG 는
// 피드 도배가 언팔로 직결이라 1 을 기본으로 보수적으로 잡는다.
const LIMIT_CONFIG: Record<AutoPublishPlatform, { env: string; fallback: number }> = {
  threads: { env: 'SOCIAL_THREADS_DAILY_LIMIT', fallback: 2 },
  instagram: { env: 'SOCIAL_IG_DAILY_LIMIT', fallback: 1 },
}

/** 플랫폼별 하루 자동 발행 상한 (최대 10 — 스팸 방지 캡). */
export function platformDailyLimit(platform: AutoPublishPlatform): number {
  const { env, fallback } = LIMIT_CONFIG[platform]
  const raw = parseInt((process.env[env] || '').trim(), 10)
  if (Number.isFinite(raw) && raw > 0) return Math.min(raw, 10)
  return fallback
}

/** 오늘 이미 해당 플랫폼으로 발행된 초안 수(멱등 카운트 — 발행 기록 기준). */
export function publishedPlatformCount(
  drafts: SocialPostDraft[],
  platform: SocialPlatform
): number {
  let n = 0
  for (const d of drafts) {
    if (d.variants.some((v) => v.platform === platform && (v.publishedUrl || v.externalId))) n += 1
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

/**
 * 해당 플랫폼으로 발행 가능한가 — 반려 아님 + 그 플랫폼 variant 에 캡션 있음 +
 * 그 플랫폼 미발행. status='published' 는 배제하지 않는다: 한 초안이 Threads 로
 * 먼저 나가도 IG variant 는 아직 미발행일 수 있다(플랫폼별 독립 판단).
 */
function isEligibleFor(draft: SocialPostDraft, platform: SocialPlatform): boolean {
  if (draft.status === 'rejected') return false
  const variant = draft.variants.find((v) => v.platform === platform)
  if (!variant || !variant.caption) return false
  if (variant.publishedUrl || variant.externalId) return false
  return true
}

function isPublishedOn(draft: SocialPostDraft, platform: SocialPlatform): boolean {
  return draft.variants.some((v) => v.platform === platform && (v.publishedUrl || v.externalId))
}

/**
 * 날짜별 로케일 우선순위 — JDN(+플랫폼 오프셋) 홀짝으로 교대. IG 처럼 하루
 * 1개인 플랫폼도 날마다 ko/en 을 번갈아 커버하게 된다.
 */
export function localeOrderForDate(
  date: string,
  locales: Array<'ko' | 'en'>,
  platform: AutoPublishPlatform
): Array<'ko' | 'en'> {
  if (locales.length < 2) return locales
  const [y, m, d] = date.split('-').map(Number)
  const { jdn } = computeDayPillarIndices(y, m, d)
  const offset = platform === 'instagram' ? 1 : 0
  return (jdn + offset) % 2 === 0 ? locales : [...locales].reverse()
}

/**
 * 다음에 발행할 초안 1개를 고른다. 정렬 우선순위:
 *   1. 오늘 이 플랫폼으로 아직 안 나간 카테고리 먼저 — 하루 N개가 전부 같은
 *      주제로 나가는 단조로움 방지 (예전엔 1순위 카테고리의 ko·en 이 연달아
 *      나가 "오늘은 별자리만 2개" 가 됐다)
 *   2. 카테고리 로테이션(날짜 기준, IG 는 한 칸 어긋나게 — 같은 날 Threads 와
 *      다른 주제를 커버)
 *   3. 오늘 이 플랫폼으로 아직 안 나간 로케일 먼저 (Threads 2개 = ko+en)
 *   4. 날짜별 로케일 교대 순서
 * 대상이 없으면 null. 하루 상한 체크는 호출부(크론)가 한다.
 */
export async function pickNextPlatformDraft(
  date: string,
  locales: Array<'ko' | 'en'>,
  platform: AutoPublishPlatform
): Promise<SocialPostDraft | null> {
  const drafts = await getDrafts(date)
  const baseOrder = categoryOrderForDate(date)
  const order = platform === 'instagram' ? [...baseOrder.slice(1), baseOrder[0]] : baseOrder
  const rank = (c: SocialCategory) => {
    const i = order.indexOf(c)
    return i < 0 ? 999 : i
  }
  const localeOrder = localeOrderForDate(date, locales, platform)

  // 오늘 이 플랫폼으로 이미 나간 카테고리/로케일 — 뒤로 밀어 다양화.
  const publishedCats = new Set<SocialCategory>()
  const publishedLocales = new Set<'ko' | 'en'>()
  for (const d of drafts) {
    if (!isPublishedOn(d, platform)) continue
    publishedCats.add(draftCategory(d))
    publishedLocales.add(d.locale)
  }

  const eligible = drafts
    .filter((d) => isEligibleFor(d, platform))
    .filter((d) => locales.includes(d.locale))
    .sort((a, b) => {
      const catA = draftCategory(a)
      const catB = draftCategory(b)
      const seenCat = Number(publishedCats.has(catA)) - Number(publishedCats.has(catB))
      if (seenCat !== 0) return seenCat
      const byCat = rank(catA) - rank(catB)
      if (byCat !== 0) return byCat
      const seenLoc =
        Number(publishedLocales.has(a.locale)) - Number(publishedLocales.has(b.locale))
      if (seenLoc !== 0) return seenLoc
      return localeOrder.indexOf(a.locale) - localeOrder.indexOf(b.locale)
    })
  return eligible[0] ?? null
}
