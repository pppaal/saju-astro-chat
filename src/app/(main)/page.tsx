import type { Metadata } from 'next'
import MainPageClient from './MainPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateJsonLd, generateMetadata } from '@/components/seo/SEO'
import { JsonLd } from '@/components/seo/JsonLd'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata: Metadata = generateMetadata({
  title: 'DestinyPal AI Fortune Platform',
  description:
    'DestinyPal is an AI fortune platform for Saju, Tarot, Astrology, Compatibility, and Destiny Map guidance. Explore Korean fortune reading, timing insight, and practical self-understanding.',
  keywords: [
    'DestinyPal',
    'destinypal',
    'ai fortune reading',
    'saju',
    'tarot',
    'astrology',
    'compatibility',
    'korean fortune telling',
    'destiny map',
    'fortune calendar',
  ],
  canonicalUrl: baseUrl,
})

export default async function MainPage() {
  const { locale, messages } = await getServerI18n()
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'DestinyPal AI Fortune Platform',
    description:
      'DestinyPal is an AI fortune platform for Saju, Tarot, Astrology, Compatibility, and Destiny Map guidance.',
    url: baseUrl,
  })
  const faqJsonLd = generateJsonLd({
    type: 'FAQPage',
    faqs: [
      {
        question: 'What is DestinyPal?',
        answer:
          'DestinyPal is an AI fortune platform that connects Saju, astrology, tarot, compatibility, and timing guidance into one experience.',
      },
      {
        question: 'What can I do on DestinyPal?',
        answer:
          'You can explore Destiny Map readings, tarot spreads, timing guidance, compatibility analysis, and AI reports.',
      },
      {
        question: 'Does DestinyPal support Korean fortune reading?',
        answer:
          'Yes. DestinyPal includes Korean Saju and extends it with astrology, tarot, and cross-system interpretation.',
      },
    ],
  })

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={faqJsonLd} />
      <MainPageClient initialLocale={locale} initialMessages={messages} />
    </>
  )
}
