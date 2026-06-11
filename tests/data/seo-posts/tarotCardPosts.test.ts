/**
 * Tests for src/data/seo-posts/tarotCardPosts.ts
 * 78장 타로 카드 SEO 포스트 생성기 검증
 */
import { describe, it, expect } from 'vitest'
import { generateTarotCardPosts, TAROT_POST_DATE } from '@/data/seo-posts/tarotCardPosts'
import { blogPosts } from '@/data/blog-posts'

describe('generateTarotCardPosts', () => {
  const posts = generateTarotCardPosts()

  it('generates exactly 78 posts (full tarot deck)', () => {
    expect(posts).toHaveLength(78)
  })

  it('has unique slugs that match URL-friendly pattern and contain the keyword', () => {
    const slugs = posts.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(78)
    slugs.forEach((slug) => {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(slug).toContain('tarot-card-meaning')
    })
  })

  it('includes expected example slugs', () => {
    const slugs = new Set(posts.map((p) => p.slug))
    expect(slugs.has('the-fool-tarot-card-meaning')).toBe(true)
    expect(slugs.has('ace-of-cups-tarot-card-meaning')).toBe(true)
    expect(slugs.has('two-of-wands-tarot-card-meaning')).toBe(true)
    expect(slugs.has('wheel-of-fortune-tarot-card-meaning')).toBe(true)
  })

  it('has non-empty bilingual fields on every post', () => {
    posts.forEach((post) => {
      expect(post.title.trim().length).toBeGreaterThan(0)
      expect(post.titleKo.trim().length).toBeGreaterThan(0)
      expect(post.excerpt.trim().length).toBeGreaterThan(0)
      expect(post.excerptKo.trim().length).toBeGreaterThan(0)
      expect(post.content.trim().length).toBeGreaterThan(0)
      expect(post.contentKo.trim().length).toBeGreaterThan(0)
      expect(post.category).toBe('Tarot')
      expect(post.categoryKo).toBe('타로')
      expect(post.icon.length).toBeGreaterThan(0)
    })
  })

  it('uses a fixed, valid ISO-like date', () => {
    posts.forEach((post) => {
      expect(post.date).toBe(TAROT_POST_DATE)
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(post.date).toString()).not.toBe('Invalid Date')
    })
  })

  it('contains upright/reversed sections and the /tarot CTA link', () => {
    posts.forEach((post) => {
      expect(post.content).toContain('Upright Meaning')
      expect(post.content).toContain('Reversed Meaning')
      expect(post.content).toContain('](/tarot)')
      expect(post.contentKo).toContain('](/tarot)')
    })
  })

  it('computes readTime >= 3', () => {
    posts.forEach((post) => {
      expect(post.readTime).toBeGreaterThanOrEqual(3)
    })
  })

  it('keeps excerpts at a search-snippet-friendly length', () => {
    posts.forEach((post) => {
      expect(post.excerpt.length).toBeLessThanOrEqual(165)
      expect(post.excerptKo.length).toBeLessThanOrEqual(165)
    })
  })

  it('is included in the full blogPosts set without slug collisions', () => {
    const allSlugs = blogPosts.map((p) => p.slug)
    expect(new Set(allSlugs).size).toBe(allSlugs.length)

    const tarotSlugs = posts.map((p) => p.slug)
    tarotSlugs.forEach((slug) => {
      expect(allSlugs).toContain(slug)
    })
  })
})
