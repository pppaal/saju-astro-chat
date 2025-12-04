import { Metadata } from "next";

export interface SEOProps {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: "website" | "article" | "profile";
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  canonicalUrl?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  ogImage = "/og-default.png",
  ogType = "website",
  twitterCard = "summary_large_image",
  canonicalUrl,
  author = "Destiny Tracker",
  publishedTime,
  modifiedTime,
}: SEOProps): Metadata {
  const siteName = "Destiny Tracker";
  const fullTitle = title.includes(siteName) ? title : `${title} | ${siteName}`;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinytracker.com";
  const fullOgImage = ogImage.startsWith("http") ? ogImage : `${baseUrl}${ogImage}`;

  return {
    title: fullTitle,
    description,
    keywords: keywords.join(", "),
    authors: [{ name: author }],
    creator: author,
    publisher: siteName,

    // Open Graph
    openGraph: {
      type: ogType,
      locale: "en_US",
      alternateLocale: ["ko_KR"],
      url: canonicalUrl || baseUrl,
      siteName,
      title: fullTitle,
      description,
      images: [
        {
          url: fullOgImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(publishedTime && { publishedTime }),
      ...(modifiedTime && { modifiedTime }),
    },

    // Twitter
    twitter: {
      card: twitterCard,
      title: fullTitle,
      description,
      images: [fullOgImage],
      creator: "@destinytracker",
      site: "@destinytracker",
    },

    // Additional
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),

    // Verification
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
      yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
    },
  };
}

// Generate JSON-LD structured data
export function generateJsonLd(data: {
  type: "WebSite" | "WebPage" | "Article" | "Organization" | "Person" | "BreadcrumbList";
  name?: string;
  url?: string;
  description?: string;
  author?: { name: string; url?: string };
  datePublished?: string;
  dateModified?: string;
  image?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
  [key: string]: any;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinytracker.com";

  const baseSchema = {
    "@context": "https://schema.org",
    "@type": data.type,
  };

  switch (data.type) {
    case "WebSite":
      return {
        ...baseSchema,
        name: data.name || "Destiny Tracker",
        url: baseUrl,
        description: data.description || "Chart the cosmos, navigate your destiny.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${baseUrl}/community?search={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      };

    case "WebPage":
      return {
        ...baseSchema,
        name: data.name,
        url: data.url || baseUrl,
        description: data.description,
        inLanguage: ["en-US", "ko-KR"],
        isPartOf: {
          "@type": "WebSite",
          name: "Destiny Tracker",
          url: baseUrl,
        },
      };

    case "Article":
      return {
        ...baseSchema,
        headline: data.name,
        description: data.description,
        image: data.image,
        datePublished: data.datePublished,
        dateModified: data.dateModified || data.datePublished,
        author: {
          "@type": "Person",
          name: data.author?.name || "Anonymous",
          url: data.author?.url,
        },
        publisher: {
          "@type": "Organization",
          name: "Destiny Tracker",
          logo: {
            "@type": "ImageObject",
            url: `${baseUrl}/logo.png`,
          },
        },
      };

    case "Organization":
      return {
        ...baseSchema,
        name: "Destiny Tracker",
        url: baseUrl,
        logo: `${baseUrl}/logo.png`,
        description: "Chart the cosmos, navigate your destiny through Saju, Astrology, and Tarot.",
        sameAs: [
          "https://twitter.com/destinytracker",
          "https://facebook.com/destinytracker",
          "https://instagram.com/destinytracker",
        ],
      };

    case "BreadcrumbList":
      return {
        ...baseSchema,
        itemListElement: data.breadcrumbs?.map((crumb, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: crumb.name,
          item: `${baseUrl}${crumb.url}`,
        })),
      };

    default:
      return baseSchema;
  }
}
