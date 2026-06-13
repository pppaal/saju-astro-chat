/**
 * Tests for src/data/blog/buildIndex.ts
 * blog:index 스크립트의 순수 변환부 검증
 */
import { describe, it, expect } from 'vitest'
import { buildBlogIndex } from '@/data/blog/buildIndex'
import { blogPosts } from '@/data/blog-posts'

describe('buildBlogIndex', () => {
  const index = buildBlogIndex(blogPosts)

  it('produces one metadata entry per visible post', () => {
    expect(index.length).toBe(blogPosts.length)
    expect(index.length).toBeGreaterThanOrEqual(78 + 60)
  })

  it('strips content fields (metadata only)', () => {
    index.forEach((entry) => {
      expect(entry).not.toHaveProperty('content')
      expect(entry).not.toHaveProperty('contentKo')
      expect(entry.slug.length).toBeGreaterThan(0)
      expect(entry.title.length).toBeGreaterThan(0)
      expect(entry.titleKo.length).toBeGreaterThan(0)
      expect(entry.excerpt.length).toBeGreaterThan(0)
      expect(entry.excerptKo.length).toBeGreaterThan(0)
      expect(entry.category.length).toBeGreaterThan(0)
      expect(entry.categoryKo.length).toBeGreaterThan(0)
      expect(entry.icon.length).toBeGreaterThan(0)
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(entry.readTime).toBeGreaterThan(0)
    })
  })

  it('only serializes featured when true', () => {
    index.forEach((entry) => {
      if ('featured' in entry) {
        expect(entry.featured).toBe(true)
      }
    })
  })

  it('filters blocked posts', () => {
    const blocked = buildBlogIndex([
      {
        slug: 'numerology-life-path-numbers-explained',
        title: 'x'.repeat(20),
        titleKo: '한글제목',
        excerpt: 'e',
        excerptKo: '발췌',
        content: 'c',
        contentKo: '내용',
        category: 'Numerology',
        categoryKo: '수비학',
        icon: 'x',
        date: '2024-01-01',
        readTime: 3,
      },
    ])
    expect(blocked).toHaveLength(0)
  })
})
