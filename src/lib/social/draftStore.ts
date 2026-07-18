// src/lib/social/draftStore.ts
//
// 소셜 초안 저장소 — Redis(cacheGet/cacheSet). 하루치 초안을 날짜 키 하나에
// 배열로 담고, 최근 날짜 인덱스를 따로 둬 어드민이 목록을 빠르게 연다.
// 저용량(하루 몇 건)이라 read-modify-write 로 단건 수정해도 충분하다.
//
// 서버 전용.

import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'
import type { SocialPostDraft, SocialDraftStatus } from './types'

// 초안 보존 — 마케팅 데이터라 60일이면 충분(이력은 휘발 허용).
const DRAFT_TTL_SECONDS = 60 * 24 * 60 * 60
// 인덱스는 좀 더 길게 — 목록에서 날짜가 갑자기 사라지지 않게.
const INDEX_TTL_SECONDS = 90 * 24 * 60 * 60
// 인덱스에 보관할 최근 날짜 수.
const MAX_INDEX_DATES = 60

const draftsKey = (date: string) => `social:drafts:${date}`
const INDEX_KEY = 'social:draft-dates'

/** 한 날짜의 초안 배열을 가져온다(없으면 빈 배열). */
export async function getDrafts(date: string): Promise<SocialPostDraft[]> {
  const list = await cacheGet<SocialPostDraft[]>(draftsKey(date))
  return Array.isArray(list) ? list : []
}

/** 한 날짜의 초안 배열을 통째로 저장 + 날짜 인덱스 갱신. */
export async function saveDrafts(date: string, drafts: SocialPostDraft[]): Promise<boolean> {
  const ok = await cacheSet(draftsKey(date), drafts, DRAFT_TTL_SECONDS)
  if (!ok) {
    logger.warn('[social/draftStore] saveDrafts failed', { date })
    return false
  }
  await addDateToIndex(date)
  return true
}

/**
 * 이미 그 날짜 초안이 있으면 건너뛰고(중복 생성 방지) 기존 걸 돌려준다.
 * 없으면 generate() 결과를 저장한다. 크론/수동 둘 다 안전하게 호출 가능.
 */
export async function ensureDrafts(
  date: string,
  generate: () => Promise<SocialPostDraft[]>
): Promise<{ drafts: SocialPostDraft[]; created: boolean }> {
  const existing = await getDrafts(date)
  if (existing.length > 0) return { drafts: existing, created: false }
  const drafts = await generate()
  if (drafts.length > 0) await saveDrafts(date, drafts)
  return { drafts, created: drafts.length > 0 }
}

/**
 * 강제 재생성 — 프롬프트를 고친 뒤 "오늘 초안을 지금 다시" 보고 싶을 때.
 * 이미 *발행된* 초안(status=published 또는 externalId/publishedUrl 있는 variant)
 * 은 보존한다 — 지우면 발행 기록·조회수 수집 키가 사라지고, 자동 발행 크론이
 * 같은 소재를 중복 발행할 수 있다. 나머지(pending/approved/rejected)만 새
 * 생성분으로 교체. 생성 실패(빈 배열)면 기존 초안을 그대로 둔다.
 */
export async function regenerateDrafts(
  date: string,
  generate: () => Promise<SocialPostDraft[]>
): Promise<{ drafts: SocialPostDraft[]; created: boolean }> {
  const existing = await getDrafts(date)
  const fresh = await generate()
  if (fresh.length === 0) return { drafts: existing, created: false }
  const published = existing.filter(
    (d) => d.status === 'published' || d.variants.some((v) => v.externalId || v.publishedUrl)
  )
  const drafts = [...published, ...fresh]
  await saveDrafts(date, drafts)
  return { drafts, created: true }
}

/** 단건 수정 — 텍스트 편집/상태 변경. 없으면 null. */
export async function updateDraft(
  date: string,
  id: string,
  patch: Partial<Pick<SocialPostDraft, 'variants' | 'status' | 'hook' | 'videoUrl'>>
): Promise<SocialPostDraft | null> {
  const drafts = await getDrafts(date)
  const idx = drafts.findIndex((d) => d.id === id)
  if (idx < 0) return null
  const updated: SocialPostDraft = {
    ...drafts[idx],
    ...patch,
    updatedAt: new Date().toISOString(),
  }
  drafts[idx] = updated
  await saveDrafts(date, drafts)
  return updated
}

/** 상태만 바꾸는 헬퍼(승인/반려/발행). */
export async function setDraftStatus(
  date: string,
  id: string,
  status: SocialDraftStatus
): Promise<SocialPostDraft | null> {
  return updateDraft(date, id, { status })
}

/** 최근 날짜 목록(내림차순). 어드민 목록 네비용. */
export async function listDraftDates(): Promise<string[]> {
  const dates = await cacheGet<string[]>(INDEX_KEY)
  return Array.isArray(dates) ? dates : []
}

async function addDateToIndex(date: string): Promise<void> {
  const dates = await listDraftDates()
  if (dates.includes(date)) return
  const next = [date, ...dates].sort((a, b) => (a < b ? 1 : -1)).slice(0, MAX_INDEX_DATES)
  await cacheSet(INDEX_KEY, next, INDEX_TTL_SECONDS)
}
