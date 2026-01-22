import type { ExternalCommunity, SeedPostEntry } from "./types";

/**
 * Generates a unique identifier
 * @returns A random unique ID string
 */
export const uid = () => Math.random().toString(36).slice(2, 10);

/**
 * Gets the current timestamp
 * @returns Current time in milliseconds since epoch
 */
export const now = () => Date.now();

/**
 * Available post categories
 */
export const CATEGORIES = ["all", "tarot", "zodiac", "fortune", "stars", "saju"] as const;

/**
 * Fallback external communities when i18n data is not available
 */
export const FALLBACK_COMMUNITIES: ExternalCommunity[] = [
  {
    name: "r/astrology",
    platform: "Reddit",
    members: "1.2M",
    icon: "*",
    url: "https://www.reddit.com/r/astrology",
    gradient: "linear-gradient(135deg, #2b2b52, #4a3f77)",
  },
  {
    name: "r/tarot",
    platform: "Reddit",
    members: "580K",
    icon: "*",
    url: "https://www.reddit.com/r/tarot",
    gradient: "linear-gradient(135deg, #1f2937, #3b82f6)",
  },
  {
    name: "#astrology",
    platform: "Instagram",
    members: "12M+",
    icon: "*",
    url: "https://www.instagram.com/explore/tags/astrology/",
    gradient: "linear-gradient(135deg, #111827, #6b21a8)",
  },
  {
    name: "Astrology Twitter",
    platform: "Twitter/X",
    members: "Active",
    icon: "*",
    url: "https://twitter.com/search?q=astrology",
    gradient: "linear-gradient(135deg, #0f172a, #1d4ed8)",
  },
];

/**
 * Fallback seed posts when i18n data is not available
 */
export const FALLBACK_SEED_POSTS: SeedPostEntry[] = [
  {
    author: "Orion",
    title: "Today's Tarot Spread - Major Insights",
    body: "Just finished my morning tarot reading and got some powerful cards! The Tower, The Star, and The World. What an interesting combination for starting the day.",
    category: "tarot",
    tags: ["destinypal", "tarot", "daily"],
  },
  {
    author: "Lyra",
    title: "Understanding Your Natal Chart - Beginner's Guide",
    body: "For everyone asking about how to read their birth chart! Here's a quick visual guide to the houses and what they represent.",
    category: "zodiac",
    tags: ["astrology", "guide", "natal chart"],
  },
];

/**
 * Particle animation constants
 */

/**
 * Maximum number of particles in the background animation
 */
export const PARTICLE_COUNT = 60;

/**
 * Maximum distance between particles to draw a connecting line
 */
export const MAX_LINK_DISTANCE = 100;

/**
 * Radius around the mouse cursor where particles are affected
 */
export const MOUSE_INTERACTION_RADIUS = 180;

/**
 * Base speed multiplier for particle movement
 */
export const PARTICLE_BASE_SPEED = 0.25;
