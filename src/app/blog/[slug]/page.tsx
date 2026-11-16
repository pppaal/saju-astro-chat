import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { blogPosts, type BlogPost } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import BlogPostClient from './BlogPostClient'

// 로케일 SSR — /ko/blog/<slug> 는 한국어 제목·발췌·canonical(/ko/...) 로, 베어
// 경로는 영어로 렌더해야 하므로 정적 생성(generateStaticParams) 대신 요청 시
// 렌더한다(x-locale 헤더를 읽어야 함).
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

type Props = {
  params: Promise<{ slug: string }>
}

function findPublicPost(slug: string): BlogPost | null {
  if (isBlockedBlogPost({ slug })) return null
  const post = blogPosts.find((p) => p.slug === slug)
  if (!post || isBlockedBlogPost(post)) return null
  return post
}

/**
 * 관련 글 — 같은 카테고리에서 이 글의 앞/뒤 이웃(인덱스 기준, 끝에서는 감아서)
 * 2개 + 다른 카테고리에서 1개. 글마다 다른 조합이 나와야 하므로 "항상 첫 3개"
 * 를 피한다. 순수 함수: 같은 입력이면 같은 결과.
 */
function pickRelatedPosts(post: BlogPost, posts: readonly BlogPost[]): BlogPost[] {
  const related: BlogPost[] = []

  const sameCategory = posts.filter((p) => p.category === post.category)
  const n = sameCategory.length
  const idx = sameCategory.findIndex((p) => p.slug === post.slug)
  if (n > 1 && idx >= 0) {
    const prev = sameCategory[(idx - 1 + n) % n]
    const next = sameCategory[(idx + 1) % n]
    related.push(prev)
    if (next.slug !== prev.slug) related.push(next)
  }

  const others = posts.filter((p) => p.category !== post.category)
  if (others.length > 0) {
    // 전체 목록에서의 위치로 다른 카테고리 글을 고른다 — 글마다 다른 1개.
    const globalIdx = Math.max(
      0,
      posts.findIndex((p) => p.slug === post.slug)
    )
    related.push(others[globalIdx % others.length])
  }

  return related
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = findPublicPost(slug)

  if (!post) {
    // 차단된 글(페이지에서 /blog 로 리다이렉트)·없는 글 — 색인 금지.
    return {
      title: 'Post Not Found',
      description: 'The requested blog post could not be found.',
      robots: { index: false, follow: true },
    }
  }

  const locale = await getServerLocale()
  const category = post.category.toLowerCase()
  return generateLocalizedMetadata(
    {
      en: {
        title: post.title,
        description: post.excerpt,
        keywords: [category, `${category} guide`, 'astrology', 'saju', 'tarot', 'compatibility'],
      },
      ko: {
        title: post.titleKo || post.title,
        description: post.excerptKo || post.excerpt,
        keywords: [post.categoryKo, `${post.categoryKo} 가이드`, '점성술', '사주', '타로', '궁합'],
      },
      // canonicalUrl 은 베어(영어) URL — 헬퍼가 로케일에 따라 /ko 를 붙인다.
      canonicalUrl: `${baseUrl}/blog/${post.slug}`,
      ogType: 'article',
      ogImage: '/og-image.png',
      publishedTime: post.date,
      modifiedTime: post.date,
    },
    locale
  )
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params
  if (isBlockedBlogPost({ slug })) {
    redirect('/blog')
  }
  const post = findPublicPost(slug)
  if (!post) {
    notFound()
  }

  const locale = await getServerLocale()
  const isKo = locale === 'ko'
  const title = isKo ? post.titleKo || post.title : post.title
  const excerpt = isKo ? post.excerptKo || post.excerpt : post.excerpt
  const postPath = `/blog/${post.slug}`
  const pageUrl = isKo ? `${baseUrl}/ko${postPath}` : `${baseUrl}${postPath}`

  const articleJsonLd = {
    ...generateJsonLd({
      type: 'Article',
      name: title,
      description: excerpt,
      datePublished: post.date,
      dateModified: post.date,
      image: `${baseUrl}/og-image.png`,
      author: { name: 'DestinyPal', url: baseUrl },
    }),
    inLanguage: isKo ? 'ko-KR' : 'en-US',
    mainEntityOfPage: pageUrl,
  }

  // BreadcrumbList 헬퍼가 baseUrl 을 앞에 붙이므로 여기선 상대 경로만 넘긴다
  // (절대 URL 을 넘기면 "https://…https://…" 로 두 번 붙는다).
  const breadcrumbJsonLd = generateJsonLd({
    type: 'BreadcrumbList',
    breadcrumbs: [
      { name: isKo ? '홈' : 'Home', url: '' },
      { name: isKo ? '가이드' : 'Guides', url: '/blog' },
      { name: title, url: postPath },
    ],
  })

  const relatedPosts = pickRelatedPosts(post, blogPosts)

  return (
    <>
      <JsonLd data={articleJsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <BlogPostClient post={post} relatedPosts={relatedPosts} />
    </>
  )
}
