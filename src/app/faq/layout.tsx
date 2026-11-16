import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'
import { faqItemsForJsonLd } from './faqData'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  return generateLocalizedMetadata(
    {
      en: {
        title: 'FAQ — DestinyPal AI Saju, Tarot & Astrology Help',
        description:
          'Find answers to common questions about DestinyPal AI Saju, tarot, astrology readings, payments, accounts, and technical support.',
        keywords: [
          'destinypal faq',
          'frequently asked questions',
          'saju help',
          'tarot questions',
          'astrology help',
          'destinypal support',
          'ai reading faq',
        ],
      },
      ko: {
        title: 'FAQ — DestinyPal 자주 묻는 질문',
        description:
          'DestinyPal AI 사주, 타로, 점성 리딩, 결제, 계정, 기술 지원에 관한 자주 묻는 질문에 대한 답변을 확인하세요.',
        keywords: [
          '디스티니팔 FAQ',
          '자주 묻는 질문',
          '사주 도움말',
          '타로 질문',
          '점성 도움말',
          '디스티니팔 지원',
        ],
      },
      canonicalUrl: `${baseUrl}/faq`,
      ogImage: '/og-image.png',
    },
    locale
  )
}

export default async function FaqLayout({ children }: { children: ReactNode }) {
  // FAQPage 스키마는 화면에 보이는 FAQ 목록(faqData.ts)과 같은 항목·언어로 만든다.
  // 예전엔 레이아웃이 4개짜리 별도 사본을 들고 있어 구조화 데이터 ≠ 보이는 내용이었다.
  const locale = await getServerLocale()
  const isKo = locale === 'ko'

  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: isKo ? 'FAQ - 자주 묻는 질문' : 'FAQ - Frequently Asked Questions',
    description: isKo
      ? 'DestinyPal 서비스에 관한 자주 묻는 질문과 답변.'
      : 'Find answers to common questions about DestinyPal services.',
    url: isKo ? `${baseUrl}/ko/faq` : `${baseUrl}/faq`,
  })

  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: faqItemsForJsonLd(locale),
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
