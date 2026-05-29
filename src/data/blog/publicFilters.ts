// 우리 서비스 (운명상담사·궁합·타로·캘린더) 와 무관한 카테고리/슬러그를
// 차단해 sitemap·blog 라우트에서 모두 숨김. 서비스와 연결되지 않은 글이
// 구글에 노출돼 트래픽만 받고 conversion 0인 상태 방지.
const BLOCKED_BLOG_CATEGORIES = new Set([
  'numerology', // 수비학 — 서비스 없음
  'i ching', // 역경 — 서비스 없음
  'dream', // 꿈 해몽 — 서비스 없음
  'personality', // MBTI 매핑 글 — Astrology 섞였지만 주제 절반이 MBTI 라 매핑 약함
])

const BLOCKED_BLOG_SLUGS = new Set([
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
