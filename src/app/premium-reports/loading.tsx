import UnifiedServiceLoading from '@/components/ui/UnifiedServiceLoading'
import { detectServerLocale } from '@/i18n/server'

export default async function Loading() {
  const locale = await detectServerLocale()
  return <UnifiedServiceLoading kind="aiReport" locale={locale} />
}
