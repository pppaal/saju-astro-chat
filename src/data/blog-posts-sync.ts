/**
 * Synchronous blog posts loader (for compatibility)
 *
 * This file provides synchronous access to blog posts by reading markdown files
 * at build time. For runtime async loading, use src/data/blog/loader.ts
 */
import { readFileSync } from 'fs'
import path from 'path'
import blogMetadata from './blog/metadata/blog-metadata.json'
import { generateCurrentYearFortuneBlogPost } from './yearly-fortune-generator'
import { generateTarotCardPosts } from './seo-posts/tarotCardPosts'
import { generateDayPillarPosts } from './seo-posts/dayPillarPosts'
import { isBlockedBlogPost } from './blog/publicFilters'

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

const POSTS_DIR = path.join(process.cwd(), 'src/data/blog/posts')

/**
 * Load all blog posts synchronously
 */
function loadBlogPostsSync(): BlogPost[] {
  return blogMetadata
    .filter((metadata) => !isBlockedBlogPost(metadata))
    .map((metadata) => {
      const enPath = path.join(POSTS_DIR, `${metadata.slug}.en.md`)
      const koPath = path.join(POSTS_DIR, `${metadata.slug}.ko.md`)

      let content = ''
      let contentKo = ''

      try {
        content = readFileSync(enPath, 'utf-8')
      } catch (_error) {
        console.warn(`Missing English content for ${metadata.slug}`)
      }

      try {
        contentKo = readFileSync(koPath, 'utf-8')
      } catch (_error) {
        // Korean content is optional
      }

      return {
        ...metadata,
        content,
        contentKo,
      }
    })
}

// Load posts once at module initialization
let cachedPosts: BlogPost[] | null = null

export const blogPosts: BlogPost[] = (() => {
  if (cachedPosts) return cachedPosts

  try {
    cachedPosts = loadBlogPostsSync()

    // Add the generated yearly fortune post
    const yearlyPost = generateCurrentYearFortuneBlogPost()
    if (yearlyPost) {
      cachedPosts.unshift(yearlyPost)
    }

    // Programmatic SEO 포스트(78 타로 카드 + 60 일주) — 데이터 SSOT 에서
    // 결정론적으로 파생. 마크다운 글 뒤에 append 해 기존 글 순서를 보존한다.
    cachedPosts.push(...generateTarotCardPosts(), ...generateDayPillarPosts())

    return cachedPosts
  } catch (error) {
    console.error('Error loading blog posts:', error)
    return []
  }
})()
