import { Metadata } from 'next'

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
}

export function generateMetadata({
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
}: SEOProps): Metadata {
  const siteName = 'DestinyPal'
  const pageTitle = title.trim()
  const socialTitle = pageTitle.includes(siteName) ? pageTitle : `${pageTitle} | ${siteName}`
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
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
      locale: 'ko_KR',
      alternateLocale: ['en_US'],
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
      creator: '@destinypal',
      site: '@destinypal',
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
        'ko-KR': canonical,
        'en-US': canonical,
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

  const baseSchema = {
    '@context': 'https://schema.org',
    '@type': data.type,
  }

  switch (data.type) {
    case 'WebSite':
      return {
        ...baseSchema,
        name: data.name || 'DestinyPal',
        url: baseUrl,
        description: data.description || 'Chart the cosmos, navigate your destiny.',
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${baseUrl}/community?search={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
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
        description: 'Chart the cosmos, navigate your destiny through Saju, Astrology, and Tarot.',
        sameAs: [
          'https://twitter.com/destinypal',
          'https://facebook.com/destinypal',
          'https://instagram.com/destinypal',
        ],
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
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.8',
          ratingCount: '1250',
        },
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
  dream: [
    {
      question: 'How does dream interpretation work?',
      answer:
        'Our AI analyzes the symbols, emotions, and themes in your dream description using both psychological frameworks and cultural symbolism to provide meaningful interpretations.',
    },
    {
      question: 'What cultural perspectives are included?',
      answer:
        'We include Korean, Chinese, Islamic, Western, Hindu, Japanese, and Native American dream symbolism for a comprehensive interpretation.',
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
  numerology: [
    {
      question: 'What is numerology?',
      answer:
        'Numerology interprets numbers derived from your birth date and name to reveal patterns.',
    },
    {
      question: 'Which numbers are calculated?',
      answer: 'We calculate life path, expression, and soul urge numbers with detailed meanings.',
    },
  ],
  iching: [
    {
      question: 'What is the I Ching?',
      answer: 'The I Ching is a classic Chinese divination system based on 64 hexagrams.',
    },
    {
      question: 'How is a reading generated?',
      answer: 'You ask a question and the system generates and interprets a hexagram.',
    },
  ],
}

// Generate service schema for specific pages
export function generateServiceSchema(
  serviceType:
    | 'destiny-map'
    | 'tarot'
    | 'dream'
    | 'saju'
    | 'astrology'
    | 'numerology'
    | 'iching'
    | 'aura'
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'
  const services = {
    'destiny-map': {
      name: 'Destiny Map - Saju & Astrology Fusion',
      description:
        'Comprehensive life guidance combining Eastern Four Pillars and Western Astrology for personalized insights.',
      category: 'Spiritual Consultation',
    },
    tarot: {
      name: 'AI Tarot Reading',
      description:
        'Professional tarot readings with 78 cards, advanced spreads, and AI-powered interpretations for love, career, and life guidance.',
      category: 'Tarot Reading',
    },
    dream: {
      name: 'Dream Interpretation',
      description:
        'AI-powered dream analysis using psychological and cultural symbolism from multiple traditions.',
      category: 'Dream Analysis',
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
    numerology: {
      name: 'Numerology Analysis',
      description:
        'Life path, expression, and soul urge number calculations with detailed interpretations.',
      category: 'Numerology',
    },
    iching: {
      name: 'I Ching Oracle',
      description:
        'Traditional Chinese divination using the 64 hexagrams of the I Ching (Book of Changes).',
      category: 'Divination',
    },
    aura: {
      name: 'Aura Reading',
      description:
        'Discover your personal aura color and energy profile through our interactive quiz.',
      category: 'Energy Reading',
    },
  }

  return generateJsonLd({
    type: 'Service',
    service: services[serviceType],
    url: `${baseUrl}/${serviceType}`,
  })
}
