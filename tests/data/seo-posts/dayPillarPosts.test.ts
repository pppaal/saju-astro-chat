/**
 * Tests for src/data/seo-posts/dayPillarPosts.ts
 * 60갑자 일주 SEO 포스트 생성기 검증
 */
import { describe, it, expect } from 'vitest'
import { generateDayPillarPosts, DAY_PILLAR_POST_DATE } from '@/data/seo-posts/dayPillarPosts'
import { blogPosts } from '@/data/blog-posts'

describe('generateDayPillarPosts', () => {
  const posts = generateDayPillarPosts()

  it('generates exactly 60 posts (sexagenary cycle)', () => {
    expect(posts).toHaveLength(60)
  })

  it('has unique slugs that match URL-friendly pattern and contain the keyword', () => {
    const slugs = posts.map((p) => p.slug)
    expect(new Set(slugs).size).toBe(60)
    slugs.forEach((slug) => {
      expect(slug).toMatch(/^[a-z0-9-]+$/)
      expect(slug).toContain('day-pillar')
    })
  })

  it('includes expected example slugs (romanized ganji + element-animal)', () => {
    const slugs = new Set(posts.map((p) => p.slug))
    expect(slugs.has('gapja-day-pillar-wood-rat')).toBe(true)
    expect(slugs.has('eulchuk-day-pillar-wood-ox')).toBe(true)
    expect(slugs.has('gyehae-day-pillar-water-pig')).toBe(true)
  })

  it('has non-empty bilingual fields on every post', () => {
    posts.forEach((post) => {
      expect(post.title.trim().length).toBeGreaterThan(0)
      expect(post.titleKo.trim().length).toBeGreaterThan(0)
      expect(post.excerpt.trim().length).toBeGreaterThan(0)
      expect(post.excerptKo.trim().length).toBeGreaterThan(0)
      expect(post.content.trim().length).toBeGreaterThan(0)
      expect(post.contentKo.trim().length).toBeGreaterThan(0)
      expect(post.category).toBe('Saju')
      expect(post.categoryKo).toBe('사주')
      expect(post.icon.length).toBeGreaterThan(0)
    })
  })

  it('uses a fixed, valid ISO-like date', () => {
    posts.forEach((post) => {
      expect(post.date).toBe(DAY_PILLAR_POST_DATE)
      expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(new Date(post.date).toString()).not.toBe('Invalid Date')
    })
  })

  it('contains personality/career/love sections and the /destiny-map CTA link', () => {
    posts.forEach((post) => {
      expect(post.content).toContain('Personality')
      expect(post.content).toContain('Career')
      expect(post.content).toContain('Love')
      expect(post.content).toContain('](/destiny-map)')
      expect(post.contentKo).toContain('](/destiny-map)')
    })
  })

  it('mentions Saju / Four Pillars of Destiny in the shared explainer', () => {
    posts.forEach((post) => {
      expect(post.content).toContain('Four Pillars of Destiny')
      expect(post.contentKo).toContain('사주')
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

    posts.forEach((post) => {
      expect(allSlugs).toContain(post.slug)
    })
  })
})
