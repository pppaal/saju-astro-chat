'use client'

import Link from 'next/link'
import { useCallback, useState, useEffect } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { isPlaceholderTranslation, toSafeFallbackText } from '@/i18n/utils'
import BackButton from '@/components/ui/BackButton'
import styles from './pricing.module.css'
import { CREDIT_PACKS, BASE_CREDIT_PRICE_KRW, type CreditPackType } from '@/lib/config/pricing'
import { fetchWithRetry } from '@/lib/http'

interface CreditPackDisplay {
  id: CreditPackType
  nameKey: string
  price: number
  priceEn: number
  readings: number
  popular?: boolean
}

const creditPacks: CreditPackDisplay[] = (
  ['mini', 'standard', 'plus', 'mega', 'ultimate'] as CreditPackType[]
).map((packId) => ({
  id: packId,
  nameKey: packId,
  price: CREDIT_PACKS[packId].pricing.krw,
  priceEn: CREDIT_PACKS[packId].pricing.usd,
  readings: CREDIT_PACKS[packId].credits,
  popular: CREDIT_PACKS[packId].popular,
}))

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5']
const PRICING_FALLBACKS: Record<string, string> = {
  heroTitle: 'Pricing for Your Destiny',
  heroSub: 'Pay only for what you use. No subscription, no auto-renewal.',
  paymentError: 'Payment service temporarily unavailable',
}
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
  'guarantee',
  'guaranteeDesc',
  'ctaTitle',
  'ctaSub',
  'startFree',
  'learnMore',
] as const
const SSR_PRICING_INDEX: Record<string, number> = SSR_PRICING_KEYS.reduce(
  (acc, key, idx) => {
    acc[key] = idx
    return acc
  },
  {} as Record<string, number>
)

type Locale = 'en' | 'ko'

interface PricingPageClientProps {
  initialLocale: Locale
  initialCopy: readonly string[]
}

export default function PricingPageClient({ initialLocale, initialCopy }: PricingPageClientProps) {
  const { locale: activeLocale, hydrated, t } = useI18n()
  const locale = activeLocale || initialLocale
  const isKo = locale === 'ko'
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingCredit, setLoadingCredit] = useState<string | null>(null)
  const baseCreditPriceUsd = CREDIT_PACKS.mini.perCreditUsd

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const existingReturnUrl = localStorage.getItem('checkout_return_url')
    if (existingReturnUrl) {
      return
    }

    try {
      const referrer = document.referrer
      if (referrer) {
        const referrerUrl = new URL(referrer)
        const currentHost = window.location.host

        if (referrerUrl.host === currentHost) {
          const path = referrerUrl.pathname
          if (path !== '/pricing' && path !== '/success' && !path.startsWith('/auth')) {
            localStorage.setItem('checkout_return_url', path)
          }
        }
      }
    } catch {
      // URL 파싱 실패 시 무시
    }
  }, [])

  const pt = useCallback(
    (key: string) => {
      const path = `pricing.${key}`
      const ssrValue = initialCopy[SSR_PRICING_INDEX[key]]
      const safeSsrValue =
        typeof ssrValue === 'string' && !isPlaceholderTranslation(ssrValue, path)
          ? ssrValue
          : undefined
      if (!hydrated) {
        if (safeSsrValue) {
          return safeSsrValue
        }
        return PRICING_FALLBACKS[key] || toSafeFallbackText(path)
      }

      const translated = t(path, PRICING_FALLBACKS[key])
      if (!isPlaceholderTranslation(translated, path)) {
        return translated
      }

      if (activeLocale === initialLocale && safeSsrValue) {
        return safeSsrValue
      }

      return PRICING_FALLBACKS[key] || toSafeFallbackText(path)
    },
    [activeLocale, hydrated, initialCopy, initialLocale, t]
  )

  const formatKrw = (value: number) => `₩${value.toLocaleString('ko-KR')}`
  const formatUsd = (value: number) => `$${value.toFixed(2)}`

  async function handleBuyCredit(packId: string) {
    setLoadingCredit(packId)
    try {
      const res = await fetchWithRetry(
        '/api/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creditPack: packId }),
        },
        {
          maxRetries: 2,
          timeoutMs: 15000,
        }
      )
      const data = await res.json().catch(() => null as unknown)
      // 서버는 withApiMiddleware 봉투로 `{ success: true, data: { url } }` 형태
      // 응답. 이전엔 data.url 만 봐서 항상 false → '결제 서비스 일시 불가' alert
      // 뜨고 stripe 페이지로 redirect 안 됨 (실제 응답은 200 정상). 봉투 안쪽
      // data.data.url 우선, 옛 직접 형태 data.url 도 폴백으로 지원.
      const obj = (data ?? {}) as Record<string, unknown>
      const inner = (obj.data ?? obj) as Record<string, unknown>
      const checkoutUrl =
        typeof inner.url === 'string'
          ? inner.url
          : typeof (obj as { url?: unknown }).url === 'string'
            ? (obj as { url: string }).url
            : null
      if (checkoutUrl) {
        window.location.href = checkoutUrl
      } else {
        // /api/checkout 의 에러 응답은 { error: { code, message, details } } 객체.
        // 통째로 alert 하면 "[object Object]" 가 떠서 사용자에게 무의미 — code/
        // message 를 풀어서 보여주고, 풀 응답은 console 에도 남겨서 진단 용이.
        // res.json() 이 실패하거나 응답이 비어 있으면 (HTML 5xx, 401 redirect,
        // 인증 미동기화 등) HTTP status 만이라도 alert 에 노출해야 사용자가
        // "결제 서비스 일시 불가" 같은 generic 메시지 보고 막막해하지 않음.
        console.error('[checkout] error response:', { status: res.status, data })
        const errObj = (obj.error ?? obj) as Record<string, unknown> | string
        const errMsg =
          typeof errObj === 'string'
            ? errObj
            : (errObj as { message?: string }).message ||
              (errObj as { code?: string }).code ||
              (obj as { message?: string }).message ||
              pt('paymentError')
        const code = typeof errObj === 'object' ? (errObj as { code?: string }).code : undefined
        alert(`${errMsg} (HTTP ${res.status}${code ? ` · ${code}` : ''})`)
      }
    } catch (err) {
      console.error('[checkout] request failed:', err)
      alert(pt('paymentError'))
    } finally {
      setLoadingCredit(null)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.backButton}>
        <BackButton />
      </div>

      <main className={styles.main}>
        <div className={styles.stars} aria-hidden />

        {/* Hero */}
        <section className={styles.hero}>
          <p className={styles.eyebrow}>{pt('eyebrow')}</p>
          <h1 className={styles.mainTitle}>{pt('heroTitle')}</h1>
          <p className={styles.mainSubtitle}>{pt('heroSub')}</p>
        </section>

        {/* Credit Packs */}
        <section className={styles.creditSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt('creditPacks')}</h2>
            <p className={styles.sectionDesc}>{pt('creditPacksDesc')}</p>
          </div>

          <div className={styles.creditGrid}>
            {creditPacks.map((pack) => {
              const basePrice = CREDIT_PACKS.mini.perCreditKrw
              const currentPrice = pack.price / pack.readings
              const discountPercent = Math.round((1 - currentPrice / basePrice) * 100)

              return (
                <div
                  key={pack.id}
                  className={`${styles.creditCard} ${pack.popular ? styles.popularCredit : ''}`}
                >
                  {pack.popular && (
                    <div className={styles.popularCreditBadge}>{pt('bestValue')}</div>
                  )}
                  <div className={styles.creditHeader}>
                    <h3 className={styles.creditName}>{pt(`creditPackNames.${pack.nameKey}`)}</h3>
                    <div className={styles.creditPrice}>
                      {isKo ? formatKrw(pack.price) : formatUsd(pack.priceEn)}
                    </div>
                  </div>
                  <div className={styles.creditBody}>
                    <div className={styles.creditReadings}>
                      <span className={styles.creditNumber}>{pack.readings}</span>
                      <span className={styles.creditLabel}>{pt('readings')}</span>
                    </div>
                    <div className={styles.perReading}>
                      {pt('perReading')}{' '}
                      {isKo
                        ? `${formatKrw(CREDIT_PACKS[pack.id].perCreditKrw)}`
                        : `${formatUsd(CREDIT_PACKS[pack.id].perCreditUsd)}`}
                      {discountPercent > 0 && (
                        <span className={styles.discountInline}> · -{discountPercent}%</span>
                      )}
                    </div>
                    <button
                      className={`${styles.creditButton} ${pack.popular ? styles.creditButtonPopular : ''}`}
                      onClick={() => handleBuyCredit(pack.id)}
                      disabled={loadingCredit !== null}
                    >
                      {loadingCredit === pack.id ? '...' : pt('buyNow')}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* How It Works */}
        <section className={styles.howItWorks}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt('howItWorks')}</h2>
          </div>
          <div className={styles.howItWorksGrid}>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>1</div>
              <h4>{pt('oneReading')}</h4>
              <p>{pt('oneReadingDesc')}</p>
            </div>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>FREE</div>
              <h4>{pt('freeFeature')}</h4>
              <p>{pt('freeFeatureDesc')}</p>
            </div>
            <div className={styles.howItWorksCard}>
              <div className={styles.howIcon}>3M</div>
              <h4>{pt('validity')}</h4>
              <p>{pt('validityDesc')}</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt('faq')}</h2>
          </div>

          <div className={styles.faqList} role="list">
            {faqKeys.map((key, idx) => {
              const isOpen = openFaq === idx
              const questionId = `faq-question-${idx}`
              const answerId = `faq-answer-${idx}`

              return (
                <div
                  key={idx}
                  className={`${styles.faqItem} ${isOpen ? styles.open : ''}`}
                  role="listitem"
                >
                  <button
                    id={questionId}
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenFaq(isOpen ? null : idx)
                      }
                    }}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    type="button"
                  >
                    <span>{pt(`faqs.${key}`)}</span>
                    <span className={styles.faqArrow} aria-hidden="true">
                      {isOpen ? '-' : '+'}
                    </span>
                  </button>
                  {isOpen && (
                    <div
                      id={answerId}
                      className={styles.faqAnswer}
                      role="region"
                      aria-labelledby={questionId}
                    >
                      {pt(`faqs.a${key.slice(1)}`)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Guarantee */}
        <section className={styles.guarantee}>
          <div className={styles.guaranteeIcon}>SAFE</div>
          <h3 className={styles.guaranteeTitle}>{pt('guarantee')}</h3>
          <p className={styles.guaranteeText}>{pt('guaranteeDesc')}</p>
          <p className={styles.guaranteeText}>
            {isKo
              ? `기준 단가: 1 credit ≈ ${formatKrw(BASE_CREDIT_PRICE_KRW)} (≈ ${formatUsd(baseCreditPriceUsd)})`
              : `Reference rate: 1 credit ≈ ${formatUsd(baseCreditPriceUsd)} (≈ ${formatKrw(BASE_CREDIT_PRICE_KRW)})`}
          </p>
        </section>

        {/* CTA */}
        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>{pt('ctaTitle')}</h2>
          <p className={styles.ctaSub}>{pt('ctaSub')}</p>
          <div className={styles.ctaButtons}>
            <Link href="/" className={styles.ctaPrimary}>
              {pt('startFree')}
            </Link>
            <Link href="/about" className={styles.ctaSecondary}>
              {pt('learnMore')}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
