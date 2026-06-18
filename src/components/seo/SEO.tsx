import { Metadata } from 'next'
import { headers } from 'next/headers'

export interface SEOProps {
  title: string
  description: string
  keywords?: string[]
  ogImage?: string
  ogType?: 'website' | 'article' | 'profile'
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player'
  canonicalUrl?: string
  author?: string
  publishedTime?: string
  modifiedTime?: string
  /** locale for openGraph + meta. default 'en' (영어 시장 우선). */
  locale?: 'ko' | 'en'
}

/**
 * Middleware가 심어둔 `x-locale` 헤더로 현재 요청 locale을 파악.
 * 영어 시장 우선이라 default는 'en'.
 */
export async function getServerLocale(): Promise<'ko' | 'en'> {
  try {
    const h = await headers()
    const raw = h.get('x-locale')
    return raw === 'ko' ? 'ko' : 'en'
  } catch {
    return 'en'
  }
}

/**
 * 영어/한국어 두 set의 SEO 텍스트를 받아 locale에 맞는 Metadata 반환.
 * 영어 검색자에 영문 title/description, 한국어 검색자에 한글 — Google이
 * 그 검색자에 맞는 결과 SERP에 표시.
 *
 * 사용:
 *   export async function generateMetadata() {
 *     const locale = await getServerLocale()
 *     return generateLocalizedMetadata({
 *       en: { title: '...', description: '...', keywords: [...] },
 *       ko: { title: '...', description: '...', keywords: [...] },
 *       canonicalUrl: 'https://destinypal.com/foo',
 *     }, locale)
 *   }
 */
export function generateLocalizedMetadata(
  input: {
    en: Pick<SEOProps, 'title' | 'description' | 'keywords'>
    ko: Pick<SEOProps, 'title' | 'description' | 'keywords'>
    ogImage?: string
    ogType?: SEOProps['ogType']
    twitterCard?: SEOProps['twitterCard']
    canonicalUrl?: string
    author?: string
    publishedTime?: string
    modifiedTime?: string
  },
  locale: 'ko' | 'en'
): Metadata {
  const pick = locale === 'ko' ? input.ko : input.en
  return generateMetadata({
    title: pick.title,
    description: pick.description,
    keywords: pick.keywords,
    ogImage: input.ogImage,
    ogType: input.ogType,
    twitterCard: input.twitterCard,
    canonicalUrl: input.canonicalUrl,
    author: input.author,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    locale,
  })
}

function generateMetadata({
  title,
  description,
  keywords = [],
  ogImage = '/og-image.png',
  ogType = 'website',
  twitterCard = 'summary_large_image',
  canonicalUrl,
  author = 'DestinyPal',
  publishedTime,
  modifiedTime,
  locale = 'en',
}: SEOProps): Metadata {
  const siteName = 'DestinyPal'
  const pageTitle = title.trim()
  const socialTitle = pageTitle.includes(siteName) ? pageTitle : `${pageTitle} | ${siteName}`
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
  const twitterHandle = process.env.NEXT_PUBLIC_TWITTER_HANDLE?.trim()
  const canonical = canonicalUrl || baseUrl
  const fullOgImage = ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`

  return {
    // Let root layout template ("%s | DestinyPal") compose the final <title> once.
    title: pageTitle.includes(siteName) ? { absolute: pageTitle } : pageTitle,
    description,
    keywords: keywords.join(', '),
    authors: [{ name: author }],
    creator: author,
    publisher: siteName,

    // Open Graph
    openGraph: {
      type: ogType,
      locale: locale === 'ko' ? 'ko_KR' : 'en_US',
      alternateLocale: [locale === 'ko' ? 'en_US' : 'ko_KR'],
      url: canonical,
      siteName,
      title: socialTitle,
      description,
      images: [
        {
          url: fullOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: twitterCard,
      title: socialTitle,
      description,
      images: [fullOgImage],
      ...(twitterHandle ? { creator: twitterHandle, site: twitterHandle } : {}),
    },

    // Additional
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    alternates: {
      canonical,
      languages: {
        'en-US': canonical,
        'ko-KR': canonical,
        'x-default': canonical,
      },
    },

    // Verification
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    },
  }
}

// Generate JSON-LD structured data
export function generateJsonLd(data: {
  type:
    | 'WebSite'
    | 'WebPage'
    | 'Article'
    | 'Organization'
    | 'Person'
    | 'BreadcrumbList'
    | 'FAQPage'
    | 'Service'
    | 'SoftwareApplication'
    | 'HowTo'
  name?: string
  url?: string
  description?: string
  author?: { name: string; url?: string }
  datePublished?: string
  dateModified?: string
  image?: string
  breadcrumbs?: Array<{ name: string; url: string }>
  faqs?: Array<{ question: string; answer: string }>
  service?: { name: string; description: string; provider?: string; category?: string }
  howTo?: { steps: Array<{ name: string; text: string }> }
  [key: string]: unknown
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
  const socialLinks = [
    process.env.NEXT_PUBLIC_X_URL,
    process.env.NEXT_PUBLIC_INSTAGRAM_URL,
    process.env.NEXT_PUBLIC_FACEBOOK_URL,
    process.env.NEXT_PUBLIC_YOUTUBE_URL,
  ].filter((value): value is string => Boolean(value?.trim()))
  const searchUrlTemplate = process.env.NEXT_PUBLIC_SITE_SEARCH_URL_TEMPLATE?.trim()

  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': data.type,
  }

  switch (data.type) {
    case 'WebSite':
      return {
        ...baseSchema,
        name: data.name || 'DestinyPal',
        alternateName: ['Destiny Pal', 'DestinyPal AI'],
        url: baseUrl,
        description:
          data.description || 'AI fortune guidance for Saju, Tarot, Astrology, and Compatibility.',
        inLanguage: ['ko-KR', 'en-US'],
        ...(searchUrlTemplate
          ? {
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: searchUrlTemplate,
                },
                'query-input': 'required name=search_term_string',
              },
            }
          : {}),
      }

    case 'WebPage':
      return {
        ...baseSchema,
        name: data.name,
        url: data.url || baseUrl,
        description: data.description,
        inLanguage: ['en-US', 'ko-KR'],
        isPartOf: {
          '@type': 'WebSite',
          name: 'DestinyPal',
          url: baseUrl,
        },
      }

    case 'Article':
      return {
        ...baseSchema,
        headline: data.name,
        description: data.description,
        image: data.image,
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
        author: {
          '@type': 'Person',
          name: data.author?.name || 'Anonymous',
          url: data.author?.url,
        },
        publisher: {
          '@type': 'Organization',
          name: 'DestinyPal',
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`,
          },
        },
      }

    case 'Organization':
      return {
        ...baseSchema,
        name: 'DestinyPal',
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description:
          'DestinyPal is an AI fortune platform for Saju, Tarot, Astrology, Compatibility, and practical timing guidance.',
        ...(socialLinks.length > 0 ? { sameAs: socialLinks } : {}),
      }

    case 'BreadcrumbList':
      return {
        ...baseSchema,
        itemListElement: data.breadcrumbs?.map((crumb, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: crumb.name,
          item: `${baseUrl}${crumb.url}`,
        })),
      }

    case 'FAQPage':
      return {
        ...baseSchema,
        mainEntity: data.faqs?.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }

    case 'Service':
      return {
        ...baseSchema,
        name: data.service?.name || data.name,
        description: data.service?.description || data.description,
        provider: {
          '@type': 'Organization',
          name: data.service?.provider || 'DestinyPal',
          url: baseUrl,
        },
        serviceType: data.service?.category || 'Spiritual Consultation',
        areaServed: 'Worldwide',
        availableChannel: {
          '@type': 'ServiceChannel',
          serviceUrl: data.url || baseUrl,
          serviceType: 'OnlineService',
        },
      }

    case 'SoftwareApplication':
      return {
        ...baseSchema,
        name: data.name || 'DestinyPal',
        description: data.description,
        applicationCategory: 'LifestyleApplication',
        operatingSystem: 'Web Browser',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        // aggregateRating 제거: 페이지에 실제로 노출되는 후기 없이 별점만 박으면
        // 구글 구조화 데이터 정책 위반(가짜 평점)이라 리치결과 거부·수동 패널티
        // 위험. 실제 사용자 후기가 쌓이고 화면에 노출되면 그때 실측값으로 복원.
      }

    case 'HowTo':
      return {
        ...baseSchema,
        name: data.name,
        description: data.description,
        step: data.howTo?.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: step.name,
          text: step.text,
        })),
      }

    default:
      return baseSchema
  }
}

// Pre-built FAQ schemas for common pages
export const SERVICE_FAQS = {
  destinyMap: [
    {
      question: 'What is Destiny Map?',
      answer:
        'Destiny Map combines Eastern Saju (Four Pillars) and Western Astrology to provide comprehensive life guidance based on your birth date, time, and location.',
    },
    {
      question: 'How accurate is Destiny Map?',
      answer:
        'Destiny Map uses precise astronomical calculations and traditional interpretation methods refined over thousands of years. It provides personalized insights based on your unique birth data.',
    },
    {
      question: 'What information do I need?',
      answer:
        'You need your birth date, exact birth time, and birth location (city or coordinates) for the most accurate reading.',
    },
  ],
  tarot: [
    {
      question: 'How does AI Tarot reading work?',
      answer:
        'Our AI Tarot system uses 78 traditional Rider-Waite cards with advanced interpretation rules. You select cards, and our AI provides detailed readings based on card positions, combinations, and your question.',
    },
    {
      question: 'Is online Tarot as accurate as in-person?',
      answer:
        'Yes, Tarot readings depend on the symbolic meanings of cards drawn. Our AI provides detailed interpretations that many users find insightful and helpful.',
    },
  ],
  saju: [
    {
      question: 'What is Saju?',
      answer:
        'Saju is the Korean Four Pillars of Destiny system based on your birth date and time.',
    },
    {
      question: 'Do I need an exact birth time?',
      answer:
        'Exact time improves accuracy, but a close estimate can still provide helpful insights.',
    },
  ],
  astrology: [
    {
      question: 'What do I need for a birth chart?',
      answer: 'We use your birth date, exact time, and place to calculate planetary positions.',
    },
    {
      question: 'How should I use astrology insights?',
      answer: 'Astrology is best used as a reflective tool for guidance and self-understanding.',
    },
  ],
  compatibility: [
    {
      question: 'How does AI compatibility analysis work?',
      answer:
        'We combine Eastern Saju (Four Pillars) and Western astrology synastry for two people, comparing birth charts to read relationship strengths, friction points, and timing for love, partnership, or friendship.',
    },
    {
      question: 'What information do I need for a compatibility reading?',
      answer:
        "You provide each person's birth date, and ideally exact birth time and place, for the most accurate synastry and Saju comparison.",
    },
    {
      question: 'Can it be used for friendships or work, not just romance?',
      answer:
        'Yes. The same Saju and astrology comparison applies to any relationship — romantic, friendship, family, or work partnerships.',
    },
  ],
  pricing: [
    {
      question: 'Is there a subscription or auto-renewal?',
      answer:
        'No. DestinyPal uses one-time credit packs — you pay only for what you use, with no subscription and no automatic renewal.',
    },
    {
      question: 'What can I use credits for?',
      answer:
        'Credits work across all features — AI Saju, Tarot readings, Compatibility analysis, and the Fortune Calendar.',
    },
    {
      question: 'Can I try DestinyPal for free?',
      answer:
        'Yes. Sign in to receive sign-up bonus credits, so you can try a reading before purchasing anything.',
    },
    {
      question: 'Can I get a refund?',
      answer:
        'Unused credits may be eligible for a refund under our refund policy. See the Refund Policy page for details.',
    },
  ],
  about: [
    {
      question: 'What is DestinyPal?',
      answer:
        'DestinyPal is an AI self-understanding platform that combines Eastern Saju (Four Pillars), Western astrology, and tarot to give personalized, reflective readings in Korean and English.',
    },
    {
      question: 'Does DestinyPal predict the future?',
      answer:
        'No. Readings are framed as possibilities and tendencies for reflection and decision-making — not fixed predictions of fate.',
    },
    {
      question: 'What languages does DestinyPal support?',
      answer: 'DestinyPal is fully available in Korean and English.',
    },
    {
      question: 'Is my birth data kept private?',
      answer:
        'Your birth and reading data are handled according to our Privacy Policy. See the Privacy Policy page for details.',
    },
  ],
}

// Generate service schema for specific pages
export function generateServiceSchema(
  serviceType: 'destiny-map' | 'tarot' | 'saju' | 'astrology' | 'compatibility',
  // 실제 라우트가 serviceType 키와 다른 경우(예: destiny-map → /destiny-counselor)
  // 정확한 경로를 넘긴다. 없으면 `/${serviceType}` 폴백.
  urlPath?: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
  const services = {
    'destiny-map': {
      name: 'Destiny Map - Saju & Astrology Fusion',
      description:
        'Comprehensive life guidance combining Eastern Four Pillars and Western Astrology for personalized insights.',
      category: 'Spiritual Consultation',
    },
    compatibility: {
      name: 'Compatibility Analysis - Saju & Astrology Synastry',
      description:
        'AI relationship compatibility combining Eastern Saju (Four Pillars) and Western astrology synastry for love, partnership, and friendship.',
      category: 'Spiritual Consultation',
    },
    tarot: {
      name: 'AI Tarot Reading',
      description:
        'Professional tarot readings with 78 cards, advanced spreads, and AI-powered interpretations for love, career, and life guidance.',
      category: 'Tarot Reading',
    },
    saju: {
      name: 'Saju - Four Pillars of Destiny',
      description:
        'Traditional Korean fortune telling based on your birth date and time using the Four Pillars system.',
      category: 'Eastern Astrology',
    },
    astrology: {
      name: 'Western Astrology',
      description:
        'Detailed astrological charts and interpretations based on planetary positions at your birth.',
      category: 'Western Astrology',
    },
  }

  return generateJsonLd({
    type: 'Service',
    service: services[serviceType],
    url: `${baseUrl}${urlPath ?? `/${serviceType}`}`,
  })
}
