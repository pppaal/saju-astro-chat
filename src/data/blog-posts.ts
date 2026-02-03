/**
 * Blog Posts - Refactored
 *
 * This file has been refactored for better maintainability.
 * Blog content is now stored in separate markdown files.
 *
 * Structure:
 * - Metadata: src/data/blog/metadata/blog-metadata.json
 * - Content: src/data/blog/posts/*.md
 * - Loader: src/data/blog/loader.ts (async)
 * - Sync Loader: src/data/blog-posts-sync.ts (for build time)
 *
 * This file re-exports from the sync loader for backward compatibility.
 */

export type { BlogPost } from './blog-posts-sync'
export { blogPosts } from './blog-posts-sync'
