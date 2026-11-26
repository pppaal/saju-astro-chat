'use client'

import Script from 'next/script'
import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useConsent } from '@/contexts/ConsentContext'
import { gaBootstrapScript, sanitizeAnalyticsUrl } from '@/lib/security/analyticsUrl'

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

    // Send pageview — birth-query URLs (?date=&time=&lat=…) must never reach GA, so page_path and
    // page_location keep only allowlisted query keys (QA-7). gtag('set') makes later events
    // (web vitals, trackEvent) inherit the sanitized location instead of document.location.
    const gtag = getGtag()
    const page = sanitizeAnalyticsUrl(url, window.location.origin)
    if (gtag && page) {
      gtag('set', { page_location: page.location, page_path: page.path })
      gtag('config', gaId, {
        page_path: page.path,
        page_location: page.location,
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
        // First config: same allowlist sanitizer, inlined (page_location defaults to the full URL).
        dangerouslySetInnerHTML={{ __html: gaBootstrapScript(gaId) }}
      />
    </>
  )
}
