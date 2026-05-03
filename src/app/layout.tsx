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
import AuthProvider from '@/components/AuthProvider'
import ScrollRestoration from '@/components/ui/ScrollRestoration'
import GlobalHeader from '@/components/ui/GlobalHeader'
import { WebVitalsReporter } from '@/components/performance/WebVitalsReporter'
import { ReactNode, Suspense } from 'react'
import { Montserrat, Noto_Sans_KR, Cinzel, Lora, Merriweather } from 'next/font/google'
import { headers } from 'next/headers'
import { ClientProviders } from './ClientProviders'

// Primary fonts with optimized loading
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '700', '800'],
  display: 'swap',
  variable: '--font-montserrat',
})

const notoKr = Noto_Sans_KR({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-noto-kr',
})

// Secondary fonts for specific pages
const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-cinzel',
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-lora',
  preload: false,
})

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-merriweather',
  preload: false,
})

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://destinypal.com')
  ),
  title: {
    default: 'DestinyPal — AI 사주·점성·타로·궁합·운세 캘린더',
    template: '%s | DestinyPal',
  },
  description:
    'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 한 곳에서 제공합니다. 결정이 필요한 순간 흐름과 타이밍을 보여드립니다.',
  keywords: [
    // Core brand
    'DestinyPal',
    '데스티니팔',
    'destinypal',
    // Korean — primary
    '사주',
    '사주풀이',
    'AI 사주',
    '운세',
    '오늘의 운세',
    '운세 캘린더',
    '타로',
    '타로 운세',
    'AI 타로',
    '궁합',
    '사주 궁합',
    'AI 궁합',
    '점성술',
    '별자리 운세',
    'AI 상담',
    '운명 상담',
    '사주 리포트',
    'AI 리포트',
    // English
    'ai saju',
    'korean fortune telling',
    'ai tarot reading',
    'free tarot',
    'horoscope today',
    'astrology chart',
    'compatibility test',
    'fortune calendar',
    'ai fortune',
    'ai astrology',
    'birth chart',
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
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'DestinyPal',
    title: 'DestinyPal — AI 사주·점성·타로·궁합·캘린더',
    description:
      'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 한 곳에서. 결정이 필요한 순간 흐름과 타이밍을 보여드립니다.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DestinyPal - AI Spiritual Mental Care',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DestinyPal — AI 사주·점성·타로·궁합·캘린더',
    description:
      'AI가 사주와 점성을 함께 분석해 운세 상담, 타로, 궁합, 캘린더, 리포트를 한 곳에서. 결정이 필요한 순간 흐름과 타이밍을 보여드립니다.',
    images: ['/og-image.png'],
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
      'ko-KR': '/',
      'en-US': '/',
      'x-default': '/',
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
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
      style={{ colorScheme: 'dark', backgroundColor: '#0d1225' }}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DestinyPal" />
        <meta name="theme-color" content="#0d1225" />
        <JsonLd data={websiteJsonLd} nonce={nonce} />
        <JsonLd data={organizationJsonLd} nonce={nonce} />
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
