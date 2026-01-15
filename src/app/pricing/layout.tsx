import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Pricing Plans",
  description: "Choose your DestinyPal plan. Get AI-powered Saju, Tarot, Astrology readings with flexible subscription options.",
  keywords: [
    "pricing",
    "subscription",
    "fortune telling plans",
    "tarot subscription",
    "astrology membership",
  ],
  canonicalUrl: `${baseUrl}/pricing`,
  ogImage: "/og-image.png",
});

export default function PricingLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Pricing Plans - DestinyPal",
    description: "Choose your DestinyPal plan. Get AI-powered Saju, Tarot, Astrology readings with flexible subscription options.",
    url: `${baseUrl}/pricing`,
  });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  );
}
