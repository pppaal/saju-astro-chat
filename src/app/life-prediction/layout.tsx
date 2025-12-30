import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/JsonLd";
import { generateJsonLd, generateMetadata } from "@/components/seo/SEO";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinypal.com";

export const metadata = generateMetadata({
  title: "Life Prediction",
  description: "AI timing insights that help you plan key life events with personalized guidance.",
  keywords: [
    "life prediction",
    "timing insights",
    "life events",
    "ai guidance",
    "future planning",
  ],
  canonicalUrl: `${baseUrl}/life-prediction`,
  ogImage: "/og-image.png",
});

const lifePredictionFaqs = [
  {
    question: "What is life prediction?",
    answer: "Life prediction provides timing-focused guidance based on your birth data and questions.",
  },
  {
    question: "How should I use timing insights?",
    answer: "Use them as a planning aid, not a guarantee, to choose better windows for action.",
  },
];

export default function LifePredictionLayout({ children }: { children: ReactNode }) {
  const pageJsonLd = generateJsonLd({
    type: "WebPage",
    name: "Life Prediction",
    description: "AI timing insights that help you plan key life events with personalized guidance.",
    url: `${baseUrl}/life-prediction`,
  });

  const serviceJsonLd = generateJsonLd({
    type: "Service",
    service: {
      name: "Life Prediction",
      description: "AI timing insights that help you plan key life events with personalized guidance.",
      category: "Life Guidance",
    },
    url: `${baseUrl}/life-prediction`,
  });

  const faqJsonLd = generateJsonLd({ type: "FAQPage", faqs: lifePredictionFaqs });

  return (
    <>
      <JsonLd data={pageJsonLd} />
      <JsonLd data={serviceJsonLd} />
      <JsonLd data={faqJsonLd} />
      {children}
    </>
  );
}
