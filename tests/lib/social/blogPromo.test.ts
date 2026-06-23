/**
 * 블로그 → Threads 홍보문 변환 테스트 (DB·네트워크 없이 순수 로직만).
 */
import { describe, it, expect } from 'vitest'
import { pickLatestUnposted, formatBlogThreadsPost } from '@/lib/social/blogPromo'
import { truncateForThreads, THREADS_TEXT_LIMIT } from '@/lib/social/threads'

const posts = [
  { slug: 'old', date: '2026-01-01', titleKo: '옛글', title: 'Old', excerptKo: '', excerpt: '' },
  {
    slug: 'new',
    date: '2026-06-20',
    titleKo: '새글',
    title: 'New',
    excerptKo: '요약',
    excerpt: 'sum',
  },
  { slug: 'mid', date: '2026-03-10', titleKo: '중간', title: 'Mid', excerptKo: '', excerpt: '' },
]

describe('pickLatestUnposted', () => {
  it('picks the newest post by date', () => {
    const p = pickLatestUnposted(posts, new Set())
    expect(p?.slug).toBe('new')
  })

  it('skips already-posted slugs', () => {
    const p = pickLatestUnposted(posts, new Set(['new']))
    expect(p?.slug).toBe('mid')
  })

  it('returns null when everything is posted', () => {
    const p = pickLatestUnposted(posts, new Set(['new', 'mid', 'old']))
    expect(p).toBeNull()
  })

  it('breaks date ties deterministically by slug', () => {
    const tie = [
      { slug: 'b', date: '2026-06-20' },
      { slug: 'a', date: '2026-06-20' },
    ]
    expect(pickLatestUnposted(tie, new Set())?.slug).toBe('b')
  })
})

describe('formatBlogThreadsPost', () => {
  const base = {
    slug: 'my-post',
    title: 'My Post',
    titleKo: '나의 글',
    excerpt: 'An excerpt',
    excerptKo: '요약문',
    date: '2026-06-20',
  }

  it('includes title, excerpt and a blog link (ko)', () => {
    const text = formatBlogThreadsPost(base, { baseUrl: 'https://destinypal.com/' })
    expect(text).toContain('나의 글')
    expect(text).toContain('요약문')
    expect(text).toContain('https://destinypal.com/blog/my-post')
  })

  it('uses english fields when locale=en', () => {
    const text = formatBlogThreadsPost(base, { baseUrl: 'https://x.com', locale: 'en' })
    expect(text).toContain('My Post')
    expect(text).toContain('#saju')
  })

  it('keeps the link intact even with a very long excerpt', () => {
    const longPost = { ...base, excerptKo: '가'.repeat(2000) }
    const text = formatBlogThreadsPost(longPost, { baseUrl: 'https://destinypal.com' })
    expect(text).toContain('https://destinypal.com/blog/my-post')
    // 최종 길이는 Threads 상한 근처 이하여야 한다.
    expect(text.length).toBeLessThanOrEqual(THREADS_TEXT_LIMIT + 5)
  })

  it('respects custom hashtags', () => {
    const text = formatBlogThreadsPost(base, {
      baseUrl: 'https://x.com',
      hashtags: ['운명', '#궁합'],
    })
    expect(text).toContain('#운명')
    expect(text).toContain('#궁합')
  })
})

describe('truncateForThreads', () => {
  it('leaves short text unchanged', () => {
    expect(truncateForThreads('hello')).toBe('hello')
  })

  it('truncates long text with ellipsis under the limit', () => {
    const out = truncateForThreads('a '.repeat(400), 50)
    expect(out.length).toBeLessThanOrEqual(50)
    expect(out.endsWith('…')).toBe(true)
  })
})
