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
    default: 'DestinyPal | AI Spiritual Mental Care Platform',
    template: '%s | DestinyPal',
  },
  description:
    'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform integrating Eastern & Western wisdom frameworks.',
  keywords: [
    // Korean keywords
    '??',
    '????',
    '????',
    '??',
    '????',
    '???',
    '???',
    '??? ??',
    '???',
    '???',
    '???',
    '??',
    'AI ??',
    'AI ??',
    '????',
    '????',
    // English keywords
    'free tarot reading',
    'tarot online',
    'horoscope today',
    'astrology chart',
    'numerology',
    'birth chart',
    'compatibility test',
    'dream interpretation',
    'saju',
    'korean fortune telling',
    'ai tarot',
    'ai astrology',
    'spiritual counseling',
    'life prediction',
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
    title: 'DestinyPal | AI Spiritual Mental Care Platform',
    description:
      'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.',
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
    title: 'DestinyPal | AI Spiritual Mental Care Platform',
    description:
      'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.',
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
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
  },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Get nonce from middleware
  const headersList = await headers()
  const nonce = headersList.get('x-nonce') || ''

  const websiteJsonLd = generateJsonLd({
    type: 'WebSite',
    name: 'DestinyPal',
    description:
      'Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.',
  })

  const organizationJsonLd = generateJsonLd({
    type: 'Organization',
  })

  return (
    <html
      lang="ko"
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
        style={{ fontFamily: 'var(--font-montserrat), var(--font-noto-kr), system-ui, sans-serif' }}
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
              <ClientProviders>
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
