import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Match — AI Saju & Astrology Compatibility',
        description:
          'Find your cosmic match with AI-powered compatibility scoring that fuses Saju (Four Pillars) and Western astrology synastry for love, friendship, and partnership.',
        keywords: [
          'destiny match',
          'saju compatibility',
          'astrology compatibility',
          'synastry match',
          'love compatibility',
          'birth chart matching',
          'ai matchmaking',
          'soulmate match',
        ],
      },
      ko: {
        title: '운명 매칭 — AI 사주·점성 궁합',
        description:
          '사주와 서양 점성 시너스트리를 함께 분석해 연애, 우정, 파트너십 궁합을 점수로 보여주는 AI 운명 매칭.',
        keywords: [
          '운명 매칭',
          '사주 궁합',
          '점성 궁합',
          '연애 궁합',
          '커플 매칭',
          'AI 궁합',
        ],
      },
      canonicalUrl: `${baseUrl}/destiny-match`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function DestinyMatchLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Destiny Match',
    description:
      'Find your cosmic connection with AI-powered matching based on Saju and astrology compatibility.',
    url: `${baseUrl}/destiny-match`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
