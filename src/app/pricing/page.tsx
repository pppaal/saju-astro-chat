import PricingPageClient from './PricingPageClient'
import { getServerI18n, getServerTranslation } from '@/i18n/server'

const SSR_PRICING_KEYS = [
  'paymentError',
  'eyebrow',
  'heroTitle',
  'heroSub',
  'creditPacks',
  'creditPacksDesc',
  'bestValue',
  'readings',
  'perReading',
  'buyNow',
  'howItWorks',
  'oneReading',
  'oneReadingDesc',
  'freeFeature',
  'freeFeatureDesc',
  'validity',
  'validityDesc',
  'faq',
  'faqs.q1',
  'faqs.a1',
  'faqs.q2',
  'faqs.a2',
  'faqs.q3',
  'faqs.a3',
  'faqs.q4',
  'faqs.a4',
  'faqs.q5',
  'faqs.a5',
  'faqs.q6',
  'faqs.a6',
  'faqs.q7',
  'faqs.a7',
  'faqs.q8',
  'faqs.a8',
  'guarantee',
  'guaranteeDesc',
  'ctaTitle',
  'ctaSub',
  'startFree',
  'learnMore',
] as const

export default async function PricingPage() {
  const { locale, messages } = await getServerI18n()
  const ssrCopy = SSR_PRICING_KEYS.map((key) => getServerTranslation(messages, `pricing.${key}`))
  return <PricingPageClient initialLocale={locale} initialCopy={ssrCopy} />
}
