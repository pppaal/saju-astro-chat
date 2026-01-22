/**
 * Community module exports
 *
 * This module provides types, constants, and utilities for the community feature.
 */

// Types
export type {
  Particle,
  MediaType,
  Comment,
  Reply,
  Post,
  SortKey,
  CommunityEntry,
  ExternalCommunity,
  SeedPostEntry,
} from "./types";

// Constants
export {
  uid,
  now,
  CATEGORIES,
  FALLBACK_COMMUNITIES,
  FALLBACK_SEED_POSTS,
  PARTICLE_COUNT,
  MAX_LINK_DISTANCE,
  MOUSE_INTERACTION_RADIUS,
  PARTICLE_BASE_SPEED,
} from "./constants";

// Utilities
export {
  sanitizeIcon,
  getCommunityDict,
  buildExternalCommunities,
  buildSeedPosts,
} from "./utils";
