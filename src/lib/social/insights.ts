// src/lib/social/insights.ts
//
// Threads 게시물 성과 수집 — graph.threads.net insights API 로 views/likes/
// replies/reposts/quotes 를 읽어 초안 variant 에 저장한다. 서버 전용.
//
// 요구 권한: 토큰에 threads_manage_insights 스코프가 있어야 한다. 없으면
// Meta 가 permission 에러를 주는데, 그대로 삼키지 않고 에러 메시지를 올려
// 어드민 UI 가 "권한 추가 필요"를 안내할 수 있게 한다.

import { logger } from '@/lib/logger'
import { getDrafts, saveDrafts } from './draftStore'
import { draftCategory, type SocialPostDraft, type SocialPostMetrics } from './types'

const GRAPH = 'https://graph.threads.net/v1.0'
const METRICS = 'views,likes,replies,reposts,quotes' as const

function token(): string | null {
  const t = (process.env.THREADS_ACCESS_TOKEN || '').trim()
  return t || null
}

/** insights 수집이 가능한 설정인가 (Threads 토큰 존재). */
export function insightsConfigured(): boolean {
  return token() !== null
}

// Threads insights 응답 — metric 별로 values[] 또는 total_value 로 온다.
interface InsightEntry {
  name?: string
  values?: Array<{ value?: number }>
  total_value?: { value?: number }
}

/** 발행 URL(threads.net/t/{id}) 폴백에서 media id 추출 — 구버전 초안용. */
export function mediaIdFromUrl(url: string | undefined): string | null {
  if (!url) return null
  const m = url.match(/\/t\/([A-Za-z0-9_-]+)\/?$/)
  return m ? m[1] : null
}

/** 단일 미디어의 insights 조회. 실패 시 에러 메시지를 문자열로 돌려준다. */
export async function fetchThreadsInsights(
  mediaId: string
): Promise<{ metrics: SocialPostMetrics } | { error: string }> {
  const t = token()
  if (!t) return { error: 'not_configured' }
  try {
    const res = await fetch(
      `${GRAPH}/${encodeURIComponent(mediaId)}/insights?metric=${METRICS}&access_token=${encodeURIComponent(t)}`,
      { cache: 'no-store' }
    )
    const body = (await res.json().catch(() => null)) as {
      data?: InsightEntry[]
      error?: { message?: string; code?: number }
    } | null
    if (!res.ok || !body?.data) {
      const msg = body?.error?.message || `HTTP ${res.status}`
      return { error: msg }
    }
    const read = (name: string): number => {
      const entry = body.data!.find((e) => e.name === name)
      if (!entry) return 0
      const v = entry.total_value?.value ?? entry.values?.[0]?.value
      return typeof v === 'number' ? v : 0
    }
    return {
      metrics: {
        views: read('views'),
        likes: read('likes'),
        replies: read('replies'),
        reposts: read('reposts'),
        quotes: read('quotes'),
        fetchedAt: new Date().toISOString(),
      },
    }
  } catch (error) {
    logger.warn('[social/insights] fetch failed', { mediaId, error })
    return { error: error instanceof Error ? error.message : 'network_error' }
  }
}

/**
 * 한 날짜의 발행된 Threads variant 들의 metrics 를 갱신해 저장한다.
 * 갱신된 초안 배열과 (있다면) 첫 에러 메시지를 돌려준다.
 */
export async function refreshMetricsForDate(
  date: string
): Promise<{ drafts: SocialPostDraft[]; updated: number; firstError: string | null }> {
  const drafts = await getDrafts(date)
  let updated = 0
  let firstError: string | null = null

  for (const draft of drafts) {
    for (const v of draft.variants) {
      if (v.platform !== 'threads') continue
      const mediaId = v.externalId || mediaIdFromUrl(v.publishedUrl)
      if (!mediaId) continue
      const result = await fetchThreadsInsights(mediaId)
      if ('metrics' in result) {
        v.metrics = result.metrics
        updated += 1
      } else if (!firstError && result.error !== 'not_configured') {
        firstError = result.error
      }
    }
  }

  if (updated > 0) await saveDrafts(date, drafts)
  return { drafts, updated, firstError }
}

/** 전체(인덱스된 날짜) 성과 요약 — 저장된 metrics 만 집계, 외부 호출 없음. */
export interface SocialSummary {
  publishedPosts: number
  totalViews: number
  totalLikes: number
  totalReplies: number
  totalReposts: number
  byCategory: Record<string, { posts: number; views: number; likes: number }>
  best: {
    date: string
    category: string
    hook: string
    views: number
    url?: string
  } | null
}

export function summarizeDrafts(
  all: Array<{ date: string; drafts: SocialPostDraft[] }>
): SocialSummary {
  const summary: SocialSummary = {
    publishedPosts: 0,
    totalViews: 0,
    totalLikes: 0,
    totalReplies: 0,
    totalReposts: 0,
    byCategory: {},
    best: null,
  }
  for (const { date, drafts } of all) {
    for (const draft of drafts) {
      for (const v of draft.variants) {
        if (v.platform !== 'threads' || !v.publishedUrl) continue
        summary.publishedPosts += 1
        const cat = draftCategory(draft)
        const bucket = (summary.byCategory[cat] ||= { posts: 0, views: 0, likes: 0 })
        bucket.posts += 1
        if (!v.metrics) continue
        summary.totalViews += v.metrics.views
        summary.totalLikes += v.metrics.likes
        summary.totalReplies += v.metrics.replies
        summary.totalReposts += v.metrics.reposts
        bucket.views += v.metrics.views
        bucket.likes += v.metrics.likes
        if (!summary.best || v.metrics.views > summary.best.views) {
          summary.best = {
            date,
            category: cat,
            hook: draft.hook || draft.cardName,
            views: v.metrics.views,
            url: v.publishedUrl,
          }
        }
      }
    }
  }
  return summary
}
