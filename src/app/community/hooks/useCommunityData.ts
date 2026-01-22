import { useMemo } from 'react';
import type { Post, ExternalCommunity } from '../types';
import { buildSeedPosts, buildExternalCommunities } from '../utils';

/**
 * Custom hook for building community data from locale
 * Memoizes seed posts and external communities based on locale
 *
 * @param locale - Current locale string
 * @returns Object containing seedPosts and externalCommunities
 */
export function useCommunityData(locale: string): {
  seedPosts: Post[];
  externalCommunities: ExternalCommunity[];
} {
  const seedPosts = useMemo(() => buildSeedPosts(locale), [locale]);
  const externalCommunities = useMemo(() => buildExternalCommunities(locale), [locale]);

  return {
    seedPosts,
    externalCommunities,
  };
}
