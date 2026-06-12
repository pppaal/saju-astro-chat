/**
 * public/data/blog/index.json 생성용 순수 변환기.
 *
 * 블로그 목록 페이지(BlogClient → blogPostLoader.getBlogPostsIndex)는 번들
 * 크기를 줄이려고 content 없는 메타데이터 인덱스를 fetch 한다. 이 함수가
 * 전체 BlogPost 집합(마크다운 + 생성 포스트)에서 메타데이터만 추려낸다.
 * 스크립트(scripts/blog/generate-index.ts)와 테스트가 공유하도록 분리.
 */
import type { BlogPost } from '../blog-posts-sync'
import { isBlockedBlogPost } from './publicFilters'

export interface BlogIndexEntry {
  slug: string
  title: string
  titleKo: string
  excerpt: string
  excerptKo: string
  category: string
  categoryKo: string
  icon: string
  date: string
  readTime: number
  featured?: boolean
}

export function buildBlogIndex(posts: BlogPost[]): BlogIndexEntry[] {
  return posts
    .filter((post) => !isBlockedBlogPost(post))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      titleKo: post.titleKo,
      excerpt: post.excerpt,
      excerptKo: post.excerptKo,
      category: post.category,
      categoryKo: post.categoryKo,
      icon: post.icon,
      date: post.date,
      readTime: post.readTime,
      // featured 가 true 인 경우만 직렬화 — 인덱스 파일을 가볍게 유지
      ...(post.featured ? { featured: true } : {}),
    }))
}
