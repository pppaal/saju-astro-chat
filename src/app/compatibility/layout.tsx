import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  generateLocalizedMetadata,
  generateServiceSchema,
  getServerLocale,
} from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Compatibility Analysis — AI Korean Astrology Synastry',
        description:
          'Discover your relationship compatibility with AI-powered analysis that fuses Eastern Saju (Four Pillars) and Western astrology synastry for love, partnership, and friendship.',
        keywords: [
          'compatibility analysis',
          'saju compatibility',
          'astrology compatibility',
          'synastry',
          'love compatibility',
          'relationship analysis',
          'couple matching',
          'birth chart compatibility',
        ],
      },
      ko: {
        title: '궁합 분석 — AI 사주·점성 시너스트리',
        description:
          '사주(사주팔자)와 서양 점성 시너스트리를 함께 분석해 연애, 파트너십, 우정 궁합을 AI가 진단해드립니다.',
        keywords: ['궁합 분석', '사주 궁합', '점성 궁합', '연애 궁합', '커플 매칭', '관계 분석'],
      },
      canonicalUrl: `${baseUrl}/compatibility`,
      ogImage: '/og-image.png',
    },
    locale
  )
}

export default function CompatibilityLayout({ children }: { children: ReactNode }) {
  // Service schema only. /compatibility itself redirects to the counselor, and
  // every indexable child (/compatibility/free, /zodiac/*, /signs/*) emits its
  // own WebPage, so a layout-level WebPage would only leak a wrong URL into
  // them. No FAQPage: nothing under /compatibility renders a visible FAQ.
  const serviceJsonLd = generateServiceSchema('compatibility')

  return (
    <>
      <JsonLd data={serviceJsonLd} />
      {children}
    </>
  )
}
