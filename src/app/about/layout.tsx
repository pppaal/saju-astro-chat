import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  generateJsonLd,
  generateLocalizedMetadata,
  getServerLocale,
  SERVICE_FAQS,
} from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'About DestinyPal — AI Saju, Astrology & Tarot Platform',
        description:
          'DestinyPal is an AI self-understanding platform that integrates Eastern Saju (Four Pillars), Western astrology, and tarot — evidence-based readings for reflection, not predictions of fate.',
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
          '동양의 사주(사주팔자)와 서양 점성, 타로를 통합한 AI 자기 이해 플랫폼. 근거 기반 해석으로 자기 성찰을 돕고, 미래를 단정하지 않습니다.',
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
    locale
  )
}

export default function AboutLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'About DestinyPal',
    description:
      'Evidence-based AI self-understanding platform combining Eastern Saju, Western astrology, and tarot. For reflection — not predictions of fate.',
    url: `${baseUrl}/about`,
  })
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: SERVICE_FAQS.about })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
