import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Personality Test",
  description: "Discover your unique personality type with our AI-powered ICP personality test based on psychological principles.",
  keywords: [
    "personality test",
    "personality type",
    "icp test",
    "psychology test",
    "self discovery",
  ],
  canonicalUrl: `${baseUrl}/personality`,
  ogImage: "/og-image.png",
});

export default function PersonalityLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Personality Test - DestinyPal",
    description: "Discover your unique personality type with our AI-powered ICP personality test based on psychological principles.",
    url: `${baseUrl}/personality`,
  });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      {children}
    </>
  );
}
