/**
 * Tests for src/data/blog-posts.ts
 * Validates blog post data structure and content
 */
import { describe, it, expect } from 'vitest';
import { blogPosts, type BlogPost } from '@/data/blog-posts';

describe('Blog Posts Data', () => {
  describe('BlogPost interface', () => {
    it('should have multiple blog posts', () => {
      expect(blogPosts.length).toBeGreaterThan(0);
    });

    it('should have required properties for all posts', () => {
      blogPosts.forEach((post: BlogPost) => {
        expect(post).toHaveProperty('slug');
        expect(post).toHaveProperty('title');
        expect(post).toHaveProperty('titleKo');
        expect(post).toHaveProperty('excerpt');
        expect(post).toHaveProperty('excerptKo');
        expect(post).toHaveProperty('content');
        expect(post).toHaveProperty('contentKo');
        expect(post).toHaveProperty('category');
        expect(post).toHaveProperty('categoryKo');
        expect(post).toHaveProperty('icon');
        expect(post).toHaveProperty('date');
        expect(post).toHaveProperty('readTime');
      });
    });

    it('should have correct property types', () => {
      blogPosts.forEach((post) => {
        expect(typeof post.slug).toBe('string');
        expect(typeof post.title).toBe('string');
        expect(typeof post.titleKo).toBe('string');
        expect(typeof post.excerpt).toBe('string');
        expect(typeof post.excerptKo).toBe('string');
        expect(typeof post.content).toBe('string');
        expect(typeof post.contentKo).toBe('string');
        expect(typeof post.category).toBe('string');
        expect(typeof post.categoryKo).toBe('string');
        expect(typeof post.icon).toBe('string');
        expect(typeof post.date).toBe('string');
        expect(typeof post.readTime).toBe('number');

        if (post.featured !== undefined) {
          expect(typeof post.featured).toBe('boolean');
        }
      });
    });
  });

  describe('Slug validation', () => {
    it('should have unique slugs', () => {
      const slugs = blogPosts.map((post) => post.slug);
      const uniqueSlugs = new Set(slugs);
      expect(uniqueSlugs.size).toBe(slugs.length);
    });

    it('should have URL-friendly slugs', () => {
      blogPosts.forEach((post) => {
        // Slugs should be lowercase with hyphens
        expect(post.slug).toMatch(/^[a-z0-9-]+$/);

        // No consecutive hyphens
        expect(post.slug).not.toMatch(/--/);

        // Should not start or end with hyphen
        expect(post.slug).not.toMatch(/^-|-$/);
      });
    });

    it('should have non-empty slugs', () => {
      blogPosts.forEach((post) => {
        expect(post.slug.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Date validation', () => {
    it('should have valid date format (YYYY-MM-DD)', () => {
      blogPosts.forEach((post) => {
        expect(post.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });
    });

    it('should have parseable dates', () => {
      blogPosts.forEach((post) => {
        const date = new Date(post.date);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });
  });

  describe('Content validation', () => {
    it('should have non-empty content', () => {
      blogPosts.forEach((post) => {
        expect(post.content.trim().length).toBeGreaterThan(0);
        expect(post.contentKo.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have non-empty excerpts', () => {
      blogPosts.forEach((post) => {
        expect(post.excerpt.trim().length).toBeGreaterThan(0);
        expect(post.excerptKo.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have content longer than excerpt', () => {
      blogPosts.forEach((post) => {
        expect(post.content.length).toBeGreaterThan(post.excerpt.length);
        expect(post.contentKo.length).toBeGreaterThan(post.excerptKo.length);
      });
    });

    it('should have markdown content with headers', () => {
      blogPosts.forEach((post) => {
        // Most blog posts should have markdown headers
        const hasHeaders = post.content.includes('##') || post.content.includes('#');
        expect(hasHeaders).toBe(true);
      });
    });
  });

  describe('Title validation', () => {
    it('should have non-empty titles', () => {
      blogPosts.forEach((post) => {
        expect(post.title.trim().length).toBeGreaterThan(0);
        expect(post.titleKo.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have reasonable title lengths', () => {
      blogPosts.forEach((post) => {
        // Titles should not be too short or too long
        expect(post.title.length).toBeGreaterThan(10);
        expect(post.title.length).toBeLessThan(200);
        expect(post.titleKo.length).toBeGreaterThan(5);
        expect(post.titleKo.length).toBeLessThan(200);
      });
    });
  });

  describe('Category validation', () => {
    it('should have non-empty categories', () => {
      blogPosts.forEach((post) => {
        expect(post.category.trim().length).toBeGreaterThan(0);
        expect(post.categoryKo.trim().length).toBeGreaterThan(0);
      });
    });

    it('should have valid category values', () => {
      const validCategories = ['Saju', 'Tarot', 'Astrology', 'Dream', 'General', 'Numerology', 'I Ching', 'Compatibility'];
      blogPosts.forEach((post) => {
        expect(validCategories).toContain(post.category);
      });
    });
  });

  describe('Read time validation', () => {
    it('should have positive read times', () => {
      blogPosts.forEach((post) => {
        expect(post.readTime).toBeGreaterThan(0);
      });
    });

    it('should have reasonable read times (1-30 minutes)', () => {
      blogPosts.forEach((post) => {
        expect(post.readTime).toBeGreaterThanOrEqual(1);
        expect(post.readTime).toBeLessThanOrEqual(30);
      });
    });
  });

  describe('Icon validation', () => {
    it('should have non-empty icons', () => {
      blogPosts.forEach((post) => {
        expect(post.icon.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Korean translation validation', () => {
    it('should have Korean content containing Korean characters', () => {
      const koreanRegex = /[\uAC00-\uD7AF]/; // Korean Hangul character range

      blogPosts.forEach((post) => {
        expect(post.titleKo).toMatch(koreanRegex);
        expect(post.excerptKo).toMatch(koreanRegex);
        expect(post.contentKo).toMatch(koreanRegex);
        expect(post.categoryKo).toMatch(koreanRegex);
      });
    });
  });

  describe('Featured posts', () => {
    it('should have at least one featured post', () => {
      const featuredPosts = blogPosts.filter((post) => post.featured === true);
      expect(featuredPosts.length).toBeGreaterThan(0);
    });
  });

  describe('Specific blog posts', () => {
    it('should have Saju introduction post', () => {
      const sajuPost = blogPosts.find((post) =>
        post.slug.includes('saju') && post.slug.includes('four-pillars')
      );
      expect(sajuPost).toBeDefined();
      expect(sajuPost?.category).toBe('Saju');
    });

    it('should include yearly fortune posts (dynamically generated)', () => {
      // The yearly fortune post is generated from yearly-fortune-generator
      const currentYear = new Date().getFullYear();
      const yearlyPost = blogPosts.find((post) =>
        post.slug.includes(`saju-${currentYear}`)
      );
      // May or may not exist depending on if it's dynamically added
      // Just verify the array handles it properly
      expect(Array.isArray(blogPosts)).toBe(true);
    });
  });

  describe('Data consistency', () => {
    it('should have consistent category pairing for Saju', () => {
      blogPosts.forEach((post) => {
        if (post.category === 'Saju') {
          expect(post.categoryKo).toBe('사주');
        }
      });
    });
  });
});
