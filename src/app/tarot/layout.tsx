import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "AI Tarot Reading",
  description: "AI tarot readings with 78 cards and curated spreads for love, career, and life guidance.",
  keywords: [
    "tarot reading",
    "ai tarot",
    "tarot spread",
    "love tarot",
    "career tarot",
    "tarot cards",
  ],
  canonicalUrl: `${baseUrl}/tarot`,
  ogImage: "/og-image.png",
});

export default function TarotLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "AI Tarot Reading",
    description: "AI tarot readings with 78 cards and curated spreads for love, career, and life guidance.",
    url: `${baseUrl}/tarot`,
  });
  const serviceJsonLd = generateServiceSchema("tarot");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.tarot });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
