import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateLocalizedMetadata, getServerLocale } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

const faqs = [
  {
    question: 'How accurate is DestinyPal?',
    answer:
      'We combine Saju, Western Astrology, Tarot, and advanced AI to provide integrated readings, cross-referencing Eastern and Western systems for deeper insights.',
  },
  {
    question: 'What is the Destiny Counselor?',
    answer:
      'The Destiny Counselor is our signature AI counseling feature that reads your Saju chart together with your astrological birth chart to give practical guidance.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'We apply industry-standard safeguards to protect account and payment data where supported and as applicable.',
  },
  {
    question: 'What payment methods are accepted?',
    answer:
      'We accept major credit/debit cards through Stripe. Local payment methods may be available by region.',
  },
]

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

export default function FaqLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'FAQ - Frequently Asked Questions',
    description: 'Find answers to common questions about DestinyPal services.',
    url: `${baseUrl}/faq`,
  })

  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs,
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  )
}
