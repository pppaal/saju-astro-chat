//src/app/layout.tsx

import type { Metadata, Viewport } from 'next'
import './globals.css'
import '../styles/mobile-touch.css'
import StarrySky from '@/components/ui/StarrySky'
import BackButtonWrapper from '@/components/ui/BackButtonWrapper'
import Footer from '@/components/ui/Footer'
import { ErrorBoundaryProvider } from '@/components/providers/ErrorBoundaryProvider'
import { ConsentProvider } from '@/contexts/ConsentContext'
import { ConsentBanner } from '@/components/consent/ConsentBanner'

import { JsonLd } from '@/components/seo/JsonLd'
import { generateJsonLd } from '@/components/seo/SEO'
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics'
import { MicrosoftClarity } from '@/components/analytics/MicrosoftClarity'
import { VisitorBeacon } from '@/components/analytics/VisitorBeacon'
import AuthProvider from '@/components/AuthProvider'
import ScrollRestoration from '@/components/ui/ScrollRestoration'
import GlobalHeader from '@/components/ui/GlobalHeader'
import { WebVitalsReporter } from '@/components/performance/WebVitalsReporter'
import { ReactNode, Suspense } from 'react'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import { ClientProviders } from './ClientProviders'

// Fonts are self-hosted (next/font/local) instead of next/font/google so the
// production build never has to reach fonts.googleapis.com at build time —
// that network fetch was failing in CI/sandboxed builds and breaking the
// whole build. Files live in ./fonts (latin subset, sourced from @fontsource).

// Primary fonts with optimized loading
const montserrat = localFont({
  src: [
    { path: './fonts/montserrat-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/montserrat-latin-700-normal.woff2', weight: '700', style: 'normal' },
    { path: './fonts/montserrat-latin-800-normal.woff2', weight: '800', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-montserrat',
})

const notoKr = localFont({
  src: [
    { path: './fonts/noto-sans-kr-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/noto-sans-kr-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-noto-kr',
})

// Secondary fonts for specific pages
const cinzel = localFont({
  src: [
    { path: './fonts/cinzel-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/cinzel-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-cinzel',
})

const lora = localFont({
  src: [
    { path: './fonts/lora-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/lora-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-lora',
  preload: false,
})

const merriweather = localFont({
  src: [
    { path: './fonts/merriweather-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: './fonts/merriweather-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  display: 'swap',
  variable: '--font-merriweather',
  preload: false,
})

// `interactiveWidget: 'resizes-content'` tells the browser to shrink the
// layout viewport when the on-screen keyboard opens instead of pushing fixed
// elements upward. Without this, iOS Safari shifts Toast/CreditDepletedModal
// /InlineTarotModal/ShareButton/CounselorSidebar/ConsentBanner above the
// keyboard, often off-screen. Next's Viewport type doesn't yet expose this
// field, so we widen with an intersection type.
export const viewport: Viewport & { interactiveWidget?: string } = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://destinypal.com')
  ),
  title: {
    default: 'DestinyPal — AI Korean Astrology, Tarot, Compatibility & Fortune Calendar',
    template: '%s | DestinyPal',
  },
  description:
    'AI reads your Saju (Four Pillars) and natal astrology together — daily counsel, tarot, compatibility, and a fortune calendar. See the flow and timing when you need to decide.',
  keywords: [
    // Core brand
    'DestinyPal',
    'destinypal',
    '데스티니팔',
    // English — primary (영어 시장 우선)
    'ai saju',
    'saju reading',
    'four pillars of destiny',
    'korean fortune telling',
    'ai astrology',
    'birth chart reading',
    'natal chart',
    'ai tarot reading',
    'free tarot online',
    'horoscope today',
    'daily horoscope',
    'compatibility test',
    'astrology compatibility',
    'synastry chart',
    'fortune calendar',
    'ai fortune teller',
    'ai life counselor',
    'ai destiny',
    'destiny matrix',
    'destiny reading',
    // Korean
    '사주',
    '사주풀이',
    'AI 사주',
    '운세',
    '오늘의 운세',
    '운세 캘린더',
    '타로',
    'AI 타로',
    '궁합',
    'AI 궁합',
    '점성술',
    'AI 상담',
    '운명 상담',
  ],
  applicationName: 'DestinyPal',
  authors: [{ name: 'DestinyPal' }],
  creator: 'DestinyPal',
  publisher: 'DestinyPal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DestinyPal',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: ['ko_KR'],
    url: '/',
    siteName: 'DestinyPal',
    title: 'DestinyPal — AI Korean Astrology, Tarot & Fortune Calendar',
    description:
      'AI reads your Saju and natal astrology together — daily counsel, tarot, compatibility, and a fortune calendar. See the flow and timing when you need to decide.',
    images: [
      {
        url: '/og-card-v2.png',
        width: 1200,
        height: 630,
        alt: 'DestinyPal — AI Korean Astrology, Tarot & Fortune Calendar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DestinyPal — AI Korean Astrology, Tarot & Fortune Calendar',
    description:
      'AI reads your Saju and natal astrology together — daily counsel, tarot, compatibility, and a fortune calendar.',
    images: ['/og-card-v2.png'],
    creator: '@destinypal',
    site: '@destinypal',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: '/',
    languages: {
      // /ko 경로 프리픽스(proxy.ts 리라이트)로 한국어가 고유 URL 을 갖는다.
      // 같은 URL 을 en/ko 가 공유하면 hreflang 이 무력해 서로 경쟁했다.
      'en-US': '/',
      'ko-KR': '/ko',
      'x-default': '/',
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    // 네이버 서치어드바이저 소유 확인 — 한국어 운세 검색 유입의 핵심 엔진.
    // 등록 시 발급되는 메타태그 content 값을 env 로 넣으면 <meta name="naver-site-verification">가 렌더된다.
    ...(process.env.NEXT_PUBLIC_NAVER_VERIFICATION
      ? { other: { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION } }
      : {}),
  },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Get nonce + server-resolved locale from middleware
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''
  const serverLocale = (headersList.get('x-locale') as 'ko' | 'en' | null) || 'en'

  const websiteJsonLd = generateJsonLd({
    type: 'WebSite',
    name: 'DestinyPal',
    description:
      'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 제공하는 AI 운세 플랫폼.',
  })

  const organizationJsonLd = generateJsonLd({
    type: 'Organization',
  })

  return (
    <html
      lang={serverLocale}
      data-theme="dark"
      data-scroll-behavior="smooth"
      style={{ colorScheme: 'dark', backgroundColor: '#07091a' }}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DestinyPal" />
        <meta name="theme-color" content="#07091a" />
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={organizationJsonLd} />
      </head>
      <body
        className={`
          ${montserrat.variable}
          ${notoKr.variable}
          ${cinzel.variable}
          ${lora.variable}
          ${merriweather.variable}
        `}
        style={{
          fontFamily:
            "var(--font-noto-kr), var(--font-montserrat), 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif",
        }}
      >
        <a href="#main-content" className="skip-to-main">
          Skip to main content
        </a>

        <ConsentProvider>
          {/* Analytics */}
          <Suspense fallback={null}>
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ''} nonce={nonce} />
          </Suspense>
          <Suspense fallback={null}>
            <MicrosoftClarity clarityId={process.env.NEXT_PUBLIC_CLARITY_ID || ''} nonce={nonce} />
          </Suspense>

          <ErrorBoundaryProvider>
            <AuthProvider>
              <WebVitalsReporter />
              <Suspense fallback={null}>
                <VisitorBeacon />
              </Suspense>
              <ScrollRestoration />
              <ClientProviders initialLocale={serverLocale}>
                <StarrySky />
                <BackButtonWrapper />
                <GlobalHeader />
                <main id="main-content">{children}</main>
                <Footer />
                <ConsentBanner />
              </ClientProviders>
            </AuthProvider>
          </ErrorBoundaryProvider>
        </ConsentProvider>
      </body>
    </html>
  )
}
