import TarotChatScreen from '@/components/tarot/TarotChatScreen'
import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd } from '@/components/seo/SEO'

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://destinypal.com'

export default function TarotPage() {
  const pageJsonLd = generateJsonLd({
    type: 'WebPage',
    name: 'AI Tarot Reading',
    description:
      'AI tarot readings with 78 cards and curated spreads for love, career, and life guidance.',
    url: `${baseUrl}/tarot`,
  })
  return (
    <>
      <JsonLd data={pageJsonLd} />
      <TarotChatScreen />
    </>
  )
}
