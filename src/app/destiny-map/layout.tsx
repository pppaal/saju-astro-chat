import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Destiny Map",
  description: "Combine Saju and Western astrology to map your destiny with personalized insights.",
  keywords: [
    "destiny map",
    "saju",
    "four pillars",
    "astrology chart",
    "life guidance",
    "korean fortune telling",
  ],
  canonicalUrl: `${baseUrl}/destiny-map`,
  ogImage: "/og-image.png",
});

export default function DestinyMapLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Destiny Map",
    description: "Combine Saju and Western astrology to map your destiny with personalized insights.",
    url: `${baseUrl}/destiny-map`,
  });
  const serviceJsonLd = generateServiceSchema("destiny-map");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.destinyMap });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
