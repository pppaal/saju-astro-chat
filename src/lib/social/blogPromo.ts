/**
 * 블로그 글 → Threads 홍보문 변환 (순수, 테스트 가능).
 *
 *  - pickLatestUnposted: 전체 블로그 메타데이터에서 date 내림차순으로 정렬해
 *    "아직 안 올린(이미 게시한 slug 집합에 없는) 가장 최신 글" 하나를 고른다.
 *  - formatBlogThreadsPost: 제목 + 요약 + 링크(+해시태그)로 게시문을 만든다.
 *    Threads 500자 상한은 게시 직전 threads.ts 에서 한 번 더 안전 컷.
 *
 * DB 접근 없음 — cron 이 이미 게시한 slug 집합과 블로그 메타데이터를 주입한다.
 */

import { truncateForThreads } from '@/lib/social/threads'

export interface BlogPromoMeta {
  slug: string
  title: string
  titleKo: string
  excerpt: string
  excerptKo: string
  date: string
}

/**
 * date(문자열, ISO 또는 YYYY-MM-DD) 내림차순 정렬 후 아직 안 올린 첫 글.
 * 동일 date 가 많은 생성형 SEO 글들 사이에서도 안정적이도록 slug 를 보조 키로.
 */
export function pickLatestUnposted<T extends { slug: string; date: string }>(
  posts: T[],
  postedSlugs: Set<string>
): T | null {
  const sorted = [...posts].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1
    return a.slug < b.slug ? 1 : -1
  })
  return sorted.find((p) => !postedSlugs.has(p.slug)) ?? null
}

export interface FormatOptions {
  locale?: 'ko' | 'en'
  baseUrl: string
  hashtags?: string[]
}

/** 블로그 글 한 편을 Threads 게시문(평문)으로. */
export function formatBlogThreadsPost(post: BlogPromoMeta, opts: FormatOptions): string {
  const ko = (opts.locale ?? 'ko') === 'ko'
  const title = (ko ? post.titleKo : post.title) || post.title || post.titleKo
  const excerpt = (ko ? post.excerptKo : post.excerpt) || ''
  const url = `${opts.baseUrl.replace(/\/$/, '')}/blog/${post.slug}`
  const tags = (
    opts.hashtags ?? (ko ? ['#사주', '#타로', '#운세'] : ['#saju', '#tarot', '#astrology'])
  )
    .map((t) => (t.startsWith('#') ? t : `#${t}`))
    .join(' ')

  // 링크/해시태그가 잘리지 않도록, 본문(제목+요약)을 먼저 예산 안에서 줄인다.
  const tail = `\n\n${url}\n${tags}`
  const budget = 500 - tail.length
  const head = truncateForThreads(excerpt ? `${title}\n\n${excerpt}` : title, Math.max(40, budget))

  return `${head}${tail}`
}
