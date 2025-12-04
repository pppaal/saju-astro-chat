import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://destinytracker.com";

  const routes = [
    { path: "", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/community", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/destiny-map", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/astrology", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/saju", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/tarot", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/iching", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/dream", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/numerology", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/compatibility", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/personality", priority: 0.8, changeFrequency: "weekly" as const },
    { path: "/myjourney", priority: 0.7, changeFrequency: "weekly" as const },
    { path: "/pricing", priority: 0.7, changeFrequency: "monthly" as const },
    { path: "/policy/terms", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/policy/privacy", priority: 0.3, changeFrequency: "yearly" as const },
    { path: "/policy/refund", priority: 0.3, changeFrequency: "yearly" as const },
  ];

  const tarotCategories = ["love", "career", "life", "daily", "weekly", "monthly"];
  const tarotSpreads = [
    { category: "love", spreads: ["three-card", "celtic-cross", "relationship"] },
    { category: "career", spreads: ["three-card", "decision", "career-path"] },
    { category: "life", spreads: ["three-card", "year-ahead", "life-purpose"] },
    { category: "daily", spreads: ["single-card", "three-card"] },
  ];

  const staticPages: MetadataRoute.Sitemap = routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified: new Date(),
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const tarotCategoryPages: MetadataRoute.Sitemap = tarotCategories.map((category) => ({
    url: `${baseUrl}/tarot/${category}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const tarotSpreadPages: MetadataRoute.Sitemap = tarotSpreads.flatMap((item) =>
    item.spreads.map((spread) => ({
      url: `${baseUrl}/tarot/${item.category}/${spread}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }))
  );

  return [...staticPages, ...tarotCategoryPages, ...tarotSpreadPages];
}

