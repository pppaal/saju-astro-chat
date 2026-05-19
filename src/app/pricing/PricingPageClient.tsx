'use client'

import Link from 'next/link'
import { useCallback, useState, useEffect } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { isPlaceholderTranslation, toSafeFallbackText } from '@/i18n/utils'
import BackButton from '@/components/ui/BackButton'
import styles from './pricing.module.css'
import {
  CREDIT_PACKS,
  BASE_CREDIT_PRICE_KRW,
  type CreditPackType,
} from '@/lib/config/pricing'
import { fetchWithRetry } from '@/lib/http'

interface CreditPackDisplay {
  id: CreditPackType
  nameKey: string
  price: number
  priceEn: number
  readings: number
  gradient: string
  popular?: boolean
}

const CREDIT_PACK_GRADIENTS: Record<CreditPackType, string> = {
  mini: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  standard: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  plus: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  mega: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  ultimate: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
}

const creditPacks: CreditPackDisplay[] = (
  ['mini', 'standard', 'plus', 'mega', 'ultimate'] as CreditPackType[]
).map((packId) => ({
  id: packId,
  nameKey: packId,
  price: CREDIT_PACKS[packId].pricing.krw,
  priceEn: CREDIT_PACKS[packId].pricing.usd,
  readings: CREDIT_PACKS[packId].credits,
  gradient: CREDIT_PACK_GRADIENTS[packId],
  popular: CREDIT_PACKS[packId].popular,
}))

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5']
const PRICING_FALLBACKS: Record<string, string> = {
  heroTitle: 'Pricing for Your Destiny',
  heroSub: 'AI counseling, Tarot, and Dream interpretation at reasonable prices',
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
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || pt('paymentError'))
      }
    } catch {
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
                  {discountPercent > 0 && (
                    <div className={styles.discountBadge}>-{discountPercent}%</div>
                  )}
                  <div className={styles.creditHeader} style={{ background: pack.gradient }}>
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
                        ? `${formatKrw(CREDIT_PACKS[pack.id].perCreditKrw)} (≈ ${formatUsd(CREDIT_PACKS[pack.id].perCreditUsd)})`
                        : `${formatUsd(CREDIT_PACKS[pack.id].perCreditUsd)} (≈ ${formatKrw(CREDIT_PACKS[pack.id].perCreditKrw)})`}
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
            <Link href="/destiny-map" className={styles.ctaPrimary}>
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
