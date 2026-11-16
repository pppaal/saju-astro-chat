import { MetadataRoute } from 'next'
import { blogPosts } from '@/data/blog-posts'
import { isBlockedBlogPost } from '@/data/blog/publicFilters'
import { ENABLED_SERVICES } from '@/config/enabledServices'
import { ALL_CARD_SLUGS } from '@/lib/tarot/cardPages'
import { ZODIAC_ANIMALS } from '@/lib/fortune/zodiacDaily'
import { allPairSlugs } from '@/lib/compatibility/zodiacCompat'
import { SUN_SIGNS } from '@/lib/astrology/sunSigns'
import { allSignPairSlugs } from '@/lib/compatibility/sunSignCompat'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

// 정적 lastModified 상수 — 매 요청마다 new Date()로 갱신하면 크롤러가 매번
// "방금 수정됨"으로 보고 lastModified 신호를 평가절하 + 크롤 예산을 낭비함.
// 콘텐츠가 실제로 크게 바뀔 때(랜딩 카피, 가격, FAQ 대규모 개편 등) 이 상수만
// 수동으로 올려준다. 블로그 글은 각 post.date 사용 — 아래 blogPages 참조.
// 2026-11-16: 영어 우선 리뉴얼 — 루트/홈/free 메타데이터, 전 페이지 공통
// 푸터(Explore 링크 블록), 블로그 색인/상세 구조가 바뀜.
const SITE_LAST_MODIFIED = '2026-11-16T00:00:00.000Z'

// 가족(family)별 상시(evergreen) 상수 — 해당 가족의 템플릿/카피/엔진이 바뀔 때만 올린다.
// 무료 도구(캘린더·인생 곡선·통합 리포트·오늘의 타로) layout 메타데이터 신설일.
const TOOL_PAGES_LAST_MODIFIED = '2026-11-16T00:00:00.000Z'
// /method 본문 — src/app/method/page.tsx 의 PAGE_DATE 와 같은 날짜를 유지한다.
const METHOD_LAST_MODIFIED = '2026-11-16T00:00:00.000Z'
// 별자리 궁합(/compatibility/signs + 78쌍) — 엔진·카피 뱅크 신설일.
const SIGN_COMPAT_LAST_MODIFIED = '2026-11-16T00:00:00.000Z'

type PageOpts = {
  lastModified: string
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
  priority: number
}

// 매일 내용이 바뀌는 표면(/horoscope·/fortune)의 lastModified — 오늘의 UTC 날짜
// 00:00 으로 고정한다. 요청 시각이 아니라 날짜 단위라 하루에 한 번만 바뀌고,
// 같은 날 어느 요청이든 같은 값(결정론). 호출당 한 번만 계산해서 재사용한다.
function utcMidnightIso(now: Date): string {
  return `${now.toISOString().slice(0, 10)}T00:00:00.000Z`
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

// 영어 전용 표면(/horoscope, /compatibility/signs, /method) — 한국어 본문이 없다.
// proxy.ts 리라이트 때문에 /ko/... 로도 열리지만 그 변형은 페이지 쪽
// generateEnglishOnlyMetadata 가 noindex,follow + 베어 canonical 로 선언하므로
// 사이트맵엔 베어 URL 하나만 올리고 alternates 도 en + x-default 만 둔다.
// (ko alternate 를 넣으면 색인 안 되는 URL 을 가리키는 hreflang 이 되어 버린다.)
function englishOnlyEntry(path: string, opts: PageOpts): MetadataRoute.Sitemap[number] {
  const url = `${BASE_URL}${path}`
  return { url, ...opts, alternates: { languages: { en: url, 'x-default': url } } }
}

// Next 는 generateSitemaps 가 없으면 default export 를 인자 없이 호출한다
// (`handler()`). `now` 는 테스트에서 날짜를 고정하기 위한 주입 지점이며,
// 훗날 generateSitemaps 가 추가돼 `{ id }` 객체가 넘어와도 깨지지 않도록
// Date 인스턴스일 때만 사용한다(결정론 컨벤션: docs/SOLAR_TIME_CONVENTION.md).
export default function sitemap(now?: Date): MetadataRoute.Sitemap {
  const currentDate = SITE_LAST_MODIFIED
  const today = utcMidnightIso(now instanceof Date ? now : new Date())

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

  // 무료 도구(무로그인) — 한국어 UI 가 있어 bilingual. 각 라우트의 layout 이
  // 자기 canonical/hreflang 메타데이터를 낸다(calendar·destiny·integrated-report·
  // tarot/daily layout.tsx). /calendar 는 ENABLED_SERVICES 에서 빠져 있어 여기서 올린다.
  // /compatibility/free 는 위 mainPages 에 이미 있다.
  const toolPages: MetadataRoute.Sitemap = [
    ...localizedEntries('/calendar', {
      lastModified: TOOL_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
    ...localizedEntries('/destiny', {
      lastModified: TOOL_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.8,
    }),
    ...localizedEntries('/integrated-report', {
      lastModified: TOOL_PAGES_LAST_MODIFIED,
      changeFrequency: 'weekly',
      priority: 0.9,
    }),
    ...localizedEntries('/tarot/daily', {
      lastModified: TOOL_PAGES_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.8,
    }),
  ]

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
  // 본문이 날마다 바뀌므로 lastModified 는 오늘(UTC 00:00).
  const fortunePages: MetadataRoute.Sitemap = [
    ...localizedEntries('/fortune', {
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...ZODIAC_ANIMALS.flatMap((a) =>
      localizedEntries(`/fortune/${a.slug}`, {
        lastModified: today,
        changeFrequency: 'daily',
        priority: 0.8,
      })
    ),
  ]

  // 별자리 오늘의 운세(영어 전용) — 허브 + 12 별자리. 매일 12:00 UTC 천체 위치로
  // 다시 계산되는 데일리 표면이라 lastModified 는 오늘(UTC 00:00).
  const horoscopePages: MetadataRoute.Sitemap = [
    englishOnlyEntry('/horoscope', {
      lastModified: today,
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...SUN_SIGNS.map((sign) =>
      englishOnlyEntry(`/horoscope/${sign.slug}`, {
        lastModified: today,
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

  // 별자리 궁합(영어 전용) — 허브 + 78개 정규 조합(같은 별자리 12 + 서로 다른 쌍 66).
  // 정규 슬러그는 SUN_SIGNS index 가 낮은 쪽이 먼저(allSignPairSlugs); 역순은
  // 페이지가 canonical 로 정규를 가리키므로 사이트맵엔 정규만 올린다.
  const sunSignCompatPages: MetadataRoute.Sitemap = [
    englishOnlyEntry('/compatibility/signs', {
      lastModified: SIGN_COMPAT_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    }),
    ...allSignPairSlugs().map((slug) =>
      englishOnlyEntry(`/compatibility/signs/${slug}`, {
        lastModified: SIGN_COMPAT_LAST_MODIFIED,
        changeFrequency: 'monthly',
        priority: 0.7,
      })
    ),
  ]

  // /method — "How DestinyPal computes a reading" (영어 전용, 상시).
  const methodPages: MetadataRoute.Sitemap = [
    englishOnlyEntry('/method', {
      lastModified: METHOD_LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.7,
    }),
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
    ...toolPages,
    ...policyPages,
    ...fortunePages,
    ...horoscopePages,
    ...tarotCardPages,
    ...zodiacCompatPages,
    ...sunSignCompatPages,
    ...methodPages,
    ...blogPages,
  ]
}
