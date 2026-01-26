/**
 * Tests for blog post loader
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBlogPostsIndex,
  getBlogPost,
  getFeaturedPosts,
  getPostsByCategory,
  getRecentPosts,
  clearBlogPostCache,
  getBlogCacheStats,
} from '@/data/blogPostLoader';

// Mock fetch globally
global.fetch = vi.fn();

describe('blogPostLoader', () => {
  beforeEach(() => {
    clearBlogPostCache();
    vi.clearAllMocks();
  });

  describe('getBlogPostsIndex', () => {
    it('should load blog posts index', async () => {
      const mockIndex = [
        {
          slug: 'test-post',
          title: 'Test Post',
          titleKo: '테스트 포스트',
          excerpt: 'Test excerpt',
          excerptKo: '테스트 발췌',
          category: 'Saju',
          categoryKo: '사주',
          icon: '四',
          date: '2024-01-01',
          readTime: 5,
          featured: true,
          content: '',
          contentKo: ''
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const posts = await getBlogPostsIndex();

      expect(Array.isArray(posts)).toBe(true);
      expect(posts.length).toBeGreaterThan(0);

      // Check that index has metadata but minimal content
      const firstPost = posts[0];
      expect(firstPost.slug).toBeDefined();
      expect(firstPost.title).toBeDefined();
      expect(firstPost.excerpt).toBeDefined();
      expect(firstPost.category).toBeDefined();
    });

    it('should cache index data', async () => {
      await getBlogPostsIndex();
      const stats1 = getBlogCacheStats();
      expect(stats1.indexLoaded).toBe(true);

      // Second call should use cache
      await getBlogPostsIndex();
      const stats2 = getBlogCacheStats();
      expect(stats2.indexLoaded).toBe(true);
    });
  });

  describe('getBlogPost', () => {
    it('should load a full blog post', async () => {
      const post = await getBlogPost('what-is-saju-four-pillars-destiny');

      expect(post).toBeDefined();
      expect(post?.slug).toBe('what-is-saju-four-pillars-destiny');
      expect(post?.content).toBeDefined();
      expect(post?.content.length).toBeGreaterThan(100);
    });

    it('should return null for non-existent post', async () => {
      const post = await getBlogPost('non-existent-slug');
      expect(post).toBeNull();
    });

    it('should cache loaded posts', async () => {
      await getBlogPost('what-is-saju-four-pillars-destiny');
      const stats1 = getBlogCacheStats();
      expect(stats1.postsLoaded).toBe(1);

      // Load another post
      await getBlogPost('tarot-card-meanings-beginners-guide');
      const stats2 = getBlogCacheStats();
      expect(stats2.postsLoaded).toBe(2);
    });
  });

  describe('getFeaturedPosts', () => {
    it('should return only featured posts', async () => {
      const featured = await getFeaturedPosts();

      expect(Array.isArray(featured)).toBe(true);
      featured.forEach(post => {
        expect(post.featured).toBe(true);
      });
    });
  });

  describe('getPostsByCategory', () => {
    it('should filter posts by category', async () => {
      const sajuPosts = await getPostsByCategory('Saju');

      expect(Array.isArray(sajuPosts)).toBe(true);
      sajuPosts.forEach(post => {
        expect(['Saju', '사주']).toContain(post.category);
      });
    });
  });

  describe('getRecentPosts', () => {
    it('should return recent posts sorted by date', async () => {
      const recent = await getRecentPosts(3);

      expect(recent.length).toBeLessThanOrEqual(3);

      // Check dates are in descending order
      for (let i = 0; i < recent.length - 1; i++) {
        const date1 = new Date(recent[i].date);
        const date2 = new Date(recent[i + 1].date);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    });
  });

  describe('cache management', () => {
    it('should clear all caches', async () => {
      await getBlogPostsIndex();
      await getBlogPost('what-is-saju-four-pillars-destiny');

      let stats = getBlogCacheStats();
      expect(stats.indexLoaded).toBe(true);
      expect(stats.postsLoaded).toBe(1);

      clearBlogPostCache();

      stats = getBlogCacheStats();
      expect(stats.indexLoaded).toBe(false);
      expect(stats.postsLoaded).toBe(0);
    });
  });
});
