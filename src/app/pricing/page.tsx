import PricingPageClient from './PricingPageClient'
import { getServerI18n } from '@/i18n/server'

export default async function PricingPage() {
  const { locale, messages } = await getServerI18n()
  return <PricingPageClient initialLocale={locale} initialMessages={messages} />
}
