//src/app/layout.tsx

import type { Metadata, Viewport } from "next";
import "./globals.css";
import "../styles/mobile-touch.css";
import StarrySky from "@/components/ui/StarrySky";
import BackButtonWrapper from "@/components/ui/BackButtonWrapper";
import Footer from "@/components/ui/Footer";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { CreditModalProvider } from "@/contexts/CreditModalContext";
// ErrorBoundary temporarily disabled - Next.js 15 compatibility issue
// import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ConsentProvider } from "@/contexts/ConsentContext";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd } from "@/components/seo/SEO";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import AuthProvider from "@/components/AuthProvider";
import ScrollRestoration from "@/components/ui/ScrollRestoration";
import { ReactNode, Suspense } from "react";
import { Montserrat, Noto_Sans_KR, Cinzel, Roboto, Lora, Merriweather } from "next/font/google";

// Primary fonts with optimized loading
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
  display: "swap",
  variable: "--font-montserrat",
});

const notoKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-noto-kr",
});

// Secondary fonts for specific pages
const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-cinzel",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: "swap",
  variable: "--font-roboto",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-lora",
});

const merriweather = Merriweather({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-merriweather",
});


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com"),
  title: {
    default: "DestinyPal | AI Spiritual Mental Care Platform",
    template: "%s | DestinyPal",
  },
  description: "Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform integrating Eastern & Western wisdom frameworks.",
  keywords: [
    // Korean keywords
    "사주", "사주팔자", "오늘 운세", "운세 보기", "타로", "타로 리딩", "별자리 운세", "별자리", "궁합", "꿈 해몽", "심리 테스트", "성격 테스트",
    // English keywords
    "free tarot reading", "tarot online", "horoscope today", "astrology chart", "numerology", "birth chart", "compatibility test", "dream interpretation", "saju", "korean fortune telling",
  ],
  authors: [{ name: "DestinyPal" }],
  creator: "DestinyPal",
  publisher: "DestinyPal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DestinyPal",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "DestinyPal",
    title: "DestinyPal | AI Spiritual Mental Care Platform",
    description: "Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "DestinyPal - AI Spiritual Mental Care",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DestinyPal | AI Spiritual Mental Care Platform",
    description: "Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.",
    images: ["/og-image.png"],
    creator: "@destinypal",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const websiteJsonLd = generateJsonLd({
    type: "WebSite",
    name: "DestinyPal",
    description: "Diagnose with Fate, Analyze with Psychology, Heal with Spirituality. AI-powered self-understanding platform.",
  });

  const organizationJsonLd = generateJsonLd({
    type: "Organization",
  });

  return (
    <html lang="en" data-theme="dark" data-scroll-behavior="smooth" style={{ colorScheme: 'dark', backgroundColor: '#0d1225' }}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/logo/logo.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DestinyPal" />
        <meta name="theme-color" content="#0d1225" />
        <JsonLd data={websiteJsonLd} />
        <JsonLd data={organizationJsonLd} />
      </head>
      <body
        className={`
          ${montserrat.variable}
          ${notoKr.variable}
          ${cinzel.variable}
          ${roboto.variable}
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
            <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
          </Suspense>
          <Suspense fallback={null}>
            <MicrosoftClarity clarityId={process.env.NEXT_PUBLIC_CLARITY_ID || ""} />
          </Suspense>

          <AuthProvider>
            <ScrollRestoration />
            <I18nProvider>
              <ToastProvider>
                <CreditModalProvider>
                  <NotificationProvider>
                    <StarrySky />
                    <BackButtonWrapper />
                    <main id="main-content">{children}</main>
                    <Footer />
                  </NotificationProvider>
                </CreditModalProvider>
              </ToastProvider>
            </I18nProvider>
          </AuthProvider>

          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
