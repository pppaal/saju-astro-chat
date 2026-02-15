import DestinyMapPageClient from './DestinyMapPageClient'
import { getServerI18n } from '@/i18n/server'

export default async function DestinyMapPage() {
  const { locale, messages } = await getServerI18n()
  return <DestinyMapPageClient initialLocale={locale} initialMessages={messages} />
}
