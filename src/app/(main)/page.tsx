import MainPageClient from './MainPageClient'
import { getServerI18n } from '@/i18n/server'

export default async function MainPage() {
  const { locale, messages } = await getServerI18n()
  return <MainPageClient initialLocale={locale} initialMessages={messages} />
}
