import DestinyMapPageClient from '@/app/destiny-map/DestinyMapPageClient'
import { getServerI18n } from '@/i18n/server'
import { generateMetadata } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export const metadata = generateMetadata({
  title: 'Destiny Counselor',
  description:
    'Chat with the AI destiny counselor using your integrated Saju and astrology profile for practical guidance.',
  keywords: [
    'destiny counselor',
    'ai counselor',
    'saju counseling',
    'astrology counseling',
    'life guidance chat',
  ],
  canonicalUrl: `${baseUrl}/destiny-counselor`,
  ogImage: '/og-image.png',
})

export default async function DestinyCounselorPage() {
  const { locale, messages } = await getServerI18n()
  return <DestinyMapPageClient initialLocale={locale} initialMessages={messages} />
}
