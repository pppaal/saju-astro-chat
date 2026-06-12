/**
 * public/data/blog/index.json 재생성 스크립트.
 *
 * 블로그 목록 페이지는 이 정적 인덱스(메타데이터 전용, content 없음)를
 * fetch 한다. 포스트 추가/변경 시 수동 편집 대신 전체 포스트 집합(마크다운
 * + yearly + programmatic SEO 포스트)에서 재생성한다.
 *
 * 사용: npm run blog:index  (tsx scripts/blog/generate-index.ts)
 */
import fs from 'node:fs'
import path from 'node:path'
import { blogPosts } from '@/data/blog-posts-sync'
import { buildBlogIndex } from '@/data/blog/buildIndex'

const OUT_PATH = path.join(process.cwd(), 'public', 'data', 'blog', 'index.json')

const index = buildBlogIndex(blogPosts)
fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8')

console.log(`Wrote ${index.length} blog index entries to ${path.relative(process.cwd(), OUT_PATH)}`)
