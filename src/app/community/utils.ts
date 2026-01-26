import { DICTS } from "@/i18n/I18nProvider";
import type {
  CommunityEntry,
  ExternalCommunity,
  Post,
  SeedPostEntry,
} from "./types";
import {
  FALLBACK_COMMUNITIES,
  FALLBACK_SEED_POSTS,
  now,
  uid,
} from "./constants";

/**
 * Sanitizes icon text to ensure it contains only ASCII characters
 * @param icon - Icon string to sanitize
 * @returns Sanitized icon string or fallback "*"
 */
export const sanitizeIcon = (icon?: string): string => {
  if (!icon) {return "*";}
  const ascii = icon.replace(/[^\x00-\x7F]/g, "*").trim();
  return ascii || "*";
};

/**
 * Gets the community dictionary for a given locale
 * @param locale - Current locale
 * @returns Community dictionary object
 */
export const getCommunityDict = (locale: string): Record<string, unknown> => {
  const dicts = DICTS as Record<string, { community?: unknown }>;
  const current = dicts[locale]?.community;
  if (current && typeof current === "object")
    {return current as Record<string, unknown>;}
  const fallback = dicts.en?.community;
  if (fallback && typeof fallback === "object")
    {return fallback as Record<string, unknown>;}
  return {};
};

/**
 * Builds external communities list from i18n dictionary or fallback
 * @param locale - Current locale
 * @returns Array of external community objects
 */
export const buildExternalCommunities = (
  locale: string
): ExternalCommunity[] => {
  const dict = getCommunityDict(locale);
  const fromDict =
    Array.isArray(dict?.externalCommunities) &&
    dict.externalCommunities.length > 0
      ? dict.externalCommunities
      : FALLBACK_COMMUNITIES;

  return fromDict.map((entry: CommunityEntry, index: number) => {
    const fallback = FALLBACK_COMMUNITIES[index % FALLBACK_COMMUNITIES.length];
    return {
      name: entry.name || fallback.name,
      platform: entry.platform || fallback.platform,
      members: entry.members || fallback.members,
      icon: sanitizeIcon(entry.icon || fallback.icon),
      url: fallback.url,
      gradient: fallback.gradient,
    };
  });
};

/**
 * Builds seed posts from i18n dictionary or fallback
 * @param locale - Current locale
 * @returns Array of post objects
 */
export const buildSeedPosts = (locale: string): Post[] => {
  const dict = getCommunityDict(locale);
  const fromDict =
    Array.isArray(dict?.seedPosts) && dict.seedPosts.length > 0
      ? dict.seedPosts
      : FALLBACK_SEED_POSTS;
  const baseTime = now();

  return fromDict.map((entry: SeedPostEntry, index: number) => {
    const fallback = FALLBACK_SEED_POSTS[index % FALLBACK_SEED_POSTS.length];
    return {
      id: uid(),
      parentId: null,
      author: entry.author || fallback.author || "User",
      authorImage: undefined,
      title: entry.title || fallback.title || "Untitled",
      mediaType: "image" as const,
      url: "",
      body: entry.body || fallback.body || "",
      category: entry.category || fallback.category || "tarot",
      tags: Array.isArray(entry.tags)
        ? entry.tags.filter(Boolean)
        : fallback.tags || [],
      createdAt: baseTime - (index + 1) * 60 * 60 * 1000,
      likes: 0,
      likedBy: [],
      status: "visible" as const,
      comments: [],
    };
  });
};
