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
        title: 'About DestinyPal — AI Saju, Astrology & Tarot Platform',
        description:
          'DestinyPal is an AI self-understanding platform that integrates Eastern Saju (Four Pillars), Western astrology, and tarot — diagnose with fate, analyze with psychology, heal with spirituality.',
        keywords: [
          'about destinypal',
          'ai fortune telling',
          'saju platform',
          'astrology app',
          'tarot platform',
          'spiritual ai',
          'four pillars ai',
          'destiny platform',
        ],
      },
      ko: {
        title: '디스티니팔 소개 — AI 사주·점성·타로 플랫폼',
        description:
          '동양의 사주(사주팔자)와 서양 점성, 타로를 통합한 AI 자기 이해 플랫폼. 운명으로 진단하고, 심리로 분석하며, 영성으로 치유합니다.',
        keywords: [
          '디스티니팔 소개',
          'AI 사주',
          'AI 점성',
          'AI 타로',
          '사주 플랫폼',
          '운세 앱',
          '자기 이해',
        ],
      },
      canonicalUrl: `${baseUrl}/about`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'About DestinyPal',
    description:
      'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.',
    url: `${baseUrl}/about`,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  )
}
