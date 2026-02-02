import { promises as fs } from 'fs'
import path from 'path'
import { logger } from '@/lib/logger'
import blogMetadata from './metadata/blog-metadata.json'

export interface BlogPost {
  slug: string
  title: string
  titleKo: string
  excerpt: string
  excerptKo: string
  content: string
  contentKo: string
  category: string
  categoryKo: string
  icon: string
  date: string
  readTime: number
  featured?: boolean
}

interface BlogMetadata {
  slug: string
  title: string
  titleKo: string
  excerpt: string
  excerptKo: string
  category: string
  categoryKo: string
  icon: string
  date: string
  readTime: number
  featured?: boolean
}

const POSTS_DIR = path.join(process.cwd(), 'src/data/blog/posts')

/**
 * Load a single blog post by slug
 */
export async function loadBlogPost(slug: string): Promise<BlogPost | null> {
  try {
    const metadata = (blogMetadata as BlogMetadata[]).find((m) => m.slug === slug)
    if (!metadata) return null

    const enPath = path.join(POSTS_DIR, `${slug}.en.md`)
    const koPath = path.join(POSTS_DIR, `${slug}.ko.md`)

    const [content, contentKo] = await Promise.all([
      fs.readFile(enPath, 'utf-8').catch(() => ''),
      fs.readFile(koPath, 'utf-8').catch(() => ''),
    ])

    return {
      ...metadata,
      content,
      contentKo,
    }
  } catch (error) {
    logger.error(
      `Error loading blog post ${slug}:`,
      error instanceof Error ? error : new Error(String(error))
    )
    return null
  }
}

/**
 * Load all blog posts
 */
export async function loadAllBlogPosts(): Promise<BlogPost[]> {
  const posts = await Promise.all((blogMetadata as BlogMetadata[]).map((m) => loadBlogPost(m.slug)))

  return posts.filter((p): p is BlogPost => p !== null)
}

/**
 * Get blog metadata without loading content (faster)
 */
export function getBlogMetadata(): BlogMetadata[] {
  return blogMetadata as BlogMetadata[]
}
