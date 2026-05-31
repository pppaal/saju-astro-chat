// 제거된 서비스(Numerology · I Ching · Dream · Personality)는 더 이상 제공하지
// 않으므로 그 카테고리 블로그 글을 공개 목록·상세·sitemap 에서 차단한다. 글
// 파일(public/data/blog/index.json 등)은 SEO/히스토리상 남아 있지만, 사용자가
// 블로그에서 "우리에게 없는 서비스" 내용을 보게 되는 문제를 막는다(소문자 비교).
const BLOCKED_BLOG_CATEGORIES = new Set<string>([
  'numerology',
  'i ching',
  'iching',
  'dream',
  'personality',
])
// 상세 페이지는 category 없이 slug 만으로도 차단 검사를 하므로(직접 URL 접근),
// 제거된 서비스 글 slug 도 명시적으로 막아 확실히 404 가 되게 한다.
const BLOCKED_BLOG_SLUGS = new Set<string>([
  'numerology-life-path-numbers-explained',
  'iching-beginners-guide-hexagrams',
  'dream-interpretation-symbols-meanings',
  'personality-types-astrology-mbti-zodiac',
])

export function isBlockedBlogPost(input: { slug: string; category?: string | null }): boolean {
  const category = (input.category || '').trim().toLowerCase()
  if (category && BLOCKED_BLOG_CATEGORIES.has(category)) {
    return true
  }
  return BLOCKED_BLOG_SLUGS.has(input.slug)
}
