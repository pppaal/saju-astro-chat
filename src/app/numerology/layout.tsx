import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Numerology Analysis",
  description: "Discover your life path and number patterns with detailed numerology insights.",
  keywords: [
    "numerology",
    "life path number",
    "expression number",
    "soul urge",
    "number meaning",
  ],
  canonicalUrl: `${baseUrl}/numerology`,
  ogImage: "/og-image.png",
});

export default function NumerologyLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Numerology Analysis",
    description: "Discover your life path and number patterns with detailed numerology insights.",
    url: `${baseUrl}/numerology`,
  });
  const serviceJsonLd = generateServiceSchema("numerology");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.numerology });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
