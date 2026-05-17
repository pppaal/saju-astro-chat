import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import {
  generateJsonLd,
  generateLocalizedMetadata,
  generateServiceSchema,
  getServerLocale,
  SERVICE_FAQS,
} from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'Destiny Map — AI Saju & Astrology Birth Chart',
        description:
          'Get integrated destiny insights by combining Saju (Four Pillars) and Western astrology birth chart for profile, timing, and decision guidance.',
        keywords: [
          'destiny map',
          'saju',
          'four pillars of destiny',
          'birth chart',
          'natal chart',
          'astrology chart',
          'life guidance',
          'korean fortune telling',
          'ai astrology',
        ],
      },
      ko: {
        title: '운명 지도 — AI 사주·점성 종합 분석',
        description:
          '사주(사주팔자)와 서양 점성을 결합해 성향, 시기, 의사결정 가이드를 한 화면에서 보여주는 통합 운명 지도.',
        keywords: [
          '운명 지도',
          '사주',
          '사주팔자',
          '천궁도',
          '점성 차트',
          '사주 풀이',
          '인생 가이드',
          'AI 사주',
        ],
      },
      canonicalUrl: `${baseUrl}/destiny-map`,
      ogImage: '/og-image.png',
    },
    locale,
  )
}

export default function DestinyMapLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'Destiny Map',
    description:
      'Get integrated destiny insights by combining Saju and Western astrology for profile, timing, and decision guidance.',
    url: `${baseUrl}/destiny-map`,
  })
  const serviceJsonLd = generateServiceSchema('destiny-map')
  const faqJsonLd = generateJsonLd({ type: 'FAQPage', faqs: SERVICE_FAQS.destinyMap })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
