const BLOCKED_BLOG_CATEGORY = 'numerology'
const BLOCKED_BLOG_SLUGS = new Set(['numerology-life-path-numbers-explained'])

export function isBlockedBlogPost(input: { slug: string; category?: string | null }): boolean {
  const category = (input.category || '').trim().toLowerCase()
  if (category === BLOCKED_BLOG_CATEGORY) {
    return true
  }
  return BLOCKED_BLOG_SLUGS.has(input.slug)
}
