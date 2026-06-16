'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useConsent } from '@/contexts/ConsentContext'

type WindowWithGtag = Window & {
  gtag?: (...args: unknown[]) => void
}

const getGtag = () => {
  if (typeof window === 'undefined') {
    return undefined
  }
  return (window as WindowWithGtag).gtag
}

const GA_ID_RE = /^[A-Z0-9-]+$/i

export function GoogleAnalytics({ gaId, nonce }: { gaId: string; nonce?: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { status } = useConsent()
  const consentGranted = status === 'granted'
  const isGaIdValid = !gaId || GA_ID_RE.test(gaId)

  useEffect(() => {
    if (!gaId || !consentGranted || !isGaIdValid) {
      return
    }

    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')

    // Send pageview with custom URL
    const gtag = getGtag()
    if (gtag) {
      gtag('config', gaId, {
        page_path: url,
      })
    }
  }, [pathname, searchParams, gaId, consentGranted, isGaIdValid])

  // Keep Google Consent Mode in sync with banner choice
  useEffect(() => {
    if (!isGaIdValid) {
      return
    }
    const gtag = getGtag()
    if (!gtag) {
      return
    }

    const consentState = consentGranted ? 'granted' : 'denied'
    gtag('consent', 'update', {
      ad_storage: consentState,
      analytics_storage: consentState,
      ad_user_data: consentState,
      ad_personalization: consentState,
    })
  }, [consentGranted, status, isGaIdValid])

  if (!gaId || !consentGranted || !isGaIdValid) {
    return null
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        nonce={nonce}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'update', {
              ad_storage: 'granted',
              analytics_storage: 'granted',
              ad_user_data: 'granted',
              ad_personalization: 'granted',
            });
            gtag('js', new Date());

            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
}

// Helper function to track custom events
const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  const gtag = getGtag()
  if (gtag) {
    gtag('event', eventName, params)
  }
}

/**
 * 실제 사용자 대면 리딩 surface 는 세 개뿐이다 (src/config/enabledServices.ts):
 * 운명 상담사 · 타로 · 궁합. saju/astrology/destiny-map/destiny-matrix 는
 * 공개 경로에서 제거됐으므로 관련 이벤트도 들고 있지 않는다(죽은 이벤트는
 * GA 리포트만 어지럽힌다). 구독도 없다 — 수익은 1회성 크레딧 팩뿐이라
 * subscribe/cancel 류 대신 begin_checkout + purchase 만 둔다.
 */
export type ReadingSurface = 'counsel' | 'tarot' | 'compatibility'

// Pre-defined event trackers — keep this catalog in sync with live features.
export const analytics = {
  // Auth
  login: () => trackEvent('login'),
  signup: () => trackEvent('sign_up'),
  logout: () => trackEvent('logout'),

  // Blog engagement
  likePost: (postId: string) => trackEvent('like_post', { post_id: postId }),
  unlikePost: (postId: string) => trackEvent('unlike_post', { post_id: postId }),
  commentPost: (postId: string) => trackEvent('comment', { post_id: postId }),
  sharePost: (postId: string) => trackEvent('share', { post_id: postId }),
  bookmarkPost: (postId: string) => trackEvent('bookmark', { post_id: postId }),

  // Reading funnel — north-star is "completed readings". start → complete per surface.
  startReading: (service: ReadingSurface) => trackEvent('start_reading', { service }),
  completeReading: (service: ReadingSurface) => trackEvent('complete_reading', { service }),
  freeResultView: (source: ReadingSurface | string) => trackEvent('free_result_view', { source }),
  drawTarot: (category: string) => trackEvent('draw_tarot', { category }),

  // Search and discovery
  search: (query: string) => trackEvent('search', { search_term: query }),
  filterCategory: (category: string) => trackEvent('filter_category', { category }),

  // Credit-pack conversion funnel (one-time packs — no subscriptions)
  viewPricing: () => trackEvent('view_pricing'),
  premiumCtaClick: (location: string) => trackEvent('premium_cta_click', { location }),
  beginCheckout: (pack: string) => trackEvent('begin_checkout', { pack }),
  purchase: (params: { transaction_id: string; value: number; currency: string; pack: string }) =>
    trackEvent('purchase', {
      transaction_id: params.transaction_id,
      value: params.value,
      currency: params.currency,
      items: [{ item_name: params.pack, price: params.value }],
    }),
}
