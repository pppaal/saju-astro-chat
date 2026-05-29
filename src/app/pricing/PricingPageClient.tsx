'use client'

import Link from 'next/link'
import { useCallback, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { isPlaceholderTranslation, toSafeFallbackText } from '@/i18n/utils'
import BackButton from '@/components/ui/BackButton'
import { useToast } from '@/components/ui/Toast'
import { logger } from '@/lib/logger'
import styles from './pricing.module.css'
import {
  CREDIT_PACKS,
  BASE_CREDIT_PRICE_KRW,
  getCreditPackDiscount,
  type CreditPackType,
} from '@/lib/config/pricing'
import { fetchWithRetry } from '@/lib/http'
import { RefundConsentModal } from '@/components/pricing/RefundConsentModal'
import { EmailCollectionModal } from '@/components/pricing/EmailCollectionModal'

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

const faqKeys = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']
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
  'faqs.q6',
  'faqs.a6',
  'faqs.q7',
  'faqs.a7',
  'faqs.q8',
  'faqs.a8',
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
  const toast = useToast()
  // session.user.email 이 비어 있으면 결제 직전 EmailCollectionModal 을
  // 띄운다. update() 는 PATCH /api/me/email 성공 후 호출해 jwt 토큰을
  // 재발급시킨다 (이메일을 token.email 에 반영 → 후속 /api/checkout 의
  // session.user.email 가드 통과).
  const { data: session, update: updateSession } = useSession()
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [loadingCredit, setLoadingCredit] = useState<string | null>(null)
  // 전자상거래법 §17 ②항 5호 — 디지털 콘텐츠 청약철회 제한은 사용자가
  // 명시적으로 동의한 경우에만 적용된다. 이전엔 페이지 상단의 인라인 체크
  // 박스로 받았는데 사용자가 체크박스 인지 못한 채 결제 버튼 누르고 "결제가
  // 안 열린다" 로 보고하던 회귀가 잦았다 (silent disabled). 지금은 결제 버튼
  // 클릭 직후 RefundConsentModal 을 띄워, 동의 + 결제 진행을 한 흐름에 묶음.
  // pendingPack = 모달이 띄워진 결제 시도의 pack id; 모달의 confirm 시
  // 이 id 로 실제 checkout 호출.
  const [pendingPack, setPendingPack] = useState<CreditPackType | null>(null)
  // 이메일이 비어 있어 EmailCollectionModal 단계에 막힌 결제 시도의 pack
  // id. 이메일 저장 성공하면 이 값을 pendingPack 로 옮겨 RefundConsentModal
  // 로 진행.
  const [emailPendingPack, setEmailPendingPack] = useState<CreditPackType | null>(null)
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
            // 쿼리까지 보존해 결제 후 보던 화면으로 정확히 복귀.
            localStorage.setItem('checkout_return_url', path + referrerUrl.search)
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

  // 결제 시도 진입점 — 사용자가 카드의 [구매] 누름.
  // 1) session.user.email 없으면 → EmailCollectionModal 먼저 띄움
  // 2) email 있으면 → RefundConsentModal 로 바로 진행
  // 진짜 결제 흐름은 둘 다 통과한 뒤 runCheckout 에서.
  function handleBuyCredit(packId: CreditPackType) {
    const currentEmail = session?.user?.email?.trim()
    if (!currentEmail) {
      setEmailPendingPack(packId)
      return
    }
    setPendingPack(packId)
  }

  // EmailCollectionModal 에서 이메일 저장 성공 시 호출. 세션을 강제로
  // 새로고침해 token.email 이 반영된 뒤 RefundConsentModal 로 이어준다.
  // update() 가 새 token 을 받아오기 전에 RefundConsent → runCheckout 으로
  // 넘어가면 server side 세션이 아직 옛 token 을 들고 있을 수 있어
  // /api/checkout 에서 다시 invalid_email 로 reject 될 수 있다. 그래서
  // await 으로 갱신 완료를 기다린 뒤 setPendingPack 한다.
  async function handleEmailSaved(savedEmail: string) {
    const pack = emailPendingPack
    try {
      await updateSession({ email: savedEmail })
    } catch (err) {
      // update 실패해도 다음 결제 시도 시 fresh GET /api/auth/session 으로
      // 어차피 잡힌다. 사용자 흐름은 막지 않는다.
      logger.warn('[pricing] session update after email save failed', err)
    }
    setEmailPendingPack(null)
    if (pack) {
      setPendingPack(pack)
    }
  }

  // 실제 결제 — RefundConsentModal 의 confirm 콜백에서 호출.
  async function runCheckout(packId: CreditPackType) {
    setLoadingCredit(packId)
    setPendingPack(null)
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
        // 디버그용 코드/HTTP status 는 logger 로만 남기고 (Sentry 등에서 추적),
        // 사용자에게는 도움이 안 되니 일반 안내 메시지만 노출.
        logger.warn('[checkout] error response', { status: res.status, data })
        toast.error(pt('paymentError'))
      }
    } catch (err) {
      logger.warn('[checkout] request failed', err)
      toast.error(pt('paymentError'))
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

          {/* 인라인 동의 체크박스는 제거 — 결제 버튼 클릭 직후 RefundConsent
              Modal 에서 명시 동의를 받는다 (전상법 §17 ②항 5호 + EU CRD
              Art.16(m) 요구 충족). 이전엔 사용자가 체크박스 인지 못한 채
              결제 버튼 누르고 "결제가 안 열린다"고 보고하는 회귀가 잦았다. */}

          <div className={styles.creditGrid}>
            {creditPacks.map((pack) => {
              const discountPercent = getCreditPackDiscount(pack.id)

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
                    <div className={styles.vatNote}>{isKo ? 'VAT 포함' : 'Tax included'}</div>
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

          <ul className={styles.faqList}>
            {faqKeys.map((key, idx) => {
              const isOpen = openFaq === idx
              const questionId = `faq-question-${idx}`
              const answerId = `faq-answer-${idx}`

              return (
                <li key={key} className={`${styles.faqItem} ${isOpen ? styles.open : ''}`}>
                  <button
                    id={questionId}
                    className={styles.faqQuestion}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    type="button"
                  >
                    <span>{pt(`faqs.${key}`)}</span>
                    <svg
                      className={styles.faqArrow}
                      viewBox="0 0 16 16"
                      width="14"
                      height="14"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <path
                        d="M4 6l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <div
                    id={answerId}
                    className={styles.faqAnswer}
                    role="region"
                    aria-labelledby={questionId}
                    hidden={!isOpen}
                  >
                    {pt(`faqs.a${key.slice(1)}`)}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>

        {/* Guarantee */}
        <section className={styles.guarantee}>
          <div className={styles.guaranteeIcon}>SAFE</div>
          <h3 className={styles.guaranteeTitle}>{pt('guarantee')}</h3>
          <p className={styles.guaranteeText}>{pt('guaranteeDesc')}</p>
          <p className={styles.guaranteeText}>
            {isKo
              ? `기준 단가: 1 크레딧 ≈ ${formatKrw(BASE_CREDIT_PRICE_KRW)} (VAT 포함)`
              : `Reference rate: 1 credit ≈ ${formatUsd(baseCreditPriceUsd)} (tax included)`}
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

      {/* 이메일 보충 모달 — session.user.email 이 비어 있을 때만 노출.
          저장 성공 시 handleEmailSaved 에서 세션 갱신 후 RefundConsentModal
          로 이어준다. */}
      <EmailCollectionModal
        open={emailPendingPack !== null}
        onClose={() => setEmailPendingPack(null)}
        onSaved={(email) => {
          void handleEmailSaved(email)
        }}
        locale={isKo ? 'ko' : 'en'}
      />

      {/* 결제 직전 청약철회 제한 동의 모달. pendingPack 가 set 되면 노출.
          confirm 시 runCheckout 로 실제 Stripe 흐름 시작. */}
      <RefundConsentModal
        open={pendingPack !== null}
        onClose={() => setPendingPack(null)}
        onConfirm={() => {
          if (pendingPack) {
            void runCheckout(pendingPack)
          }
        }}
        productSummary={(() => {
          if (!pendingPack) return null
          const pack = creditPacks.find((p) => p.id === pendingPack)
          if (!pack) return null
          const price = isKo ? formatKrw(pack.price) : formatUsd(pack.priceEn)
          const label = pt(`creditPackNames.${pack.nameKey}`)
          return isKo
            ? `${label} · ${pack.readings} 크레딧 · ${price}`
            : `${label} · ${pack.readings} credits · ${price}`
        })()}
        locale={isKo ? 'ko' : 'en'}
      />
    </div>
  )
}
