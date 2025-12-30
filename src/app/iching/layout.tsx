import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata, generateServiceSchema, SERVICE_FAQS } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "I Ching Oracle",
  description: "Consult the I Ching with AI-powered interpretations of the 64 hexagrams.",
  keywords: [
    "iching",
    "i ching",
    "hexagram",
    "oracle",
    "divination",
  ],
  canonicalUrl: `${baseUrl}/iching`,
  ogImage: "/og-image.png",
});

export default function IChingLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "I Ching Oracle",
    description: "Consult the I Ching with AI-powered interpretations of the 64 hexagrams.",
    url: `${baseUrl}/iching`,
  });
  const serviceJsonLd = generateServiceSchema("iching");
  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: SERVICE_FAQS.iching });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
