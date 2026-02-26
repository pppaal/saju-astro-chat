import DestinyMapPageClient from '@/app/destiny-map/DestinyMapPageClient'
import { getServerI18n } from '@/i18n/server'

export default async function DestinyCounselorPage() {
  const { locale, messages } = await getServerI18n()
  return <DestinyMapPageClient initialLocale={locale} initialMessages={messages} />
}
