/**
 * Lazy loader for blog posts
 * Loads full post content on-demand to reduce initial bundle size
 *
 * Bundle optimization: Loads only the index (6.67KB) initially
 * Full posts (110KB) are loaded only when needed
 */

import type { BlogPost } from './blog-posts';
import { logger } from '@/lib/logger';

// Cache loaded posts
const postCache = new Map<string, BlogPost>();

// Cache for the index
let indexCache: BlogPost[] | null = null;

/**
 * Load the blog posts index (metadata only, no content)
 * This is lightweight and can be used for listing pages
 */
export async function getBlogPostsIndex(): Promise<BlogPost[]> {
  if (indexCache) {
    return indexCache;
  }

  try {
    const response = await fetch('/data/blog/index.json');
    if (!response.ok) {
      throw new Error(`Failed to load blog index: ${response.statusText}`);
    }

    const data = await response.json();
    indexCache = data;
    return data;
  } catch (error) {
    logger.error('Failed to load blog posts index:', error);
    throw error;
  }
}

/**
 * Load a specific blog post by slug
 * Returns the full post with content
 */
export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  // Check cache first
  if (postCache.has(slug)) {
    return postCache.get(slug)!;
  }

  try {
    const response = await fetch(`/data/blog/${slug}.json`);
    if (!response.ok) {
      if (response.status === 404) {
        logger.warn(`Blog post not found: ${slug}`);
        return null;
      }
      throw new Error(`Failed to load blog post ${slug}: ${response.statusText}`);
    }

    const post: BlogPost = await response.json();
    postCache.set(slug, post);
    return post;
  } catch (error) {
    logger.error(`Failed to load blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Preload multiple blog posts (for performance optimization)
 */
export async function preloadBlogPosts(slugs: string[]): Promise<void> {
  const promises = slugs
    .filter(slug => !postCache.has(slug))
    .map(slug => getBlogPost(slug));

  await Promise.allSettled(promises);
}

/**
 * Get featured blog posts from index
 */
export async function getFeaturedPosts(): Promise<BlogPost[]> {
  const index = await getBlogPostsIndex();
  return index.filter(post => post.featured);
}

/**
 * Get blog posts by category from index
 */
export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const index = await getBlogPostsIndex();
  return index.filter(post => post.category === category || post.categoryKo === category);
}

/**
 * Get recent blog posts from index
 */
export async function getRecentPosts(limit: number = 5): Promise<BlogPost[]> {
  const index = await getBlogPostsIndex();
  return index
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, limit);
}

/**
 * Clear the post cache (useful for memory management)
 */
export function clearBlogPostCache(): void {
  postCache.clear();
  indexCache = null;
}

/**
 * Get cache statistics (for debugging)
 */
export function getBlogCacheStats() {
  return {
    postsLoaded: postCache.size,
    indexLoaded: indexCache !== null
  };
}
