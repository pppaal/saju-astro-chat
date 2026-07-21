import { MetadataRoute } from 'next'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import { ALL_CARD_SLUGS } from '@/lib/tarot/cardPages'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'
import { allPairSlugs } from '@/lib/compatibility/zodiacCompat'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 정적 lastModified 상수 — 매 요청마다 new Date()로 갱신하면 크롤러가 매번
// "방금 수정됨"으로 보고 lastModified 신호를 평가절하 + 크롤 예산을 낭비함.
// 콘텐츠가 실제로 크게 바뀔 때(랜딩 카피, 가격, FAQ 대규모 개편 등) 이 상수만
// 수동으로 올려준다. 블로그 글은 각 post.date 사용 — 아래 blogPages 참조.
const SITE_LAST_MODIFIED = '2026-05-29T00:00:00.000Z'

type PageOpts = {
  lastModified: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

// /ko 경로 프리픽스(proxy.ts 리라이트) 규약: 베어 경로 = en, /ko/... = ko.
// 두 URL 을 모두 sitemap 에 올리고 서로를 hreflang alternates 로 가리켜야
// 구글이 언어별 버전을 각각 색인한다 — 이전엔 en/ko 가 같은 URL 이라 무력했음.
function localizedEntries(path: string, opts: PageOpts): MetadataRoute.Sitemap {
  const enUrl = path === '/' ? BASE_URL : `${BASE_URL}${path}`
  const koUrl = path === '/' ? `${BASE_URL}/ko` : `${BASE_URL}/ko${path}`
  const alternates = { languages: { en: enUrl, ko: koUrl } }
  return [
    { url: enUrl, ...opts, alternates },
    { url: koUrl, ...opts, alternates },
  ]
}

export default function sitemap(): MetadataRoute.Sitemap {
  const currentDate = SITE_LAST_MODIFIED

  // Main public pages
  const mainPages: MetadataRoute.Sitemap = [
    ...localizedEntries('/', {
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1,
    }),
    ...localizedEntries('/about', {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...localizedEntries('/faq', {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    ...localizedEntries('/contact', {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
    ...localizedEntries('/pricing', {
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
    ...localizedEntries('/blog', {
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
    // /destiny-counselor 는 ENABLED_SERVICES(servicePages)에서 이미 내보냄
    // 무료 퍼널 허브 — 소셜(인스타/쓰레드/유튜브) 유입의 착지점. 색인되어
    // 검색에서도 "무료 타로/궁합" 의도로 들어오게 한다. priority 높게.
    ...localizedEntries('/free', {
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
    ...localizedEntries('/compatibility/free', {
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
  ]

  const servicePages: MetadataRoute.Sitemap = ENABLED_SERVICES.flatMap((service) =>
    localizedEntries(service.href, {
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.9,
    })
  )

  // Policy pages
  const policyPages: MetadataRoute.Sitemap = ['terms', 'privacy', 'refund'].flatMap((policy) =>
    localizedEntries(`/policy/${policy}`, {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  )

  // 타로 카드 의미 사전 — 프로그램매틱 SEO 표면(인덱스 + 78장 상세).
  // 콘텐츠는 덱 SSOT 에서 렌더되는 상시(evergreen) 페이지.
  const tarotCardPages: MetadataRoute.Sitemap = [
    ...localizedEntries('/tarot/cards', {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...ALL_CARD_SLUGS.flatMap((slug) =>
      localizedEntries(`/tarot/cards/${slug}`, {
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    ),
  ]

  // 띠별 오늘의 운세 — 매일 갱신되는 데일리 SEO 표면(인덱스 + 12띠).
  const fortunePages: MetadataRoute.Sitemap = [
    ...localizedEntries('/fortune', {
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...ZODIAC_ANIMALS.flatMap((a) =>
      localizedEntries(`/fortune/${a.slug}`, {
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 0.8,
      })
    ),
  ]

  // 띠 궁합 — 프로그램매틱 SEO 표면(허브 + 78개 정규 조합). 상시(evergreen)
  // 콘텐츠라 changeFrequency monthly. 역순 슬러그는 canonical 로 정규를 가리키므로
  // 사이트맵엔 정규 슬러그(allPairSlugs)만 올린다.
  const zodiacCompatPages: MetadataRoute.Sitemap = [
    ...localizedEntries('/compatibility/zodiac', {
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...allPairSlugs().flatMap((slug) =>
      localizedEntries(`/compatibility/zodiac/${slug}`, {
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    ),
  ]

  // Blog posts (ko/en 본문이 같은 slug 에 공존 — 언어별 URL 로 각각 색인)
  const blogPages: MetadataRoute.Sitemap = blogPosts
    .filter((post) => !isBlockedBlogPost(post))
    .flatMap((post) =>
      localizedEntries(`/blog/${post.slug}`, {
        lastModified: post.date || currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    )

  return [
    ...mainPages,
    ...servicePages,
    ...policyPages,
    ...fortunePages,
    ...tarotCardPages,
    ...zodiacCompatPages,
    ...blogPages,
  ]
}
