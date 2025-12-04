//src/app/layout.tsx

import type { Metadata } from "next";
import "./globals.css";
import StarrySky from "@/components/ui/StarrySky";
import BackButton from "@/components/ui/BackButton";
import { I18nProvider } from "@/i18n/I18nProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd } from "@/components/seo/SEO";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";
import PushNotificationPrompt from "@/components/notifications/PushNotificationPrompt";
import AuthProvider from "@/components/AuthProvider";
import { ReactNode } from "react";
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

function BackButtonInLayout() {
  "use client";
  const { usePathname } = require("next/navigation");
  const pathname = usePathname?.() ?? "/";
  if (pathname === "/") return null;
  return <BackButton />;
}

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://destinytracker.com"),
  title: {
    default: "Destiny Tracker | Chart the cosmos, navigate your destiny",
    template: "%s | Destiny Tracker",
  },
  description: "AI-powered astrology, Saju, Tarot, and I Ching readings. Discover your destiny map with personalized insights combining Eastern and Western divination traditions.",
  keywords: [
    "astrology",
    "saju",
    "tarot",
    "i ching",
    "destiny map",
    "AI fortune telling",
    "birth chart",
    "horoscope",
    "사주",
    "점성술",
    "타로",
    "운세",
  ],
  authors: [{ name: "Destiny Tracker" }],
  creator: "Destiny Tracker",
  publisher: "Destiny Tracker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "Destiny Tracker",
    title: "Destiny Tracker | Chart the cosmos, navigate your destiny",
    description: "AI-powered astrology, Saju, Tarot, and I Ching readings. Discover your destiny map with personalized insights.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Destiny Tracker - AI-powered destiny readings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Destiny Tracker | Chart the cosmos, navigate your destiny",
    description: "AI-powered astrology, Saju, Tarot, and I Ching readings. Discover your destiny map with personalized insights.",
    images: ["/og-image.png"],
    creator: "@destinytracker",
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
    name: "Destiny Tracker",
    description: "AI-powered astrology, Saju, Tarot, and I Ching readings. Discover your destiny map with personalized insights.",
  });

  const organizationJsonLd = generateJsonLd({
    type: "Organization",
  });

  return (
    <html lang="en">
      <head>
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

        {/* Analytics */}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID || ""} />
        <MicrosoftClarity clarityId={process.env.NEXT_PUBLIC_CLARITY_ID || ""} />

        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider>
              <I18nProvider>
                <ToastProvider>
                  <NotificationProvider>
                    <PushNotificationPrompt />
                    <StarrySky />
                    <BackButtonInLayout />
                    <main id="main-content">{children}</main>
                  </NotificationProvider>
                </ToastProvider>
              </I18nProvider>
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
