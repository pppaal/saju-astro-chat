import { MetadataRoute } from 'next'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { ENABLED_SERVICES } from '@/config/enabledServices'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 정적 lastModified 상수 — 매 요청마다 new Date()로 갱신하면 크롤러가 매번
// "방금 수정됨"으로 보고 lastModified 신호를 평가절하 + 크롤 예산을 낭비함.
// 콘텐츠가 실제로 크게 바뀔 때(랜딩 카피, 가격, FAQ 대규모 개편 등) 이 상수만
// 수동으로 올려준다. 블로그 글은 각 post.date 사용 — 아래 blogPages 참조.
const SITE_LAST_MODIFIED = '2026-05-29T00:00:00.000Z'

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = SITE_LAST_MODIFIED

  // Main public pages
  const mainPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
      alternates: {
        languages: {
          en: BASE_URL,
          ko: BASE_URL,
        },
      },
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/blog`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/destiny-counselor`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // 무료 퍼널 허브 — 소셜(인스타/쓰레드/유튜브) 유입의 착지점. 색인되어
    // 검색에서도 "무료 타로/궁합" 의도로 들어오게 한다. priority 높게.
    {
      url: `${BASE_URL}/free`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: { en: `${BASE_URL}/free`, ko: `${BASE_URL}/free` },
      },
    },
    {
      url: `${BASE_URL}/compatibility/free`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
      alternates: {
        languages: {
          en: `${BASE_URL}/compatibility/free`,
          ko: `${BASE_URL}/compatibility/free`,
        },
      },
    },
  ]

  const servicePages: MetadataRoute.Sitemap = ENABLED_SERVICES.map((service) => ({
    url: `${BASE_URL}${service.href}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
    alternates: {
      languages: {
        en: `${BASE_URL}${service.href}`,
        ko: `${BASE_URL}${service.href}`,
      },
    },
  }))

  // Policy pages
  const policyPages: MetadataRoute.Sitemap = ['terms', 'privacy', 'refund'].map((policy) => ({
    url: `${BASE_URL}/policy/${policy}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.5,
  }))

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = blogPosts
    .filter((post) => !isBlockedBlogPost(post))
    .map((post) => ({
      url: `${BASE_URL}/blog/${post.slug}`,
      lastModified: post.date || currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))

  return [...mainPages, ...servicePages, ...policyPages, ...blogPages]
}
