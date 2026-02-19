'use client'

import Link from 'next/link'
import { useCallback, useState, useEffect } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import { isPlaceholderTranslation, toSafeFallbackText } from '@/i18n/utils'
import BackButton from '@/components/ui/BackButton'
import styles from './pricing.module.css'
import {
  PLANS,
  CREDIT_PACKS,
  YEARLY_DISCOUNT_PERCENT,
  YEARLY_DISCOUNT_MULTIPLIER,
  type PlanType,
  type CreditPackType,
} from '@/lib/config/pricing'
import { fetchWithRetry } from '@/lib/http'

interface PlanFeature {
  textKey: string
  included: boolean
}

interface PlanDisplay {
  id: string
  nameKey: string
  price: number
  priceEn: number
  readings: number
  features: PlanFeature[]
  popular?: boolean
  gradient: string
}

interface CreditPackDisplay {
  id: string
  nameKey: string
  price: number
  priceEn: number
  readings: number
  perReading: string
  perReadingEn: string
  gradient: string
  popular?: boolean
}

// Plan display configuration derived from centralized pricing config
const PLAN_GRADIENTS: Record<PlanType, string> = {
  free: 'linear-gradient(135deg, #3a3f5c 0%, #2a2f4c 100%)',
  starter: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  pro: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  premium: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
}

const PLAN_FEATURES: Record<PlanType, PlanFeature[]> = {
  free: [
    { textKey: 'aiChat7', included: true },
    { textKey: 'calendarThisMonth', included: true },
    { textKey: 'personalityFree', included: true },
    { textKey: 'calendar3months', included: false },
    { textKey: 'adFree', included: false },
  ],
  starter: [
    { textKey: 'aiChat25', included: true },
    { textKey: 'calendar3months', included: true },
    { textKey: 'personalityFree', included: true },
    { textKey: 'adFree', included: true },
    { textKey: 'calendar1year', included: false },
  ],
  pro: [
    { textKey: 'aiChat80', included: true },
    { textKey: 'calendar1year', included: true },
    { textKey: 'personalityFree', included: true },
    { textKey: 'adFree', included: true },
    { textKey: 'calendar2years', included: false },
  ],
  premium: [
    { textKey: 'aiChat200', included: true },
    { textKey: 'calendar2years', included: true },
    { textKey: 'personalityFree', included: true },
    { textKey: 'adFree', included: true },
    { textKey: 'prioritySupport', included: true },
  ],
}

// Build plans array from centralized config
const plans: PlanDisplay[] = (['free', 'starter', 'pro', 'premium'] as PlanType[]).map(
  (planId) => ({
    id: planId,
    nameKey: planId,
    price: PLANS[planId].pricing.monthly.krw,
    priceEn: PLANS[planId].pricing.monthly.usd,
    readings: PLANS[planId].config.monthlyCredits,
    features: PLAN_FEATURES[planId],
    popular: planId === 'pro',
    gradient: PLAN_GRADIENTS[planId],
  })
)

// Credit pack display configuration
const CREDIT_PACK_GRADIENTS: Record<CreditPackType, string> = {
  mini: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  standard: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  plus: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
  mega: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  ultimate: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
}

// Build credit packs array from centralized config
const creditPacks: CreditPackDisplay[] = (
  ['mini', 'standard', 'plus', 'mega', 'ultimate'] as CreditPackType[]
).map((packId) => ({
  id: packId,
  nameKey: packId,
  price: CREDIT_PACKS[packId].pricing.krw,
  priceEn: CREDIT_PACKS[packId].pricing.usd,
  readings: CREDIT_PACKS[packId].credits,
  perReading: `KRW ${CREDIT_PACKS[packId].perCreditKrw}`,
  perReadingEn: `$${CREDIT_PACKS[packId].perCreditUsd.toFixed(2)}`,
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
  'free',
  'perYear',
  'perMonth',
  'paymentError',
  'eyebrow',
  'heroTitle',
  'heroSub',
  'monthly',
  'yearly',
  'mostPopular',
  'readingsPerMonth',
  'getStarted',
  'subscribe',
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
  'monthlyReset',
  'monthlyResetDesc',
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
  'features.aiChat7',
  'features.calendarThisMonth',
  'features.personalityFree',
  'features.calendar3months',
  'features.adFree',
  'features.aiChat25',
  'features.calendar1year',
  'features.aiChat80',
  'features.calendar2years',
  'features.aiChat200',
  'features.prioritySupport',
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [loadingCredit, setLoadingCredit] = useState<string | null>(null)

  // 결제 후 돌아갈 URL 저장 (referrer 또는 이전에 저장된 값 유지)
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    // 이미 저장된 returnUrl이 있으면 유지
    const existingReturnUrl = localStorage.getItem('checkout_return_url')
    if (existingReturnUrl) {
      return
    }

    // referrer에서 같은 도메인의 경로 추출
    try {
      const referrer = document.referrer
      if (referrer) {
        const referrerUrl = new URL(referrer)
        const currentHost = window.location.host

        // 같은 도메인에서 온 경우에만 저장
        if (referrerUrl.host === currentHost) {
          const path = referrerUrl.pathname
          // pricing, success, auth 페이지 제외
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

  const getFeatureText = useCallback(
    (textKey: string) => {
      return pt(`features.${textKey}`)
    },
    [pt]
  )

  const formatPrice = (price: number, priceEn: number) => {
    if (price === 0) {
      return pt('free')
    }
    if (isKo) {
      if (billingCycle === 'yearly') {
        const yearly = Math.floor(price * YEARLY_DISCOUNT_MULTIPLIER)
        return `KRW ${yearly.toLocaleString()}`
      }
      return `KRW ${price.toLocaleString()}`
    }
    if (billingCycle === 'yearly') {
      const yearly = Math.floor(priceEn * YEARLY_DISCOUNT_MULTIPLIER * 100) / 100
      return `$${yearly.toFixed(2)}`
    }
    return `$${priceEn.toFixed(2)}`
  }

  const getPeriod = () => {
    if (billingCycle === 'yearly') {
      return pt('perYear')
    }
    return pt('perMonth')
  }

  async function handleSelectPlan(planId: string) {
    if (planId === 'free') {
      window.location.href = '/destiny-map'
      return
    }

    setLoadingPlan(planId)
    try {
      const res = await fetchWithRetry(
        '/api/checkout',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: planId,
            billingCycle: billingCycle === 'yearly' ? 'yearly' : 'monthly',
          }),
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
      setLoadingPlan(null)
    }
  }

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

          {/* Billing Toggle */}
          <div className={styles.billingToggle}>
            <button
              className={`${styles.toggleBtn} ${billingCycle === 'monthly' ? styles.active : ''}`}
              onClick={() => setBillingCycle('monthly')}
              type="button"
              aria-pressed={billingCycle === 'monthly'}
            >
              {pt('monthly')}
            </button>
            <button
              className={`${styles.toggleBtn} ${billingCycle === 'yearly' ? styles.active : ''}`}
              onClick={() => setBillingCycle('yearly')}
              type="button"
              aria-pressed={billingCycle === 'yearly'}
            >
              {pt('yearly')}
              <span className={styles.discount}>-{YEARLY_DISCOUNT_PERCENT}%</span>
            </button>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className={styles.pricingSection}>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`${styles.planCard} ${plan.popular ? styles.popular : ''}`}
              >
                {plan.popular && <div className={styles.popularBadge}>{pt('mostPopular')}</div>}
                <div className={styles.cardHeader} style={{ background: plan.gradient }}>
                  <h3 className={styles.planName}>{pt(`plans.${plan.nameKey}`)}</h3>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>{formatPrice(plan.price, plan.priceEn)}</span>
                    {plan.price > 0 && <span className={styles.period}>{getPeriod()}</span>}
                  </div>
                  <div className={styles.readingsBadge}>
                    <span className={styles.readingsIcon}>*</span>
                    {plan.readings} {pt('readingsPerMonth')}
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <ul className={styles.featureList}>
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={
                          feature.included ? styles.featureItem : styles.featureItemDisabled
                        }
                      >
                        <span className={feature.included ? styles.checkIcon : styles.xIcon}>
                          {feature.included ? 'OK' : 'X'}
                        </span>
                        {getFeatureText(feature.textKey)}
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`${styles.ctaButton} ${plan.popular ? styles.ctaPopular : ''}`}
                    style={!plan.popular ? { background: plan.gradient } : {}}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={loadingPlan !== null}
                  >
                    {loadingPlan === plan.id
                      ? '...'
                      : plan.id === 'free'
                        ? pt('getStarted')
                        : pt('subscribe')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Credit Packs */}
        <section className={styles.creditSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{pt('creditPacks')}</h2>
            <p className={styles.sectionDesc}>{pt('creditPacksDesc')}</p>
          </div>

          <div className={styles.creditGrid}>
            {creditPacks.map((pack) => {
              // Calculate discount percentage (base: mini pack rate)
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
                      {isKo ? `KRW ${pack.price.toLocaleString()}` : `$${pack.priceEn.toFixed(2)}`}
                    </div>
                  </div>
                  <div className={styles.creditBody}>
                    <div className={styles.creditReadings}>
                      <span className={styles.creditNumber}>{pack.readings}</span>
                      <span className={styles.creditLabel}>{pt('readings')}</span>
                    </div>
                    <div className={styles.perReading}>
                      {pt('perReading')} {isKo ? pack.perReading : pack.perReadingEn}
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
              <div className={styles.howIcon}>CYCLE</div>
              <h4>{pt('monthlyReset')}</h4>
              <p>{pt('monthlyResetDesc')}</p>
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
