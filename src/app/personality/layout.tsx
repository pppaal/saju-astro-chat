import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const meta = generateLocalizedMetadata(
    {
      en: {
        title: 'Personality Test — AI Self-Understanding Assessment',
        description:
          'Map your core personality pattern with an AI-assisted assessment focused on decision style, pressure response, and practical self-understanding.',
        keywords: [
          'personality test',
          'ai personality assessment',
          'personality type',
          'decision style',
          'behavior pattern',
          'self understanding',
          'personality quiz',
        ],
      },
      ko: {
        title: '성격 테스트 — AI 자기 이해 진단',
        description:
          '결정 스타일, 압박 상황 반응, 실생활 자기 이해에 초점을 맞춘 AI 기반 성격 진단으로 핵심 성향을 그려드려요.',
        keywords: [
          '성격 테스트',
          '성격 유형',
          'AI 성격 분석',
          '의사결정 스타일',
          '자기 이해',
          '성격 진단',
        ],
      },
      canonicalUrl: `${baseUrl}/personality`,
      ogImage: '/og-image.png',
    },
    locale,
  )
  // Retired from public navigation — keep the page for direct/deep links but
  // exclude it from search so the discontinued feature doesn't surface.
  return { ...meta, robots: { index: false, follow: false } }
}

export default function PersonalityLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Personality Test - DestinyPal',
    description:
      'Map your core personality pattern with an AI-assisted assessment focused on decision style, pressure response, and practical self-understanding.',
    url: `${baseUrl}/personality`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
