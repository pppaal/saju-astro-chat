// 서비스와 무관한 카테고리 차단. 현재는 모든 무관 글 (Numerology · I Ching ·
// Dream · Personality) 이 디스크에서 삭제됐기 때문에 Set 은 비어 있다.
// 향후 잘못 추가된 글을 빠르게 숨기는 안전망으로 형태만 유지 — sitemap.ts /
// blog/[slug]/page.tsx 가 isBlockedBlogPost 호출 중이라 API contract 도 보존.
const BLOCKED_BLOG_CATEGORIES = new Set<string>([])
const BLOCKED_BLOG_SLUGS = new Set<string>([])

export function isBlockedBlogPost(input: { slug: string; category?: string | null }): boolean {
  const category = (input.category || '').trim().toLowerCase()
  if (category && BLOCKED_BLOG_CATEGORIES.has(category)) {
    return true
  }
  return BLOCKED_BLOG_SLUGS.has(input.slug)
}
