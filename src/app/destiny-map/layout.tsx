import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Destiny Counselor",
  description: "Get practical AI counseling by combining Saju and Western astrology signals.",
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
    name: "Destiny Counselor",
    description: "Get practical AI counseling by combining Saju and Western astrology signals.",
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
