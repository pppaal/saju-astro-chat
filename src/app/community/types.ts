/**
 * Type definitions for the Community feature
 */

/**
 * Represents a particle in the background animation
 */
export type Particle = {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  color: string;
  update: () => void;
  draw: () => void;
};

/**
 * Media type for community posts
 */
export type MediaType = "image" | "video";

/**
 * Represents a comment on a post
 */
export type Comment = {
  id: string;
  postId: string;
  author: string;
  authorImage?: string;
  body: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  replies: Reply[];
};

/**
 * Represents a reply to a comment
 */
export type Reply = {
  id: string;
  commentId: string;
  author: string;
  authorImage?: string;
  body: string;
  createdAt: number;
  likes: number;
  likedBy: string[];
  mentionedUser?: string;
};

/**
 * Represents a community post
 */
export type Post = {
  id: string;
  parentId: string | null;
  author: string;
  authorImage?: string;
  title: string;
  mediaType: MediaType;
  url: string;
  body?: string;
  category: string;
  tags: string[];
  createdAt: number;
  likes: number;
  likedBy: string[];
  status: "visible" | "hidden" | "reported";
  comments: Comment[];
};

/**
 * Sort options for community posts
 */
export type SortKey = "new" | "top";

/**
 * Community entry from i18n dictionary
 */
export type CommunityEntry = {
  name?: string;
  platform?: string;
  members?: string;
  icon?: string;
};

/**
 * External community platform information
 */
export type ExternalCommunity = {
  name: string;
  platform: string;
  members: string;
  icon: string;
  url: string;
  gradient: string;
};

/**
 * Seed post entry from i18n dictionary
 */
export type SeedPostEntry = {
  author?: string;
  title?: string;
  body?: string;
  category?: string;
  tags?: string[];
};
