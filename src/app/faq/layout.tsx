import type { ReactNode } from 'react'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

const faqs = [
  {
    question: 'How accurate is DestinyPal?',
    answer:
      'We combine Saju, Western Astrology, Tarot, and advanced AI to provide integrated readings. Our Destiny Fusion Matrix cross-references Eastern and Western systems for deeper insights.',
  },
  {
    question: 'What is the Destiny Map?',
    answer:
      'The Destiny Map is our signature visualization tool that combines your Saju chart, astrological birth chart, and numerology into one comprehensive view.',
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

export const metadata = generateMetadata({
  title: 'FAQ - Frequently Asked Questions',
  description:
    'Find answers to common questions about DestinyPal services, payments, accounts, and technical support.',
  keywords: [
    'destinypal faq',
    'frequently asked questions',
    'help',
    'support',
    'tarot questions',
    'astrology help',
  ],
  canonicalUrl: `${baseUrl}/faq`,
  ogImage: '/og-image.png',
})

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
