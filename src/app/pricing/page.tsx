import PricingPageClient from './PricingPageClient'
import { getServerI18n, getServerTranslation } from '@/i18n/server'
import { SSR_PRICING_KEYS } from './pricingCopyKeys'
import { isCheckoutCurrencySupported } from '@/lib/payments/prices'

export default async function PricingPage() {
  const { locale, messages } = await getServerI18n()
  const ssrCopy = SSR_PRICING_KEYS.map((key) => getServerTranslation(messages, `pricing.${key}`))
  // USD Stripe Price 가 전 팩에 설정돼 있는지 — 표시 통화 결정에 필요하다.
  // 환경변수는 서버만 볼 수 있으므로 서버 컴포넌트에서 내려준다. 클라가
  // `isKo || !usdEnabled ? KRW : USD` 로 계산하면 /api/checkout 의
  // resolveCheckoutCurrency(locale) 와 같은 값이 나온다(표시 == 청구).
  const usdEnabled = isCheckoutCurrencySupported('USD')
  return <PricingPageClient initialLocale={locale} initialCopy={ssrCopy} usdEnabled={usdEnabled} />
}
