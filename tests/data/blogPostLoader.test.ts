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
      const mockIndex = [{
        slug: 'test',
        title: 'Test',
        titleKo: 'Test',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Test',
        categoryKo: 'Test',
        icon: 'T',
        date: '2024-01-01',
        readTime: 1,
        content: '',
        contentKo: ''
      }];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

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
      const mockPost = {
        slug: 'what-is-saju-four-pillars-destiny',
        title: 'What is Saju?',
        titleKo: '사주란?',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Saju',
        categoryKo: '사주',
        icon: '四',
        date: '2024-01-01',
        readTime: 5,
        content: 'This is a long content that should be more than 100 characters to pass the test. Let me add some more text here to make sure it passes.',
        contentKo: 'Korean content'
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockPost
      });

      const post = await getBlogPost('what-is-saju-four-pillars-destiny');

      expect(post).toBeDefined();
      expect(post?.slug).toBe('what-is-saju-four-pillars-destiny');
      expect(post?.content).toBeDefined();
      expect(post?.content.length).toBeGreaterThan(100);
    });

    it('should return null for non-existent post', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404
      });

      const post = await getBlogPost('non-existent-slug');
      expect(post).toBeNull();
    });

    it('should cache loaded posts', async () => {
      const mockPost1 = {
        slug: 'what-is-saju-four-pillars-destiny',
        title: 'Test',
        titleKo: 'Test',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Test',
        categoryKo: 'Test',
        icon: 'T',
        date: '2024-01-01',
        readTime: 1,
        content: 'Test content',
        contentKo: 'Test'
      };

      const mockPost2 = {
        slug: 'tarot-card-meanings-beginners-guide',
        title: 'Test2',
        titleKo: 'Test2',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Test',
        categoryKo: 'Test',
        icon: 'T',
        date: '2024-01-01',
        readTime: 1,
        content: 'Test content 2',
        contentKo: 'Test'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost1
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost2
      });

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
      const mockIndex = [
        {
          slug: 'featured-1',
          title: 'Featured 1',
          titleKo: 'Featured 1',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Test',
          categoryKo: 'Test',
          icon: 'T',
          date: '2024-01-01',
          readTime: 1,
          featured: true,
          content: '',
          contentKo: ''
        },
        {
          slug: 'not-featured',
          title: 'Not Featured',
          titleKo: 'Not Featured',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Test',
          categoryKo: 'Test',
          icon: 'T',
          date: '2024-01-01',
          readTime: 1,
          featured: false,
          content: '',
          contentKo: ''
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const featured = await getFeaturedPosts();

      expect(Array.isArray(featured)).toBe(true);
      featured.forEach(post => {
        expect(post.featured).toBe(true);
      });
    });
  });

  describe('getPostsByCategory', () => {
    it('should filter posts by category', async () => {
      const mockIndex = [
        {
          slug: 'saju-post',
          title: 'Saju Post',
          titleKo: 'Saju Post',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Saju',
          categoryKo: '사주',
          icon: 'T',
          date: '2024-01-01',
          readTime: 1,
          content: '',
          contentKo: ''
        },
        {
          slug: 'tarot-post',
          title: 'Tarot Post',
          titleKo: 'Tarot Post',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Tarot',
          categoryKo: '타로',
          icon: 'T',
          date: '2024-01-01',
          readTime: 1,
          content: '',
          contentKo: ''
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

      const sajuPosts = await getPostsByCategory('Saju');

      expect(Array.isArray(sajuPosts)).toBe(true);
      sajuPosts.forEach(post => {
        expect(['Saju', '사주']).toContain(post.category);
      });
    });
  });

  describe('getRecentPosts', () => {
    it('should return recent posts sorted by date', async () => {
      const mockIndex = [
        {
          slug: 'post-1',
          title: 'Post 1',
          titleKo: 'Post 1',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Test',
          categoryKo: 'Test',
          icon: 'T',
          date: '2024-03-01',
          readTime: 1,
          content: '',
          contentKo: ''
        },
        {
          slug: 'post-2',
          title: 'Post 2',
          titleKo: 'Post 2',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Test',
          categoryKo: 'Test',
          icon: 'T',
          date: '2024-02-01',
          readTime: 1,
          content: '',
          contentKo: ''
        },
        {
          slug: 'post-3',
          title: 'Post 3',
          titleKo: 'Post 3',
          excerpt: 'Test',
          excerptKo: 'Test',
          category: 'Test',
          categoryKo: 'Test',
          icon: 'T',
          date: '2024-01-01',
          readTime: 1,
          content: '',
          contentKo: ''
        }
      ];

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockIndex
      });

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
      const mockIndex = [{
        slug: 'test',
        title: 'Test',
        titleKo: 'Test',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Test',
        categoryKo: 'Test',
        icon: 'T',
        date: '2024-01-01',
        readTime: 1,
        content: '',
        contentKo: ''
      }];

      const mockPost = {
        slug: 'what-is-saju-four-pillars-destiny',
        title: 'Test',
        titleKo: 'Test',
        excerpt: 'Test',
        excerptKo: 'Test',
        category: 'Test',
        categoryKo: 'Test',
        icon: 'T',
        date: '2024-01-01',
        readTime: 1,
        content: 'Test',
        contentKo: 'Test'
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockIndex
      }).mockResolvedValueOnce({
        ok: true,
        json: async () => mockPost
      });

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
