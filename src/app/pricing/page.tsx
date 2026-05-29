import PricingPageClient from './PricingPageClient'
import { getServerI18n, getServerTranslation } from '@/i18n/server'
import { SSR_PRICING_KEYS } from './pricingCopyKeys'

export default async function PricingPage() {
  const { locale, messages } = await getServerI18n()
  const ssrCopy = SSR_PRICING_KEYS.map((key) => getServerTranslation(messages, `pricing.${key}`))
  return <PricingPageClient initialLocale={locale} initialCopy={ssrCopy} />
}
