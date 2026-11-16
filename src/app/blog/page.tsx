import type { Metadata } from 'next'
import Link from 'next/link'
import BlogClient from './BlogClient'
import { blogPosts, type BlogPost } from '@/data/blog-posts'
import { categories } from '@/data/blog-categories'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

// 로케일별 metadata(x-locale 헤더) 를 내므로 요청 시 렌더.
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Guides — Birth Charts, Daily Horoscopes, Tarot Meanings, Saju & Compatibility',
        description:
          'Plain-English guides to reading a birth chart, daily horoscopes, the 78 tarot card meanings, Korean Four Pillars (Saju) day pillars and zodiac compatibility — written to be understood, not to mystify.',
        keywords: [
          'astrology guides',
          'birth chart guide',
          'tarot card meanings',
          'saju guide',
          'four pillars guide',
          'zodiac compatibility guide',
          'horoscope guide',
          'astrology blog',
        ],
      },
      ko: {
        title: '가이드 — 점성술·사주·타로·궁합 인사이트',
        description:
          '출생 차트 읽는 법, 타로 78장 카드 의미, 사주 일주 해설, 별자리 궁합까지 — 쉽게 읽히는 상시 가이드 모음.',
        keywords: [
          '점성술 가이드',
          '사주 가이드',
          '타로 카드 의미',
          '일주 해설',
          '궁합 가이드',
          '운세 블로그',
        ],
      },
      canonicalUrl: `${baseUrl}/blog`,
      ogImage: '/og-image.png',
    },
    locale
  )
}

type GuideGroup = { id: string; name: string; nameKo: string; posts: BlogPost[] }

/**
 * 공개 글 전체를 카테고리별로 묶는다 — 노출 순서는 blog-categories 의 순서
 * (Saju → Astrology → Tarot → Compatibility), 거기 없는 카테고리는 이름순으로
 * 뒤에 붙인다. 글 순서는 원본(blogPosts) 순서 그대로 — 결정론.
 */
function groupGuidesByCategory(posts: readonly BlogPost[]): GuideGroup[] {
  const known = categories.filter((c) => c.id !== 'all')
  const groups = new Map<string, GuideGroup>()
  for (const c of known) {
    groups.set(c.name.toLowerCase(), { id: c.id, name: c.name, nameKo: c.nameKo, posts: [] })
  }
  for (const post of posts) {
    const key = post.category.trim().toLowerCase()
    const group = groups.get(key)
    if (group) {
      group.posts.push(post)
    } else {
      groups.set(key, {
        id: key,
        name: post.category,
        nameKo: post.categoryKo || post.category,
        posts: [post],
      })
    }
  }
  const ordered = [...groups.values()].filter((g) => g.posts.length > 0)
  const knownOrder = new Map(known.map((c, i) => [c.name.toLowerCase(), i]))
  return ordered.sort((a, b) => {
    const ai = knownOrder.get(a.name.toLowerCase())
    const bi = knownOrder.get(b.name.toLowerCase())
    if (ai !== undefined && bi !== undefined) return ai - bi
    if (ai !== undefined) return -1
    if (bi !== undefined) return 1
    return a.name.localeCompare(b.name)
  })
}

export default async function BlogPage() {
  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const groups = groupGuidesByCategory(blogPosts)
  const total = groups.reduce((sum, g) => sum + g.posts.length, 0)

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? 'DestinyPal 가이드' : 'DestinyPal Guides',
    description: isKo
      ? '점성술·사주·타로·궁합에 관한 상시 가이드 모음.'
      : 'Plain-English guides to birth charts, daily horoscopes, tarot card meanings, Saju and zodiac compatibility.',
    url: isKo ? `${baseUrl}/ko/blog` : `${baseUrl}/blog`,
  })
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: isKo ? '홈' : 'Home', url: '' },
      { name: isKo ? '가이드' : 'Guides', url: '/blog' },
    ],
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogClient />
      {/* 서버 렌더 "All guides" — JS 없이도 크롤러가 모든 공개 글 제목을 링크로
          따라갈 수 있게 한다(BlogClient 는 24개씩 "더 보기" 라 나머지가 숨는다). */}
      <section
        aria-labelledby="all-guides-heading"
        style={{
          position: 'relative',
          zIndex: 1,
          background: 'var(--ds-dark-bg, #07091a)',
          color: '#e8ecf5',
          borderTop: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 32px 72px' }}>
          <h2
            id="all-guides-heading"
            style={{ fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.01em' }}
          >
            {isKo ? '전체 가이드' : 'All guides'}
          </h2>
          <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(232,236,245,0.6)' }}>
            {isKo
              ? `공개된 글 ${total}개를 주제별로 모았습니다. 제목을 누르면 바로 글로 이동합니다.`
              : `${total} guides, grouped by topic. Every title below is a direct link.`}
          </p>
          {groups.map((group) => (
            <div key={group.id} style={{ marginBottom: 28 }}>
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  margin: '0 0 10px',
                  color: '#d4b572',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {isKo ? group.nameKo : group.name}
                <span style={{ color: 'rgba(232,236,245,0.45)', fontWeight: 400, marginLeft: 8 }}>
                  ({group.posts.length})
                </span>
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '6px 24px',
                }}
              >
                {group.posts.map((post) => (
                  <li key={post.slug} style={{ fontSize: 14, lineHeight: 1.55 }}>
                    <Link
                      href={`/blog/${post.slug}`}
                      style={{ color: 'rgba(232,236,245,0.86)', textDecoration: 'none' }}
                    >
                      {isKo ? post.titleKo || post.title : post.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
