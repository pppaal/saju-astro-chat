// src/hooks/calendar/useProfileLoader.ts
import { useState, useCallback } from 'react';
import { getUserProfile } from '@/lib/userProfile';
import { logger } from '@/lib/logger';

interface BirthInfo {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  gender: 'Male' | 'Female';
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

interface CityHit {
  name: string;
  country: string;
  lat: number;
  lon: number;
  timezone?: string;
}

interface UseProfileLoaderReturn {
  loadingProfile: boolean;
  profileLoaded: boolean;
  loadProfile: (
    userId: string,
    onSuccess: (info: BirthInfo, city: CityHit) => void
  ) => Promise<void>;
}

/**
 * Hook for loading user profile data
 */
export function useProfileLoader(): UseProfileLoaderReturn {
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);

  const loadProfile = useCallback(
    async (
      userId: string,
      onSuccess: (info: BirthInfo, city: CityHit) => void
    ) => {
      if (profileLoaded) {
        logger.info('[useProfileLoader] Profile already loaded');
        return;
      }

      setLoadingProfile(true);

      try {
        const profile = getUserProfile();

        if (
          profile?.birthDate &&
          profile?.latitude !== undefined &&
          profile?.longitude !== undefined
        ) {
          const birthInfo: BirthInfo = {
            birthDate: profile.birthDate,
            birthTime: profile.birthTime || '12:00',
            birthPlace: profile.birthCity || '',
            gender: profile.gender === 'Female' ? 'Female' : 'Male',
            latitude: profile.latitude,
            longitude: profile.longitude,
            timezone: profile.timezone || 'UTC',
          };

          const cityHit: CityHit = {
            name: profile.birthCity || 'Unknown',
            country: '',
            lat: profile.latitude,
            lon: profile.longitude,
            timezone: profile.timezone || 'UTC',
          };

          onSuccess(birthInfo, cityHit);
          setProfileLoaded(true);

          logger.info('[useProfileLoader] Profile loaded successfully', {
            birthDate: profile.birthDate,
            hasTime: !!profile.birthTime,
          });
        } else {
          logger.warn('[useProfileLoader] Incomplete profile data');
        }
      } catch (err) {
        logger.error('[useProfileLoader] Failed to load profile', {
          error: err instanceof Error ? err.message : 'Unknown',
        });
      } finally {
        setLoadingProfile(false);
      }
    },
    [profileLoaded]
  );

  return { loadingProfile, profileLoaded, loadProfile };
}
