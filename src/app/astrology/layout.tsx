import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Western Astrology",
  description: "Generate a personalized birth chart and astrology insights based on your birth data.",
  keywords: [
    "astrology",
    "birth chart",
    "horoscope",
    "zodiac",
    "natal chart",
  ],
  canonicalUrl: `${baseUrl}/astrology`,
  ogImage: "/og-image.png",
});

export default function AstrologyLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Western Astrology",
    description: "Generate a personalized birth chart and astrology insights based on your birth data.",
    url: `${baseUrl}/astrology`,
  });
  const serviceJsonLd = generateServiceSchema("astrology");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.astrology });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
