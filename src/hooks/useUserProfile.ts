/**
 * useUserProfile Hook
 *
 * React hook for loading user profile data.
 * Automatically syncs profile from DB for authenticated users.
 */

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  getUserProfile,
  fetchAndSyncUserProfile,
  type UserProfile,
} from '@/lib/userProfile';

interface UseUserProfileOptions {
  /** Skip API fetch even if authenticated */
  skipFetch?: boolean;
}

interface UseUserProfileReturn {
  profile: UserProfile;
  isLoading: boolean;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to get user profile with automatic sync for authenticated users
 *
 * @example
 * const { profile, isLoading } = useUserProfile();
 *
 * useEffect(() => {
 *   if (profile.birthDate) setBirthDate(profile.birthDate);
 *   if (profile.birthTime) setBirthTime(profile.birthTime);
 * }, [profile]);
 */
export function useUserProfile(
  options: UseUserProfileOptions = {}
): UseUserProfileReturn {
  const { status } = useSession();
  const [profile, setProfile] = useState<UserProfile>({});
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = status === 'authenticated';

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      if (isAuthenticated && !options.skipFetch) {
        // Authenticated: fetch from API and sync
        const fetched = await fetchAndSyncUserProfile();
        setProfile(fetched);
      } else {
        // Not authenticated: use localStorage only
        setProfile(getUserProfile());
      }
    } catch {
      setProfile(getUserProfile());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAuthenticated]);

  return {
    profile,
    isLoading: status === 'loading' || isLoading,
    isAuthenticated,
    refetch: loadProfile,
  };
}

export default useUserProfile;
