import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Compatibility Analysis",
  description: "Discover your relationship compatibility with AI-powered analysis combining Eastern Saju and Western astrology.",
  keywords: [
    "compatibility",
    "relationship analysis",
    "love compatibility",
    "couple matching",
    "saju compatibility",
    "astrology compatibility",
  ],
  canonicalUrl: `${baseUrl}/compatibility`,
  ogImage: "/og-image.png",
});

export default function CompatibilityLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Compatibility Analysis",
    description: "Discover your relationship compatibility with AI-powered analysis combining Eastern Saju and Western astrology.",
    url: `${baseUrl}/compatibility`,
  });
  // Note: compatibility service schema not yet defined in SEO.tsx

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  );
}
