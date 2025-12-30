import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Dream Interpretation",
  description: "AI-powered dream interpretation blending psychology and cultural symbolism for meaningful insight.",
  keywords: [
    "dream interpretation",
    "dream meaning",
    "lucid dream",
    "dream analysis",
    "symbolism",
    "ai dream",
  ],
  canonicalUrl: `${baseUrl}/dream`,
  ogImage: "/og-image.png",
});

export default function DreamLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Dream Interpretation",
    description: "AI-powered dream interpretation blending psychology and cultural symbolism for meaningful insight.",
    url: `${baseUrl}/dream`,
  });
  const serviceJsonLd = generateServiceSchema("dream");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.dream });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
