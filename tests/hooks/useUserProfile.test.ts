/**
 * useUserProfile Hook Tests
 * 사용자 프로필 훅 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useUserProfile } from '@/hooks/useUserProfile';

// Mock next-auth
const mockUseSession = vi.fn();
vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

// Mock userProfile lib
const mockGetUserProfile = vi.fn();
const mockFetchAndSyncUserProfile = vi.fn();
vi.mock('@/lib/userProfile', () => ({
  getUserProfile: () => mockGetUserProfile(),
  fetchAndSyncUserProfile: () => mockFetchAndSyncUserProfile(),
}));

describe('useUserProfile', () => {
  const mockProfile = {
    name: 'Test User',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    city: 'Seoul',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserProfile.mockReturnValue({});
    mockFetchAndSyncUserProfile.mockResolvedValue(mockProfile);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('unauthenticated state', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ status: 'unauthenticated' });
    });

    it('should return empty profile initially', async () => {
      mockGetUserProfile.mockReturnValue({});

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual({});
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should load profile from localStorage', async () => {
      const localProfile = { name: 'Local User', birthDate: '1985-05-15' };
      mockGetUserProfile.mockReturnValue(localProfile);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(localProfile);
      expect(mockFetchAndSyncUserProfile).not.toHaveBeenCalled();
    });

    it('should not call fetchAndSyncUserProfile', async () => {
      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchAndSyncUserProfile).not.toHaveBeenCalled();
    });
  });

  describe('authenticated state', () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({ status: 'authenticated' });
    });

    it('should fetch profile from API', async () => {
      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchAndSyncUserProfile).toHaveBeenCalled();
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should fallback to localStorage on API error', async () => {
      mockFetchAndSyncUserProfile.mockRejectedValue(new Error('API Error'));
      const localProfile = { name: 'Fallback User' };
      mockGetUserProfile.mockReturnValue(localProfile);

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(localProfile);
    });

    it('should skip fetch when skipFetch option is true', async () => {
      const localProfile = { name: 'Skip Fetch User' };
      mockGetUserProfile.mockReturnValue(localProfile);

      const { result } = renderHook(() => useUserProfile({ skipFetch: true }));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchAndSyncUserProfile).not.toHaveBeenCalled();
      expect(result.current.profile).toEqual(localProfile);
    });
  });

  describe('loading state', () => {
    it('should show loading while session is loading', () => {
      mockUseSession.mockReturnValue({ status: 'loading' });

      const { result } = renderHook(() => useUserProfile());

      expect(result.current.isLoading).toBe(true);
    });

    it('should show loading while fetching profile', async () => {
      mockUseSession.mockReturnValue({ status: 'authenticated' });
      mockFetchAndSyncUserProfile.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockProfile), 100))
      );

      const { result } = renderHook(() => useUserProfile());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('refetch', () => {
    it('should provide refetch function', async () => {
      mockUseSession.mockReturnValue({ status: 'unauthenticated' });

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch profile when called', async () => {
      mockUseSession.mockReturnValue({ status: 'authenticated' });

      const { result } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Clear mocks to count refetch calls
      mockFetchAndSyncUserProfile.mockClear();

      const updatedProfile = { ...mockProfile, name: 'Updated User' };
      mockFetchAndSyncUserProfile.mockResolvedValue(updatedProfile);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockFetchAndSyncUserProfile).toHaveBeenCalledTimes(1);
      expect(result.current.profile).toEqual(updatedProfile);
    });
  });

  describe('status changes', () => {
    it('should reload profile when auth status changes', async () => {
      // Start unauthenticated
      mockUseSession.mockReturnValue({ status: 'unauthenticated' });
      const localProfile = { name: 'Local' };
      mockGetUserProfile.mockReturnValue(localProfile);

      const { result, rerender } = renderHook(() => useUserProfile());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.profile).toEqual(localProfile);

      // Change to authenticated
      mockUseSession.mockReturnValue({ status: 'authenticated' });

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchAndSyncUserProfile).toHaveBeenCalled();
    });
  });
});
