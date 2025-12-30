import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Saju - Four Pillars of Destiny",
  description: "Traditional Korean Saju analysis based on your birth date and time for life guidance.",
  keywords: [
    "saju",
    "four pillars",
    "korean fortune telling",
    "birth chart",
    "destiny analysis",
  ],
  canonicalUrl: `${baseUrl}/saju`,
  ogImage: "/og-image.png",
});

export default function SajuLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Saju - Four Pillars of Destiny",
    description: "Traditional Korean Saju analysis based on your birth date and time for life guidance.",
    url: `${baseUrl}/saju`,
  });
  const serviceJsonLd = generateServiceSchema("saju");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.saju });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
